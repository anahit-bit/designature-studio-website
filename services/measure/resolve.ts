/**
 * The measurement ladder. Takes a `RoomObservation` (points) and returns metres.
 *
 * Rules carried over from `readPlan.ts`, learned the hard way there:
 *  - a number the USER states outranks anything we derive;
 *  - `null` is a real answer — refuse rather than invent (floorplan R39-R42);
 *  - two independent rungs that disagree mean ASK, never average.
 *
 * And one learned here: A PHOTOGRAPH DOES NOT CONTAIN THE ROOM. The camera
 * stands where the fourth wall would be, so the visible floor is a U, not a
 * rectangle. The defensible primary output is therefore the WALL RUN — which is
 * also exactly what a fit check needs. A room extent is only claimed when the
 * boundary actually turns far enough to bound one.
 */

import {
  cameraHeightMm,
  distMm,
  extentMm,
  floorCamera,
  focalFromOrthogonalVps,
  homographyFromQuad,
  horizonFrom,
  applyH,
  pointOnFloorMm,
  vanishingPoint,
  verticalHeightMm,
  type ImageSize,
  type Mat3,
  type Pt,
} from "./projective.js";
import { relativeBand, standardById, type Standard } from "./standards.js";
import type {
  BoundaryKind,
  ObservedRuler,
  RoomMeasurement,
  RoomObservation,
  RungResult,
} from "./types.js";

/** Rooms outside this range are not rooms; a rung that lands here is wrong. */
const PLAN_MIN_MM = 900;
const PLAN_MAX_MM = 25_000;
const CEIL_MIN_MM = 1900;
const CEIL_MAX_MM = 6000;
/** A wall run shorter than this is a jog or a reveal, not a wall worth reporting. */
const RUN_MIN_MM = 300;

/**
 * Geometry noise floor. The model's point-picking, not the ruler, dominates the
 * error — a tile quad picked 3 px off on a 1000 px image is already ~1%, and it
 * compounds when the ruler is small relative to the room.
 */
const GEOMETRY_BAND = 0.04;
/** Above this relative spread, independent rungs are contradicting each other. */
export const DISAGREEMENT_LIMIT = 0.05;
/** Above this band we will not stand behind the number without the visitor. */
export const CONFIRM_LIMIT = 0.06;
/**
 * Total turning of the floor boundary, in degrees, below which it has not
 * wrapped around a room. One flat wall turns ~0; an L turns ~90; the U you get
 * from a normal room photo turns ~180.
 */
const WRAP_TURN_DEG = 110;

const plausiblePlan = (mm: number | null): boolean =>
  mm !== null && Number.isFinite(mm) && mm >= PLAN_MIN_MM && mm <= PLAN_MAX_MM;
const plausibleCeiling = (mm: number | null): boolean =>
  mm !== null && Number.isFinite(mm) && mm >= CEIL_MIN_MM && mm <= CEIL_MAX_MM;

interface Prepared {
  ruler: ObservedRuler;
  std: Standard;
}

function prepare(obs: RoomObservation): Prepared[] {
  return obs.rulers
    .map((r) => ({ ruler: r, std: standardById(r.standardId) }))
    .filter((x): x is Prepared => !!x.std)
    .sort((a, b) => relativeBand(a.std) - relativeBand(b.std));
}

/** The plane rectangle a planar ruler stands for, in millimetres. */
function planeRect(
  std: Standard,
  longFirst: boolean,
  cols = 1,
  rows = 1,
): { rect: [number, number][]; diagonalMm: number } {
  const L = std.nominalMm;
  const W = std.nominalMm2 ?? std.nominalMm;
  const [mA, mB] = longFirst ? [L, W] : [W, L];
  const a = mA * cols;
  const b = mB * rows;
  return {
    rect: [
      [0, 0],
      [a, 0],
      [a, b],
      [0, b],
    ],
    diagonalMm: Math.hypot(a, b),
  };
}

