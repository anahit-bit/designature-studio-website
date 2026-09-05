/**
 * Print the exact prompt the image model would receive.
 *
 * Verification tool. The AI Vision panel only renders for a signed-in user and
 * the dev server has historically served stale bundles for this component, so
 * the honest way to check what the model is being told is to assemble it here.
 *
 *   npx tsx scripts/aivision/show-prompt.ts
 *   npx tsx scripts/aivision/show-prompt.ts --style Bohemian --room "Living + Dining"
 *   npx tsx scripts/aivision/show-prompt.ts --style Bohemian --paint silhouette
 *   npx tsx scripts/aivision/show-prompt.ts --style Bohemian --accents   # the whole pool
 */
import { STYLE_BRIEFS, STYLE_NAME_TO_PRESET, ROOM_NAME_TO_TYPE } from "../../services/aiVision/stylePresets.js";
import { buildGenerationPrompt, pickAccent } from "../../services/aiVision/promptTemplates.js";
import { STYLE_PALETTES } from "../../services/aiVision/rulebook.generated.js";

const argv = process.argv.slice(2);
const flag = (n: string) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };

const styleLabel = flag("style") ?? "Warm Contemporary";
const roomLabel = flag("room") ?? "Living";
const paint = flag("paint");
const seed = flag("seed") ? Number(flag("seed")) : 0;

const preset = STYLE_NAME_TO_PRESET[styleLabel];
const roomKey = ROOM_NAME_TO_TYPE[roomLabel];
if (!preset) { console.error(`Unknown style "${styleLabel}"`); process.exit(1); }
if (!roomKey) { console.error(`Unknown room "${roomLabel}"`); process.exit(1); }

if (argv.includes("--accents")) {
  console.log(`\n${styleLabel} — palette (${preset})\n`);
  for (const c of STYLE_PALETTES[preset]) {
    console.log(`  ${c.role.padEnd(8)} ${c.hex}  ${c.name}`);
  }
  const accents = STYLE_PALETTES[preset].filter((c) => c.role === "accent");
  console.log(`\n  ${accents.length} accents — a generation uses exactly one:`);
  accents.forEach((_, i) => console.log(`    seed ${i} -> ${pickAccent(preset, i)!.name}`));
  process.exit(0);
}

const accent = pickAccent(preset, seed, paint);
const prompt = buildGenerationPrompt({
  styleBrief: STYLE_BRIEFS[preset],
  roomType: roomKey,
  accent,
});

console.log("=".repeat(78));
console.log(`STYLE ${styleLabel} (${preset})  ·  ROOM ${roomLabel} (${roomKey})  ·  SEED ${seed}`);
console.log(`ACCENT ${accent ? `${accent.name} ${accent.hex}${accent.brand ? ` — ${accent.brand}` : ""}` : "none"}`);
console.log(`PAINT  ${paint ?? "off"}`);
console.log(`LENGTH ${prompt.split(/\s+/).length} words`);
console.log("=".repeat(78));
console.log(prompt);
