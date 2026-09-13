/**
 * AI Vision — side-by-side engine comparison on a fixed set of hard rooms.
 *
 * Runs every engine on the SAME photo with the SAME style brief, the SAME
 * measured structure and the SAME accent colour, then writes one HTML page with
 * a row per room and a column per engine, so the owner can judge by eye.
 *
 * Engines are called DIRECTLY (not through generateConcept) so a failure shows
 * up as an empty cell instead of being silently replaced by a fallback engine.
 *
 *   gemini       gemini-2.5-flash-image, production prompt + verify→retry
 *   staging      fal FLUX apartment-staging, its short edit prompt
 *   openai       GPT Image, the same short edit prompt as staging
 *   openai-full  GPT Image, the full Gemini prompt (spatial constraints + rulebook)
 *
 * Outputs are cached per case+engine, so the run can be completed in pieces
 * (e.g. Gemini + staging today, OpenAI once the key exists) and the page is
 * rebuilt from whatever exists.
 *
 * Usage:
 *   npx tsx scripts/aivision-bench/compare-engines.ts --engines gemini,staging
 *   npx tsx scripts/aivision-bench/compare-engines.ts --engines openai,openai-full
 *   npx tsx scripts/aivision-bench/compare-engines.ts --html-only
 *   flags: --run-id engines-01  --style warm_contemporary  --concurrency 3  --only bath-tub,base-room
 *
 * Output: E:\Business\Claude\_Plan\Website\aivision-bench\engine-compare\<runId>\
 *   images\<id>__before.jpg · <id>__<engine>.png · <id>__<engine>__thumb.jpg
 *   meta\<id>__structure.json · <id>__prompts.txt · <id>__<engine>.json
 *   compare.html (relative paths) · compare-embedded.html (self-contained)
 */
import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import sharp from "sharp";
import {
  BENCH_ROOT,
  ensureDir,
  loadImage,
  mapLimit,
  requireGeminiKey,
  stripDataUrl,
} from "./lib.js";
import { extractStyleBrief } from "../../services/aiVision/styleExtraction.js";
import {
  buildGenerationPrompt,
  buildStagingPrompt,
  pickAccent,
} from "../../services/aiVision/promptTemplates.js";
import {
  analyzeRoomStructure,
  renderSpatialConstraints,
  type RoomStructure,
} from "../../services/aiVision/spatialAnalysis.js";
import { generateConceptImage } from "../../services/aiVision/imageGeneration.js";
import { generateConceptImageStaging } from "../../services/aiVision/virtualStaging.js";
import { generateConceptImageOpenAI, openAIImageModel } from "../../services/aiVision/openaiImage.js";
import type { RoomType, StylePreset } from "../../services/aiVision/stylePresets.js";

const args = process.argv.slice(2);
function flag(name: string, fallback?: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  return i !== -1 ? args[i + 1] : fallback;
}
const RUN_ID = flag("run-id", "engines-01")!;
const STYLE = flag("style", "warm_contemporary") as StylePreset;
const CONCURRENCY = Number(flag("concurrency", "3"));
const HTML_ONLY = args.includes("--html-only");
const ENGINES = (flag("engines", "gemini,staging,openai,openai-full") ?? "")
  .split(",").map((s) => s.trim()).filter(Boolean) as EngineId[];
const ONLY = (flag("only") ?? "").split(",").map((s) => s.trim()).filter(Boolean);

type EngineId = "gemini" | "staging" | "openai" | "openai-full";
const ENGINE_LABEL: Record<EngineId, string> = {
  gemini: "Gemini 2.5 Flash Image",
  staging: "fal · FLUX apartment-staging",
  openai: `GPT Image · short edit prompt`,
  "openai-full": `GPT Image · full Gemini prompt`,
};
const ALL_ENGINES: EngineId[] = ["gemini", "staging", "openai", "openai-full"];