/**
 * Extra uncertainty from EXTRAPOLATION — the term that was missing and that let
 * a 600 mm tile in one corner claim a 22 m room, and a 100 mm skirting board
 * claim a ceiling height.
 *
 * Every rung knows a thing of size `rulerMm` and reports a thing of size
 * `targetMm`. Point error in the ruler is multiplied by that ratio, so the band
 * has to grow with it. A tile block spanning the floor is barely penalised; a
 * tile in the corner of a big room is penalised heavily, which is correct.
 */
function extrapolationBand(targetMm: number | null, rulerMm: number): number {
  if (!targetMm || !Number.isFinite(targetMm) || rulerMm <= 0) return 0;
  return Math.min(0.5, 0.012 * (targetMm / rulerMm));
}

/** The largest thing a rung claims, which is what the extrapolation is measured against. */
const claimScale = (r: { lengthMm: number | null; wallRunsMm: number[] }): number | null => {
  const candidates = [r.lengthMm ?? 0, ...r.wallRunsMm].filter((x) => x > 0);
  return candidates.length ? Math.max(...candidates) : null;
};

type MetricPt = [number, number];

/**
 * Lengths of the straight runs between consecutive boundary points — but ONLY
 * where BOTH ends are real corners.
 *
 * This is the rule that stops the tool measuring a wall that runs off the edge
 * of the photograph. A run ending at the frame has no length: nobody can see
 * where it stops, so neither our geometry nor the visitor's tape can close it.
 * Reporting such a run is how a 17 m living room gets printed.
 */
function runsFrom(points: readonly MetricPt[], kinds: readonly BoundaryKind[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < points.length; i++) {
    if (kinds[i - 1] !== "corner" || kinds[i] !== "corner") continue;
    const d = distMm(points[i - 1], points[i]);
    if (Number.isFinite(d) && d >= RUN_MIN_MM && d <= PLAN_MAX_MM) out.push(d);
  }
  return out;
}

/** Total absolute turning along a polyline, in degrees. */
function turnDeg(points: readonly MetricPt[]): number {
  let total = 0;
  for (let i = 2; i < points.length; i++) {
    const [ax, ay] = [points[i - 1][0] - points[i - 2][0], points[i - 1][1] - points[i - 2][1]];
    const [bx, by] = [points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]];
    const na = Math.hypot(ax, ay);
    const nb = Math.hypot(bx, by);
    if (na < 1e-6 || nb < 1e-6) continue;
    const c = Math.min(1, Math.max(-1, (ax * bx + ay * by) / (na * nb)));
    total += (Math.acos(c) * 180) / Math.PI;
  }
  return total;
}

/** Everything a rung reports about a mapped boundary. */
function fromMapped(
  mapped: MetricPt[],
  kinds: readonly BoundaryKind[],
): {
  lengthMm: number | null;
  widthMm: number | null;
  wallRunsMm: number[];
  extentPartial: boolean;
} | null {
  if (mapped.length < 2) return null;
  const wallRunsMm = runsFrom(mapped, kinds);
  const ext = mapped.length >= 3 ? extentMm(mapped) : null;
  const extentPartial = turnDeg(mapped) < WRAP_TURN_DEG;
  const closedEnds = kinds[0] === "corner" && kinds[kinds.length - 1] === "corner";
  const ok = closedEnds && ext && plausiblePlan(ext.aMm) && plausiblePlan(ext.bMm);
  return {
    lengthMm: ok ? ext!.aMm : null,
    widthMm: ok ? ext!.bMm : null,
    wallRunsMm,
    extentPartial,
  };
}

const emptyRung = (
  method: RungResult["method"],
  label: string,
  via: string,
  failed: string,
): RungResult => ({
  method, label, via,
  widthMm: null, lengthMm: null, ceilingMm: null,
  wallRunsMm: [], extentPartial: true, band: 1, failed,
});

