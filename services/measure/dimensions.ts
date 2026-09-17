/**
 * What the measuring step hands to the rest of the pipeline.
 *
 * One shape, used by the browser that collects the taps, the endpoint that
 * receives them and the prompt that spends them. Every number is millimetres —
 * the unit the geometry works in — and every number carries the error band of
 * the photo it came from, because a measurement without its band invites being
 * trusted to the millimetre.
 *
 * This is the "warm" edge of the card pipeline in miniature: measured once,
 * carried forward, never re-derived.
 */

export interface RoomDimension {
  /** What was measured, in the words the person was asked for it. */
  label: string;
  mm: number;
}

export interface RoomDimensions {
  items: RoomDimension[];
  /** Expected error as a percentage, from the calibration that produced these. */
  bandPct: number;
  /** The object whose known size made the photo measurable. */
  ruler?: string;
}

/** Metres to two decimals — millimetres are false precision at room scale. */
export const metresOf = (mm: number): string => `${(mm / 1000).toFixed(2)} m`;

/** "ceiling height 2.80 m · wall width 4.10 m" */
export function describeDimensions(d: RoomDimensions): string {
  return d.items.map((i) => `${i.label.toLowerCase()} ${metresOf(i.mm)}`).join(" · ");
}

/**
 * Accept dimensions off the wire, or refuse them.
 *
 * Nothing downstream may be told a size that was not measured, so anything
 * malformed becomes null rather than a partial object: no label without a
 * number, no number that is not a plausible room distance (1 cm to 50 m).
 */
export function parseDimensions(raw: unknown): RoomDimensions | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { items?: unknown; bandPct?: unknown; ruler?: unknown };
  if (!Array.isArray(r.items)) return null;

  const items: RoomDimension[] = [];
  for (const entry of r.items.slice(0, 12)) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as { label?: unknown; mm?: unknown };
    const label = String(e.label ?? "").trim().slice(0, 40);
    const mm = Number(e.mm);
    if (!label || !Number.isFinite(mm) || mm < 10 || mm > 50_000) continue;
    items.push({ label, mm });
  }
  if (!items.length) return null;

  const band = Number(r.bandPct);
  return {
    items,
    bandPct: Number.isFinite(band) && band >= 0 && band <= 100 ? Math.round(band) : 20,
    ruler: typeof r.ruler === "string" && r.ruler.trim() ? r.ruler.trim().slice(0, 40) : undefined,
  };
}
