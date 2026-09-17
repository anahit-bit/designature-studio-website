/**
 * The arithmetic behind the tap control.
 *
 * Four taps on a rectangle whose real size is known determine that wall's
 * homography, and every distance on that wall follows. The test set put this at
 * 1–5% on angled walls, with the error dominated by where the corners land —
 * which is why the pins are draggable and why we warn when the rectangle is
 * small in frame.
 *
 * No model is involved anywhere in this file. The person places the points.
 */

import {
  applyH,
  cross,
  dot,
  homographyFromQuad,
  type ImageSize,
  type Mat3,
  type Pt,
} from "../../services/measure/projective.js";

/** Things people can tap that already have a known size — no typing needed. */
export interface TapTarget {
  id: string;
  label: string;
  widthMm: number;
  heightMm: number;
  /** Shown under the option so the choice is checkable. */
  note: string;
}

export const TAP_TARGETS: readonly TapTarget[] = [
  {
    id: "door-eu",
    label: "Interior door",
    widthMm: 800,
    heightMm: 2000,
    note: "European standard leaf, 80 × 200 cm",
  },
  {
    id: "door-us",
    label: "Interior door (US)",
    widthMm: 813,
    heightMm: 2032,
    note: "32 × 80 in — the common US bedroom door",
  },
  {
    id: "door-us-30",
    label: "Interior door, narrow (US)",
    widthMm: 762,
    heightMm: 2032,
    note: "30 × 80 in — bathrooms and closets",
  },
  {
    id: "door-ext-us",
    label: "Front or back door (US)",
    widthMm: 914,
    heightMm: 2032,
    note: "36 × 80 in — exterior doors are wider",
  },
  {
    id: "ceiling-tile",
    label: "Ceiling tile",
    widthMm: 600,
    heightMm: 600,
    note: "600 × 600 mm suspended grid",
  },
  {
    id: "a4",
    label: "A4 sheet of paper",
    widthMm: 297,
    heightMm: 210,
    note: "Tape one to the wall if nothing else is standard",
  },
];

export interface Calibration {
  /** True when the two sides were matched to the trace the other way round. */
  swapped: boolean;
  /** Distance in millimetres between two points on the calibrated wall. */
  measure(a: Pt, b: Pt): number | null;
  /** Fraction of the frame's diagonal the calibration rectangle covers. */
  coverage: number;
  /**
   * Expected error, as a fraction. Grows as the rectangle shrinks in frame,
   * because every point you place is extrapolated outward from it.
   */
  band: number;
  /** Plain-language problems the person can act on. Empty when it is fine. */
  warnings: string[];
}

/** The reason a calibration could not be built at all. */
export type CalibrationError =
  | "need-four-points"
  | "degenerate"
  | "too-small"
  | "bad-size"
  | "cut-off";

/** How close to the photo's border a corner may sit before it counts as cut off. */
const EDGE = 0.005;

/**
 * Put four taps into going-round order, starting from the first tap.
 *
 * People were told to tap "top-left, top-right…" — words that mean nothing on a
 * table top or a floor tile lying flat. A rectangle in perspective is always
 * convex, so sorting the taps by angle around their centre recovers the order
 * whatever order they came in.
 */
export function orderCorners(quad: readonly Pt[], size: ImageSize): Pt[] {
  if (quad.length !== 4) return [...quad];
  const at = quad.map((p) => [p[0] * size.w, p[1] * size.h] as const);
  const cx = at.reduce((t, p) => t + p[0], 0) / 4;
  const cy = at.reduce((t, p) => t + p[1], 0) / 4;
  const angle = (i: number) => Math.atan2(at[i][1] - cy, at[i][0] - cx);
  const round = [0, 1, 2, 3].sort((a, b) => angle(a) - angle(b));
  const start = round.indexOf(0);
  return [...round.slice(start), ...round.slice(0, start)].map((i) => quad[i]);
}

/**
 * A 26 mm-equivalent phone main camera, as a fraction of the frame diagonal
 * (26 / 43.3). Only used when the traced shape cannot tell us the focal length.
 */
const PHONE_FOCAL = 0.6;

type V3 = [number, number, number];

/**
 * The real proportions — corner 1→2 side over corner 1→4 side — of a rectangle
 * traced in perspective.
 *
 * Zhang & He's whiteboard rectification: with square pixels and the principal
 * point at the centre, a rectangle whose two edge pairs both converge fixes the
 * focal length, and the focal length fixes the proportions. When one pair runs
 * parallel in the picture (a table photographed square-on) the focal length
 * cannot be recovered and a typical phone camera stands in for it. That is
 * plenty for deciding which way round the sides go; the measurement itself comes
 * from the homography, which needs no focal length at all.
 */
