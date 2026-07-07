/**
 * Consultation slot utilities — pure, testable helpers (I-025-v2).
 *
 * Availability itself now comes from Calendly (see ./calendly.ts). What remains
 * here is small and provider-agnostic:
 *   - filterAvailable  — subtract our own live holds (overlap-aware) from a slot list
 *   - tzOffsetMs / gmtLabelForTz — server-side GMT-offset label for the studio
 *     timezone (used by the receipt email; the browser computes its own for the UI)
 *
 * All slot timestamps are UTC ISO strings (`...Z`).
 */

/** A busy/held interval, UTC. */
export interface Interval {
  start: string | Date;
  end: string | Date;
}

function toMs(v: string | Date): number {
  return v instanceof Date ? v.getTime() : Date.parse(v);
}

/** Do [aStart,aEnd) and [bStart,bEnd) intersect? */
function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Filter candidate slots to those that DON'T overlap any busy interval or any
 * held interval. `heldStarts` are live-hold slot starts (each occupies
 * [start, start+duration)). A held 09:00 therefore also removes an overlapping
 * 09:30 candidate. Returns UTC ISO strings, sorted ascending.
 */
export function filterAvailable(
  candidates: string[],
  busy: Interval[],
  heldStarts: (string | Date)[],
  durationMinutes: number,
): string[] {
  const durationMs = durationMinutes * 60_000;
  const busyMs = busy
    .map((b) => ({ start: toMs(b.start), end: toMs(b.end) }))
    .filter((b) => Number.isFinite(b.start) && Number.isFinite(b.end) && b.end > b.start);
  const heldMs = heldStarts
    .map((h) => toMs(h))
    .filter((n) => Number.isFinite(n))
    .map((s) => ({ start: s, end: s + durationMs }));

  const available = candidates.filter((iso) => {
    const s = Date.parse(iso);
    const e = s + durationMs;
    for (const b of busyMs) if (overlaps(s, e, b.start, b.end)) return false;
    for (const h of heldMs) if (overlaps(s, e, h.start, h.end)) return false;
    return true;
  });
  return available.sort((a, b) => Date.parse(a) - Date.parse(b));
}

/**
 * Offset (minutes) to ADD to a UTC instant to get the wall-clock time in
 * `timeZone` at that instant. Probed via Intl so it's correct for any IANA zone
 * (fixed +240 for Asia/Yerevan; DST-aware elsewhere).
 */
export function tzOffsetMs(timeZone: string, instant: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const map: Record<string, string> = {};
  for (const p of dtf.formatToParts(instant)) map[p.type] = p.value;
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second),
  );
  return asUtc - instant.getTime();
}

/** "GMT+4" / "GMT-3:30" for `timeZone` at `instant` — no city name. */
export function gmtLabelForTz(timeZone: string, instant: Date): string {
  const mins = Math.round(tzOffsetMs(timeZone, instant) / 60000);
  return formatGmtOffset(mins);
}

/** Format an offset in minutes as a GMT label ("GMT+4", "GMT-3:30", "GMT+0"). */
export function formatGmtOffset(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `GMT${sign}${h}${m ? ":" + String(m).padStart(2, "0") : ""}`;
}
