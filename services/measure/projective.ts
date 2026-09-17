/**
 * Single-view metrology — the arithmetic half of room measurement.
 *
 * Nothing in this file talks to a model. A vision pass supplies POINTS (which
 * it is good at); every number is computed here (which a model is bad at). That
 * split is the same one `services/floorplan/readPlan.ts` makes for plans, and it
 * exists for the same reason: Gemini's perception is excellent and its pixel
 * arithmetic is not.
 *
 * Coordinates: callers pass NORMALISED points (0..1, top-left origin). Everything
 * internal works in pixel-like coordinates so the principal point sits at the
 * image centre and the aspect ratio is honoured — a homography computed in
 * normalised space on a 4:3 photo is a homography of a squashed world.
 *
 * Reference for the vertical measurement: Criminisi, Reid & Zisserman,
 * "Single View Metrology" (IJCV 2000).
 */

/** Homogeneous 2D point / line. */
export type Vec3 = readonly [number, number, number];
/** Normalised image point, 0..1, top-left origin. */
export type Pt = readonly [number, number];

export interface ImageSize {
  w: number;
  h: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Vector primitives
// ─────────────────────────────────────────────────────────────────────────────

export const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

export const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export const norm2 = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);

/** Length of the (x, y) part only — what the Criminisi ratio needs. */
export const normXY = (a: Vec3): number => Math.hypot(a[0], a[1]);

/** Scale a homogeneous point so w = 1. Returns null for a point at infinity. */
export function dehomog(p: Vec3): [number, number] | null {
  if (!Number.isFinite(p[2]) || Math.abs(p[2]) < 1e-12) return null;
  return [p[0] / p[2], p[1] / p[2]];
}

/** Normalise a homogeneous vector to unit length (direction only). */
export function unit(a: Vec3): Vec3 {
  const n = norm2(a);
  if (n < 1e-12) return [0, 0, 0];
  return [a[0] / n, a[1] / n, a[2] / n];
}

/** Convert a normalised point to pixel-like homogeneous coordinates. */
export const toPx = (p: Pt, size: ImageSize): Vec3 => [p[0] * size.w, p[1] * size.h, 1];

/** The line through two points; also the intersection of two lines. */
export const join = cross;

// ─────────────────────────────────────────────────────────────────────────────
// Vanishing points
// ─────────────────────────────────────────────────────────────────────────────

export interface Segment {
  a: Pt;
  b: Pt;
}

/**
 * Least-squares vanishing point of a bundle of image-parallel segments.
 *
 * Each segment contributes its line; the vanishing point is the point closest to
 * every line, found as the smallest right-singular vector of the stacked line
 * matrix. Two segments give the exact intersection; more segments average out
 * the model's point noise, which is the entire reason this takes a bundle.
 *
 * Returns null for fewer than two segments, or when the lines are too nearly
 * identical for their intersection to mean anything.
 */
export function vanishingPoint(segments: readonly Segment[], size: ImageSize): Vec3 | null {
  if (segments.length < 2) return null;
  const lines = segments
    .map((s) => join(toPx(s.a, size), toPx(s.b, size)))
    .filter((l) => normXY(l) > 1e-9)
    .map((l) => unit(l));
  if (lines.length < 2) return null;

  if (lines.length === 2) {
    const angle = Math.abs(lines[0][0] * lines[1][1] - lines[0][1] * lines[1][0]);
    // Only TRUE parallels are refused. A distant vanishing point is normal — a
    // camera with little pitch puts the vertical VP thousands of pixels away and
    // the cross-ratio is still exact there; rejecting it would refuse most photos.
    if (angle < 1e-9) return null;
    return cross(lines[0], lines[1]);
  }

  // Build M = sum(l lᵀ); the eigenvector of the smallest eigenvalue is the VP.
  const M = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (const l of lines) {
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) M[i][j] += l[i] * l[j];
  }
  return smallestEigenvector(M);
}

