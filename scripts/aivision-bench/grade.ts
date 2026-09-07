/**
 * AI VISION STRUCTURE BENCHMARK — step 3: GRADE.
 *
 * Two independent graders per case, because neither is trustworthy alone:
 *
 *   Tier 1 — MEASURED. Re-runs the product's own analyzeRoomStructure on the
 *   OUTPUT image and diffs it against the source structure. Produces numbers, not
 *   opinions: window count delta, window centre drift, width-fraction drift
 *   (widening), door delta, and invented-wall detection (a wall the source
 *   reported as out-of-frame showing up as visible in the output — the exact
 *   head-on-bedroom failure). Note this measurement is itself a model call and is
 *   noisy run-to-run, which is why it is not the only grader.
 *
 *   Tier 2 — JUDGED. One call with before and after side by side against a fixed
 *   rubric, returning per-dimension pass/fail plus a one-line reason.
 *
 * The two are then reconciled into a verdict. DISAGREE is a first-class outcome,
 * not an error: those cases go to the top of the human review queue, because a
 * grader that quietly disagrees with itself is how a benchmark starts lying.
 *
 * Usage:
 *   npx tsx scripts/aivision-bench/grade.ts --run-id pilot-01
 *   npx tsx scripts/aivision-bench/grade.ts --run-id pilot-01 --concurrency 4
 */
import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import {
  RUNS_DIR,
  loadImage,
  mapLimit,
  parseJsonLoose,
  requireGeminiKey,
} from "./lib.js";
import {
  analyzeRoomStructure,
  spatialMetrics,
  type RoomStructure,
  type Surface,
} from "../../services/aiVision/spatialAnalysis.js";
import type { CaseResult } from "./run.js";

const args = process.argv.slice(2);
function flag(name: string, fallback?: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  return i !== -1 ? args[i + 1] : fallback;
}
const RUN_ID = flag("run-id");
const CONCURRENCY = Number(flag("concurrency", "4"));
if (!RUN_ID) throw new Error("--run-id is required.");

// Thresholds. Deliberately loose — the goal is to catch real structural breakage,
// not to punish the restyle for moving a curtain. Tighten only with evidence.
const CENTRE_DRIFT_TOL = 0.08; // normalized image widths
const WIDTH_FRAC_TOL = 0.12; // matches PROPORTION_TOLERANCE in imageGeneration.ts

