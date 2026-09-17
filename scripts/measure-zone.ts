/**
 * ZONE MEASUREMENT — measure a WALL, not a room, from one tape measurement.
 *
 * The room-measurement bench established that a photograph rarely contains a
 * whole room: the side walls run off the frame, so nothing has two measurable
 * ends. But a ZONE usually is fully in frame — an alcove, a chimney breast, a
 * media wall, a kitchen run — and a zone is what someone is actually redesigning.
 *
 * Give one real distance between two points that BOTH show, and everything on
 * that wall becomes metric: the calibration fixes the camera height, the camera
 * fixes the floor, and the floor line under the wall fixes the wall plane.
 *
 *   npx tsx scripts/measure-zone.ts <image> --mm 2550
 *   npx tsx scripts/measure-zone.ts <image> --mm 2550 --json out.json
 *
 * `--mm` is the width of the zone the model identifies, measured on the floor.
 */
import dotenv from "dotenv";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import {
  cameraHeightFromFloorSpan,
  floorCamera,
  focalFromAnyOrthogonalPair,
  frontalWall,
  frontalDistanceMm,
  frontalBand,
  focalFromOrthogonalVps,
  pointOnWallMm,
  vanishingPoint,
  type ImageSize,
  type Pt,
  type Segment,
} from "../services/measure/projective.js";

const FALLBACK_ENV_PATH = "E:/Secrets/Website/.env";
dotenv.config({
  path: existsSync(".env") ? ".env" : existsSync(FALLBACK_ENV_PATH) ? FALLBACK_ENV_PATH : undefined,
});