export function tracedAspect(quad: readonly Pt[], size: ImageSize): number | null {
  if (quad.length !== 4) return null;
  const c = (p: Pt): V3 => [p[0] * size.w - size.w / 2, p[1] * size.h - size.h / 2, 1];
  // Zhang & He name the corners m1 (0,0), m2 (w,0), m3 (0,h), m4 (w,h).
  const m1 = c(quad[0]);
  const m2 = c(quad[1]);
  const m4 = c(quad[2]);
  const m3 = c(quad[3]);
  const k2 = dot(cross(m1, m4), m3) / dot(cross(m2, m4), m3);
  const k3 = dot(cross(m1, m4), m2) / dot(cross(m3, m4), m2);
  const n2 = m2.map((v, i) => k2 * v - m1[i]);
  const n3 = m3.map((v, i) => k3 * v - m1[i]);
  const diag = Math.hypot(size.w, size.h);
  let f2 = -(n2[0] * n3[0] + n2[1] * n3[1]) / (n2[2] * n3[2]);
  // Outside a real lens's range the edges did not converge enough to say.
  if (!(f2 > (0.25 * diag) ** 2 && f2 < (2.5 * diag) ** 2)) f2 = (PHONE_FOCAL * diag) ** 2;
  const a2 =
    (n2[0] ** 2 + n2[1] ** 2 + f2 * n2[2] ** 2) / (n3[0] ** 2 + n3[1] ** 2 + f2 * n3[2] ** 2);
  return a2 > 0 && Number.isFinite(a2) ? Math.sqrt(a2) : null;
}

export function buildCalibration(
  quad: readonly Pt[],
  widthMm: number,
  heightMm: number,
  size: ImageSize,
): Calibration | CalibrationError {
  if (quad.length !== 4) return "need-four-points";
  if (!(widthMm > 0) || !(heightMm > 0)) return "bad-size";
  // A corner on the photo's border is where the shape ran out of the picture,
  // not where it ends. The owner's bar table was cut by the frame, and the only
  // "corner" left to tap was the edge of the photo.
  const onEdge = (p: Pt) => p[0] <= EDGE || p[0] >= 1 - EDGE || p[1] <= EDGE || p[1] >= 1 - EDGE;
  if (quad.some(onEdge)) return "cut-off";
  const corners = orderCorners(quad, size);

  // Which typed number belongs to which traced edge must NOT depend on the order
  // they were typed. The homography pins the first number to the edge from
  // corner 1 to corner 2 — so 400 × 1200 typed for a table top, traced starting
  // along its 1200 side, made a 1.2 m edge read as 40 cm and the shape look
  // "edge-on". Comparing traced proportions is not enough: a table top running
  // away from the camera is foreshortened until 1200 × 400 looks square. So match
  // the typed sides to the rectangle's real proportions, recovered from its
  // perspective.
  const px = corners.map((p) => [p[0] * size.w, p[1] * size.h] as const);
  const e1 = Math.hypot(px[0][0] - px[1][0], px[0][1] - px[1][1]);
  const e2 = Math.hypot(px[1][0] - px[2][0], px[1][1] - px[2][1]);
  const seenAspect = e1 / (e2 || 1);
  const aspect = tracedAspect(corners, size) ?? seenAspect;
  const typed = widthMm / heightMm;
  const swapped = Math.abs(Math.log(aspect * typed)) < Math.abs(Math.log(aspect / typed));
  const [sideA, sideB] = swapped ? [heightMm, widthMm] : [widthMm, heightMm];
  const squash = seenAspect / (sideA / sideB);

  const rect: [number, number][] = [
    [0, 0],
    [sideA, 0],
    [sideA, sideB],
    [0, sideB],
  ];
  const H: Mat3 | null = homographyFromQuad(corners, rect, size);
  if (!H) return "degenerate";

  // How big the rectangle is in the picture, against the frame's own diagonal.
  let longest = 0;
  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      longest = Math.max(longest, Math.hypot(px[i][0] - px[j][0], px[i][1] - px[j][1]));
    }
  }
  const coverage = longest / Math.hypot(size.w, size.h);
  if (coverage < 0.05) return "too-small";

  const warnings: string[] = [];
  if (coverage < 0.2) {
    warnings.push(
      "Your ruler is small in this photo, so the numbers can drift. Trace something bigger if you can.",
    );
  }
  // A rectangle seen almost edge-on carries almost no information across its
  // short axis, so the homography is ill-conditioned even though it solves.
  if (squash < 0.25 || squash > 4) {
    warnings.push(
      "Your ruler is almost edge-on to the camera. Trace something facing you instead.",
    );
  }

  // 4% is the geometry floor measured on the bench; the rest is extrapolation.
  const band = 0.04 + Math.min(0.4, 0.02 / Math.max(coverage, 0.05));

  return {
    swapped,
    measure(a: Pt, b: Pt) {
      const pa = applyH(H, a, size);
      const pb = applyH(H, b, size);
      if (!pa || !pb) return null;
      const mm = Math.hypot(pa[0] - pb[0], pa[1] - pb[1]);
      return Number.isFinite(mm) ? mm : null;
    },
    coverage,
    band,
    warnings,
  };
}

export const isCalibration = (v: Calibration | CalibrationError): v is Calibration =>
  typeof v !== "string";

/** Metres to two decimals, or a dash. */
export const metres = (mm: number | null): string =>
  mm === null || !Number.isFinite(mm) ? "—" : `${(mm / 1000).toFixed(2)} m`;

/** Reads better than metres for anything under a metre. */
export function humanLength(mm: number | null): string {
  if (mm === null || !Number.isFinite(mm)) return "—";
  if (mm < 1000) return `${Math.round(mm)} mm`;
  return `${(mm / 1000).toFixed(2)} m`;
}

export const CALIBRATION_MESSAGE: Record<CalibrationError, string> = {
  "need-four-points": "Place all four corners first.",
  degenerate: "Those four corners lie on a line. Put one on each corner of the shape.",
  "too-small": "That shape is too small in the picture to measure anything from.",
  "bad-size": "Give both a width and a height, in millimetres.",
  "cut-off":
    "A corner sits on the edge of the photo, so this shape runs out of the picture. Trace something fully in view — a floor tile usually is.",
};
