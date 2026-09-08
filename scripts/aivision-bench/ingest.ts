/**
 * AI VISION STRUCTURE BENCHMARK — step 1: INGEST.
 *
 * Takes whatever the owner drops into `_Inputs\ai-vision\clients\` (any filename,
 * any nesting, duplicates included) and turns it into a clean, stable corpus:
 *
 *   1. Walk the intake folders, dedupe by file hash.
 *   2. Classify each photo with one cheap Gemini call: room type, whether it is a
 *      usable "before" photo, and why not when it isn't.
 *   3. Measure architecture with the product's own analyzeRoomStructure, and derive
 *      camera geometry (single_wall vs multi_wall) — the axis the known failures
 *      split on, so the corpus can be stratified rather than just counted.
 *   4. Copy to corpus/ under a canonical name: C007__bedroom__single_wall.jpg
 *   5. Write manifest.json mapping every canonical id back to its original path.
 *
 * Re-runnable: photos already in the manifest (by hash) are skipped, so you can
 * drop more photos later and only pay for the new ones. Nothing is ever deleted
 * or renamed in place — originals stay untouched in `_Inputs\`.
 *
 * Usage:
 *   npx tsx scripts/aivision-bench/ingest.ts                  # clients/ only
 *   npx tsx scripts/aivision-bench/ingest.ts --include-stock  # + the older _Inputs/ai-vision batches
 *   npx tsx scripts/aivision-bench/ingest.ts --limit 20
 *   npx tsx scripts/aivision-bench/ingest.ts --dry-run        # classify nothing, just list what it sees
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import {
  CORPUS_DIR,
  INTAKE_DIRS,
  MANIFEST_PATH,
  BENCH_ROOT,
  ensureDir,
  listImages,
  loadImage,
  mapLimit,
  parseJsonLoose,
  requireGeminiKey,
  sha256,
  type CorpusEntry,
  type Geometry,
  type Manifest,
} from "./lib.js";
import { analyzeRoomStructure, type RoomStructure } from "../../services/aiVision/spatialAnalysis.js";

const args = process.argv.slice(2);
const includeStock = args.includes("--include-stock");
const dryRun = args.includes("--dry-run");
const limitArg = args.indexOf("--limit");
const LIMIT = limitArg !== -1 ? Number(args[limitArg + 1]) : Infinity;
const CONCURRENCY = 4;

const ROOM_TYPES = [
  "living_room",
  "dining_room",
  "bedroom",
  "kitchen",
  "bathroom",
  "home_office",
  "kids_room",
  "outdoor",
  "hallway",
] as const;

const CLASSIFY_PROMPT = `You are triaging photographs for a benchmark that tests an AI interior-redesign tool.

The tool takes a photo of a REAL, un-styled room and restyles it while preserving the architecture. So a good benchmark photo is an ordinary "before" shot: an empty, bare, dated, or lived-in real room, typically taken on a phone.

Classify this photo. Return STRICT JSON only, no prose, no markdown fences:
{
  "roomType": one of ${ROOM_TYPES.map((r) => `"${r}"`).join(" | ")},
  "spaceKind": "residential" | "commercial" | "outdoor",
  "commercialType": "<e.g. cafe, restaurant, shop, salon, office, lobby — only when spaceKind is commercial, else empty string>",
  "furnishing": "empty" | "partly_furnished" | "fully_furnished",
  "usable": true | false,
  "reason": "<short phrase — required when usable is false>",
  "alreadyStyled": true | false,
  "isRender": true | false
}

"roomType" must be the CLOSEST match from the list even for a commercial or outdoor space — "spaceKind" and "commercialType" carry the real answer.

"furnishing": "empty" = a bare room with no furniture; "partly_furnished" = a few pieces or construction leftovers; "fully_furnished" = lived-in or fully outfitted.

Set "usable" to false ONLY when the photo is: a 3D render or AI-generated image rather than a photograph; a close-up of a single object rather than a space; too dark, blurred, or cropped to read the architecture; or not a space at all (a product shot, a document, a person).

A room that is bare, mid-renovation, under construction, cluttered, or full of furniture is STILL USABLE — those are exactly what real clients photograph.

Set "alreadyStyled" true for a finished, professionally decorated interior (these make the benchmark look easier than reality) — but keep it usable.
Set "isRender" true for CGI, 3D renders, illustrations, or AI-generated images.`;

interface Classification {
  roomType: string;
  spaceKind?: string;
  commercialType?: string;
  furnishing?: string;
  usable: boolean;
  reason?: string;
  alreadyStyled?: boolean;
  isRender?: boolean;
}

/**
 * Room type spelled out in the filename, when the owner named the file. Checked
 * longest-first so "living room" wins over a bare "room".
 */