/**
 * The ten rooms. Picked from _Inputs\source-rooms for difficulty: four bathrooms
 * (one where ONLY the tub is visible), a raw-plaster single-wall room, a bare
 * hallway that is nothing but a door, a head-on window, a brick fireplace, a
 * dated kitchen and a room that is already furnished.
 */
const SRC = "E:/Business/Claude/_Inputs/source-rooms";
interface Case { id: string; file: string; roomType: RoomType; note: string }
const CASES: Case[] = [
  { id: "bath-tub-only", file: "20220521_144435.jpg", roomType: "bathroom", note: "Bathtub + pink shower curtain, nothing else visible" },
  { id: "bath-cluttered", file: "AB02B4AA-B801-4E8A-B2CD-5B496E4F3DC0.jpeg", roomType: "bathroom", note: "Tub, toilet, basin, marble, clutter" },
  { id: "bath-vanity", file: "BA06F95F-99A7-476F-BD38-D95935F2BD4B.jpeg", roomType: "bathroom", note: "Double vanity, shuttered window, radiator" },
  { id: "bath-stripped", file: "20220521_144431.jpg", roomType: "bathroom", note: "Stripped wall, plumbing stubs, door — mid-renovation" },
  { id: "base-room", file: "base-room.png", roomType: "living_room", note: "Raw plaster, single wall, big window, radiator" },
  { id: "hallway-door", file: "EB69DEAC-336C-4972-979E-DD08679EF266.jpeg", roomType: "hallway", note: "Bare hallway: one door, one switch" },
  { id: "window-city", file: "C7347E96-AECF-42B2-A40E-CD19745C98EF.jpeg", roomType: "living_room", note: "Head-on window with city view, radiator" },
  { id: "fireplace-orange", file: "Screen Shot 2022-05-22 at 9.29.32 PM.png", roomType: "living_room", note: "Orange walls, brick fireplace, two windows" },
  { id: "kitchen-oak", file: "_VAG8535.jpg", roomType: "kitchen", note: "Dated oak kitchen, tiled floor, bar stools" },
  { id: "living-furnished", file: "0338D40E-1D98-43C2-9CB1-4ABAF581FE51.jpeg", roomType: "living_room", note: "Already furnished: sectional sofa, toys, two windows" },
];

const OUT = path.join(BENCH_ROOT, "engine-compare", RUN_ID);
const IMG = ensureDir(path.join(OUT, "images"));
const META = ensureDir(path.join(OUT, "meta"));

interface CellMeta { engine: EngineId; ok: boolean; ms: number; error?: string; at: string; model?: string; promptWords?: number }

async function thumb(src: Buffer, dest: string, width = 1000): Promise<void> {
  await sharp(src).rotate().resize({ width, withoutEnlargement: true }).jpeg({ quality: 78 }).toFile(dest);
}

