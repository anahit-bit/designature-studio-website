/**
 * Synthetic-camera tests for the measurement ladder.
 *
 * A real room of known size is projected through a camera of known focal length,
 * height and pitch; the resulting image points are handed to the resolver, and
 * the resolver has to give the room back. Nothing here calls a model — this
 * separates "the maths is wrong" from "the model picked the wrong pixels",
 * which are the only two ways this can fail in production.
 */

import { describe, expect, it } from "vitest";
import {
  cameraHeightFromFloorSpan,
  extentMm,
  focalFromOrthogonalVps,
  measureAlongLine,
  pointOnWallMm,
  floorCamera,
  homographyFromQuad,
  applyH,
  horizonFrom,
  vanishingPoint,
  verticalHeightMm,
  type ImageSize,
  type Pt,
} from "../../services/measure/projective.js";
import { resolveMeasurement } from "../../services/measure/resolve.js";
import type { RoomObservation } from "../../services/measure/types.js";

// ── A camera we control completely ───────────────────────────────────────────

const SIZE: ImageSize = { w: 1600, h: 1200 };
const FOCAL = 1250; // px — roughly a 28 mm-equivalent phone lens on this frame

type World = readonly [number, number, number]; // X right, Y depth, Z up (mm)

interface Cam {
  c: World;
  yaw: number;
  pitch: number;
  f: number;
}

const sub = (a: World, b: World): World => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot3 = (a: World, b: World) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function basis(cam: Cam) {
  const { yaw, pitch } = cam;
  const f0: World = [Math.sin(yaw), Math.cos(yaw), 0];
  const right: World = [Math.cos(yaw), -Math.sin(yaw), 0];
  const up0: World = [0, 0, 1];
  const forward: World = [
    f0[0] * Math.cos(pitch) - up0[0] * Math.sin(pitch),
    f0[1] * Math.cos(pitch) - up0[1] * Math.sin(pitch),
    f0[2] * Math.cos(pitch) - up0[2] * Math.sin(pitch),
  ];
  const camUp: World = [
    f0[0] * Math.sin(pitch) + up0[0] * Math.cos(pitch),
    f0[1] * Math.sin(pitch) + up0[1] * Math.cos(pitch),
    f0[2] * Math.sin(pitch) + up0[2] * Math.cos(pitch),
  ];
  const down: World = [-camUp[0], -camUp[1], -camUp[2]];
  return { right, down, forward };
}

/** World point to a normalised image point. Throws if it lands behind the camera. */
function project(cam: Cam, p: World): Pt {
  const { right, down, forward } = basis(cam);
  const d = sub(p, cam.c);
  const z = dot3(d, forward);
  if (z <= 1) throw new Error("point is behind the camera");
  const u = (cam.f * dot3(d, right)) / z + SIZE.w / 2;
  const v = (cam.f * dot3(d, down)) / z + SIZE.h / 2;
  return [u / SIZE.w, v / SIZE.h];
}

// ── The room ─────────────────────────────────────────────────────────────────

const W = 4200; // X extent
const D = 3150; // Y extent
const CEIL = 2700;

const CAM: Cam = { c: [900, -2600, 1550], yaw: 0.16, pitch: 0.09, f: FOCAL };

const floorCorners: World[] = [
  [0, 0, 0],
  [W, 0, 0],
  [W, D, 0],
  [0, D, 0],
];
const ceilCorners: World[] = floorCorners.map((p) => [p[0], p[1], CEIL] as World);

const pf = (p: World) => project(CAM, p);

/** A 600×600 floor tile sitting in the middle of the room. */
const tileOrigin: World = [1500, 1200, 0];
const tileQuad: [Pt, Pt, Pt, Pt] = [
  pf(tileOrigin),
  pf([tileOrigin[0] + 600, tileOrigin[1], 0]),
  pf([tileOrigin[0] + 600, tileOrigin[1] + 600, 0]),
  pf([tileOrigin[0], tileOrigin[1] + 600, 0]),
];

