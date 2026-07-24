/**
 * Calendly bookings reader (admin Consultations tab + HubSpot sync).
 *
 * Separate concern from calendly.ts (which reads *availability* for the paid
 * booking flow). This module reads *who actually booked* — scheduled events plus
 * their invitee (name/email/booked-at) — and normalises them into one shape the
 * admin UI and the HubSpot sync share.
 *
 * TWO ACCOUNTS, TWO TOKENS. The free "Quick Conversation" and paid "Paid
 * Consultation" live under two DIFFERENT Calendly logins. On a free Calendly plan
 * they can't share an organisation, so there's no single org-wide token — each
 * account needs its own Personal Access Token and we query + merge both.
 *
 * Env (read lazily — same ESM-vs-dotenv trap as db/pgPool.ts):
 *   CALENDLY_PAID_TOKEN  — PAT for the paid account (anahit-designature).
 *                          Falls back to CALENDLY_ACCESS_TOKEN (the OAuth token
 *                          the availability flow already uses) if unset.
 *   CALENDLY_FREE_TOKEN  — PAT for the free account (hello-designature).
 *   CALENDLY_PAID_CONSULT_EVENT_TYPE_URI — paid event type (classification + a
 *                          scope fallback for the narrow OAuth token).
 *   CALENDLY_FREE_EVENT_TYPE_URI          — free event type (optional; classification).
 *
 * Each token is queried by its own user scope. Classification prefers an event
 * type URI match, then the per-account hint (we know which account a token is),
 * then the event name.
 */

const API = "https://api.calendly.com";
const REQUEST_TIMEOUT_MS = 15_000;
const CACHE_TTL_MS = 60_000;
/** Cap the per-account fetch so a refresh never fans out into hundreds of invitee calls. */
export const MAX_EVENTS = 40;

export type BookingKind = "free" | "paid";
export type BookingStatus = "active" | "canceled";

export interface ConsultationBooking {
  /** Stable unique id — the Calendly invitee URI. */
  inviteeUri: string;
  eventUuid: string;
  kind: BookingKind;
  eventName: string;
  /** Meeting start (UTC ISO). */
  startTime: string;
  status: BookingStatus;
  email: string;
  name: string;
  /** When the booking was made (UTC ISO). */
  createdAt: string;
  cancelUrl?: string;
  rescheduleUrl?: string;
  /** Where the record came from — a live API read or a webhook push. */
  source: "calendly_api" | "webhook";
}

export interface BookingsConfig {
  paidToken: string;
  freeToken: string;
  paidEventTypeUri: string;
  freeEventTypeUri: string;
}

export function getBookingsConfig(): BookingsConfig {
  return {
    paidToken: (process.env.CALENDLY_PAID_TOKEN || process.env.CALENDLY_ACCESS_TOKEN || "").trim(),
    freeToken: (process.env.CALENDLY_FREE_TOKEN || "").trim(),
    paidEventTypeUri: (process.env.CALENDLY_PAID_CONSULT_EVENT_TYPE_URI || "").trim(),
    freeEventTypeUri: (process.env.CALENDLY_FREE_EVENT_TYPE_URI || "").trim(),
  };
}

export function isBookingsConfigured(): boolean {
  const c = getBookingsConfig();
  return !!(c.paidToken || c.freeToken);
}

// ── Pure helpers (unit-tested) ───────────────────────────────────────────────

/**
 * Classify an event as free or paid. Prefers an event_type URI match; then the
 * per-account `hint` (we know which token an event came from); then the name.
 */
export function classifyKind(
  eventTypeUri: string | undefined,
  eventName: string | undefined,
  cfg: Pick<BookingsConfig, "paidEventTypeUri" | "freeEventTypeUri">,
  hint?: BookingKind,
): BookingKind {
  const et = (eventTypeUri || "").trim();
  if (et && cfg.paidEventTypeUri && et === cfg.paidEventTypeUri) return "paid";
  if (et && cfg.freeEventTypeUri && et === cfg.freeEventTypeUri) return "free";
  if (hint) return hint;
  return /\bpaid\b/i.test(eventName || "") ? "paid" : "free";
}

function uuidFromUri(uri: string | undefined): string {
  if (!uri) return "";
  const parts = uri.split("/").filter(Boolean);
  return parts[parts.length - 1] || "";
}

/**
 * Merge one scheduled_event + one invitee into a normalised booking. PURE — the
 * shape both the admin UI and HubSpot sync consume. `source` marks provenance,
 * `hint` biases classification toward the account the event came from.
 */
export function normalizeBooking(
  event: any,
  invitee: any,
  cfg: Pick<BookingsConfig, "paidEventTypeUri" | "freeEventTypeUri">,
  source: ConsultationBooking["source"] = "calendly_api",
  hint?: BookingKind,
): ConsultationBooking | null {
  const inviteeUri = String(invitee?.uri || "").trim();
  const email = String(invitee?.email || "").trim();
  if (!inviteeUri || !email) return null;
  const eventUri = String(event?.uri || "").trim();
  const rawStatus = String(invitee?.status || event?.status || "active").toLowerCase();
  const status: BookingStatus = rawStatus === "canceled" || rawStatus === "cancelled" ? "canceled" : "active";
  return {
    inviteeUri,
    eventUuid: uuidFromUri(eventUri),
    kind: classifyKind(event?.event_type, event?.name, cfg, hint),
    eventName: String(event?.name || "").trim() || "Consultation",
    startTime: String(event?.start_time || "").trim(),
    status,
    email,
    name: String(invitee?.name || "").trim(),
    createdAt: String(invitee?.created_at || event?.created_at || "").trim(),
    cancelUrl: invitee?.cancel_url ? String(invitee.cancel_url) : undefined,
    rescheduleUrl: invitee?.reschedule_url ? String(invitee.reschedule_url) : undefined,
    source,
  };
}