async function runCase(c: Case, index: number): Promise<void> {
  const room = loadImage(path.join(SRC, c.file));
  const beforePath = path.join(IMG, `${c.id}__before.jpg`);
  if (!existsSync(beforePath)) await thumb(Buffer.from(room.data, "base64"), beforePath, 1400);

  // Shared inputs — identical for every engine.
  const styleBrief = await extractStyleBrief({ referenceImageData: [], fallbackPreset: STYLE });
  const structPath = path.join(META, `${c.id}__structure.json`);
  let structure: RoomStructure | null;
  if (existsSync(structPath)) {
    structure = JSON.parse(readFileSync(structPath, "utf8"));
  } else {
    structure = await analyzeRoomStructure(room);
    writeFileSync(structPath, JSON.stringify(structure, null, 2), "utf8");
  }
  const spatialConstraints = renderSpatialConstraints(structure);
  const accent = pickAccent(STYLE, index); // seeded → the same colour on every engine

  const fullPrompt = buildGenerationPrompt({ styleBrief, roomType: c.roomType, spatialConstraints, accent, structure });
  const shortPrompt = buildStagingPrompt({ styleBrief, roomType: c.roomType, accent });
  writeFileSync(
    path.join(META, `${c.id}__prompts.txt`),
    `# ${c.id} · ${c.roomType} · ${STYLE} · accent ${accent?.name ?? "none"}\n\n## SHORT edit prompt (staging + openai)\n\n${shortPrompt}\n\n## FULL prompt (gemini + openai-full)\n\n${fullPrompt}\n`,
    "utf8"
  );

  for (const engine of ENGINES) {
    const outPng = path.join(IMG, `${c.id}__${engine}.png`);
    const metaPath = path.join(META, `${c.id}__${engine}.json`);
    if (existsSync(outPng)) { console.log(`  skip ${c.id} ${engine} (exists)`); continue; }
    const t0 = Date.now();
    const meta: CellMeta = { engine, ok: false, ms: 0, at: new Date().toISOString() };
    try {
      let url: string;
      if (engine === "gemini") {
        url = await generateConceptImage({ roomPhoto: room, styleBrief, roomType: c.roomType, spatialConstraints, sourceStructure: structure, accent });
        meta.model = "gemini-2.5-flash-image"; meta.promptWords = fullPrompt.split(/\s+/).length;
      } else if (engine === "staging") {
        url = await generateConceptImageStaging({ roomPhoto: room, styleBrief, roomType: c.roomType, accent });
        meta.model = "fal-ai/flux-2-lora-gallery/apartment-staging"; meta.promptWords = shortPrompt.split(/\s+/).length;
      } else {
        const promptMode = engine === "openai-full" ? "full" : "staging";
        url = await generateConceptImageOpenAI({ roomPhoto: room, styleBrief, roomType: c.roomType, spatialConstraints, sourceStructure: structure, accent, promptMode });
        meta.model = openAIImageModel(); meta.promptWords = (promptMode === "full" ? fullPrompt : shortPrompt).split(/\s+/).length;
      }
      const buf = Buffer.from(stripDataUrl(url).data, "base64");
      writeFileSync(outPng, buf);
      await thumb(buf, path.join(IMG, `${c.id}__${engine}__thumb.jpg`));
      meta.ok = true;
    } catch (err: any) {
      meta.error = String(err?.message ?? err);
    }
    meta.ms = Date.now() - t0;
    writeFileSync(metaPath, JSON.stringify(meta, null, 2), "utf8");
    console.log(`  ${meta.ok ? "OK  " : "FAIL"} ${c.id.padEnd(18)} ${engine.padEnd(12)} ${(meta.ms / 1000).toFixed(0)}s${meta.error ? `  — ${meta.error}` : ""}`);
  }
}

function readMeta(id: string, engine: EngineId): CellMeta | null {
  const p = path.join(META, `${id}__${engine}.json`);
  return existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")) as CellMeta) : null;
}