const FILENAME_HINTS: Array<[RegExp, string]> = [
  [/living[\s_-]*room/i, "living_room"],
  [/dining[\s_-]*room/i, "dining_room"],
  [/kids?[\s_-]*room/i, "kids_room"],
  [/home[\s_-]*office/i, "home_office"],
  [/bedroom/i, "bedroom"],
  [/bathroom|bath\b/i, "bathroom"],
  [/kitchen/i, "kitchen"],
  [/hallway|corridor/i, "hallway"],
  [/balcony|terrace|garden|outdoor|yard/i, "outdoor"],
];

function roomTypeFromFilename(file: string): string | null {
  const base = path.basename(file);
  for (const [re, type] of FILENAME_HINTS) if (re.test(base)) return type;
  return null;
}

/**
 * Derive camera geometry from the measured structure. Mirrors isSingleWallShot()
 * in the product, but keeps "unknown" separate so a failed analysis is never
 * silently counted as a passing multi-wall shot.
 */
function deriveGeometry(s: RoomStructure | null): Geometry {
  if (!s || !Array.isArray(s.visibleWalls) || s.visibleWalls.length === 0) return "unknown";
  const hasLeft = s.visibleWalls.includes("left");
  const hasRight = s.visibleWalls.includes("right");
  if (!hasLeft && !hasRight) return "single_wall";
  return "multi_wall";
}

function loadManifest(): Manifest {
  if (existsSync(MANIFEST_PATH)) {
    return JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as Manifest;
  }
  const now = new Date().toISOString();
  return { createdAt: now, updatedAt: now, entries: [] };
}