/** Newest-booked first. */
export function sortBookings(list: ConsultationBooking[]): ConsultationBooking[] {
  return [...list].sort((a, b) => Date.parse(b.createdAt || b.startTime) - Date.parse(a.createdAt || a.startTime));
}

// ── Network ──────────────────────────────────────────────────────────────────

async function calendlyGet(token: string, url: string): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: controller.signal,
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Calendly HTTP ${res.status}: ${text.slice(0, 200)}`);
    return text ? JSON.parse(text) : {};
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Resolve one token's scheduled_events query scope (a `user=` fragment):
 *  - PAT → /users/me → user uri
 *  - narrow OAuth token (no users:read) → fall back to the given event type's owner
 */
async function resolveUserScope(token: string, fallbackEventTypeUri?: string): Promise<string> {
  try {
    const me = await calendlyGet(token, `${API}/users/me`);
    const user = me?.resource?.uri;
    if (user) return `user=${encodeURIComponent(user)}`;
  } catch {
    /* narrow token — fall through */
  }
  if (fallbackEventTypeUri) {
    const et = await calendlyGet(token, fallbackEventTypeUri);
    const owner = et?.resource?.profile?.owner;
    if (owner) return `user=${encodeURIComponent(owner)}`;
  }
  throw new Error("Could not resolve a Calendly user scope for this token.");
}

/** Fetch one account's recent bookings (each with its invitee). */
async function fetchForToken(
  token: string,
  cfg: BookingsConfig,
  opts: { hint: BookingKind; fallbackEventTypeUri?: string },
): Promise<ConsultationBooking[]> {
  const scope = await resolveUserScope(token, opts.fallbackEventTypeUri);
  const list = await calendlyGet(token, `${API}/scheduled_events?${scope}&count=${MAX_EVENTS}&sort=start_time:desc`);
  const events: any[] = Array.isArray(list?.collection) ? list.collection : [];
  const out: ConsultationBooking[] = [];
  await Promise.all(
    events.map(async (ev) => {
      try {
        const inv = await calendlyGet(token, `${ev.uri}/invitees?count=10`);
        for (const invitee of inv?.collection || []) {
          const b = normalizeBooking(ev, invitee, cfg, "calendly_api", opts.hint);
          if (b) out.push(b);
        }
      } catch (err) {
        console.error("[calendly-bookings] invitees failed for", ev?.uri, (err as Error)?.message);
      }
    }),
  );
  return out;
}

export interface FetchBookingsResult {
  bookings: ConsultationBooking[];
  paidConfigured: boolean;
  freeConfigured: boolean;
  /** Per-account read error (null when it read OK or isn't configured). */
  paidError: string | null;
  freeError: string | null;
}

let _cache: { expiresAt: number; result: FetchBookingsResult } | null = null;
export function clearBookingsCache(): void {
  _cache = null;
}

/**
 * Live-read recent bookings from BOTH accounts (whichever tokens are set) and
 * merge them, newest-booked first. Cached 60s. Never throws — a per-account
 * failure is surfaced as that account's error while the other still returns.
 */
export async function fetchBookings(now: Date = new Date()): Promise<FetchBookingsResult> {
  if (_cache && now.getTime() < _cache.expiresAt) return _cache.result;
  const cfg = getBookingsConfig();

  const [paid, free] = await Promise.all([
    cfg.paidToken
      ? fetchForToken(cfg.paidToken, cfg, { hint: "paid", fallbackEventTypeUri: cfg.paidEventTypeUri })
          .then((bookings) => ({ bookings, error: null as string | null }))
          .catch((e) => ({ bookings: [] as ConsultationBooking[], error: e?.message || "read failed" }))
      : Promise.resolve({ bookings: [] as ConsultationBooking[], error: null as string | null }),
    cfg.freeToken
      ? fetchForToken(cfg.freeToken, cfg, { hint: "free" })
          .then((bookings) => ({ bookings, error: null as string | null }))
          .catch((e) => ({ bookings: [] as ConsultationBooking[], error: e?.message || "read failed" }))
      : Promise.resolve({ bookings: [] as ConsultationBooking[], error: null as string | null }),
  ]);

  const result: FetchBookingsResult = {
    bookings: sortBookings([...paid.bookings, ...free.bookings]),
    paidConfigured: !!cfg.paidToken,
    freeConfigured: !!cfg.freeToken,
    paidError: cfg.paidToken ? paid.error : null,
    freeError: cfg.freeToken ? free.error : null,
  };
  _cache = { expiresAt: now.getTime() + CACHE_TTL_MS, result };
  return result;
}