/** Symmetric 3x3 smallest-eigenvalue eigenvector by inverse power iteration. */
function smallestEigenvector(M: number[][]): Vec3 | null {
  // Shift so the matrix is invertible even when an eigenvalue is ~0.
  const trace = M[0][0] + M[1][1] + M[2][2];
  const eps = Math.max(trace, 1) * 1e-9;
  const A = M.map((row, i) => row.map((v, j) => (i === j ? v + eps : v)));
  const Ainv = invert3x3(A);
  if (!Ainv) return null;
  let v: Vec3 = [1, 1, 1];
  for (let k = 0; k < 200; k++) {
    const next = mul3(Ainv, v);
    const n = norm2(next);
    if (n < 1e-18) return null;
    v = [next[0] / n, next[1] / n, next[2] / n];
  }
  return v;
}

const mul3 = (M: number[][], v: Vec3): Vec3 => [
  M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2],
  M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2],
  M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2],
];

export function invert3x3(m: number[][]): number[][] | null {
  const [a, b, c] = m[0];
  const [d, e, f] = m[1];
  const [g, h, i] = m[2];
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (!Number.isFinite(det) || Math.abs(det) < 1e-14) return null;
  const id = 1 / det;
  return [
    [(e * i - f * h) * id, (c * h - b * i) * id, (b * f - c * e) * id],
    [(f * g - d * i) * id, (a * i - c * g) * id, (c * d - a * f) * id],
    [(d * h - e * g) * id, (b * g - a * h) * id, (a * e - b * d) * id],
  ];
}

/** The horizon (vanishing line of the floor) through two horizontal VPs. */
export const horizonFrom = (vx: Vec3, vy: Vec3): Vec3 => join(vx, vy);

// ─────────────────────────────────────────────────────────────────────────────
// Homography — a known rectangle on a plane makes that whole plane metric
// ─────────────────────────────────────────────────────────────────────────────

export type Mat3 = readonly (readonly number[])[];

/**
 * Homography mapping four image points to four plane points (mm), by DLT.
 *
 * `imageQuad` must be given in the same cyclic order as `planeQuad`. Solves the
 * 8x8 system directly rather than by SVD — with exactly four correspondences the
 * system is square, so this is exact, not a fit.
 */
export function homographyFromQuad(
  imageQuad: readonly Pt[],
  planeQuad: readonly (readonly [number, number])[],
  size: ImageSize,
): Mat3 | null {
  if (imageQuad.length !== 4 || planeQuad.length !== 4) return null;
  const A: number[][] = [];
  const rhs: number[] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = [imageQuad[i][0] * size.w, imageQuad[i][1] * size.h];
    const [X, Y] = planeQuad[i];
    A.push([x, y, 1, 0, 0, 0, -X * x, -X * y]);
    rhs.push(X);
    A.push([0, 0, 0, x, y, 1, -Y * x, -Y * y]);
    rhs.push(Y);
  }
  const h = solveLinear(A, rhs);
  if (!h) return null;
  return [
    [h[0], h[1], h[2]],
    [h[3], h[4], h[5]],
    [h[6], h[7], 1],
  ];
}

/** Gaussian elimination with partial pivoting. Returns null if singular. */
export function solveLinear(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    if (Math.abs(M[piv][col]) < 1e-12) return null;
    [M[col], M[piv]] = [M[piv], M[col]];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col] / M[col][col];
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }
  // After full Gauss-Jordan the matrix is diagonal, so row[i] IS the pivot.
  return M.map((row, i) => row[n] / row[i]);
}

/** Map a normalised image point through a homography to plane mm. */
export function applyH(H: Mat3, p: Pt, size: ImageSize): [number, number] | null {
  const v: Vec3 = [p[0] * size.w, p[1] * size.h, 1];
  const out: Vec3 = [
    H[0][0] * v[0] + H[0][1] * v[1] + H[0][2] * v[2],
    H[1][0] * v[0] + H[1][1] * v[1] + H[1][2] * v[2],
    H[2][0] * v[0] + H[2][1] * v[1] + H[2][2] * v[2],
  ];
  return dehomog(out);
}

// ─────────────────────────────────────────────────────────────────────────────
// Vertical measurement (Criminisi)
// ─────────────────────────────────────────────────────────────────────────────

export interface VerticalRef {
  /** Foot of the vertical, on the floor. */
  base: Pt;
  /** Top of the vertical. */
  top: Pt;
}

