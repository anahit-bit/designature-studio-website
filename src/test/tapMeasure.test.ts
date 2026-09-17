/**
 * Tests for the tap control's arithmetic.
 *
 * A wall is synthesised by choosing where a known rectangle lands in the image,
 * inverting the calibration to place other points on that same wall, and then
 * asking the calibration to measure them back. Nothing is eyeballed.
 */
import { describe, expect, it } from "vitest";
import {
  buildCalibration,
  humanLength,
  isCalibration,
  TAP_TARGETS,
  tracedAspect,
  type Calibration,
} from "../lib/tapMeasure.js";
import {
  homographyFromQuad,
  invert3x3,
  type ImageSize,
  type Pt,
} from "../../services/measure/projective.js";

const SIZE: ImageSize = { w: 1200, h: 1600 };

/** A door seen at an angle: the right edge is further away, so it is shorter. */
const DOOR: Pt[] = [
  [0.30, 0.22],
  [0.62, 0.26],
  [0.62, 0.80],
  [0.30, 0.88],
];
const DOOR_W = 800;
const DOOR_H = 2000;

/** Place a point given in wall millimetres back into the image. */
function planeToImage(quad: Pt[], w: number, h: number, mm: readonly [number, number]): Pt {
  const H = homographyFromQuad(
    quad,
    [
      [0, 0],
      [w, 0],
      [w, h],
      [0, h],
    ],
    SIZE,
  )!;
  const inv = invert3x3(H.map((r) => [...r]))!;
  const v = [mm[0], mm[1], 1];
  const x = inv[0][0] * v[0] + inv[0][1] * v[1] + inv[0][2] * v[2];
  const y = inv[1][0] * v[0] + inv[1][1] * v[1] + inv[1][2] * v[2];
  const wgt = inv[2][0] * v[0] + inv[2][1] * v[1] + inv[2][2] * v[2];
  return [x / wgt / SIZE.w, y / wgt / SIZE.h];
}

const cal = (): Calibration => {
  const c = buildCalibration(DOOR, DOOR_W, DOOR_H, SIZE);
  if (!isCalibration(c)) throw new Error(`expected a calibration, got ${c}`);
  return c;
};

const near = (a: number, b: number, tol = 0.01) => Math.abs(a - b) / b <= tol;

describe("tap calibration", () => {
  it("measures the calibration rectangle back to its own size", () => {
    const c = cal();
    expect(near(c.measure(DOOR[0], DOOR[1])!, DOOR_W)).toBe(true);
    expect(near(c.measure(DOOR[1], DOOR[2])!, DOOR_H)).toBe(true);
    expect(near(c.measure(DOOR[0], DOOR[2])!, Math.hypot(DOOR_W, DOOR_H))).toBe(true);
  });

  it("measures a ceiling height well outside the calibration rectangle", () => {
    // 2.6 m straight up the wall from the door's foot — the real use case.
    const foot = planeToImage(DOOR, DOOR_W, DOOR_H, [0, DOOR_H]);
    const ceiling = planeToImage(DOOR, DOOR_W, DOOR_H, [0, DOOR_H - 2600]);
    const c = cal();
    expect(near(c.measure(foot, ceiling)!, 2600)).toBe(true);
  });

  it("measures a run along the wall far from the rectangle", () => {
    const a = planeToImage(DOOR, DOOR_W, DOOR_H, [-1500, 1000]);
    const b = planeToImage(DOOR, DOOR_W, DOOR_H, [2600, 1000]);
    const c = cal();
    expect(near(c.measure(a, b)!, 4100)).toBe(true);
  });

  it("does not care which order the two sides were typed in", () => {
    // The owner typed 400 x 1200 for a table top, then traced starting along the
    // 1200 side. Pinning the first number to the first traced edge made a 1.2 m
    // edge read as 40 cm and the shape look edge-on.
    const a = buildCalibration(DOOR, 800, 2000, SIZE);
    const b = buildCalibration(DOOR, 2000, 800, SIZE);
    if (!isCalibration(a) || !isCalibration(b)) throw new Error("both should calibrate");
    const p: Pt = [0.2, 0.3];
    const q: Pt = [0.75, 0.7];
    expect(near(a.measure(p, q)!, b.measure(p, q)!, 0.001)).toBe(true);
    expect(a.swapped).toBe(false);
    expect(b.swapped).toBe(true);
    // And typing the sides the "wrong" way round must not trip the edge-on warning.
    expect(b.warnings.join(" ")).not.toMatch(/edge-on/i);
  });

  it("takes the four corners in any order", () => {
    // Corner names like "top-left" mean nothing on a table top lying flat.
    const shuffled: Pt[] = [DOOR[2], DOOR[0], DOOR[3], DOOR[1]];
    const b = buildCalibration(shuffled, DOOR_W, DOOR_H, SIZE);
    if (!isCalibration(b)) throw new Error("should calibrate");
    const p: Pt = [0.2, 0.3];
    const q: Pt = [0.75, 0.7];
    expect(near(b.measure(p, q)!, cal().measure(p, q)!, 0.001)).toBe(true);
  });

  it("gives the same answer whichever standard door is tapped, to scale", () => {
    const us = buildCalibration(DOOR, 813, 2032, SIZE);
    const eu = buildCalibration(DOOR, 800, 2000, SIZE);
    if (!isCalibration(us) || !isCalibration(eu)) throw new Error("both should calibrate");
    const a: Pt = [0.2, 0.5];
    const b: Pt = [0.8, 0.5];
    // The two standards differ by 1.6%, so the readings must differ by the same.
    const ratio = us.measure(a, b)! / eu.measure(a, b)!;
    expect(near(ratio, 813 / 800, 0.005)).toBe(true);
  });
});

