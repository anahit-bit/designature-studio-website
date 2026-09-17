/**
 * Flattens the cached observations + the current resolver output into ONE JSON
 * file, so the visual register can be rebuilt without re-running anything.
 *
 *   npx tsx scripts/export-room-measurements.ts [outPath]
 *
 * Default out: room-measurements.json in the repo root (gitignored).
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { resolveMeasurement } from "../services/measure/resolve.js";
import { standardById } from "../services/measure/standards.js";
import type { CachedRun } from "./bench-rooms.js";

const CACHE_DIR = path.resolve("bench-rooms-out");
const out = process.argv[2] ?? path.resolve("room-measurements.json");

if (!existsSync(CACHE_DIR)) {
  console.error(`No cache at ${CACHE_DIR}. Run: npx tsx scripts/bench-rooms.ts`);
  process.exit(1);
}

const rows = readdirSync(CACHE_DIR)
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(path.join(CACHE_DIR, f), "utf-8")) as CachedRun)
  .map((run) => {
    const m = resolveMeasurement(run.observation, run.size);
    const o = run.observation;
    const anchor = m.best ?? m.rungs.find((r) => !r.failed && r.wallRunsMm.length > 0) ?? null;
    return {
      file: run.file,
      sha: run.sha,
      size: run.size,
      imageKind: o.imageKind,
      imageKindReason: o.imageKindReason,
      roomType: o.roomType,
      region: o.region,
      peopleInFrame: o.peopleInFrame,
      wallCornersVisible: o.wallCornersVisible,
      refusal: m.refusal,
      // What the geometry actually produced
      lengthMm: m.best?.lengthMm ?? null,
      widthMm: m.best?.widthMm ?? null,
      ceilingMm: m.ceilingMm,
      longestRunMm: m.longestRunMm,
      wallRunsMm: anchor?.wallRunsMm ?? [],
      extentPartial: anchor?.extentPartial ?? true,
      method: anchor?.method ?? null,
      via: anchor?.via ?? null,
      bandPct: anchor ? Math.round(anchor.band * 100) : null,
      disagreementPct: m.disagreement === null ? null : Math.round(m.disagreement * 100),
      confirmRequired: m.confirm.required,
      confirmReason: m.confirm.reason,
      tapPrompt: m.confirm.tapPrompt,
      rulers: o.rulers.map((r) => ({
        id: r.standardId,
        label: standardById(r.standardId)?.label ?? r.standardId,
        what: r.what,
        confidence: r.confidence,
        modules: r.quad ? `${r.cols ?? 1}×${r.rows ?? 1}` : null,
      })),
      rungs: m.rungs.map((r) => ({
        method: r.method,
        via: r.via,
        lengthMm: r.lengthMm,
        widthMm: r.widthMm,
        ceilingMm: r.ceilingMm,
        wallRunsMm: r.wallRunsMm,
        extentPartial: r.extentPartial,
        bandPct: Math.round(r.band * 100),
        failed: r.failed ?? null,
      })),
      modelEstimate: m.modelEstimate,
    };
  })
  .sort((a, b) => a.file.toLowerCase().localeCompare(b.file.toLowerCase()));

writeFileSync(out, JSON.stringify(rows, null, 1), "utf-8");
console.log(`${rows.length} row(s) → ${out}`);
