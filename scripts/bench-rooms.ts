/**
 * ROOM MEASUREMENT BENCH — runs the vision pass over a folder of room photos,
 * caches every observation, and replays it through our own geometry.
 *
 * The cache is the point. A vision pass costs money and ~5-10 s per photo; our
 * resolver costs nothing. So:
 *   - change the PROMPT  → re-run with --force (paid)
 *   - change the LADDER  → `npx tsx scripts/rescore-rooms.ts` (free, ~1 second)
 * Same split as `bench-plans.ts` / `rescore-plans.ts` for floorplans, which is
 * where four real bugs surfaced at zero API cost.
 *
 * Usage:
 *   npx tsx scripts/bench-rooms.ts                     # every image, cached ones skipped
 *   npx tsx scripts/bench-rooms.ts --only kitchen      # filename substring
 *   npx tsx scripts/bench-rooms.ts --force             # re-run even if cached
 *   npx tsx scripts/bench-rooms.ts --limit 5           # first N, for a cheap smoke test
 *   npx tsx scripts/bench-rooms.ts --dir path/to/pics
 *
 * Requires GEMINI_API_KEY (local .env, else E:/Secrets/Website/.env).
 */
import dotenv from "dotenv";
import { createHash } from "crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "fs";
import path from "path";
import { observeRoom } from "../services/measure/observe.js";
import { asMetres, resolveMeasurement } from "../services/measure/resolve.js";
import type { RoomObservation } from "../services/measure/types.js";

const FALLBACK_ENV_PATH = "E:/Secrets/Website/.env";
dotenv.config({
  path: existsSync(".env") ? ".env" : existsSync(FALLBACK_ENV_PATH) ? FALLBACK_ENV_PATH : undefined,
});

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const DEFAULT_DIR = "E:/Business/Claude/_Inputs/source-rooms";
const CACHE_DIR = path.resolve("bench-rooms-out");

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const has = (flag: string) => process.argv.includes(flag);

const dir = arg("--dir") ?? DEFAULT_DIR;
const only = arg("--only");
const limit = Number(arg("--limit") ?? "0") || 0;
const force = has("--force");

export interface CachedRun {
  file: string;
  bytes: number;
  sha: string;
  size: { w: number; h: number };
  observation: RoomObservation;
  observedAt: string;
  model: string;
}

function walk(root: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(root)) {
    const full = path.join(root, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (IMAGE_EXT.has(path.extname(name).toLowerCase())) out.push(full);
  }
  return out.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
}

export const cachePath = (sha: string) => path.join(CACHE_DIR, `${sha}.json`);

async function main() {
  const apiKey = process.env.GEMINI_API_KEY ?? "";
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set — nothing to run.");
    process.exit(1);
  }
  if (!existsSync(dir)) {
    console.error(`No such folder: ${dir}`);
    process.exit(1);
  }
  mkdirSync(CACHE_DIR, { recursive: true });

  let files = walk(dir);
  if (only) files = files.filter((f) => path.basename(f).toLowerCase().includes(only.toLowerCase()));
  if (limit) files = files.slice(0, limit);

  // Byte-identical files share a cache entry, so duplicates cost one call, not two.
  console.log(`${files.length} image(s) in ${dir}`);
  let called = 0;
  let cached = 0;
  let failed = 0;

  for (const [i, file] of files.entries()) {
    const buf = readFileSync(file);
    const sha = createHash("sha256").update(buf).digest("hex").slice(0, 16);
    const cp = cachePath(sha);
    const rel = path.relative(dir, file).replace(/\\/g, "/");
    const tag = `[${String(i + 1).padStart(2, "0")}/${files.length}] ${rel}`;

    if (existsSync(cp) && !force) {
      cached++;
      const run = JSON.parse(readFileSync(cp, "utf-8")) as CachedRun;
      console.log(`${tag}  (cached)  ${summarise(run)}`);
      continue;
    }

    process.stdout.write(`${tag}  … `);
    const started = Date.now();
    const res = await observeRoom(buf, apiKey);
    if ("error" in res) {
      failed++;
      console.log(`FAILED — ${res.error}`);
      continue;
    }
    called++;
    const run: CachedRun = {
      file: rel,
      bytes: buf.length,
      sha,
      size: res.size,
      observation: res.observation,
      observedAt: new Date().toISOString(),
      model: "gemini-2.5-flash",
    };
    writeFileSync(cp, JSON.stringify(run, null, 1), "utf-8");
    console.log(`${((Date.now() - started) / 1000).toFixed(1)}s  ${summarise(run)}`);
  }

  console.log(
    `\ndone — ${called} vision call(s), ${cached} from cache, ${failed} failed. Cache: ${CACHE_DIR}`,
  );
  console.log("Re-score for free after any resolver change:  npx tsx scripts/rescore-rooms.ts");
}

export function summarise(run: CachedRun): string {
  const m = resolveMeasurement(run.observation, run.size);
  if (m.refusal) return `REFUSED — ${run.observation.imageKind}`;
  if (!m.best) return `no measure (${run.observation.rulers.length} ruler(s))`;
  const l = asMetres(m.best.lengthMm);
  const w = asMetres(m.best.widthMm);
  const c = asMetres(m.ceilingMm);
  return `${l}×${w} m${c ? `, h ${c}` : ""}  via ${m.best.method} ±${Math.round(m.best.band * 100)}%`;
}

// Only run when invoked directly, so rescore-rooms.ts can import the helpers.
if (process.argv[1] && path.resolve(process.argv[1]).includes("bench-rooms")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
