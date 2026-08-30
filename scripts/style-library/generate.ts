/**
 * Style × Room library generator — builds the visual style-picker grid.
 *
 * Renders one photorealistic room per (style, room) pair so a visitor who
 * cannot name their style can pick one by eye. Every style chip × every room
 * chip = the full grid, generated from the SAME briefs the live tool uses, so
 * what the picker promises is what AI Vision actually delivers.
 *
 * DELIBERATELY NOT the production pipeline. Production EDITS the user's photo
 * and its whole job is to preserve that room's architecture (rulebook RD1-RD7).
 * Here there is no source room and the owner's instruction was explicit — "the
 * architecture does not matter". So this is pure text-to-image, and the
 * architectural constraint block is intentionally absent. The style brief and
 * the room program are shared with production; only the framing differs.
 *
 * Run:
 *   npx tsx scripts/style-library/generate.ts                 # everything missing
 *   npx tsx scripts/style-library/generate.ts --styles "Japandi,Coastal"
 *   npx tsx scripts/style-library/generate.ts --rooms "Living + Dining"
 *   npx tsx scripts/style-library/generate.ts --force         # re-render existing
 *   npx tsx scripts/style-library/generate.ts --concurrency 4
 *   npx tsx scripts/style-library/generate.ts --dry-run       # print plan + cost
 *
 * Resumable: a pair whose PNG already exists is skipped unless --force, so an
 * interrupted run is restarted by re-running the identical command.
 */

import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import {
  STYLE_BRIEFS,
  STYLE_NAME_TO_PRESET,
  ROOM_NAME_TO_TYPE,
  ROOM_TYPE_LABELS,
  type StylePreset,
  type RoomType,
} from "../../services/aiVision/stylePresets.js";
import { ROOM_PROGRAM_RULES } from "../../services/aiVision/promptTemplates.js";
import { VISION_STYLES_FULL, ROOM_TYPES_FULL } from "../../src/components/VisionExperience.js";

// I-006: .env never lives inside a Drive-synced folder, so fall back outside the tree.
const FALLBACK_ENV_PATH = "E:/Secrets/Website/.env";
dotenv.config({ path: fs.existsSync(".env") ? ".env" : FALLBACK_ENV_PATH });

// ── Output location ─────────────────────────────────────────────────────────
// Outside the repo: 150 PNGs would bloat the tree, and these are owner-facing
// review assets that later go to Cloudinary, not source.
const OUT_ROOT = "E:\\Business\\Claude\\_Plan\\Website\\style-room-library";

const MODEL = "gemini-2.5-flash-image";
const ASPECT = "4:3";            // picker cards are landscape
const COST_PER_IMAGE = 0.04;     // measured in the bench harness, Aug 2026

// ── CLI ─────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const has = (name: string) => argv.includes(`--${name}`);

const csv = (v: string | undefined) =>
  v ? v.split(",").map((s) => s.trim()).filter(Boolean) : undefined;

const onlyStyles = csv(flag("styles"));
const onlyRooms = csv(flag("rooms"));
const force = has("force");
const dryRun = has("dry-run");
const concurrency = Math.max(1, Number(flag("concurrency") ?? 3));

const styles = (onlyStyles ?? [...VISION_STYLES_FULL]) as string[];
const rooms = (onlyRooms ?? [...ROOM_TYPES_FULL]) as string[];

// ── Prompt ──────────────────────────────────────────────────────────────────
const slug = (s: string) =>
  s.toLowerCase().replace(/\+/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * Library prompt: style brief + room program + photographic framing.
 *
 * The room program is stated as authoritative over the brief for the same
 * reason production does it — a style brief describes a living room by default,
 * so without this a "Japandi kitchen" comes back as a Japandi lounge.
 */
function buildLibraryPrompt(preset: StylePreset, roomKey: RoomType): string {
  const roomLabel = ROOM_TYPE_LABELS[roomKey];
  return `Photorealistic interior photograph of a ${roomLabel.toLowerCase()}, professionally designed and completely furnished in the style described below. Editorial interior photography: natural daylight from a window, eye-level camera at standing height, a wide but undistorted lens showing the whole room, sharp focus, realistic materials and textures, high detail. No people, no text, no watermark, no visible camera equipment.

ROOM PROGRAM (this rule overrides any furniture examples in the style brief below — the room must be this room type, not the style's default room):
${ROOM_PROGRAM_RULES[roomKey]}

The room is architecturally simple and generic — plain flat walls, one flat ceiling, one or two ordinary windows — so that nothing competes with the style itself. The furniture, materials, colours and lighting carry the whole image.

TARGET STYLE:

${STYLE_BRIEFS[preset]}

Generate the photograph now. It must be immediately recognisable as this style, applied to this room type.`;
}

// ── Job list ────────────────────────────────────────────────────────────────
interface Job {
  style: string;
  room: string;
  preset: StylePreset;
  roomKey: RoomType;
  file: string;
}

const jobs: Job[] = [];
const wiringErrors: string[] = [];

for (const style of styles) {
  const preset = STYLE_NAME_TO_PRESET[style];
  if (!preset) { wiringErrors.push(`style "${style}" has no preset mapping`); continue; }
  for (const room of rooms) {
    const roomKey = ROOM_NAME_TO_TYPE[room];
    if (!roomKey) { wiringErrors.push(`room "${room}" has no room-type mapping`); continue; }
    jobs.push({
      style, room, preset, roomKey,
      file: path.join(OUT_ROOT, slug(style), `${slug(room)}.png`),
    });
  }
}

if (wiringErrors.length) {
  console.error("Refusing to run — unmapped chips would render as the wrong thing:");
  for (const e of new Set(wiringErrors)) console.error("  ·", e);
  process.exit(1);
}

const todo = force ? jobs : jobs.filter((j) => !fs.existsSync(j.file));

console.log(`Style library — ${styles.length} styles × ${rooms.length} rooms = ${jobs.length} images`);
console.log(`Already on disk: ${jobs.length - todo.length} · to generate: ${todo.length}`);
console.log(`Estimated cost: $${(todo.length * COST_PER_IMAGE).toFixed(2)} at $${COST_PER_IMAGE}/image`);
console.log(`Output: ${OUT_ROOT}`);

if (dryRun) {
  for (const j of todo.slice(0, 12)) console.log(`  · ${j.style} / ${j.room} -> ${path.relative(OUT_ROOT, j.file)}`);
  if (todo.length > 12) console.log(`  · … and ${todo.length - 12} more`);
  process.exit(0);
}
if (!todo.length) { console.log("Nothing to do."); process.exit(0); }

// ── Generation ──────────────────────────────────────────────────────────────
const apiKey = process.env.GEMINI_API_KEY ?? "";
if (!apiKey) { console.error("GEMINI_API_KEY is not set."); process.exit(1); }
const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: 180000 } });

