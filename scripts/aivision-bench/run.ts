/**
 * AI VISION STRUCTURE BENCHMARK — step 2: RUN.
 *
 * Executes the REAL pipeline over the corpus, exactly as
 * POST /api/ai-vision/generate does it:
 *
 *   Step 1    extractStyleBrief  (preset path — no reference image)
 *   Step 1.5  analyzeRoomStructure + renderSpatialConstraints   (AI-029)
 *   Step 2    generateConcept    (improved Gemini by default)
 *
 * Deliberately NOT going through HTTP: no auth, no quota decrement, and no risk
 * of another worktree's dev server answering on port 3000.
 *
 * Every case writes three files into runs/<runId>/images/, so before/after pairs
 * can be reviewed side by side without cross-referencing anything:
 *   C007__japandi__before.jpg
 *   C007__japandi__after.png
 *   C007__japandi__meta.json      (style brief, structure, timings, errors)
 *
 * Usage:
 *   npx tsx scripts/aivision-bench/run.ts --limit 20
 *   npx tsx scripts/aivision-bench/run.ts --styles japandi,minimalist
 *   npx tsx scripts/aivision-bench/run.ts --run-id pilot-01 --concurrency 4
 *   npx tsx scripts/aivision-bench/run.ts --only C003,C007
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import {
  CORPUS_DIR,
  MANIFEST_PATH,
  RUNS_DIR,
  ensureDir,
  loadImage,
  mapLimit,
  requireGeminiKey,
  stripDataUrl,
  type CorpusEntry,
  type Manifest,
} from "./lib.js";
import { extractStyleBrief } from "../../services/aiVision/styleExtraction.js";
import { pickAccent } from "../../services/aiVision/promptTemplates.js";
import {
  analyzeRoomStructure,
  renderSpatialConstraints,
  type RoomStructure,
} from "../../services/aiVision/spatialAnalysis.js";
import { generateConcept } from "../../services/aiVision/generateConcept.js";
import type { RoomType, StylePreset } from "../../services/aiVision/stylePresets.js";

const args = process.argv.slice(2);
function flag(name: string, fallback?: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  return i !== -1 ? args[i + 1] : fallback;
}

const LIMIT = Number(flag("limit", "20"));
const CONCURRENCY = Number(flag("concurrency", "4"));
const RUN_ID = flag("run-id") ?? `run-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}`;
const ONLY = (flag("only") ?? "").split(",").map((s) => s.trim()).filter(Boolean);

/**
 * Styles rotate across cases rather than multiplying them: the bedroom
 * investigation already established room type, not style, as the failure axis,
 * so spending the budget on more ROOMS beats more style permutations.
 */
// Entries may be a bare style ("japandi") to add to the rotation, or a pinned
// "C068=warm_contemporary" pair. Pinning is what makes a re-test honest: after a
// prompt change you want the SAME photo under the SAME style, not a new roll.
const STYLE_ARG = (flag("styles") ?? "japandi,minimalist,warm_contemporary")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const PINNED: Record<string, StylePreset> = {};
const STYLES: StylePreset[] = [];
for (const entry of STYLE_ARG) {
  const eq = entry.indexOf("=");
  if (eq === -1) STYLES.push(entry as StylePreset);
  else PINNED[entry.slice(0, eq).trim()] = entry.slice(eq + 1).trim() as StylePreset;
}
if (STYLES.length === 0) STYLES.push("japandi");

export interface CaseResult {
  id: string;
  corpusFile: string;
  roomType: string;
  geometry: string;
  style: string;
  ok: boolean;
  error?: string;
  engine?: string;
  ms?: number;
  beforeFile?: string;
  afterFile?: string;
  /** Structure measured on the SOURCE — the grader diffs the output against this. */
  sourceStructure?: RoomStructure | null;
  hadSpatialConstraints?: boolean;
}