/**
 * Height of `target` given a reference vertical of known height, the horizon and
 * the vertical vanishing point. Both verticals must stand on the same plane.
 *
 * Cross-ratio form: for a vertical (b, t),
 *     k = |b x t| / ( (l . b) * |vz x t| )
 * and heights are proportional to k, so the reference cancels the unknown scale.
 *
 * Returns null when any denominator collapses — which is exactly the degenerate
 * case of a camera at the vertical's own height, where the ratio carries no
 * information and a number would be an invention.
 */
export function verticalHeightMm(
  target: VerticalRef,
  reference: VerticalRef,
  referenceHeightMm: number,
  horizon: Vec3,
  vz: Vec3,
  size: ImageSize,
): number | null {
  const k = (v: VerticalRef): number | null => {
    const b = toPx(v.base, size);
    const t = toPx(v.top, size);
    const num = normXY(cross(b, t));
    const den = dot(horizon, b) * normXY(cross(vz, t));
    if (!Number.isFinite(num) || !Number.isFinite(den) || Math.abs(den) < 1e-9) return null;
    return num / den;
  };
  const kt = k(target);
  const kr = k(reference);
  if (kt === null || kr === null || Math.abs(kr) < 1e-12) return null;
  const out = referenceHeightMm * (kt / kr);
  return Number.isFinite(out) && out > 0 ? out : null;
}

/**
 * Camera height above the floor, from one vertical of known height.
 *
 * A point at eye level projects onto the horizon, so the vertical running from
 * the reference's own base up to where its vertical line crosses the horizon has
 * height equal to the camera height.
 */