/** A door leaf standing against the back wall, 2032 tall. */
const doorBase: World = [3200, D, 0];
const doorVertical = { base: pf(doorBase), top: pf([doorBase[0], doorBase[1], 2032]) };

function observation(over: Partial<RoomObservation> = {}): RoomObservation {
  return {
    imageKind: "photograph",
    imageKindReason: "synthetic",
    roomType: "living room",
    peopleInFrame: false,
    floorVisible: true,
    ceilingVisible: true,
    wallCornersVisible: 2,
    region: "eu",
    depthLines: [
      { a: pf([0, 0, 0]), b: pf([0, D, 0]) },
      { a: pf([W, 0, 0]), b: pf([W, D, 0]) },
      { a: pf([0, 0, CEIL]), b: pf([0, D, CEIL]) },
    ],
    widthLines: [
      { a: pf([0, D, 0]), b: pf([W, D, 0]) },
      { a: pf([0, D, CEIL]), b: pf([W, D, CEIL]) },
      { a: pf([0, 0, CEIL]), b: pf([W, 0, CEIL]) },
    ],
    verticalLines: [
      { a: pf([0, D, 0]), b: pf([0, D, CEIL]) },
      { a: pf([W, D, 0]), b: pf([W, D, CEIL]) },
    ],
    floorBoundary: floorCorners.map(pf),
    // All four are true room corners in the synthetic room.
    boundaryKinds: ["corner", "corner", "corner", "corner"],
    ceilingBoundary: ceilCorners.map(pf),
    ceilingCorner: { base: pf([0, D, 0]), top: pf([0, D, CEIL]) },
    rulers: [
      {
        standardId: "floor_tile_600",
        what: "600 grey porcelain tile, mid floor",
        plane: "floor",
        quad: tileQuad,
        longEdgeFirst: true,
        confidence: 0.9,
      },
      {
        standardId: "door_leaf_eu",
        what: "door on the back wall",
        vertical: doorVertical,
        confidence: 0.85,
      },
    ],
    modelEstimate: { widthMm: 4000, lengthMm: 3000, ceilingMm: 2700, note: "eyeballed" },
    ...over,
  };
}

const within = (actual: number, expected: number, tol: number) =>
  Math.abs(actual - expected) / expected <= tol;

// ── Primitives ───────────────────────────────────────────────────────────────