let useImageConfig = true;
let done = 0;
const failures: { job: Job; error: string }[] = [];

async function renderOne(job: Job, attempt = 0): Promise<void> {
  const prompt = buildLibraryPrompt(job.preset, job.roomKey);
  const config: any = { temperature: 0.6, responseModalities: ["IMAGE"] };
  if (useImageConfig) config.imageConfig = { aspectRatio: ASPECT };

  let response: any;
  try {
    response = await ai.models.generateContent({
      model: MODEL,
      contents: { parts: [{ text: prompt }] },
      config,
    });
  } catch (err: any) {
    const msg = String(err?.message ?? "").toLowerCase();
    // Same imageConfig fallback production uses — older API builds reject it.
    if (useImageConfig && (msg.includes("imageconfig") || msg.includes("aspect") || msg.includes("unknown field"))) {
      useImageConfig = false;
      return renderOne(job, attempt);
    }
    // Quota / transient: back off and retry twice.
    if (attempt < 2 && (msg.includes("quota") || msg.includes("429") || msg.includes("resource") || msg.includes("unavailable") || msg.includes("timeout"))) {
      await new Promise((r) => setTimeout(r, 4000 * (attempt + 1)));
      return renderOne(job, attempt + 1);
    }
    throw err;
  }

  const parts: any[] = response?.candidates?.[0]?.content?.parts ?? [];
  const img = parts.find((p) => p?.inlineData?.data);
  if (!img) {
    if (attempt < 2) return renderOne(job, attempt + 1);
    throw new Error("no image data returned after retries");
  }

  fs.mkdirSync(path.dirname(job.file), { recursive: true });
  fs.writeFileSync(job.file, Buffer.from(img.inlineData.data, "base64"));
  done++;
  console.log(`  [${done}/${todo.length}] ${job.style} / ${job.room}`);
}

async function main() {
  const queue = [...todo];
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    for (;;) {
      const job = queue.shift();
      if (!job) return;
      try {
        await renderOne(job);
      } catch (err: any) {
        const msg = String(err?.message ?? err);
        failures.push({ job, error: msg });
        console.error(`  [FAIL] ${job.style} / ${job.room} — ${msg}`);
      }
    }
  });
  await Promise.all(workers);

  // Manifest: what exists, so the contact sheet and any later Cloudinary
  // upload read from one place instead of re-walking the tree.
  const manifest = jobs
    .filter((j) => fs.existsSync(j.file))
    .map((j) => ({
      style: j.style, room: j.room, preset: j.preset, roomKey: j.roomKey,
      file: path.relative(OUT_ROOT, j.file).replace(/\\/g, "/"),
      bytes: fs.statSync(j.file).size,
    }));
  fs.writeFileSync(
    path.join(OUT_ROOT, "manifest.json"),
    JSON.stringify({ model: MODEL, aspect: ASPECT, generated: manifest.length, images: manifest }, null, 2),
  );

  console.log(`\nDone. ${done} generated · ${failures.length} failed · ${manifest.length}/${jobs.length} present.`);
  console.log(`Spent about $${(done * COST_PER_IMAGE).toFixed(2)}.`);
  if (failures.length) {
    console.log("Failed pairs (re-run the same command to retry only these):");
    for (const f of failures) console.log(`  · ${f.job.style} / ${f.job.room} — ${f.error}`);
  }
}

void main();