export function cameraHeightMm(
  reference: VerticalRef,
  referenceHeightMm: number,
  horizon: Vec3,
  vz: Vec3,
  size: ImageSize,
): number | null {
  const b = toPx(reference.base, size);
  const verticalLine = join(b, vz);
  const eye = dehomog(join(verticalLine, horizon));
  if (!eye) return null;
  return verticalHeightMm(
    { base: reference.base, top: [eye[0] / size.w, eye[1] / size.h] },
    reference,
    referenceHeightMm,
    horizon,
    vz,
    size,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Full calibration — two orthogonal horizontal VPs give focal length, and with a
// camera height that makes the whole floor metric without any floor rectangle.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Focal length in pixels from two orthogonal vanishing points, assuming square
 * pixels and the principal point at the image centre.
 *
 * For orthogonal directions, (v1 - p) . (v2 - p) + f^2 = 0. A non-negative dot
 * product means the two VPs cannot be orthogonal under this camera model — the
 * honest answer there is null, not a salvaged number.
 */
/**
 * Focal length from whichever ORTHOGONAL PAIR of vanishing points is usable.
 *
 * A head-on photograph — which is how people shoot a media wall — sends the
 * across-the-view vanishing point to infinity, so the two horizontal directions
 * carry no focal length between them. The depth direction and the vertical are
 * orthogonal too, and in exactly that shot they are the well-conditioned pair.
 * Try all three pairings and take the first that lands in a plausible range for
 * a real camera.
 */
export function focalFromAnyOrthogonalPair(
  vDepth: Vec3 | null,
  vWidth: Vec3 | null,
  vz: Vec3 | null,
  size: ImageSize,
): { focalPx: number; via: string } | null {
  const pairs: [Vec3 | null, Vec3 | null, string][] = [
    [vDepth, vWidth, "the two horizontal directions"],
    [vDepth, vz, "depth against vertical"],
    [vWidth, vz, "width against vertical"],
  ];
  // A real camera's focal length sits within a few times the frame; anything
  // outside that is a vanishing point that did not converge.
  const lo = size.w * 0.3;
  const hi = size.w * 4;
  for (const [a, b, via] of pairs) {
    if (!a || !b) continue;
    const f = focalFromOrthogonalVps(a, b, size);
    if (f !== null && f >= lo && f <= hi) return { focalPx: f, via };
  }
  return null;
}

export function focalFromOrthogonalVps(v1: Vec3, v2: Vec3, size: ImageSize): number | null {
  const a = dehomog(v1);
  const b = dehomog(v2);
  if (!a || !b) return null;
  const px = size.w / 2;
  const py = size.h / 2;
  const d = (a[0] - px) * (b[0] - px) + (a[1] - py) * (b[1] - py);
  if (!(d < 0)) return null;
  return Math.sqrt(-d);
}

export interface FloorCamera {
  focalPx: number;
  cameraHeightMm: number;
  /** Unit vertical direction in camera coordinates, pointing from floor to ceiling. */
  up: readonly [number, number, number];
  size: ImageSize;
}

/**
 * Build the floor-plane back-projector from a focal length, the vertical VP and
 * a camera height.
 */
export function floorCamera(
  focalPx: number,
  vz: Vec3,
  cameraHeight: number,
  size: ImageSize,
): FloorCamera | null {
  const v = dehomog(vz);
  if (!v || !Number.isFinite(focalPx) || focalPx <= 0 || !(cameraHeight > 0)) return null;
  // Direction of the world vertical in camera coordinates.
  let d: Vec3 = [(v[0] - size.w / 2) / focalPx, (v[1] - size.h / 2) / focalPx, 1];
  d = unit(d);
  // Point it from the floor upward: the floor is below the camera, so the ray to
  // a floor point has a positive component along the DOWN direction.
  const up: Vec3 = d[1] > 0 ? [-d[0], -d[1], -d[2]] : d;
  return { focalPx, cameraHeightMm: cameraHeight, up, size };
}

/** The ray through a normalised image point, in camera coordinates. */
function rayThrough(cam: FloorCamera, p: Pt): Vec3 {
  const { focalPx, size } = cam;
  return unit([p[0] * size.w - size.w / 2, p[1] * size.h - size.h / 2, focalPx]);
}

/**
 * Where the ray through an image point meets the floor, in 3D camera
 * coordinates (mm). Null above the horizon, where it never meets the floor.
 */
export function floorPoint3D(cam: FloorCamera, p: Pt): Vec3 | null {
  const down: Vec3 = [-cam.up[0], -cam.up[1], -cam.up[2]];
  const r = rayThrough(cam, p);
  const denom = dot(r, down);
  if (!(denom > 1e-6)) return null;
  const t = cam.cameraHeightMm / denom;
  return [r[0] * t, r[1] * t, r[2] * t];
}

/**
 * Back-project a normalised image point onto the floor plane, returning metric
 * coordinates in a floor frame (mm). Returns null for points at or above the
 * horizon, which do not meet the floor at all.
 */
export function pointOnFloorMm(cam: FloorCamera, p: Pt): [number, number] | null {
  const X = floorPoint3D(cam, p);
  if (!X) return null;
  const { up } = cam;
  // Express in a floor basis: e1 orthogonal to up in the camera's forward plane.
  const fwd: Vec3 = [0, 0, 1];
  let e1 = cross(up, fwd);
  if (norm2(e1) < 1e-9) e1 = cross(up, [1, 0, 0]);
  e1 = unit(e1);
  const e2 = unit(cross(up, e1));
  return [dot(X, e1), dot(X, e2)];
}

/**
 * Back-project onto the VERTICAL PLANE standing on the floor line through two
 * image points — i.e. onto a wall, once you know where its foot is.
 *
 * Returns `[alongMm, upMm]`: distance along the wall from the first foot point,
 * and height above the floor. This is what makes a wall fully measurable from
 * one tape measurement on the floor: the television's width, the shelf's
 * length, the alcove's height and the ceiling all sit on this plane.
 */
export function pointOnWallMm(
  cam: FloorCamera,
  footA: Pt,
  footB: Pt,
  p: Pt,
): [number, number] | null {
  const A = floorPoint3D(cam, footA);
  const B = floorPoint3D(cam, footB);
  if (!A || !B) return null;
  const along = unit([B[0] - A[0], B[1] - A[1], B[2] - A[2]]);
  if (norm2(along) < 1e-9) return null;
  const up = cam.up;
  const n = unit(cross(along, up));
  const r = rayThrough(cam, p);
  const denom = dot(r, n);
  if (Math.abs(denom) < 1e-9) return null;
  const t = dot(A, n) / denom;
  if (!(t > 0)) return null;
  const X: Vec3 = [r[0] * t, r[1] * t, r[2] * t];
  const d: Vec3 = [X[0] - A[0], X[1] - A[1], X[2] - A[2]];
  return [dot(d, along), dot(d, up)];
}

/**
 * Camera height from ONE distance the visitor measured between two points on
 * the floor — the rung that works when nothing else does.
 *
 * With the focal length known, back-projecting a floor point is linear in the
 * camera's height above the floor: double the height and every floor distance
 * doubles. So measure the visitor's span at an arbitrary trial height, compare
 * it to what they typed, and scale. One tape measurement calibrates the whole
 * floor plane.
 *
 * Crucially this needs only that BOTH ENDS OF THE SPAN ARE VISIBLE — not that
 * any wall has a visible end. A window reveal, an alcove, a hearth or a chimney
 * breast all qualify in photographs where no wall does.
 */
export function cameraHeightFromFloorSpan(
  focalPx: number,
  vz: Vec3,
  span: { a: Pt; b: Pt; mm: number },
  size: ImageSize,
): number | null {
  if (!(span.mm > 0)) return null;
  const TRIAL_MM = 1500;
  const trial = floorCamera(focalPx, vz, TRIAL_MM, size);
  if (!trial) return null;
  const pa = pointOnFloorMm(trial, span.a);
  const pb = pointOnFloorMm(trial, span.b);
  if (!pa || !pb) return null;
  const measured = Math.hypot(pa[0] - pb[0], pa[1] - pb[1]);
  if (!(measured > 1e-6)) return null;
  const height = (TRIAL_MM * span.mm) / measured;
  // A camera below the knee or above head height means the span was not on the
  // floor, or the vanishing points are wrong. Refuse rather than scale by it.
  return height >= 400 && height <= 2600 ? height : null;
}

/**
 * Measure a segment lying on the SAME straight line as a segment of known
 * length, using that line's vanishing point. Pure 1D projective geometry: the
 * vanishing point is the line's point at infinity, which is the third reference
 * a cross-ratio needs.
 *
 * Only valid for a target collinear with the reference — parallel is not enough,
 * because the unit does not transfer between parallel lines without the plane.
 */
export function measureAlongLine(
  known: { a: Pt; b: Pt; mm: number },
  target: { a: Pt; b: Pt },
  vp: Vec3,
  size: ImageSize,
): number | null {
  const V = dehomog(vp);
  if (!V || !(known.mm > 0)) return null;
  const A = [known.a[0] * size.w, known.a[1] * size.h];
  const B = [known.b[0] * size.w, known.b[1] * size.h];
  const dir = [B[0] - A[0], B[1] - A[1]];
  const len = Math.hypot(dir[0], dir[1]);
  if (len < 1e-6) return null;
  const u = [dir[0] / len, dir[1] / len];
  // Signed position along the reference line.
  const t = (p: readonly number[]) => (p[0] - A[0]) * u[0] + (p[1] - A[1]) * u[1];
  const tB = t(B);
  const tV = t(V);
  if (Math.abs(tB) < 1e-9) return null;
  // World coordinate of an image position, in units of |AB|, with A at 0 and B at 1.
  const f = (tp: number) => {
    const den = (tB - 0) * (tp - tV);
    if (Math.abs(den) < 1e-9) return null;
    return ((tp - 0) * (tB - tV)) / den;
  };
  const fc = f(t([target.a[0] * size.w, target.a[1] * size.h]));
  const fd = f(t([target.b[0] * size.w, target.b[1] * size.h]));
  if (fc === null || fd === null) return null;
  const out = Math.abs(fd - fc) * known.mm;
  return Number.isFinite(out) && out > 0 ? out : null;
}

/**
 * FRONTAL WALL MODE — the case the general machinery cannot do, and does not
 * need to.
 *
 * When someone photographs a media wall they stand square to it and hold the
 * phone level. That sends BOTH the vertical and the across-the-wall vanishing
 * points to infinity, and two vanishing points at infinity carry no focal
 * length — so the calibrated route dies. But the same degeneracy means the wall
 * is fronto-parallel, and on a fronto-parallel plane scale is uniform: one
 * millimetre-per-pixel holds everywhere on that wall.
 *
 * So the hardest photograph for the general method is the easiest for this one.
 *
 * Returns null when the frame is NOT frontal enough for the assumption, which
 * is the whole point — the caller must not use it on an angled shot.
 */
export interface FrontalWall {
  /** Millimetres per pixel on the wall face. */
  mmPerPx: number;
  /** How far off square the wall reads, in degrees. Feeds the error band. */
  skewDeg: number;
  size: ImageSize;
}

export function frontalWall(
  foot: { a: Pt; b: Pt; mm: number },
  verticals: readonly Segment[],
  size: ImageSize,
  maxSkewDeg = 8,
): FrontalWall | null {
  if (!(foot.mm > 0)) return null;
  const ax = foot.a[0] * size.w;
  const ay = foot.a[1] * size.h;
  const bx = foot.b[0] * size.w;
  const by = foot.b[1] * size.h;
  const px = Math.hypot(bx - ax, by - ay);
  if (px < 20) return null;

  // How far the foot line tilts, and how far the verticals lean.
  const footDeg = Math.abs((Math.atan2(by - ay, bx - ax) * 180) / Math.PI);
  const footSkew = Math.min(footDeg, Math.abs(180 - footDeg));
  let leanSkew = 0;
  for (const v of verticals) {
    const dx = (v.b[0] - v.a[0]) * size.w;
    const dy = (v.b[1] - v.a[1]) * size.h;
    if (Math.hypot(dx, dy) < 20) continue;
    const deg = Math.abs((Math.atan2(dy, dx) * 180) / Math.PI);
    leanSkew = Math.max(leanSkew, Math.abs(90 - Math.min(deg, 180 - deg)));
  }
  const skewDeg = Math.max(footSkew, leanSkew);
  if (skewDeg > maxSkewDeg) return null;
  return { mmPerPx: foot.mm / px, skewDeg, size };
}

/** Distance in mm between two image points on a frontal wall. */
export function frontalDistanceMm(w: FrontalWall, a: Pt, b: Pt): number {
  const dx = (b[0] - a[0]) * w.size.w;
  const dy = (b[1] - a[1]) * w.size.h;
  return Math.hypot(dx, dy) * w.mmPerPx;
}

/**
 * The error a frontal reading carries. A wall photographed square is good to a
 * couple of percent; the band grows with the skew, because depth the assumption
 * ignores is exactly what skew reveals.
 */
export function frontalBand(w: FrontalWall): number {
  return 0.02 + 0.01 * w.skewDeg;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers over a measured polygon
// ─────────────────────────────────────────────────────────────────────────────

/** Longest and shortest side of the axis-aligned extent of a metric polygon. */
export function extentMm(points: readonly (readonly [number, number])[]): {
  aMm: number;
  bMm: number;
} | null {
  if (points.length < 3) return null;
  // Principal axes, so a room photographed at an angle is not reported as the
  // bounding box of its own diagonal.
  const cx = points.reduce((s, p) => s + p[0], 0) / points.length;
  const cy = points.reduce((s, p) => s + p[1], 0) / points.length;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (const [x, y] of points) {
    const dx = x - cx;
    const dy = y - cy;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }
  const theta = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  let minU = Infinity;
  let maxU = -Infinity;
  let minV = Infinity;
  let maxV = -Infinity;
  for (const [x, y] of points) {
    const u = (x - cx) * c + (y - cy) * s;
    const v = -(x - cx) * s + (y - cy) * c;
    minU = Math.min(minU, u);
    maxU = Math.max(maxU, u);
    minV = Math.min(minV, v);
    maxV = Math.max(maxV, v);
  }
  const a = maxU - minU;
  const b = maxV - minV;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return { aMm: Math.max(a, b), bMm: Math.min(a, b) };
}

/** Straight-line distance between two metric points. */
export const distMm = (p: readonly [number, number], q: readonly [number, number]): number =>
  Math.hypot(p[0] - q[0], p[1] - q[1]);