const arg = (f: string) => {
  const i = process.argv.indexOf(f);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

const imagePath = process.argv[2];
const knownMm = Number(arg("--mm") ?? "0");
const jsonOut = arg("--json");

if (!imagePath || !existsSync(imagePath) || !(knownMm > 0)) {
  console.error("usage: npx tsx scripts/measure-zone.ts <image> --mm <zone width in mm>");
  process.exit(1);
}

const PROMPT = `You are a surveyor's assistant looking at ONE photograph of an interior ZONE — a wall
someone wants to redesign (a media wall, an alcove, a chimney breast, a kitchen run).

You LOCATE things. You never state a dimension. All coordinates are NORMALISED: x from 0 at the
left edge to 1 at the right, y from 0 at the top to 1 at the bottom. Four decimal places.

1. THE ZONE. Identify the main wall face this photograph is about — the recessed or flat wall
   section the furniture sits against.
   zoneName        a short name for it ("recessed TV alcove", "chimney breast", "kitchen run")
   zoneFoot        {"a":[x,y],"b":[x,y]} — the two ends of that wall face WHERE IT MEETS THE
                   FLOOR. Both points must be ON the floor line, at the left and right limits of
                   the zone. If the zone is recessed, use the inside corners of the recess. These
                   two points are what the visitor measured with a tape, so they must be the two
                   ends of the thing they measured. Put them at floor level even if furniture
                   stands in front — estimate where the skirting meets the floor behind it.

2. PERSPECTIVE. Endpoints of real straight edges you can see. Longer is better.
   depthLines      3-6 edges running AWAY from the camera and mutually parallel in reality:
                   floor-to-wall junctions along side walls, floorboard joints, ceiling junctions.
   widthLines      3-6 edges running ACROSS the view, perpendicular to those in reality: the foot
                   of the zone wall, its ceiling junction, a shelf, a worktop front.
   verticalLines   2-4 true verticals: room corners, the returns of a recess, door jambs.

3. FEATURES to measure — everything on that wall worth a number. For each:
   name            plain words ("television", "console width", "shelf", "ceiling height",
                   "alcove opening width", "alcove height", "socket height")
   kind            "width"  a horizontal extent on the wall
                   "height" a height above the floor (give a = the point at floor level directly
                            below, b = the point itself)
   a, b            the two endpoints
   Include, when present: the television, the media console, any floating shelf, the alcove's own
   opening, the ceiling height, and any wall socket. 4-10 features.

Return ONLY JSON:
{"zoneName":"...","zoneFoot":{"a":[0.1,0.8],"b":[0.8,0.78]},
 "depthLines":[{"a":[0.1,0.9],"b":[0.3,0.8]}],
 "widthLines":[{"a":[0.1,0.8],"b":[0.8,0.78]}],
 "verticalLines":[{"a":[0.1,0.8],"b":[0.1,0.2]}],
 "features":[{"name":"television","kind":"width","a":[0.3,0.5],"b":[0.6,0.5]}]}`;

interface ZoneObs {
  zoneName: string;
  zoneFoot: { a: Pt; b: Pt };
  depthLines: Segment[];
  widthLines: Segment[];
  verticalLines: Segment[];
  features: { name: string; kind: "width" | "height"; a: Pt; b: Pt }[];
}

const pt = (v: unknown): Pt | null => {
  if (!Array.isArray(v) || v.length < 2) return null;
  const [x, y] = [Number(v[0]), Number(v[1])];
  return Number.isFinite(x) && Number.isFinite(y) ? [x, y] : null;
};
const segs = (v: unknown): Segment[] =>
  (Array.isArray(v) ? v : [])
    .map((s) => ({ a: pt((s as any)?.a), b: pt((s as any)?.b) }))
    .filter((s): s is Segment => !!s.a && !!s.b);

async function main() {
  const apiKey = process.env.GEMINI_API_KEY ?? "";
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const img = await sharp(readFileSync(imagePath))
    .rotate()
    .resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 88 })
    .toBuffer({ resolveWithObject: true });
  const size: ImageSize = { w: img.info.width, h: img.info.height };

  const cachePath = `zone-obs-${imagePath.replace(/[^\w]/g, "_").slice(-40)}.json`;
  if (existsSync(cachePath) && !process.argv.includes("--force")) {
    const cached = JSON.parse(readFileSync(cachePath, "utf-8"));
    return report(cached.obs as ZoneObs, cached.size as ImageSize);
  }
  const ai = new GoogleGenAI({ apiKey });
  const res = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: img.data.toString("base64") } },
          { text: PROMPT },
        ],
      },
    ],
    config: { temperature: 0, responseMimeType: "application/json" },
  });

  const raw = JSON.parse((res.text ?? "").replace(/^```(?:json)?|```$/g, "").trim());
  const obs: ZoneObs = {
    zoneName: String(raw.zoneName ?? "zone"),
    zoneFoot: { a: pt(raw.zoneFoot?.a)!, b: pt(raw.zoneFoot?.b)! },
    depthLines: segs(raw.depthLines),
    widthLines: segs(raw.widthLines),
    verticalLines: segs(raw.verticalLines),
    features: (Array.isArray(raw.features) ? raw.features : [])
      .map((f: any) => ({ name: String(f?.name ?? "?"), kind: f?.kind === "height" ? "height" : "width", a: pt(f?.a), b: pt(f?.b) }))
      .filter((f: any) => f.a && f.b),
  };

  writeFileSync(cachePath, JSON.stringify({ obs, size }, null, 1), "utf-8");
  report(obs, size);
}