async function main(): Promise<void> {
  requireGeminiKey();

  if (!existsSync(MANIFEST_PATH)) {
    throw new Error(`No corpus yet — run ingest.ts first (looked for ${MANIFEST_PATH}).`);
  }
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as Manifest;

  let corpus: CorpusEntry[] = manifest.entries.filter((e) => e.usable);
  if (ONLY.length) corpus = corpus.filter((e) => ONLY.includes(e.id));

  // Stratify: interleave room types so a truncated run still covers the spread
  // rather than 20 consecutive living rooms.
  const byType = new Map<string, CorpusEntry[]>();
  for (const e of corpus) {
    if (!byType.has(e.roomType)) byType.set(e.roomType, []);
    byType.get(e.roomType)!.push(e);
  }
  const interleaved: CorpusEntry[] = [];
  for (let i = 0; interleaved.length < corpus.length; i++) {
    for (const list of byType.values()) if (list[i]) interleaved.push(list[i]);
  }
  const selected = interleaved.slice(0, LIMIT);

  const runDir = ensureDir(path.join(RUNS_DIR, RUN_ID));
  const imgDir = ensureDir(path.join(runDir, "images"));

  console.log(`[run] ${RUN_ID} — ${selected.length} case(s), styles=${STYLES.join("/")}, concurrency=${CONCURRENCY}`);
  console.log(`[run] engine=${process.env.AI_VISION_ENGINE || "gemini (default)"} → ${runDir}`);

  const started = Date.now();
  const outcomes = await mapLimit(selected, CONCURRENCY, async (entry, index) => {
    const style = PINNED[entry.id] ?? STYLES[index % STYLES.length];
    const t0 = Date.now();
    const result: CaseResult = {
      id: entry.id,
      corpusFile: entry.file,
      roomType: entry.roomType,
      geometry: entry.geometry,
      style,
      ok: false,
    };

    const srcPath = path.join(CORPUS_DIR, entry.file);
    const room = loadImage(srcPath);

    try {
      // Step 1 — style brief (preset path: no reference image overrides it).
      const styleBrief = await extractStyleBrief({
        referenceImageData: [],
        fallbackPreset: style,
      });

      // Step 1.5 — spatial grounding. Reuse the structure measured at ingest so
      // repeat runs of the same corpus are comparable AND cheaper.
      const structure =
        (entry.structure as RoomStructure | undefined) ?? (await analyzeRoomStructure(room));
      const spatialConstraints = renderSpatialConstraints(structure ?? null);

      // Step 2 — the concept image. The accent is picked HERE exactly as
      // server.ts does it, so the benchmarked prompt is the production prompt.
      // It matters: on the staging engine, prompt length costs fidelity to the
      // source photo, and the accent line is part of that length.
      const accent = pickAccent(style, undefined, undefined);
      const { url, engine } = await generateConcept({
        roomPhoto: room,
        styleBrief,
        roomType: entry.roomType as RoomType,
        spatialConstraints,
        sourceStructure: structure ?? null,
        accent,
      });

      const { data } = stripDataUrl(url);
      const base = `${entry.id}__${style}`;
      const beforeName = `${base}__before${path.extname(entry.file)}`;
      const afterName = `${base}__after.png`;
      copyFileSync(srcPath, path.join(imgDir, beforeName));
      writeFileSync(path.join(imgDir, afterName), Buffer.from(data, "base64"));
      writeFileSync(
        path.join(imgDir, `${base}__meta.json`),
        JSON.stringify({ styleBrief, structure, engine }, null, 2),
        "utf8"
      );

      result.ok = true;
      result.engine = engine;
      result.beforeFile = beforeName;
      result.afterFile = afterName;
      result.sourceStructure = structure ?? null;
      result.hadSpatialConstraints = Boolean(spatialConstraints);
    } catch (err: any) {
      result.error = String(err?.message ?? err);
    }
    result.ms = Date.now() - t0;
    console.log(
      `  ${result.ok ? "OK  " : "FAIL"} ${entry.id} ${entry.roomType.padEnd(12)} ${entry.geometry.padEnd(12)} ${style.padEnd(18)} ${result.ms}ms${result.error ? `  — ${result.error}` : ""}`
    );
    return result;
  });

  const cases = outcomes.map((o) =>
    o.ok ? o.value : ({ ok: false, error: o.error } as unknown as CaseResult)
  );
  const okCount = cases.filter((c) => c.ok).length;

  writeFileSync(
    path.join(runDir, "run.json"),
    JSON.stringify(
      {
        runId: RUN_ID,
        startedAt: new Date(started).toISOString(),
        finishedAt: new Date().toISOString(),
        engine: process.env.AI_VISION_ENGINE || "gemini",
        styles: STYLES,
        cases,
      },
      null,
      2
    ),
    "utf8"
  );

  console.log(
    `\n[run] ${okCount}/${cases.length} generated in ${Math.round((Date.now() - started) / 1000)}s → ${path.join(runDir, "run.json")}`
  );
  console.log(`[run] next: npx tsx scripts/aivision-bench/grade.ts --run-id ${RUN_ID}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
