/**
 * Calendly bookings reader (admin Consultations tab + webhook backfill).
 *
 * Separate concern from calendly.ts (which reads *availability* for the paid
 * booking flow). This module reads *who actually booked* — scheduled events plus
 * their invitee (name/email/booked-at) — for both the free "Quick Conversation"
 * and the paid "Paid Consultation" event types, and normalises them into one
 * shape the admin UI and the HubSpot sync share.
 *
 * Token & scope (read lazily — same ESM-vs-dotenv trap as db/pgPool.ts):
 *   CALENDLY_ADMIN_TOKEN  — a Personal Access Token (PREFERRED). With users:read
 *                           it resolves the ORGANISATION, so scheduled_events can
 *                           be queried org-wide → sees BOTH the free + paid events
 *                           when they share one Calendly organisation.
 *   CALENDLY_ACCESS_TOKEN — the narrower OAuth token the availability flow uses.
 *                           Fallback: can't call /users/me, so we resolve the paid
 *                           event type's owner USER and query by that user →
 *                           PAID-ONLY. (Free events live under a different user.)
 *   CALENDLY_PAID_CONSULT_EVENT_TYPE_URI — paid event type (classification + fallback scope)
 *   CALENDLY_FREE_EVENT_TYPE_URI         — free event type (optional; improves classification)
 *
 * Classification: an event is 'paid' if its event_type matches the paid URI (or,
 * failing a URI match, if its name contains "paid"); otherwise 'free'.
 */

const API = "https://api.calendly.com";
const REQUEST_TIMEOUT_MS = 15_000;
const CACHE_TTL_MS = 60_000;
/** Cap the live fetch so an admin load never fans out into hundreds of invitee calls. */
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
  token: string;
  isPat: boolean; // CALENDLY_ADMIN_TOKEN present → treat as a full-scope PAT
  paidEventTypeUri: string;
  freeEventTypeUri: string;
}

export function getBookingsConfig(): BookingsConfig {
  const pat = (process.env.CALENDLY_ADMIN_TOKEN || "").trim();
  const oauth = (process.env.CALENDLY_ACCESS_TOKEN || "").trim();
  return {
    token: pat || oauth,
    isPat: !!pat,
    paidEventTypeUri: (process.env.CALENDLY_PAID_CONSULT_EVENT_TYPE_URI || "").trim(),
    freeEventTypeUri: (process.env.CALENDLY_FREE_EVENT_TYPE_URI || "").trim(),
  };
}

export function isBookingsConfigured(): boolean {
  return !!getBookingsConfig().token;
}

// ── Pure helpers (unit-tested) ───────────────────────────────────────────────

/** Classify an event as free or paid from its event_type URI (preferred) or name. */
export function classifyKind(
  eventTypeUri: string | undefined,
  eventName: string | undefined,
  cfg: Pick<BookingsConfig, "paidEventTypeUri" | "freeEventTypeUri">,
): BookingKind {
  const et = (eventTypeUri || "").trim();
  if (et && cfg.paidEventTypeUri && et === cfg.paidEventTypeUri) return "paid";
  if (et && cfg.freeEventTypeUri && et === cfg.freeEventTypeUri) return "free";
  // No URI match — fall back to the human name. "Paid Consultation" → paid.
  return /\bpaid\b/i.test(eventName || "") ? "paid" : "free";
}

function uuidFromUri(uri: string | undefined): string {
  if (!uri) return "";
  const parts = uri.split("/").filter(Boolean);
  return parts[parts.length - 1] || "";
}

/**
 * Merge one scheduled_event + one invitee into a normalised booking. PURE — the
 * shape both the admin UI and HubSpot sync consume. `source` marks provenance.
 */
export function normalizeBooking(
  event: any,
  invitee: any,
  cfg: Pick<BookingsConfig, "paidEventTypeUri" | "freeEventTypeUri">,
  source: ConsultationBooking["source"] = "calendly_api",
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
    kind: classifyKind(event?.event_type, event?.name, cfg),
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
 * Resolve the scheduled_events query scope from the token:
 *  - PAT with users:read → { organization } (org-wide → free + paid)
 *  - else → the paid event type's owner { user } (paid-only fallback)
 * Returns a query-string fragment like "organization=..." or "user=...".
 */
async function resolveScope(cfg: BookingsConfig): Promise<{ scope: string; orgWide: boolean }> {
  // Preferred: /users/me → current_organization (needs users:read; PATs have it).
  try {
    const me = await calendlyGet(cfg.token, `${API}/users/me`);
    const org = me?.resource?.current_organization;
    if (org) return { scope: `organization=${encodeURIComponent(org)}`, orgWide: true };
  } catch {
    /* narrow OAuth token — fall through to user scope */
  }
  // Fallback: the paid event type's owner user → paid-only.
  if (cfg.paidEventTypeUri) {
    const et = await calendlyGet(cfg.token, cfg.paidEventTypeUri);
    const owner = et?.resource?.profile?.owner;
    if (owner) return { scope: `user=${encodeURIComponent(owner)}`, orgWide: false };
  }
  throw new Error("Could not resolve a Calendly query scope (no users:read and no paid event type URI).");
}

let _cache: { expiresAt: number; result: FetchBookingsResult } | null = null;
export function clearBookingsCache(): void {
  _cache = null;
}

export interface FetchBookingsResult {
  bookings: ConsultationBooking[];
  /** false when only the paid account is reachable (narrow OAuth token). */
  orgWide: boolean;
  /** true when free bookings can't be seen with the current token/scope. */
  freeVisible: boolean;
}

/**
 * Live-read the most recent bookings (both event types when org-wide), each with
 * its invitee. Cached 60s. Throws only when the scope can't be resolved at all;
 * a per-event invitee failure just drops that event.
 */
export async function fetchBookings(now: Date = new Date()): Promise<FetchBookingsResult> {
  if (_cache && now.getTime() < _cache.expiresAt) return _cache.result;
  const cfg = getBookingsConfig();
  if (!cfg.token) throw new Error("Calendly bookings not configured (no token).");

  const { scope, orgWide } = await resolveScope(cfg);
  const listUrl = `${API}/scheduled_events?${scope}&count=${MAX_EVENTS}&sort=start_time:desc`;
  const list = await calendlyGet(cfg.token, listUrl);
  const events: any[] = Array.isArray(list?.collection) ? list.collection : [];

  const bookings: ConsultationBooking[] = [];
  await Promise.all(
    events.map(async (ev) => {
      try {
        const inv = await calendlyGet(cfg.token, `${ev.uri}/invitees?count=10`);
        for (const invitee of inv?.collection || []) {
          const b = normalizeBooking(ev, invitee, cfg, "calendly_api");
          if (b) bookings.push(b);
        }
      } catch (err) {
        console.error("[calendly-bookings] invitees failed for", ev?.uri, (err as Error)?.message);
      }
    }),
  );

  const result: FetchBookingsResult = {
    bookings: sortBookings(bookings),
    orgWide,
    freeVisible: orgWide, // only an org-wide scope sees the free account's events
  };
  _cache = { expiresAt: now.getTime() + CACHE_TTL_MS, result };
  return result;
}