function buildHtml(embed: boolean): string {
  const img = (file: string): string | null => {
    const p = path.join(IMG, file);
    if (!existsSync(p)) return null;
    return embed ? `data:image/jpeg;base64,${readFileSync(p).toString("base64")}` : `images/${file}`;
  };
  const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]!));
  const present = ALL_ENGINES.filter((e) => CASES.some((c) => existsSync(path.join(IMG, `${c.id}__${e}__thumb.jpg`)) || readMeta(c.id, e)));
  const cols = present.length ? present : ALL_ENGINES;

  const rows = CASES.map((c) => {
    const before = img(`${c.id}__before.jpg`);
    const cells = cols.map((e) => {
      const t = img(`${c.id}__${e}__thumb.jpg`);
      const m = readMeta(c.id, e);
      const full = `images/${c.id}__${e}.png`;
      const caption = m
        ? m.ok
          ? `${(m.ms / 1000).toFixed(0)}s · ${m.promptWords ?? "?"}w prompt`
          : `<span class="err">failed: ${esc(m.error ?? "")}</span>`
        : `<span class="pending">not run yet</span>`;
      const body = t
        ? embed ? `<img src="${t}" alt="${e}">` : `<a href="${full}" target="_blank"><img src="${t}" alt="${e}"></a>`
        : `<div class="empty">${m?.ok === false ? "✕" : "…"}</div>`;
      return `<td>${body}<div class="cap">${caption}</div></td>`;
    }).join("");
    const prompts = existsSync(path.join(META, `${c.id}__prompts.txt`)) ? readFileSync(path.join(META, `${c.id}__prompts.txt`), "utf8") : "";
    return `<tr><th scope="row"><div class="id">${esc(c.id)}</div><div class="rt">${esc(c.roomType.replace("_", " "))}</div><div class="note">${esc(c.note)}</div>${before ? `<img src="${before}" alt="source">` : ""}<details><summary>prompts</summary><pre>${esc(prompts)}</pre></details></th>${cells}</tr>`;
  }).join("\n");

  const head = cols.map((e) => `<th>${ENGINE_LABEL[e]}</th>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Engine comparison · ${esc(RUN_ID)}</title>
<style>
body{margin:0;padding:24px;font:14px/1.4 system-ui,sans-serif;background:#fafafa;color:#0B2240}
h1{font-size:20px;margin:0 0 4px}p.sub{margin:0 0 18px;color:#555}
table{border-collapse:separate;border-spacing:8px;width:100%}
th{background:#fff;border:1px solid #e5e5e5;border-radius:6px;padding:10px;text-align:left;vertical-align:top;font-weight:600}
thead th{position:sticky;top:0;z-index:1;font-size:13px}
td{background:#fff;border:1px solid #e5e5e5;border-radius:6px;padding:6px;vertical-align:top;width:${Math.floor(80 / cols.length)}%}
th[scope=row]{width:16%;font-weight:400}
img{width:100%;height:auto;display:block;border-radius:4px}
.id{font-weight:700}.rt{color:#9E5E41;text-transform:capitalize;font-size:12px}.note{font-size:12px;color:#555;margin:2px 0 8px}
.cap{font-size:11px;color:#666;margin-top:4px}.err{color:#b00020}.pending{color:#999}
.empty{aspect-ratio:4/3;display:flex;align-items:center;justify-content:center;color:#bbb;font-size:32px;background:#f3f3f3;border-radius:4px}
details{margin-top:8px;font-size:11px}pre{white-space:pre-wrap;font-size:10px;max-height:320px;overflow:auto;background:#f6f6f6;padding:6px}
</style></head><body>
<h1>Redesign My Room — engine comparison</h1>
<p class="sub">Run <b>${esc(RUN_ID)}</b> · style <b>${esc(STYLE)}</b> · same photo, style brief, measured structure and accent colour on every engine. Gemini runs the production verify→retry loop; the others are single shots. Click an image for full resolution.</p>
<table><thead><tr><th>Source</th>${head}</tr></thead><tbody>
${rows}
</tbody></table></body></html>`;
}

async function main(): Promise<void> {
  if (!HTML_ONLY) {
    requireGeminiKey(); // spatial analysis + style path need it regardless of engine
    const selected = ONLY.length ? CASES.filter((c) => ONLY.includes(c.id)) : CASES;
    console.log(`[compare] ${RUN_ID} · ${selected.length} rooms · engines=${ENGINES.join(",")} · style=${STYLE} → ${OUT}`);
    const results = await mapLimit(selected, CONCURRENCY, (c, i) => runCase(c, CASES.indexOf(c) >= 0 ? CASES.indexOf(c) : i));
    for (const r of results) if (!r.ok) console.error(`[compare] case failed: ${r.error}`);
  }
  writeFileSync(path.join(OUT, "compare.html"), buildHtml(false), "utf8");
  writeFileSync(path.join(OUT, "compare-embedded.html"), buildHtml(true), "utf8");
  console.log(`[compare] wrote ${path.join(OUT, "compare.html")}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
