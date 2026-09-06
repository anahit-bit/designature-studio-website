/**
 * Headless before/after for the 2026-09-04 failure.
 *
 * Runs the REAL pipeline in-process on the owner's photo — no HTTP, no auth, no
 * quota, immune to the port-3000 dev-server war. Same script is run from the
 * "before" worktree (commit 37f8319) and the "after" one, so the only variable
 * is the code.
 *
 *   npx tsx scripts/aivision/verify-2026-09-04.ts <label> <outDir> [runs]
 *
 * Then grades each output by RE-MEASURING it: analyzeRoomStructure on the
 * generated image, diffed against the source. The failure being tested is an
 * invented archway + staircase in a room that has no opening at all, so the
 * opening count is the measurement that matters.
 */
import dotenv from "dotenv";
// Secrets live outside the Drive-synced tree (I-006), and a standalone script
// does not inherit the server's environment.
dotenv.config({ path: String.raw`E:\Secrets\Website\.env` });
import * as fs from "fs";
import * as path from "path";
import { generateConcept } from "../../services/aiVision/generateConcept.js";
import {
  analyzeRoomStructure,
  renderSpatialConstraints,
  type RoomStructure,
} from "../../services/aiVision/spatialAnalysis.js";
import { STYLE_BRIEFS } from "../../services/aiVision/stylePresets.js";
import { pickAccent } from "../../services/aiVision/promptTemplates.js";

const PHOTO = String.raw`E:\Business\Claude\_Inputs\ai-vision\_VAG8650.jpg`;
const STYLE = "trend_2026";
const ROOM = "hallway" as const; // exactly what the owner had selected

// `countOpenings` only exists after the fix; count inline so both sides agree.
const openings = (s: RoomStructure | null) => ({
  windows: s?.windows?.length ?? 0,
  doors: s?.doors?.length ?? 0,
});

async function main() {
  const [label, outDir, runsArg] = process.argv.slice(2);
  if (!label || !outDir) throw new Error("usage: <label> <outDir> [runs]");
  const runs = Number(runsArg ?? 2);
  fs.mkdirSync(outDir, { recursive: true });

  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing — check E:/Secrets/Website/.env");

  const roomPhoto = {
    data: fs.readFileSync(PHOTO).toString("base64"),
    mimeType: "image/jpeg",
  };

  console.log(`\n=== ${label} · ${runs} run(s) · room=${ROOM} · style=${STYLE} ===`);

  const source = await analyzeRoomStructure(roomPhoto);
  const src = openings(source);
  console.log(
    `SOURCE: walls=[${source?.visibleWalls.join(",")}] outOfFrame=[${source?.outOfFrameWalls.join(",")}] ` +
      `windows=${src.windows} doors=${src.doors} detectedRoom=${(source as any)?.detectedRoom ?? "n/a"}`
  );

  const results: any[] = [];
  for (let i = 1; i <= runs; i++) {
    const t0 = Date.now();
    const { url } = await generateConcept({
      roomPhoto,
      styleBrief: STYLE_BRIEFS[STYLE],
      roomType: ROOM,
      spatialConstraints: renderSpatialConstraints(source),
      sourceStructure: source,
      accent: pickAccent(STYLE, i),
      variationSeed: i > 1 ? i : undefined,
    } as any);

    const b64 = url.split(",")[1];
    const file = path.join(outDir, `${label}-run${i}.png`);
    fs.writeFileSync(file, Buffer.from(b64, "base64"));

    // Grade it: re-measure the OUTPUT and diff against the source.
    const out = await analyzeRoomStructure({ data: b64, mimeType: "image/png" });
    const o = openings(out);
    const invented = o.windows > src.windows || o.doors > src.doors;
    const secs = ((Date.now() - t0) / 1000).toFixed(0);

    console.log(
      `RUN ${i} (${secs}s): output windows=${o.windows} doors=${o.doors} | ` +
        `INVENTED OPENING: ${invented ? "YES  <-- FAILURE" : "no"} | ${file}`
    );
    if (out?.summary) console.log(`   output reads as: ${out.summary.slice(0, 220)}`);
    results.push({ run: i, file, source: src, output: o, invented });
  }

  const failures = results.filter((r) => r.invented).length;
  console.log(`\n${label} VERDICT: ${runs - failures}/${runs} preserved the closed shell, ${failures} invented an opening.`);
  fs.writeFileSync(
    path.join(outDir, `${label}-result.json`),
    JSON.stringify({ label, source: src, results }, null, 2)
  );
}

main().catch((e) => {
  console.error("FAILED:", e?.message ?? e);
  process.exit(1);
});