/** Homography rung: one known rectangle makes its whole plane metric. */
function rungHomography(
  obs: RoomObservation,
  prepared: Prepared[],
  size: ImageSize,
  plane: "floor" | "ceiling",
): RungResult | null {
  const boundary = plane === "floor" ? obs.floorBoundary : obs.ceilingBoundary;
  const candidate = prepared.find(
    (p) => p.std.kind === "planar" && p.ruler.quad && (p.ruler.plane ?? "floor") === plane,
  );
  const method = plane === "floor" ? "H-FLOOR" : "H-CEIL";
  const label = plane === "floor" ? "Floor-plane grid" : "Ceiling-plane grid";
  if (!candidate) return null;
  const via = candidate.std.label;
  if (boundary.length < 2) {
    return emptyRung(method, label, via, `${plane} boundary has ${boundary.length} point(s)`);
  }

  const { rect, diagonalMm } = planeRect(
    candidate.std,
    candidate.ruler.longEdgeFirst !== false,
    candidate.ruler.cols ?? 1,
    candidate.ruler.rows ?? 1,
  );
  const H: Mat3 | null = homographyFromQuad(candidate.ruler.quad!, rect, size);
  if (!H) {
    return emptyRung(method, label, via, "the quad is degenerate — its corners are collinear");
  }

  const kinds =
    plane === "floor"
      ? (obs.boundaryKinds ?? [])
      : // The ceiling boundary is not labelled; walls are vertical, so a floor
        // corner is a ceiling corner. Reuse the labels when the counts line up.
        (obs.boundaryKinds ?? []).length === boundary.length
        ? obs.boundaryKinds!
        : boundary.map(() => "frame" as BoundaryKind);
  const mapped: MetricPt[] = [];
  for (const p of boundary) {
    const q = applyH(H, p, size);
    if (q) mapped.push(q);
  }
  const r = fromMapped(mapped, kinds);
  if (!r || (!r.lengthMm && r.wallRunsMm.length === 0)) {
    return emptyRung(method, label, via, "no run has two visible corners, and no room-sized extent");
  }
  return {
    method, label, via,
    lengthMm: r.lengthMm, widthMm: r.widthMm, ceilingMm: null,
    wallRunsMm: r.wallRunsMm, extentPartial: r.extentPartial,
    band:
      relativeBand(candidate.std) +
      GEOMETRY_BAND +
      extrapolationBand(claimScale(r), diagonalMm),
  };
}

interface Frame {
  horizon: ReturnType<typeof horizonFrom>;
  vz: NonNullable<ReturnType<typeof vanishingPoint>>;
  vDepth: NonNullable<ReturnType<typeof vanishingPoint>>;
  vWidth: NonNullable<ReturnType<typeof vanishingPoint>>;
}

/** Vanishing points and the horizon, when the frame supports them. */
function buildFrame(obs: RoomObservation, size: ImageSize): Frame | null {
  const vDepth = vanishingPoint(obs.depthLines, size);
  const vWidth = vanishingPoint(obs.widthLines, size);
  const vz = vanishingPoint(obs.verticalLines, size);
  if (!vDepth || !vWidth || !vz) return null;
  return { horizon: horizonFrom(vDepth, vWidth), vz, vDepth, vWidth };
}

/** A vertical of known height, needed to fix the scale of everything else. */
function verticalReference(prepared: Prepared[]): Prepared | null {
  return prepared.find((p) => p.std.kind === "vertical" && p.ruler.vertical) ?? null;
}

/**
 * Calibrated rung: two orthogonal horizontal vanishing points give the focal
 * length, one known vertical gives the camera height, and together they make the
 * floor metric with no rectangle needed anywhere.
 */