const JUDGE_PROMPT = `You are auditing an AI interior-redesign tool. You will see TWO images of the SAME room:
  IMAGE 1 = the original photograph (the "before").
  IMAGE 2 = the AI-restyled version (the "after").

The tool is ALLOWED to change: furniture, rugs, textiles, lighting fixtures, decor, art, plants, paint colour, and floor/wall FINISHES.

The tool is FORBIDDEN from changing the room's ARCHITECTURE. Judge only that.

For each dimension answer pass/fail strictly against IMAGE 1:

  "windows"      — check EACH of these and fail the dimension if ANY of them fails:
                     (a) every window and balcony door in IMAGE 1 is still present, and no new one was added;
                     (b) it is in the same position on the same wall;
                     (c) it is the same size relative to the wall;
                     (d) it is the same SHAPE with the same subdivisions — count the panes/sashes and the glazing bars in IMAGE 1 and confirm IMAGE 2 has the same count and layout; an arch must keep the same arch, springing from the same height;
                     (e) it is unobstructed — PARTIAL obstruction counts as a failure, including a headboard, sofa back, cabinet, or shelving rising in front of any part of the glazing;
                     (f) it is still real glazing with daylight or a view, not opaque or painted over.
                   Look closely: a window that is still roughly "there" but has lost a sash, changed its glazing-bar pattern, shifted its arch, or sits behind a headboard is a FAIL, not a pass.
  "doors"        — same test for doors and doorways. FAIL if a doorway was added, removed, or relocated.
  "walls"        — the same walls are visible from the same viewpoint. FAIL if a wall was added that IMAGE 1 does not show (a common failure: a head-on photo of one wall is opened out into a 3D room with invented side walls), or if a wall was removed or repositioned.
  "proportions"  — the room's proportions and the camera framing match. FAIL if the room was made wider, deeper, or taller, or if the camera appears pulled back / zoomed out so the room reads bigger.
  "ceiling"      — the ceiling is the same single flat plane. FAIL if beams, bulkheads, soffits, coffers, or a tray ceiling were invented.
  "no_new_arch"  — no built-in architecture was invented: no columns, pilasters, partition walls, glazed/Crittall dividers, recessed niches, arches, or platforms that IMAGE 1 does not have. A television or shelf sunk into a new panelled recess or built-out feature wall IS invented architecture. Flat cladding applied to an existing wall (stone, tile, slats, panelling, wallpaper) is a FINISH and passes, as long as the wall stays in its plane. Freestanding furniture does NOT count as architecture.
  "furniture_cleared" — every LOOSE item from IMAGE 1 (sofas, chairs, beds, tables, freestanding shelving, rugs, curtains, lamps, plants, pictures, clutter) is gone and replaced with different pieces in a different arrangement. FAIL if a recognisable original piece survives — including one that was merely refinished or recoloured in place — or if the original layout was reused. Genuinely built-in joinery (fitted kitchen run, fitted wardrobe, built-in banquette, reception counter) is EXEMPT: it is supposed to stay, refinished, and its presence is not a failure.
  "inhabited"    — the result is a complete, lived-in room for its purpose, not a near-empty shell with one or two pieces. FAIL if the space reads as unfurnished, staged-thin, or missing the basics its room type needs.

Return STRICT JSON only, no prose, no markdown fences:
{
  "windows":     {"pass": true|false, "reason": "<max 15 words>"},
  "doors":       {"pass": true|false, "reason": "<max 15 words>"},
  "walls":       {"pass": true|false, "reason": "<max 15 words>"},
  "proportions": {"pass": true|false, "reason": "<max 15 words>"},
  "ceiling":     {"pass": true|false, "reason": "<max 15 words>"},
  "no_new_arch": {"pass": true|false, "reason": "<max 15 words>"},
  "furniture_cleared": {"pass": true|false, "reason": "<max 15 words>"},
  "inhabited":   {"pass": true|false, "reason": "<max 15 words>"},
  "severity": "none" | "minor" | "major",
  "headline": "<one sentence: the single worst structural problem, or 'structure preserved'>"
}

"severity": "none" when every dimension passes; "minor" when a change is visible but a client would accept it; "major" when the room is no longer recognisably the same room.

Be strict and literal. Do not credit the tool for a beautiful result — a gorgeous room with a moved window is a FAIL.`;

const DIMENSIONS = [
  "windows", "doors", "walls", "proportions", "ceiling", "no_new_arch",
  "furniture_cleared", "inhabited",
] as const;
type Dimension = (typeof DIMENSIONS)[number];

interface JudgeVerdict {
  severity: "none" | "minor" | "major";
  headline: string;
  [k: string]: any;
}

interface MeasuredDiff {
  ok: boolean;
  note?: string;
  windowCountDelta?: number;
  doorCountDelta?: number;
  centreDrift?: number;
  widthFracDelta?: number;
  inventedWalls?: Surface[];
  flags: string[];
}

/** Largest window by area — the one both AI-029 and the eye anchor on. */
function primaryWindow(s: RoomStructure | null) {
  if (!s?.windows?.length) return null;
  return [...s.windows].sort((a, b) => {
    const area = (w: typeof a) => (w.box[2] - w.box[0]) * (w.box[3] - w.box[1]);
    return area(b) - area(a);
  })[0];
}