describe("projective primitives", () => {
  it("recovers a vanishing point from image-parallel lines", () => {
    const v = vanishingPoint(observation().depthLines, SIZE);
    expect(v).not.toBeNull();
    // The depth direction (0,1,0) projects to a specific image point; the width
    // VP must be a different one, and the horizon must join them.
    const vw = vanishingPoint(observation().widthLines, SIZE);
    expect(vw).not.toBeNull();
    const l = horizonFrom(v!, vw!);
    expect(Number.isFinite(l[0])).toBe(true);
  });

  it("recovers the true focal length from two orthogonal vanishing points", () => {
    const o = observation();
    const f = focalFromOrthogonalVps(
      vanishingPoint(o.depthLines, SIZE)!,
      vanishingPoint(o.widthLines, SIZE)!,
      SIZE,
    );
    expect(f).not.toBeNull();
    expect(within(f!, FOCAL, 0.02)).toBe(true);
  });

  it("maps the floor through a tile homography back to real millimetres", () => {
    const H = homographyFromQuad(
      tileQuad,
      [
        [0, 0],
        [600, 0],
        [600, 600],
        [0, 600],
      ],
      SIZE,
    )!;
    expect(H).not.toBeNull();
    const mapped = floorCorners.map(pf).map((p) => applyH(H, p, SIZE)!);
    const ext = extentMm(mapped)!;
    expect(within(ext.aMm, W, 0.01)).toBe(true);
    expect(within(ext.bMm, D, 0.01)).toBe(true);
  });

  it("measures an unknown vertical against a known one", () => {
    const o = observation();
    const horizon = horizonFrom(
      vanishingPoint(o.depthLines, SIZE)!,
      vanishingPoint(o.widthLines, SIZE)!,
    );
    const vz = vanishingPoint(o.verticalLines, SIZE)!;
    const wallCorner = { base: pf([0, D, 0]), top: pf([0, D, CEIL]) };
    const h = verticalHeightMm(wallCorner, doorVertical, 2000, horizon, vz, SIZE);
    expect(h).not.toBeNull();
    // The door standard is 2000 nominal against a true 2032, so the answer is
    // expected to land ~1.6% low — the ruler's band, showing up exactly as it should.
    expect(within(h!, CEIL * (2000 / 2032), 0.02)).toBe(true);
  });

  it("recovers the camera height from one measured floor span", () => {
    const o = observation();
    const f = focalFromOrthogonalVps(
      vanishingPoint(o.depthLines, SIZE)!,
      vanishingPoint(o.widthLines, SIZE)!,
      SIZE,
    )!;
    const vz = vanishingPoint(o.verticalLines, SIZE)!;
    // A 2550 mm span on the floor — the alcove the owner measured with a tape.
    const A: World = [800, 900, 0];
    const B: World = [800 + 2550, 900, 0];
    const h = cameraHeightFromFloorSpan(f, vz, { a: pf(A), b: pf(B), mm: 2550 }, SIZE);
    expect(h).not.toBeNull();
    expect(within(h!, 1550, 0.03)).toBe(true);
  });

  it("measures a second segment on the same line from one known length", () => {
    const o = observation();
    const vw = vanishingPoint(o.widthLines, SIZE)!;
    // Known: 2000 mm along the foot of the back wall. Target: 1400 mm further along.
    const known = { a: pf([500, D, 0]), b: pf([2500, D, 0]), mm: 2000 };
    const target = { a: pf([2500, D, 0]), b: pf([3900, D, 0]) };
    const got = measureAlongLine(known, target, vw, SIZE);
    expect(got).not.toBeNull();
    expect(within(got!, 1400, 0.02)).toBe(true);
  });

  it("measures a television and a ceiling on a wall, from one floor span", () => {
    const o = observation();
    const f = focalFromOrthogonalVps(
      vanishingPoint(o.depthLines, SIZE)!,
      vanishingPoint(o.widthLines, SIZE)!,
      SIZE,
    )!;
    const vz = vanishingPoint(o.verticalLines, SIZE)!;
    // The visitor tapes the alcove on the back wall: 2550 mm, both ends visible.
    const footA: World = [700, D, 0];
    const footB: World = [700 + 2550, D, 0];
    const camH = cameraHeightFromFloorSpan(
      f, vz, { a: pf(footA), b: pf(footB), mm: 2550 }, SIZE,
    )!;
    const cam = floorCamera(f, vz, camH, SIZE)!;
    const wall = (p: World) => pointOnWallMm(cam, pf(footA), pf(footB), pf(p));

    // A 1400 mm television, its underside 900 mm up, centred in the alcove.
    const tvL = wall([1300, D, 1500])!;
    const tvR = wall([2700, D, 1500])!;
    expect(within(Math.abs(tvR[0] - tvL[0]), 1400, 0.04)).toBe(true);
    expect(within(tvL[1], 1500, 0.05)).toBe(true);

    // And the ceiling, which is just a very high point on the same wall.
    const ceil = wall([2000, D, CEIL])!;
    expect(within(ceil[1], CEIL, 0.05)).toBe(true);
  });

  it("refuses a span that was not on the floor", () => {
    const o = observation();
    const f = focalFromOrthogonalVps(
      vanishingPoint(o.depthLines, SIZE)!,
      vanishingPoint(o.widthLines, SIZE)!,
      SIZE,
    )!;
    const vz = vanishingPoint(o.verticalLines, SIZE)!;
    // Same span, but 1.8 m up the wall — the derived camera height goes absurd.
    const h = cameraHeightFromFloorSpan(
      f, vz,
      { a: pf([800, D, 1800]), b: pf([3350, D, 1800]), mm: 2550 },
      SIZE,
    );
    expect(h).toBeNull();
  });

  it("refuses a degenerate quad rather than returning a plausible matrix", () => {
    const collinear: [Pt, Pt, Pt, Pt] = [
      [0.1, 0.5],
      [0.2, 0.5],
      [0.3, 0.5],
      [0.4, 0.5],
    ];
    const H = homographyFromQuad(
      collinear,
      [
        [0, 0],
        [600, 0],
        [600, 600],
        [0, 600],
      ],
      SIZE,
    );
    expect(H).toBeNull();
  });
});

