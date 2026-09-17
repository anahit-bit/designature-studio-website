/**
 * MEASURE FROM TAPS — the harness that stands in for the real UI.
 *
 * The vision pass cannot place a point on the object it just named, so the
 * person places them. This script takes points exactly as a tap interface would
 * hand them over, and measures with the same geometry the product will use.
 *
 * Two calibration shapes, and the difference matters:
 *
 *   --span  two points and one length. Only valid on a wall square to the
 *           camera, where scale is uniform. Cheapest possible ask: two taps.
 *
 *   --quad  FOUR points of a rectangle and its two real dimensions. Valid at
 *           ANY angle, because four correspondences determine the wall plane's
 *           homography outright. A door, a window, a television, a closet
 *           front — every room has one, and most are standard sizes we already
 *           carry in the catalogue.
 *
 * Angled views are the common case, so `--quad` is the one that matters.
 *
 *   npx tsx scripts/measure-manual.ts <image> \
 *     --quad 220,593 405,593 405,698 220,698 --size 1230x730 \
 *     --target "ceiling:150,395:150,820" --target "nook:98,500:511,500"
 *
 * Coordinates are pixels in the image resized to a 1280 long edge (what
 * `overlay_zone.py` and `grid.py` both draw), so they can be read straight off
 * a gridded overlay.
 */
import { existsSync, readFileSync } from "fs";
import sharp from "sharp";
import {
  applyH,
  frontalDistanceMm,
  frontalWall,
  homographyFromQuad,
  type ImageSize,
  type Mat3,
  type Pt,
} from "../services/measure/projective.js";

const LONG_EDGE = 1280;

const argAll = (flag: string): string[] => {
  const out: string[] = [];
  process.argv.forEach((a, i) => {
    if (a === flag && process.argv[i + 1]) out.push(process.argv[i + 1]);
  });
  return out;
};
const arg = (flag: string) => argAll(flag)[0];

const imagePath = process.argv[2];
if (!imagePath || !existsSync(imagePath)) {
  console.error("usage: npx tsx scripts/measure-manual.ts <image> --quad ... --size WxH | --span ... --mm N");
  process.exit(1);
}

const parsePx = (s: string): [number, number] => {
  const [x, y] = s.split(",").map(Number);
  return [x, y];
};

async function main() {
  // `metadata()` reports the FILE's dimensions, which for a portrait phone photo
  // are the landscape sensor dimensions plus an EXIF orientation tag — so asking
  // it after `.rotate()` still gives the sideways frame. Resize for real and take
  // the size from the output, which is the only version that has been rotated.
  const out = await sharp(readFileSync(imagePath))
    .rotate()
    .resize({ width: LONG_EDGE, height: LONG_EDGE, fit: "inside", withoutEnlargement: true })
    .toBuffer({ resolveWithObject: true });
  const size: ImageSize = { w: out.info.width, h: out.info.height };
  const norm = (p: [number, number]): Pt => [p[0] / size.w, p[1] / size.h];

  console.log(`\n${imagePath.split(/[\\/]/).pop()}  ·  frame ${size.w}×${size.h}`);

  const quadArg = arg("--quad");
  const sizeArg = arg("--size");
  const spanArg = arg("--span");
  const mmArg = Number(arg("--mm") ?? "0");

  let measure: ((a: Pt, b: Pt) => number | null) | null = null;
  let mode = "";

  if (quadArg && sizeArg) {
    // Four corners, in the order given, against a rectangle of the stated size.
    const pts = quadArg.trim().split(/\s+/).map(parsePx).map(norm);
    const [W, H] = sizeArg.split(/[x×]/).map(Number);
    if (pts.length !== 4 || !(W > 0) || !(H > 0)) {
      console.error("--quad needs 4 'x,y' points and --size WxH in mm");
      process.exit(1);
    }
    const rect: [number, number][] = [
      [0, 0],
      [W, 0],
      [W, H],
      [0, H],
    ];
    const Hm: Mat3 | null = homographyFromQuad(pts, rect, size);
    if (!Hm) {
      console.log("REFUSED — those four points are degenerate (three of them collinear).");
      return;
    }
    // Reprojection check: the homography must return the calibration rectangle.
    const back = pts.map((p) => applyH(Hm, p, size)!);
    const err = back
      .map((b, i) => Math.hypot(b[0] - rect[i][0], b[1] - rect[i][1]))
      .reduce((a, b) => Math.max(a, b), 0);
    mode = `wall-plane homography from a ${W}×${H} mm rectangle  (fit ${err.toFixed(1)} mm)`;
    measure = (a, b) => {
      const pa = applyH(Hm, a, size);
      const pb = applyH(Hm, b, size);
      if (!pa || !pb) return null;
      return Math.hypot(pa[0] - pb[0], pa[1] - pb[1]);
    };
  } else if (spanArg && mmArg > 0) {
    const [a, b] = spanArg.trim().split(/\s+/).map(parsePx).map(norm);
    const fw = frontalWall({ a, b, mm: mmArg }, [], size, 90);
    if (!fw) {
      console.log("REFUSED — span too short to calibrate on.");
      return;
    }
    mode = `uniform frontal scale ${fw.mmPerPx.toFixed(3)} mm/px  (assumes the wall is square on)`;
    measure = (p, q) => frontalDistanceMm(fw, p, q);
  } else {
    console.error("give either --quad ... --size WxH, or --span 'x,y x,y' --mm N");
    process.exit(1);
  }

  console.log(`calibration: ${mode}\n`);

  for (const t of argAll("--target")) {
    const [name, aStr, bStr] = t.split(":");
    const mm = measure!(norm(parsePx(aStr)), norm(parsePx(bStr)));
    const truth = t.split(":")[3];
    if (mm === null) {
      console.log(`  ${name.padEnd(24)} —`);
      continue;
    }
    let line = `  ${name.padEnd(24)} ${(mm / 1000).toFixed(2)} m`;
    if (truth) {
      const t2 = Number(truth);
      const err = (Math.abs(mm - t2) / t2) * 100;
      line += `   truth ${(t2 / 1000).toFixed(2)}   off by ${err.toFixed(0)}%`;
    }
    console.log(line);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
