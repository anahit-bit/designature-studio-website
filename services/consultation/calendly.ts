/**
 * Calendly availability source (I-025-v2, revision 3).
 *
 * The studio owner manages her availability entirely in Calendly's UI (schedule
 * windows, day-off rules, buffers). Our slot picker MIRRORS it live by reading
 * Calendly's `event_type_available_times` for the Paid Consultation event type —
 * so the days/times we offer are exactly Calendly's, at Calendly's stride (the
 * event's 45-min duration + 15-min buffer → hourly, on the hour). We do NOT book
 * through Calendly; on payment we create the event in Google Calendar. Calendly
 * is availability-read only.
 *
 * Calendly caps each availability query at a 7-DAY range, so a 30-day horizon is
 * fetched as ~5 chunked requests and merged. Responses are cached 60s to stay
 * comfortably under the API rate limits.
 *
 * Env (read lazily — same ESM-vs-dotenv trap fixed in db/pgPool.ts):
 *   CALENDLY_ACCESS_TOKEN                 — Personal Access Token (secret)
 *   CALENDLY_PAID_CONSULT_EVENT_TYPE_URI  — the Paid Consultation event type URI
 *   CONSULTATION_DURATION_MINUTES         — 45 (retained; used elsewhere)
 *   CONSULTATION_TIMEZONE                 — Asia/Yerevan (retained; studio-side
 *                                           date math + receipt GMT label)
 */

const CALENDLY_API_BASE = "https://api.calendly.com";
const CALENDLY_MAX_WINDOW_DAYS = 7; // Calendly caps availability queries at 7 days
const CACHE_TTL_MS = 60_000;
const REQUEST_TIMEOUT_MS = 15_000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
/** Small buffer so the first chunk's start_time is never "in the past" for Calendly. */
const START_BUFFER_MS = 2 * 60 * 1000;

export const DEFAULT_DURATION_MINUTES = 45;
export const DEFAULT_TIMEZONE = "Asia/Yerevan";
export const HORIZON_DAYS = 30;

export interface ConsultationConfig {
  durationMinutes: number;
  /** Studio timezone — retained for server-side date math + the receipt GMT label. */
  timeZone: string;
  token: string;
  eventTypeUri: string;
}

export function getConsultationConfig(): ConsultationConfig {
  const durationRaw = Number(process.env.CONSULTATION_DURATION_MINUTES);
  const durationMinutes =
    Number.isFinite(durationRaw) && durationRaw > 0 ? durationRaw : DEFAULT_DURATION_MINUTES;
  return {
    durationMinutes,
    timeZone: (process.env.CONSULTATION_TIMEZONE || DEFAULT_TIMEZONE).trim() || DEFAULT_TIMEZONE,
    token: (process.env.CALENDLY_ACCESS_TOKEN || "").trim(),
    eventTypeUri: (process.env.CALENDLY_PAID_CONSULT_EVENT_TYPE_URI || "").trim(),
  };
}

/** True once the owner has pasted the PAT + event type URI into env. */
export function isCalendlyConfigured(): boolean {
  const cfg = getConsultationConfig();
  return !!cfg.token && !!cfg.eventTypeUri;
}

/**
 * Merge + normalise Calendly availability payloads into a clean, de-duped,
 * ascending list of UTC ISO strings. PURE — unit-tested against a real fixture.
 * Calendly emits microsecond-precision UTC (`...Z`); we normalise to millisecond
 * ISO so it round-trips cleanly against `new Date().toISOString()` everywhere.
 */
export function parseAvailableTimes(payloads: any[]): string[] {
  const set = new Set<string>();
  for (const p of payloads) {
    const collection = p?.collection;
    if (!Array.isArray(collection)) continue;
    for (const item of collection) {
      if (item?.status && item.status !== "available") continue;
      const st = item?.start_time;
      if (typeof st !== "string") continue;
      const t = Date.parse(st);
      if (!Number.isFinite(t)) continue;
      set.add(new Date(t).toISOString());
    }
  }
  return Array.from(set).sort((a, b) => Date.parse(a) - Date.parse(b));
}

/** Split [now+buffer, now+horizon) into <=7-day [startIso, endIso) windows. */
export function buildAvailabilityWindows(
  now: Date,
  horizonDays: number = HORIZON_DAYS,
): Array<[string, string]> {
  const windows: Array<[string, string]> = [];
  const endBase = now.getTime() + horizonDays * MS_PER_DAY;
  let start = now.getTime() + START_BUFFER_MS;
  while (start < endBase) {
    const end = Math.min(start + CALENDLY_MAX_WINDOW_DAYS * MS_PER_DAY, endBase);
    windows.push([new Date(start).toISOString(), new Date(end).toISOString()]);
    start = end;
  }
  return windows;
}

async function fetchWindow(cfg: ConsultationConfig, startIso: string, endIso: string): Promise<any> {
  const url =
    `${CALENDLY_API_BASE}/event_type_available_times` +
    `?event_type=${encodeURIComponent(cfg.eventTypeUri)}` +
    `&start_time=${encodeURIComponent(startIso)}` +
    `&end_time=${encodeURIComponent(endIso)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${cfg.token}`, Accept: "application/json" },
      signal: controller.signal,
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Calendly HTTP ${res.status}: ${text.slice(0, 200)}`);
    }
    return text ? JSON.parse(text) : { collection: [] };
  } finally {
    clearTimeout(timer);
  }
}

// 60-second cache (per process) so repeated /slots + /hold calls don't hammer the API.
let _cache: { expiresAt: number; slots: string[] } | null = null;

/** Test hook — drop the cache between cases. */
export function clearCalendlyCache(): void {
  _cache = null;
}

/**
 * Live bookable slots (UTC ISO) from Calendly across the next `horizonDays`,
 * cached 60s. Throws if Calendly is unreachable for EVERY window (so /slots can
 * surface a clean error rather than fabricate availability); tolerates a partial
 * failure by returning whatever windows succeeded.
 */
export async function fetchCalendlyAvailableSlots(
  now: Date,
  horizonDays: number = HORIZON_DAYS,
): Promise<string[]> {
  if (_cache && now.getTime() < _cache.expiresAt) return _cache.slots;

  const cfg = getConsultationConfig();
  if (!cfg.token || !cfg.eventTypeUri) {
    throw new Error("Calendly is not configured (CALENDLY_ACCESS_TOKEN / CALENDLY_PAID_CONSULT_EVENT_TYPE_URI).");
  }

  const windows = buildAvailabilityWindows(now, horizonDays);
  const results = await Promise.all(
    windows.map(([s, e]) =>
      fetchWindow(cfg, s, e).catch((err) => {
        console.error("[calendly] availability window failed", s, "→", e, err?.message || err);
        return null;
      }),
    ),
  );
  const ok = results.filter(Boolean);
  if (ok.length === 0) {
    throw new Error("Calendly availability request failed for every window.");
  }

  const slots = parseAvailableTimes(ok);
  _cache = { expiresAt: now.getTime() + CACHE_TTL_MS, slots };
  return slots;
}