// ── The ladder end to end ────────────────────────────────────────────────────

describe("resolveMeasurement", () => {
  it("measures the synthetic room to within a few percent", () => {
    const m = resolveMeasurement(observation(), SIZE);
    expect(m.refusal).toBeNull();
    expect(m.best).not.toBeNull();
    const long = Math.max(m.best!.lengthMm!, m.best!.widthMm!);
    const short = Math.min(m.best!.lengthMm!, m.best!.widthMm!);
    expect(within(long, W, 0.03)).toBe(true);
    expect(within(short, D, 0.03)).toBe(true);
  });

  it("reports a ceiling height", () => {
    const m = resolveMeasurement(observation(), SIZE);
    expect(m.ceilingMm).not.toBeNull();
    expect(within(m.ceilingMm!, CEIL, 0.05)).toBe(true);
  });

  it("still measures when the only ruler is a door — no grid in the room", () => {
    const o = observation({
      rulers: [
        {
          standardId: "door_leaf_eu",
          what: "door on the back wall",
          vertical: doorVertical,
          confidence: 0.85,
        },
      ],
    });
    const m = resolveMeasurement(o, SIZE);
    expect(m.best?.method).toBe("C-VP");
    const long = Math.max(m.best!.lengthMm!, m.best!.widthMm!);
    expect(within(long, W, 0.06)).toBe(true);
  });

  it("refuses an AI-generated image outright", () => {
    const m = resolveMeasurement(observation({ imageKind: "ai_generated" }), SIZE);
    expect(m.best).toBeNull();
    expect(m.refusal).toMatch(/no real dimensions/i);
    expect(m.rungs).toHaveLength(0);
  });

  it("refuses a 3D render, separately from an AI image", () => {
    const m = resolveMeasurement(observation({ imageKind: "3d_render" }), SIZE);
    expect(m.refusal).toMatch(/render/i);
  });

  it("asks for confirmation when there is no ruler at all", () => {
    const m = resolveMeasurement(observation({ rulers: [] }), SIZE);
    expect(m.best).toBeNull();
    expect(m.confirm.required).toBe(true);
    expect(m.confirm.reason).toMatch(/no object of known size/i);
    expect(m.confirm.tapPrompt).toMatch(/tap/i);
  });

  it("reports every wall run the boundary traces", () => {
    const m = resolveMeasurement(observation(), SIZE);
    const runs = m.best!.wallRunsMm.map((r) => Math.round(r));
    // The boundary walks W, D, W — three runs of the room's own sides.
    expect(runs).toHaveLength(3);
    expect(within(runs[0], W, 0.03)).toBe(true);
    expect(within(runs[1], D, 0.03)).toBe(true);
    expect(m.longestRunMm).not.toBeNull();
  });

  it("will not call a partial boundary a room", () => {
    // Only the back wall is traced: two points, no turn. The run is still real,
    // but there is no room extent to claim.
    const o = observation({
      floorBoundary: [pf([0, D, 0]), pf([W, D, 0])],
      boundaryKinds: ["corner", "corner"],
      ceilingBoundary: [],
    });
    const m = resolveMeasurement(o, SIZE);
    expect(m.best).toBeNull();
    expect(m.longestRunMm).not.toBeNull();
    expect(within(m.longestRunMm!, W, 0.03)).toBe(true);
    expect(m.confirm.required).toBe(true);
    expect(m.confirm.reason).toMatch(/only part of the room/i);
  });

  it("gives no ceiling height when no full corner was identified", () => {
    const m = resolveMeasurement(observation({ ceilingCorner: null }), SIZE);
    expect(m.ceilingMm).toBeNull();
  });

  it("refuses everything when both ends of every wall run off the frame", () => {
    // The exact case the owner named: the photo is taken at an angle and the
    // wall simply leaves the picture. There is nothing to measure and nothing
    // to tap.
    const o = observation({ boundaryKinds: ["frame", "corner", "frame", "frame"] });
    const m = resolveMeasurement(o, SIZE);
    expect(m.wallsCut).toBe(true);
    expect(m.best).toBeNull();
    expect(m.longestRunMm).toBeNull();
    expect(m.confirm.tapPrompt).toBeNull();
    expect(m.confirm.reason).toMatch(/runs off the edge/i);
  });

  it("measures the one run that does have two corners", () => {
    const o = observation({ boundaryKinds: ["frame", "corner", "corner", "frame"] });
    const m = resolveMeasurement(o, SIZE);
    expect(m.wallsCut).toBe(false);
    expect(m.longestRunMm).not.toBeNull();
    expect(within(m.longestRunMm!, D, 0.04)).toBe(true);
    // One run is not a room.
    expect(m.best).toBeNull();
  });

  it("offers no tap when the floor is not in frame", () => {
    const m = resolveMeasurement(
      observation({ floorVisible: false, floorBoundary: [], boundaryKinds: [] }),
      SIZE,
    );
    expect(m.confirm.tapPrompt).toBeNull();
  });

  it("flags disagreement instead of averaging two rulers that conflict", () => {
    // Same tile quad, but declared as a 300 tile: half the true size, so the two
    // rungs must land ~2x apart.
    const o = observation();
    o.rulers = [
      { ...o.rulers[0], standardId: "floor_tile_300" },
      o.rulers[1],
    ];
    const m = resolveMeasurement(o, SIZE);
    expect(m.disagreement).not.toBeNull();
    expect(m.disagreement!).toBeGreaterThan(0.05);
    expect(m.confirm.required).toBe(true);
    expect(m.confirm.reason).toMatch(/disagree/i);
  });

  it("carries the model's own estimate through without letting it become the answer", () => {
    const m = resolveMeasurement(observation(), SIZE);
    expect(m.modelEstimate.widthMm).toBe(4000);
    expect(m.best!.method).not.toBe("MODEL");
  });

  it("rejects a rung whose result is not a room", () => {
    // A 100 mm patch of floor mislabelled as a 2500 mm plasterboard sheet scales
    // the room 25x. The plausibility gate has to catch that rather than report a
    // 105 m living room.
    const patch: World = [1500, 1200, 0];
    const o = observation();
    o.rulers = [
      {
        standardId: "plasterboard_sheet",
        what: "mislabelled patch",
        plane: "floor",
        quad: [
          pf(patch),
          pf([patch[0] + 100, patch[1], 0]),
          pf([patch[0] + 100, patch[1] + 100, 0]),
          pf([patch[0], patch[1] + 100, 0]),
        ],
        longEdgeFirst: true,
        confidence: 0.5,
      },
    ];
    const m = resolveMeasurement(o, SIZE);
    const floor = m.rungs.find((r) => r.method === "H-FLOOR");
    expect(floor?.failed ?? "").toMatch(/room-sized/i);
    expect(m.best).toBeNull();
  });
});
