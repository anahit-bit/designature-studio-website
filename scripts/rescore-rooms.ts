/**
 * Replays every CACHED room observation through the current resolver.
 *
 * Free and instant. Reach for this after ANY change to `resolve.ts`,
 * `standards.ts` or `projective.ts`; only a change to the vision PROMPT needs
 * `bench-rooms.ts --force`, which costs money.
 *
 * Usage:
 *   npx tsx scripts/rescore-rooms.ts            # one line per photo
 *   npx tsx scripts/rescore-rooms.ts -v         # every rung, ruler and failure
 *   npx tsx scripts/rescore-rooms.ts -v kitchen # only files matching a substring
 */
import { existsSync, readdirSync, readFileSync } from "fs";
import path from "path";
import { asMetres, resolveMeasurement } from "../services/measure/resolve.js";
import type { CachedRun } from "./bench-rooms.js";

const CACHE_DIR = path.resolve("bench-rooms-out");
const verbose = process.argv.includes("-v");
const filter = process.argv.slice(2).find((a) => !a.startsWith("-"));

if (!existsSync(CACHE_DIR)) {
  console.error(`No cache at ${CACHE_DIR}. Run: npx tsx scripts/bench-rooms.ts`);
  process.exit(1);
}

const runs = readdirSync(CACHE_DIR)
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(path.join(CACHE_DIR, f), "utf-8")) as CachedRun)
  .filter((r) => !filter || r.file.toLowerCase().includes(filter.toLowerCase()))
  .sort((a, b) => a.file.toLowerCase().localeCompare(b.file.toLowerCase()));

const m2 = (mm: number | null) => (mm === null ? "  —  " : (mm / 1000).toFixed(2).padStart(5));

let measured = 0;
let refused = 0;
let unmeasured = 0;
let needsConfirm = 0;

for (const run of runs) {
  const obs = run.observation;
  const m = resolveMeasurement(obs, run.size);
  const name = run.file.length > 42 ? `…${run.file.slice(-41)}` : run.file.padEnd(42);

  if (m.refusal) {
    refused++;
    console.log(`${name}  REFUSED   ${obs.imageKind.padEnd(12)} ${m.refusal.slice(0, 60)}`);
  } else if (m.best) {
    measured++;
    if (m.confirm.required) needsConfirm++;
    console.log(
      `${name}  ${m2(m.best.lengthMm)}×${m2(m.best.widthMm)} m  h${m2(m.ceilingMm)}  ` +
        `run ${m2(m.longestRunMm)}  ${m.best.method.padEnd(7)} ±${String(Math.round(m.best.band * 100)).padStart(2)}%` +
        `${m.confirm.required ? "  ASK" : ""}`,
    );
  } else if (m.longestRunMm !== null) {
    measured++;
    needsConfirm++;
    console.log(
      `${name}  walls only          h${m2(m.ceilingMm)}  run ${m2(m.longestRunMm)}  ` +
        `${(m.rungs.find((r) => !r.failed)?.method ?? "?").padEnd(7)}       ASK`,
    );
  } else {
    unmeasured++;
    console.log(`${name}  no measurement      ${m.confirm.reason.slice(0, 58)}`);
  }

  if (verbose) {
    console.log(
      `      kind=${obs.imageKind} room=${obs.roomType} region=${obs.region} ` +
        `corners=${obs.wallCornersVisible} people=${obs.peopleInFrame} ` +
        `floorPts=${obs.floorBoundary.length} ceilPts=${obs.ceilingBoundary.length} ` +
        `ceilCorner=${obs.ceilingCorner ? "yes" : "no"} ` +
        `lines d/w/v=${obs.depthLines.length}/${obs.widthLines.length}/${obs.verticalLines.length}`,
    );
    for (const r of obs.rulers) {
      console.log(
        `      ruler ${r.standardId.padEnd(24)} c=${r.confidence.toFixed(2)} ` +
          `${r.quad ? "quad" : r.vertical ? "vert" : "span"}  ${r.what.slice(0, 50)}`,
      );
    }
    for (const rung of m.rungs) {
      if (rung.failed) {
        console.log(`      ${rung.method.padEnd(8)} FAILED  ${rung.failed}`);
      } else {
        const runsTxt = rung.wallRunsMm.map((x) => (x / 1000).toFixed(2)).join(" / ");
        console.log(
          `      ${rung.method.padEnd(8)} ${m2(rung.lengthMm)}×${m2(rung.widthMm)} h${m2(rung.ceilingMm)} ` +
            `${rung.extentPartial ? "PARTIAL" : "wrapped"} via ${rung.via}  runs: ${runsTxt || "—"}`,
        );
      }
    }
    const e = obs.modelEstimate;
    console.log(
      `      model guess ${m2(e.lengthMm)}×${m2(e.widthMm)} h${m2(e.ceilingMm)}  ` +
        `disagreement=${m.disagreement === null ? "—" : `${Math.round(m.disagreement * 100)}%`}`,
    );
    console.log(`      confirm: ${m.confirm.required ? "REQUIRED" : "optional"} — ${m.confirm.reason}`);
    console.log("");
  }
}

console.log(
  `\n${runs.length} cached · ${measured} measured · ${needsConfirm} need confirmation · ` +
    `${unmeasured} no measurement · ${refused} refused`,
);
