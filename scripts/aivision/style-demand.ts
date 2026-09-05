/**
 * Measure real search demand for each AI Vision style, using the same Bing
 * Webmaster keyword source the /admin Insights watchlist uses.
 *
 *   npx tsx scripts/aivision/style-demand.ts
 *
 * Asks several phrasings per style, because ONE phrasing lies. Measured
 * 2026-08-30: "biophilic interior design" returns 82/mo and reads like a dead
 * style, while "biophilic design" returns 937 and is the second-strongest style
 * we offer. Ranking on a single phrase would have got that exactly backwards.
 * The bare style name is reported too but must not be ranked on — "Modern"
 * (402k) and "Industrial" (348k) are ordinary English words, not design intent.
 *
 * Reports whether each style is offered in AI Vision, in the Style Quiz, or
 * both, so a style with no demand AND no quiz presence stands out.
 *
 * Caveats to carry into any decision made from this: Bing volume is US-centric
 * and monthly; a dash means "below the reporting threshold", NOT zero; and
 * search demand is not the same as demand from studio clients.
 */
import fs from "node:fs";
import dotenv from "dotenv";
dotenv.config({ path: fs.existsSync(".env") ? ".env" : "E:/Secrets/Website/.env" });

import { bingVolumes, bingConfigured } from "../../server/analytics/bingKeywords.js";
import { VISION_STYLES_FULL } from "../../src/components/VisionExperience.js";

// The 9 the quiz can actually return — src/data/quizImageWeights.ts.
const QUIZ_STYLES = new Set([
  "Japandi", "Modern", "Mid-Century", "Bohemian", "Rustic",
  "Art Deco", "Industrial", "Coastal", "Transitional",
]);

if (!bingConfigured()) {
  console.error("BING_WEBMASTER_API_KEY is not set — cannot measure demand.");
  process.exit(1);
}

// Every phrasing a person plausibly types when they want THIS look. We rank on
// the best of them, because a style is not weak just because one phrasing is.
// "modern" is here for Mid-Century alone: nobody types "mid-century interior",
// they type "mid century modern" (4,164/mo — the highest of any style we offer).
// Without it the table reports Mid-Century as having no demand at all.
const QUALIFIERS = ["design", "interior", "interior design", "decor", "style", "modern"];

// Phrases that win for the WRONG reason — the words mean something else in the
// wider world, so the volume is not people shopping for an interior look.
// Reported with a warning rather than silently trusted.
const CONTAMINATED = new Set([
  "industrial design", // a product-design profession, not a room style
  "modern design",     // far too generic to mean this style
]);
const styles = [...VISION_STYLES_FULL];
const phrases: string[] = [];
for (const s of styles) {
  phrases.push(s.toLowerCase());
  for (const q of QUALIFIERS) phrases.push(`${s.toLowerCase()} ${q}`);
}

// Bing quietly returns nothing for most of a large batch rather than erroring,
// so a single 90-phrase call reports "no demand" for almost everything and looks
// like a finding. Chunk it, and pause between chunks.
const vols: Record<string, number | null> = {};
const CHUNK = 20;
for (let i = 0; i < phrases.length; i += CHUNK) {
  const slice = phrases.slice(i, i + CHUNK);
  Object.assign(vols, await bingVolumes(slice));
  if (i + CHUNK < phrases.length) await new Promise((r) => setTimeout(r, 1200));
}
const answered = Object.values(vols).filter((v) => typeof v === "number").length;
if (answered < phrases.length * 0.25) {
  console.error(`Only ${answered}/${phrases.length} phrases came back — treat this run as unreliable, not as low demand.`);
}

interface Row { style: string; bare: number | null; best: number | null; bestPhrase: string; inQuiz: boolean }
const rows: Row[] = styles.map((s) => {
  let best: number | null = null;
  let bestPhrase = "—";
  for (const q of QUALIFIERS) {
    const phrase = `${s.toLowerCase()} ${q}`;
    if (CONTAMINATED.has(phrase)) continue;
    const v = vols[phrase];
    if (typeof v === "number" && (best === null || v > best)) { best = v; bestPhrase = phrase; }
  }
  return { style: s, bare: vols[s.toLowerCase()] ?? null, best, bestPhrase, inQuiz: QUIZ_STYLES.has(s) };
});

rows.sort((a, b) => (b.best ?? -1) - (a.best ?? -1));

const n = (v: number | null) => (v === null ? "     —" : String(v).padStart(6));
console.log("\nAI Vision styles by real search demand (Bing Webmaster, monthly)");
console.log("Ranked on the BEST design-intent phrasing. The bare name is context only.\n");
console.log("  STYLE                  BARE     BEST  PHRASE THAT WON            IN QUIZ?");
console.log("  " + "-".repeat(74));
for (const r of rows) {
  console.log(
    `  ${r.style.padEnd(20)} ${n(r.bare)}  ${n(r.best)}  ${r.bestPhrase.padEnd(28)} ${r.inQuiz ? "yes" : "NO"}`,
  );
}

const noData = rows.filter((r) => r.best === null);
const measured = rows.filter((r) => r.best !== null);
console.log("\n  Weakest measured:", measured.slice(-4).map((r) => `${r.style} (${r.best})`).join(" · "));
if (noData.length) {
  console.log("  Below reporting threshold on every phrasing (NOT proof of zero demand):");
  console.log("   ", noData.map((r) => r.style).join(" · "));
}
console.log("  In AI Vision but NOT in the quiz:", rows.filter((r) => !r.inQuiz).map((r) => r.style).join(" · "));
console.log("  In the quiz but NOT in AI Vision:",
  [...QUIZ_STYLES].filter((q) => !styles.includes(q as never)).join(" · ") || "none");
console.log();