async function main(): Promise<void> {
  const apiKey = requireGeminiKey();
  const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: 120000 } });

  ensureDir(BENCH_ROOT);
  ensureDir(CORPUS_DIR);

  const manifest = loadManifest();
  const known = new Set(manifest.entries.map((e) => e.hash));

  const dirs = includeStock ? INTAKE_DIRS : [INTAKE_DIRS[0]];
  const files: string[] = [];
  const seenThisRun = new Set<string>();
  // --include-stock adds the older _Inputs/ai-vision batches, which nest clients/
  // inside them; seenThisRun keeps a photo from being listed twice.
  for (const dir of dirs) {
    for (const f of listImages(dir)) {
      if (seenThisRun.has(f)) continue;
      seenThisRun.add(f);
      files.push(f);
    }
  }

  console.log(`[ingest] scanning: ${dirs.join(", ")}`);
  console.log(`[ingest] found ${files.length} image files; ${manifest.entries.length} already in the corpus.`);

  // Dedupe by content hash — the same photo dropped twice must not become two cases.
  const fresh: Array<{ file: string; hash: string }> = [];
  const hashesThisRun = new Set<string>();
  for (const file of files) {
    const hash = sha256(readFileSync(file).toString("base64"));
    if (known.has(hash) || hashesThisRun.has(hash)) continue;
    hashesThisRun.add(hash);
    fresh.push({ file, hash });
    if (fresh.length >= LIMIT) break;
  }

  console.log(`[ingest] ${fresh.length} new photo(s) to classify.`);
  if (dryRun) {
    for (const f of fresh) console.log(`  would ingest: ${f.file}`);
    return;
  }
  if (fresh.length === 0) return;

  // Next free id continues the existing numbering.
  let nextId =
    manifest.entries.reduce((max, e) => Math.max(max, Number(e.id.replace(/\D/g, "")) || 0), 0) + 1;

  const results = await mapLimit(fresh, CONCURRENCY, async ({ file, hash }) => {
    const img = loadImage(file);

    // One classify call + one structure measurement per photo.
    const resp = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: img.mimeType, data: img.data } },
            { text: CLASSIFY_PROMPT },
          ],
        },
      ],
      config: { responseMimeType: "application/json", temperature: 0.1 },
    });
    const cls = parseJsonLoose<Classification>(resp.text ?? "");
    if (!cls) throw new Error("classification returned unparseable JSON");

    const structure = cls.usable ? await analyzeRoomStructure(img) : null;
    const geometry = deriveGeometry(structure);
    // A filename the owner wrote ("Proj1 Empty Living Room.jpg") beats the model's
    // guess — the classifier read that one as a bedroom, and room type drives
    // ROOM_PROGRAM_RULES, so a mislabel changes what gets generated.
    const hinted = roomTypeFromFilename(file);
    const roomType =
      hinted ??
      ((ROOM_TYPES as readonly string[]).includes(cls.roomType) ? cls.roomType : "living_room");

    return { file, hash, cls, structure, geometry, roomType };
  });

  for (const r of results) {
    if (!r.ok) {
      console.warn(`[ingest] FAILED: ${r.error}`);
      continue;
    }
    const { file, hash, cls, structure, geometry, roomType } = r.value;
    const id = `C${String(nextId++).padStart(3, "0")}`;
    const ext = path.extname(file).toLowerCase();
    const canonical = `${id}__${roomType}__${geometry}${ext}`;
    copyFileSync(file, path.join(CORPUS_DIR, canonical));

    const entry: CorpusEntry = {
      id,
      file: canonical,
      source: file,
      hash,
      roomType,
      geometry,
      spaceKind: cls.spaceKind,
      commercialType: cls.commercialType || undefined,
      furnishing: cls.furnishing,
      usable: Boolean(cls.usable) && !cls.isRender,
      note: cls.usable
        ? cls.alreadyStyled
          ? "already professionally styled — easier than a real before photo"
          : undefined
        : cls.reason || "unusable",
      structure: structure ?? undefined,
    };
    manifest.entries.push(entry);
    const kind = entry.commercialType || entry.spaceKind || "";
    console.log(
      `  ${id}  ${roomType.padEnd(12)} ${geometry.padEnd(12)} ${(entry.furnishing ?? "").padEnd(16)} ${kind.padEnd(12)} ${entry.usable ? "OK " : "SKIP"}  ${path.basename(file)}${entry.note ? `  — ${entry.note}` : ""}`
    );
  }

  manifest.updatedAt = new Date().toISOString();
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");

  // ── Stratification summary — what the corpus actually covers ────────────────
  const usable = manifest.entries.filter((e) => e.usable);
  const byRoom = new Map<string, number>();
  const byGeom = new Map<string, number>();
  for (const e of usable) {
    byRoom.set(e.roomType, (byRoom.get(e.roomType) ?? 0) + 1);
    byGeom.set(e.geometry, (byGeom.get(e.geometry) ?? 0) + 1);
  }
  console.log(`\n[ingest] corpus: ${usable.length} usable / ${manifest.entries.length} total`);
  console.log(`[ingest] by room type: ${[...byRoom].map(([k, v]) => `${k}=${v}`).join("  ")}`);
  console.log(`[ingest] by geometry:  ${[...byGeom].map(([k, v]) => `${k}=${v}`).join("  ")}`);
  console.log(`[ingest] manifest → ${MANIFEST_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
