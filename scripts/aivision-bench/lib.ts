/**
 * AI VISION STRUCTURE BENCHMARK — shared plumbing.
 *
 * A headless harness that runs the REAL "Redesign My Room" pipeline
 * (extractStyleBrief → analyzeRoomStructure → generateConcept — the same chain
 * as POST /api/ai-vision/generate) over a fixed corpus of room photos, then
 * grades every output for structure preservation.
 *
 * Headless on purpose: no sign-in, no quota decrement, and immune to the port-3000
 * dev-server war that makes localhost serve another worktree's code.
 *
 * Corpus and results live OUTSIDE the git repo — client photos are private and
 * 100 PNGs would bloat the tree:
 *   inputs   E:\Business\Claude\_Inputs\ai-vision\clients\        (owner drops here)
 *   corpus   E:\Business\Claude\_Plan\Website\aivision-bench\corpus\   (renamed, canonical)
 *   runs     E:\Business\Claude\_Plan\Website\aivision-bench\runs\<runId>\
 */
import dotenv from "dotenv";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "fs";
import path from "path";
import { createHash } from "crypto";

// ── Env (mirror server.ts: local .env first, then the Secrets fallback) ───────
const FALLBACK_ENV_PATH = "E:/Secrets/Website/.env";
dotenv.config({
  path: existsSync(".env") ? ".env" : existsSync(FALLBACK_ENV_PATH) ? FALLBACK_ENV_PATH : undefined,
});

export function requireGeminiKey(): string {
  const k = (process.env.GEMINI_API_KEY ?? "").trim();
  if (!k) throw new Error("GEMINI_API_KEY is not set (checked .env and E:/Secrets/Website/.env).");
  return k;
}

// ── Paths ────────────────────────────────────────────────────────────────────
//
// Everything is scoped to a PACK — one batch of photos the owner hands over.
// Pack 1 is the first client batch; pack 2 will be the next. Each pack keeps its
// own corpus, manifest and runs, so two packs can be compared without their
// numbering or results ever mixing.
//
//   _Inputs\ai-vision\clients\<pack>\            ← owner drops photos here
//   _Plan\Website\aivision-bench\<pack>\corpus\  ← renamed, canonical
//   _Plan\Website\aivision-bench\<pack>\runs\<runId>\
//
// Override with --pack "<name>" on any script; "stock" is the pre-client batch
// scraped from the older _Inputs\ai-vision\<n>\ folders.
export const BENCH_ROOT = "E:/Business/Claude/_Plan/Website/aivision-bench";
export const CLIENTS_ROOT = "E:/Business/Claude/_Inputs/ai-vision/clients";
export const STOCK_ROOT = "E:/Business/Claude/_Inputs/ai-vision";

function argPack(): string {
  const i = process.argv.indexOf("--pack");
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : "pack 1";
}

export const PACK = argPack();
export const PACK_ROOT = path.join(BENCH_ROOT, PACK);
export const CORPUS_DIR = path.join(PACK_ROOT, "corpus");
export const RUNS_DIR = path.join(PACK_ROOT, "runs");
export const MANIFEST_PATH = path.join(PACK_ROOT, "manifest.json");
/** Where this pack's photos come from. "stock" reads the legacy numbered batches. */
export const INTAKE_DIRS =
  PACK === "stock" ? [STOCK_ROOT] : [path.join(CLIENTS_ROOT, PACK)];

export function ensureDir(p: string): string {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
  return p;
}

// ── Image helpers ────────────────────────────────────────────────────────────
export const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);
export const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export interface LoadedImage {
  data: string; // base64, no prefix
  mimeType: string;
}

export function loadImage(file: string): LoadedImage {
  const ext = path.extname(file).toLowerCase();
  const mimeType = MIME[ext];
  if (!mimeType) throw new Error(`Unsupported image extension: ${file}`);
  return { data: readFileSync(file).toString("base64"), mimeType };
}

export function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

/**
 * Every image file under `dir`, recursively, sorted for stable ordering.
 *
 * DIRECTORIES whose name starts with "_" are skipped. `_outputs` inside an
 * intake folder is a junction pointing at that pack's generated results, put
 * there so the owner finds them beside their photos — walking into it would
 * re-ingest our own renders as if they were new client rooms. The test is on
 * directories only: the owner's own camera exports are named `_VAG8469.jpg`.
 */
export function listImages(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      if (entry.startsWith("_")) continue;
      out.push(...listImages(full));
    }
    else if (IMAGE_EXT.has(path.extname(entry).toLowerCase())) out.push(full);
  }
  return out.sort();
}

/** Strip a `data:<mime>;base64,` prefix if present. */
export function stripDataUrl(url: string): { data: string; mimeType: string } {
  const m = url.match(/^data:([^;]+);base64,(.+)$/s);
  if (!m) throw new Error("Not a base64 data URL.");
  return { mimeType: m[1], data: m[2] };
}

// ── Corpus taxonomy ──────────────────────────────────────────────────────────
/** Camera geometry — the axis the known failure modes split on. */
export type Geometry = "single_wall" | "multi_wall" | "unknown";

export interface CorpusEntry {
  /** Canonical id, e.g. "C007". Stable across runs — the benchmark's primary key. */
  id: string;
  /** Canonical filename inside corpus/, e.g. "C007__bedroom__single_wall.jpg". */
  file: string;
  /** Original path the photo arrived at, so nothing is ever lost. */
  source: string;
  /** SHA-256 of the file bytes — dedupe key. */
  hash: string;
  roomType: string;
  geometry: Geometry;
  /** residential | commercial | outdoor. The card only has residential room types. */
  spaceKind?: string;
  /** cafe / shop / office / lobby … when spaceKind is commercial. */
  commercialType?: string;
  /** empty | partly_furnished | fully_furnished — the clear-the-room axis. */
  furnishing?: string;
  /** Model's confidence that this is a real "before" photo worth benchmarking. */
  usable: boolean;
  /** Why it was excluded, when usable === false. */
  note?: string;
  /** Measured architecture from analyzeRoomStructure, cached at ingest. */
  structure?: unknown;
}

export interface Manifest {
  createdAt: string;
  updatedAt: string;
  entries: CorpusEntry[];
}

// ── Bounded concurrency ──────────────────────────────────────────────────────
/**
 * Outcome of one task. Kept as a single shape rather than a discriminated union
 * because this repo's tsconfig has strictNullChecks off, which disables
 * narrowing on a boolean discriminant.
 */
export interface TaskResult<R> {
  ok: boolean;
  value?: R;
  error?: string;
}

/**
 * Run `worker` over `items` with at most `limit` in flight. Failures are
 * captured per item rather than aborting the batch — one bad photo must never
 * cost the whole run.
 */
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<Array<TaskResult<R>>> {
  const results: Array<TaskResult<R>> = new Array(items.length);
  let next = 0;
  async function pump(): Promise<void> {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      try {
        results[i] = { ok: true, value: await worker(items[i], i) };
      } catch (err: any) {
        results[i] = { ok: false, error: String(err?.message ?? err) };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, pump));
  return results;
}

// ── Gemini JSON helper ───────────────────────────────────────────────────────
/** Tolerate ```json fences and leading prose around a JSON object. */
export function parseJsonLoose<T>(raw: string): T | null {
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(s.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}