/**
 * A table top lying on the floor, photographed by a pinhole camera. Returns the
 * four corners in tracing order: far-left, far-right, near-right, near-left.
 */
function tableTop(opts: {
  focal: number;
  eyeMm: number;
  yaw: number;
  pitch: number;
  distMm: number;
  acrossMm: number;
  awayMm: number;
}): Pt[] {
  const f = opts.focal * Math.hypot(SIZE.w, SIZE.h);
  const [cy, sy, cp, sp] = [Math.cos(opts.yaw), Math.sin(opts.yaw), Math.cos(opts.pitch), Math.sin(opts.pitch)];
  const project = (x: number, y: number): Pt => {
    const z = -opts.eyeMm;
    const xr = cy * x - sy * y;
    const yr = sy * x + cy * y;
    const up = yr * sp + z * cp;
    const depth = yr * cp - z * sp;
    return [(SIZE.w / 2 + (f * xr) / depth) / SIZE.w, (SIZE.h / 2 - (f * up) / depth) / SIZE.h];
  };
  const [a, d] = [opts.acrossMm / 2, opts.awayMm / 2];
  return [
    project(-a, opts.distMm + d),
    project(a, opts.distMm + d),
    project(a, opts.distMm - d),
    project(-a, opts.distMm - d),
  ];
}

describe("which way round the typed sides go", () => {
  // Seated, looking square-on down a 400 × 1200 table: foreshortening makes it
  // look almost exactly square, so the traced proportions cannot say which side
  // is which. This is the case that defeats "pick whichever looks closer".
  const seated = tableTop({ focal: 0.8, eyeMm: 1000, yaw: 0, pitch: 0.2, distMm: 3600, acrossMm: 400, awayMm: 1200 });

  it("measures the table correctly whichever order its sides were typed in", () => {
    for (const [w, h] of [
      [400, 1200],
      [1200, 400],
    ]) {
      const c = buildCalibration(seated, w, h, SIZE);
      if (!isCalibration(c)) throw new Error(`should calibrate for ${w} × ${h}`);
      expect(near(c.measure(seated[3], seated[2])!, 400)).toBe(true);
      expect(near(c.measure(seated[2], seated[1])!, 1200)).toBe(true);
    }
  });

  it("recovers the real proportions when both edge pairs converge", () => {
    const standing = tableTop({ focal: 0.9, eyeMm: 1500, yaw: 0.45, pitch: 0.5, distMm: 3000, acrossMm: 400, awayMm: 1200 });
    expect(near(tracedAspect(standing, SIZE)!, 400 / 1200, 0.02)).toBe(true);
  });
});

describe("tap calibration refuses rather than guesses", () => {
  it("needs four corners", () => {
    expect(buildCalibration(DOOR.slice(0, 3), 800, 2000, SIZE)).toBe("need-four-points");
  });

  it("rejects collinear corners", () => {
    const line: Pt[] = [
      [0.1, 0.5],
      [0.3, 0.5],
      [0.5, 0.5],
      [0.7, 0.5],
    ];
    expect(buildCalibration(line, 800, 2000, SIZE)).toBe("degenerate");
  });

  it("rejects a rectangle too small to measure from", () => {
    const tiny: Pt[] = [
      [0.500, 0.500],
      [0.512, 0.500],
      [0.512, 0.520],
      [0.500, 0.520],
    ];
    expect(buildCalibration(tiny, 800, 2000, SIZE)).toBe("too-small");
  });

  it("refuses a shape that runs off the edge of the photo", () => {
    // The owner's bar table: its end was cut by the frame, so one "corner" was the photo's edge.
    const cut: Pt[] = [
      [0, 0.45],
      [0.12, 0.42],
      [0.4, 0.44],
      [0.3, 0.48],
    ];
    expect(buildCalibration(cut, 400, 1200, SIZE)).toBe("cut-off");
  });

  it("rejects a missing size", () => {
    expect(buildCalibration(DOOR, 0, 2000, SIZE)).toBe("bad-size");
  });
});

describe("tap calibration warns where it is weak", () => {
  it("warns when the rectangle is small in frame, and bands it wider", () => {
    const small: Pt[] = [
      [0.50, 0.50],
      [0.56, 0.505],
      [0.56, 0.60],
      [0.50, 0.60],
    ];
    const c = buildCalibration(small, 800, 2000, SIZE);
    if (!isCalibration(c)) throw new Error("should still calibrate");
    expect(c.warnings.join(" ")).toMatch(/small in this photo/i);
    expect(c.band).toBeGreaterThan(cal().band);
  });

  it("warns when the rectangle is almost edge-on", () => {
    const edge: Pt[] = [
      [0.40, 0.20],
      [0.42, 0.21],
      [0.42, 0.85],
      [0.40, 0.84],
    ];
    const c = buildCalibration(edge, 800, 2000, SIZE);
    if (!isCalibration(c)) throw new Error("should still calibrate");
    expect(c.warnings.join(" ")).toMatch(/edge-on/i);
  });

  it("says nothing when the rectangle is large and facing the camera", () => {
    expect(cal().warnings).toHaveLength(0);
  });
});

describe("presentation", () => {
  it("reads millimetres below a metre and metres above", () => {
    expect(humanLength(730)).toBe("730 mm");
    expect(humanLength(2895)).toBe("2.90 m");
    expect(humanLength(null)).toBe("—");
  });

  it("offers standards that a person would recognise", () => {
    expect(TAP_TARGETS.map((t) => t.id)).toContain("door-eu");
    for (const t of TAP_TARGETS) {
      expect(t.widthMm).toBeGreaterThan(0);
      expect(t.heightMm).toBeGreaterThan(0);
      expect(t.note.length).toBeGreaterThan(5);
    }
  });
});