function rungCalibrated(
  obs: RoomObservation,
  prepared: Prepared[],
  size: ImageSize,
  frame: Frame | null,
): RungResult | null {
  const ref = verticalReference(prepared);
  if (!ref) return null;
  const via = ref.std.label;
  const M = "C-VP" as const;
  const L = "Calibrated camera";
  if (!frame) {
    return emptyRung(M, L, via, "needs two orthogonal horizontal directions and a vertical");
  }
  const focal = focalFromOrthogonalVps(frame.vDepth, frame.vWidth, size);
  if (focal === null) {
    return emptyRung(M, L, via, "those two horizontal vanishing points cannot be orthogonal");
  }
  const camH = cameraHeightMm(ref.ruler.vertical!, ref.std.nominalMm, frame.horizon, frame.vz, size);
  if (camH === null || camH < 500 || camH > 2500) {
    return emptyRung(
      M, L, via,
      camH === null ? "camera height did not resolve" : `camera height came out ${Math.round(camH)} mm`,
    );
  }
  const cam = floorCamera(focal, frame.vz, camH, size);
  if (!cam || obs.floorBoundary.length < 2) {
    return emptyRung(M, L, via, "no usable floor boundary to back-project");
  }
  const mapped: MetricPt[] = [];
  for (const p of obs.floorBoundary) {
    const q = pointOnFloorMm(cam, p);
    if (q) mapped.push(q);
  }
  const r = fromMapped(mapped, obs.boundaryKinds ?? []);
  if (!r || (!r.lengthMm && r.wallRunsMm.length === 0)) {
    return emptyRung(M, L, via, "no run has two visible corners after back-projection");
  }
  return {
    method: M, label: L, via,
    lengthMm: r.lengthMm, widthMm: r.widthMm, ceilingMm: null,
    wallRunsMm: r.wallRunsMm, extentPartial: r.extentPartial,
    // Calibration compounds three estimates, so it is banded wider than a grid.
    band:
      relativeBand(ref.std) +
      GEOMETRY_BAND * 2 +
      extrapolationBand(claimScale(r), ref.std.nominalMm),
  };
}

/**
 * Vertical rung: ceiling height only, and ONLY from a corner the model explicitly
 * called a floor-to-ceiling corner. Taking "the longest vertical line in frame"
 * measures a door jamb and reports it as the ceiling.
 */
function rungVertical(
  obs: RoomObservation,
  prepared: Prepared[],
  size: ImageSize,
  frame: Frame | null,
): RungResult | null {
  const ref = verticalReference(prepared);
  if (!ref || !frame || !obs.ceilingCorner) return null;
  const via = ref.std.label;
  const M = "VERT" as const;
  const L = "Wall corner against a known height";
  const h = verticalHeightMm(
    obs.ceilingCorner,
    ref.ruler.vertical!,
    ref.std.nominalMm,
    frame.horizon,
    frame.vz,
    size,
  );
  if (h === null || !plausibleCeiling(h)) {
    return emptyRung(
      M, L, via,
      h === null ? "the cross-ratio degenerated" : `gave ${Math.round(h)} mm, not a ceiling`,
    );
  }
  return {
    method: M, label: L, via,
    widthMm: null, lengthMm: null, ceilingMm: h,
    wallRunsMm: [], extentPartial: true,
    band: relativeBand(ref.std) + GEOMETRY_BAND + extrapolationBand(h, ref.std.nominalMm),
  };
}

/** Relative spread of a set of readings of the same quantity. */
function spread(values: number[]): number | null {
  const v = values.filter((x) => Number.isFinite(x) && x > 0);
  if (v.length < 2) return null;
  const lo = Math.min(...v);
  const hi = Math.max(...v);
  return (hi - lo) / ((hi + lo) / 2);
}

/** True when no wall in frame has two visible ends. */
export function wallsAreCut(obs: RoomObservation): boolean {
  // A cache entry written before boundary labels existed has none; treat that as
  // "cut", the conservative reading, rather than silently measuring on old rules.
  const k = obs.boundaryKinds ?? [];
  for (let i = 1; i < k.length; i++) if (k[i - 1] === "corner" && k[i] === "corner") return false;
  return true;
}

/**
 * The tap we would ask the visitor for — and `null` when asking would be
 * dishonest. A wall whose end is outside the photograph cannot be tapped, so
 * offering the tap there is a dead end dressed up as a fix.
 */
function tapPrompt(obs: RoomObservation): string | null {
  if (!obs.floorVisible || obs.floorBoundary.length < 2) return null;
  if (wallsAreCut(obs)) return null;
  return "Tap the two ends of one wall where it meets the floor, then type how long it is.";
}