/** Pure arithmetic on the cached observation — free to re-run. */
function report(obs: ZoneObs, size: ImageSize) {
  console.log(`\nzone: ${obs.zoneName}`);
  console.log(
    `lines depth/width/vertical = ${obs.depthLines.length}/${obs.widthLines.length}/${obs.verticalLines.length}`,
  );

  const vDepth = vanishingPoint(obs.depthLines, size);
  const vWidth = vanishingPoint(obs.widthLines, size);
  const vz = vanishingPoint(obs.verticalLines, size);
  if (!vDepth || !vWidth || !vz) {
    console.log("REFUSED — not enough parallel structure for a perspective frame.");
    return;
  }
  if (process.argv.includes("--debug")) {
    const d = (v: typeof vDepth) => {
      const p = v && v[2] !== 0 ? [v[0] / v[2], v[1] / v[2]] : null;
      return p ? `(${Math.round(p[0])}, ${Math.round(p[1])})` : "at infinity";
    };
    console.log(`  vDepth ${d(vDepth)}  vWidth ${d(vWidth)}  vz ${d(vz)}   frame ${size.w}x${size.h}`);
    for (const [n, a, b] of [["depth×width", vDepth, vWidth], ["depth×vert", vDepth, vz], ["width×vert", vWidth, vz]] as const) {
      console.log(`  focal ${n}: ${focalFromOrthogonalVps(a!, b!, size) ?? "no solution"}`);
    }
  }
  const cal = focalFromAnyOrthogonalPair(vDepth, vWidth, vz, size);
  if (!cal) {
    // Both the vertical and the across-the-wall directions vanish at infinity:
    // the visitor stood square to the wall and held the phone level. No focal
    // length is recoverable — and none is needed, because that is exactly the
    // condition under which the wall is fronto-parallel.
    const fw = frontalWall(
      { a: obs.zoneFoot.a, b: obs.zoneFoot.b, mm: knownMm },
      obs.verticalLines,
      size,
    );
    if (!fw) {
      console.log(
        "REFUSED — no focal length from the vanishing points, and the wall is not square " +
          "enough to the camera to measure it as a flat face.",
          "          enough to the camera to measure it as a flat face.",
      );
      return;
    }
    console.log(
      `square-on wall · ${fw.mmPerPx.toFixed(2)} mm per pixel · ${fw.skewDeg.toFixed(1)}° off square` +
        `  (calibrated on "${obs.zoneName}" = ${(knownMm / 1000).toFixed(2)} m)` +
        `
±${Math.round(frontalBand(fw) * 100)}% on everything below
`,
    );
    const out: Record<string, number> = {};
    for (const f of obs.features) {
      if (f.kind === "height") {
        // Uniform scale is a HORIZONTAL claim. A phone held at chest height in
        // portrait still has real vertical perspective — the ceiling recedes —
        // so a height read at the horizontal scale comes out roughly double.
        // Refusing is the only honest answer without a calibrated camera.
        console.log(`  ${f.name.padEnd(26)} —      (heights need a second measurement)`);
        continue;
      }
      const mm = frontalDistanceMm(fw, f.a, f.b);
      if (!(mm > 20 && mm < 8000)) {
        console.log(`  ${f.name.padEnd(26)} —      (${Math.round(mm)} mm, out of range)`);
        continue;
      }
      out[f.name] = Math.round(mm);
      console.log(`  ${f.name.padEnd(26)} ${(mm / 1000).toFixed(2)} m   [${f.kind}]`);
    }
    if (jsonOut) {
      writeFileSync(jsonOut, JSON.stringify({ zone: obs.zoneName, mode: "frontal", mmPerPx: fw.mmPerPx, features: out }, null, 1));
      console.log(`
→ ${jsonOut}`);
    }
    return;
  }
  const focal = cal.focalPx;
  const camH = cameraHeightFromFloorSpan(
    focal,
    vz,
    { a: obs.zoneFoot.a, b: obs.zoneFoot.b, mm: knownMm },
    size,
  );
  if (camH === null) {
    console.log("REFUSED — the calibration span did not resolve to a sane camera height.");
    return;
  }
  const cam = floorCamera(focal, vz, camH, size);
  if (!cam) {
    console.log("REFUSED — camera would not build.");
    return;
  }

  console.log(
    `focal ${Math.round(focal)} px (from ${cal.via}) · camera held ${(camH / 1000).toFixed(2)} m above the floor` +
      `  (calibrated on "${obs.zoneName}" = ${(knownMm / 1000).toFixed(2)} m)\n`,
  );

  const wall = (p: Pt) => pointOnWallMm(cam, obs.zoneFoot.a, obs.zoneFoot.b, p);
  const out: Record<string, number> = {};
  for (const f of obs.features) {
    const A = wall(f.a);
    const B = wall(f.b);
    if (!A || !B) {
      console.log(`  ${f.name.padEnd(26)} —      (does not meet the wall plane)`);
      continue;
    }
    const mm = f.kind === "width" ? Math.abs(B[0] - A[0]) : Math.max(A[1], B[1]);
    if (!(mm > 20 && mm < 8000)) {
      console.log(`  ${f.name.padEnd(26)} —      (${Math.round(mm)} mm, out of range)`);
      continue;
    }
    out[f.name] = Math.round(mm);
    console.log(`  ${f.name.padEnd(26)} ${(mm / 1000).toFixed(2)} m   [${f.kind}]`);
  }

  if (jsonOut) {
    writeFileSync(jsonOut, JSON.stringify({ zone: obs.zoneName, cameraHeightMm: Math.round(camH), features: out }, null, 1));
    console.log(`\n→ ${jsonOut}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