function measure(source: RoomStructure | null, output: RoomStructure | null): MeasuredDiff {
  const flags: string[] = [];
  if (!source || !output) {
    return { ok: false, note: "structure analysis unavailable on one side", flags: ["unmeasurable"] };
  }

  const windowCountDelta = output.windows.length - source.windows.length;
  const doorCountDelta = output.doors.length - source.doors.length;
  if (windowCountDelta < 0) flags.push("window_lost");
  if (windowCountDelta > 0) flags.push("window_invented");
  if (doorCountDelta < 0) flags.push("door_lost");
  if (doorCountDelta > 0) flags.push("door_invented");

  // A wall the source explicitly reported as out of frame, now visible = invented.
  const inventedWalls = (source.outOfFrameWalls ?? []).filter((w) =>
    (output.visibleWalls ?? []).includes(w)
  );
  if (inventedWalls.length) flags.push("wall_invented");

  const ps = primaryWindow(source);
  const po = primaryWindow(output);
  let centreDrift: number | undefined;
  let widthFracDelta: number | undefined;
  if (ps && po) {
    const c = (b: number[]) => [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
    const [sx, sy] = c(ps.box);
    const [ox, oy] = c(po.box);
    centreDrift = Math.hypot(ox - sx, oy - sy);
    if (centreDrift > CENTRE_DRIFT_TOL) flags.push("window_moved");

    const sm = spatialMetrics(source);
    const om = spatialMetrics(output);
    if (sm?.windowWidthFrac != null && om?.windowWidthFrac != null) {
      widthFracDelta = om.windowWidthFrac - sm.windowWidthFrac;
      // Negative = window shrank as a share of frame = the room was widened.
      if (widthFracDelta < -WIDTH_FRAC_TOL) flags.push("room_widened");
      if (widthFracDelta > WIDTH_FRAC_TOL) flags.push("window_enlarged");
    }
  }

  return {
    ok: flags.length === 0,
    windowCountDelta,
    doorCountDelta,
    centreDrift,
    widthFracDelta,
    inventedWalls,
    flags,
  };
}

async function main(): Promise<void> {
  const apiKey = requireGeminiKey();
  const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: 120000 } });

  const runDir = path.join(RUNS_DIR, RUN_ID!);
  const runPath = path.join(runDir, "run.json");
  if (!existsSync(runPath)) throw new Error(`No such run: ${runPath}`);
  const run = JSON.parse(readFileSync(runPath, "utf8")) as { cases: CaseResult[] };
  const cases = run.cases.filter((c) => c.ok && c.afterFile);

  console.log(`[grade] ${RUN_ID} — grading ${cases.length} case(s), concurrency=${CONCURRENCY}`);

  const graded = await mapLimit(cases, CONCURRENCY, async (c) => {
    const imgDir = path.join(runDir, "images");
    const before = loadImage(path.join(imgDir, c.beforeFile!));
    const after = loadImage(path.join(imgDir, c.afterFile!));

    // ── Tier 1: measured ──
    const outputStructure = await analyzeRoomStructure(after);
    const measured = measure(c.sourceStructure ?? null, outputStructure);

    // ── Tier 2: judged ──
    const resp = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: "IMAGE 1 — the original photograph:" },
            { inlineData: { mimeType: before.mimeType, data: before.data } },
            { text: "IMAGE 2 — the AI-restyled version:" },
            { inlineData: { mimeType: after.mimeType, data: after.data } },
            { text: JUDGE_PROMPT },
          ],
        },
      ],
      config: { responseMimeType: "application/json", temperature: 0.1 },
    });
    const judge = parseJsonLoose<JudgeVerdict>(resp.text ?? "");

    const judgeFails = judge
      ? DIMENSIONS.filter((d) => judge[d] && judge[d].pass === false)
      : [];
    const judgeSaysBad = judge ? judge.severity !== "none" : false;
    const measuredSaysBad = !measured.ok;

    // Reconcile. DISAGREE surfaces the cases where the graders contradict each
    // other — reviewed FIRST, since they are also how the graders get validated.
    let verdict: "PASS" | "FAIL" | "DISAGREE" | "UNGRADED";
    if (!judge) verdict = "UNGRADED";
    else if (judgeSaysBad && measuredSaysBad) verdict = "FAIL";
    else if (!judgeSaysBad && !measuredSaysBad) verdict = "PASS";
    else verdict = "DISAGREE";

    return {
      id: c.id,
      style: c.style,
      roomType: c.roomType,
      geometry: c.geometry,
      beforeFile: c.beforeFile,
      afterFile: c.afterFile,
      verdict,
      measured,
      judge: judge
        ? {
            severity: judge.severity,
            headline: judge.headline,
            failedDimensions: judgeFails,
            reasons: Object.fromEntries(
              judgeFails.map((d) => [d, judge[d]?.reason ?? ""])
            ),
          }
        : null,
    };
  });

  const rows = graded.filter((g) => g.ok).map((g) => g.value);
  writeFileSync(
    path.join(runDir, "scorecard.json"),
    JSON.stringify({ runId: RUN_ID, gradedAt: new Date().toISOString(), rows }, null, 2),
    "utf8"
  );

  // ── Report ─────────────────────────────────────────────────────────────────
  const tally = (pred: (r: (typeof rows)[number]) => boolean) => rows.filter(pred).length;
  const flagCounts = new Map<string, number>();
  for (const r of rows) {
    for (const f of r.measured.flags) flagCounts.set(f, (flagCounts.get(f) ?? 0) + 1);
    for (const d of r.judge?.failedDimensions ?? []) {
      const k = `judge:${d}`;
      flagCounts.set(k, (flagCounts.get(k) ?? 0) + 1);
    }
  }

  const lines: string[] = [];
  lines.push(`# AI Vision structure benchmark — ${RUN_ID}`);
  lines.push("");
  lines.push(`Graded ${rows.length} case(s).`);
  lines.push("");
  lines.push(`| Verdict | Count |`);
  lines.push(`|---|---|`);
  lines.push(`| PASS (both graders clean) | ${tally((r) => r.verdict === "PASS")} |`);
  lines.push(`| FAIL (both graders flag it) | ${tally((r) => r.verdict === "FAIL")} |`);
  lines.push(`| DISAGREE (review first) | ${tally((r) => r.verdict === "DISAGREE")} |`);
  lines.push(`| UNGRADED | ${tally((r) => r.verdict === "UNGRADED")} |`);
  lines.push("");
  lines.push(`## Failure taxonomy`);
  lines.push("");
  lines.push(`| Signal | Cases |`);
  lines.push(`|---|---|`);
  for (const [k, v] of [...flagCounts].sort((a, b) => b[1] - a[1])) {
    lines.push(`| ${k} | ${v} |`);
  }
  lines.push("");
  lines.push(`## By room type`);
  lines.push("");
  lines.push(`| Room type | Cases | Failing |`);
  lines.push(`|---|---|---|`);
  const roomTypes = [...new Set(rows.map((r) => r.roomType))].sort();
  for (const rt of roomTypes) {
    const sub = rows.filter((r) => r.roomType === rt);
    lines.push(`| ${rt} | ${sub.length} | ${sub.filter((r) => r.verdict !== "PASS").length} |`);
  }
  lines.push("");
  lines.push(`## By camera geometry`);
  lines.push("");
  lines.push(`| Geometry | Cases | Failing |`);
  lines.push(`|---|---|---|`);
  for (const g of [...new Set(rows.map((r) => r.geometry))].sort()) {
    const sub = rows.filter((r) => r.geometry === g);
    lines.push(`| ${g} | ${sub.length} | ${sub.filter((r) => r.verdict !== "PASS").length} |`);
  }
  lines.push("");
  lines.push(`## Cases`);
  lines.push("");
  lines.push(`| Case | Room | Geometry | Style | Verdict | Severity | Measured flags | Headline |`);
  lines.push(`|---|---|---|---|---|---|---|---|`);
  const order = { DISAGREE: 0, FAIL: 1, UNGRADED: 2, PASS: 3 } as const;
  for (const r of [...rows].sort((a, b) => order[a.verdict] - order[b.verdict])) {
    lines.push(
      `| ${r.id} | ${r.roomType} | ${r.geometry} | ${r.style} | ${r.verdict} | ${r.judge?.severity ?? "—"} | ${r.measured.flags.join(", ") || "—"} | ${r.judge?.headline ?? "—"} |`
    );
  }
  const reportPath = path.join(runDir, "report.md");
  writeFileSync(reportPath, lines.join("\n"), "utf8");

  console.log(`\n${lines.slice(0, 14).join("\n")}`);
  console.log(`\n[grade] scorecard → ${path.join(runDir, "scorecard.json")}`);
  console.log(`[grade] report    → ${reportPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