export function resolveMeasurement(obs: RoomObservation, size: ImageSize): RoomMeasurement {
  const modelEstimate = obs.modelEstimate;
  const empty = (refusal: string): RoomMeasurement => ({
    refusal,
    rungs: [],
    best: null,
    longestRunMm: null,
    wallsCut: true,
    ceilingMm: null,
    disagreement: null,
    confirm: { required: false, reason: refusal, tapPrompt: null },
    modelEstimate,
  });

  if (obs.imageKind === "not_a_room") return empty("Not a room — nothing here to measure.");
  if (obs.imageKind === "ai_generated")
    return empty(
      "AI-generated image. It has no real dimensions to recover, so any number would be invented.",
    );
  if (obs.imageKind === "3d_render")
    return empty(
      "A 3D render, not a photograph. Its geometry is the designer's, not a room's — ask for the model instead.",
    );

  const prepared = prepare(obs);
  const frame = buildFrame(obs, size);

  const rungs: RungResult[] = [];
  for (const r of [
    rungHomography(obs, prepared, size, "ceiling"),
    rungHomography(obs, prepared, size, "floor"),
    rungCalibrated(obs, prepared, size, frame),
    rungVertical(obs, prepared, size, frame),
  ]) {
    if (r) rungs.push(r);
  }

  const good = rungs.filter((r) => !r.failed).sort((a, b) => a.band - b.band);
  // A room extent is only claimed from a boundary that actually wrapped one.
  const withPlan = good.filter(
    (r) => !r.extentPartial && plausiblePlan(r.lengthMm) && plausiblePlan(r.widthMm),
  );
  const withCeiling = good.filter((r) => plausibleCeiling(r.ceilingMm));
  const withRuns = good.filter((r) => r.wallRunsMm.length > 0);

  const best = withPlan[0] ?? null;
  const ceilingMm = withCeiling[0]?.ceilingMm ?? null;
  const longestRunMm = withRuns.length ? Math.max(...withRuns[0].wallRunsMm) : null;

  const disagreement =
    spread(withPlan.map((r) => r.lengthMm as number)) ??
    spread(withRuns.map((r) => Math.max(...r.wallRunsMm))) ??
    spread(withCeiling.map((r) => r.ceilingMm as number));

  const cut = wallsAreCut(obs);
  const anchor = best ?? withRuns[0] ?? withCeiling[0] ?? null;
  let required = true;
  let reason: string;
  if (cut && !best) {
    reason =
      "Every wall in this photo runs off the edge of the frame, so no wall has two " +
      "measurable ends. Nothing here can be measured — not by us, and not by tapping.";
  } else if (!anchor) {
    reason =
      prepared.length === 0
        ? "No object of known size was found in this frame."
        : "A ruler was found but the geometry did not resolve.";
  } else if (disagreement !== null && disagreement > DISAGREEMENT_LIMIT) {
    reason = `Two independent rulers disagree by ${Math.round(disagreement * 100)}% — we will not pick one for you.`;
  } else if (!best) {
    reason =
      "Only part of the room is in frame, so the walls are measured but the room is not. Confirm one length.";
  } else if (anchor.band > CONFIRM_LIMIT) {
    reason = `Measured to about ±${Math.round(anchor.band * 100)}%, wider than we will stand behind for a fit check.`;
  } else {
    required = false;
    reason = `Measured off the ${anchor.via.toLowerCase()} to about ±${Math.round(anchor.band * 100)}%.`;
  }

  return {
    refusal: null,
    rungs,
    best,
    longestRunMm,
    wallsCut: cut,
    ceilingMm,
    disagreement,
    confirm: { required, reason, tapPrompt: tapPrompt(obs) },
    modelEstimate,
  };
}

/** Metres, to two decimals, for display. Null stays null. */
export const asMetres = (mm: number | null): string | null =>
  mm === null || !Number.isFinite(mm) ? null : (mm / 1000).toFixed(2);

export { distMm };
