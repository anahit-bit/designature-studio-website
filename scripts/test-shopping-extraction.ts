/**
 * Standalone test for the shopping list item-extraction prompt.
 *
 * Runs the same Gemini prompt that /api/shopping/identify uses against a room
 * photo (local file OR remote URL), and prints the parsed items. NO Serper
 * call — cheapest way to iterate on the prompt without burning shopping-API
 * credits.
 *
 * Usage:
 *   # set GEMINI_API_KEY in env (or rely on E:/Secrets/Website/.env via DOTENV_CONFIG_PATH)
 *   npx tsx scripts/test-shopping-extraction.ts <path-or-url>
 *
 * Examples:
 *   npx tsx scripts/test-shopping-extraction.ts ./photo.jpg
 *   npx tsx scripts/test-shopping-extraction.ts https://res.cloudinary.com/.../cover.jpg
 *
 * Cost: one gemini-2.5-flash multimodal call per run (~$0.001 per typical photo).
 */
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { GoogleGenAI } from "@google/genai";

const imageArg = process.argv[2];
if (!imageArg) {
  console.error("Usage: npx tsx scripts/test-shopping-extraction.ts <path-or-url>");
  process.exit(1);
}

const isUrl = /^https?:\/\//i.test(imageArg);

async function loadImage(arg: string): Promise<{ buf: Buffer; mimeType: string; label: string }> {
  if (isUrl) {
    const res = await fetch(arg);
    if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
    const ct = res.headers.get("content-type") ?? "image/jpeg";
    const ab = await res.arrayBuffer();
    return { buf: Buffer.from(ab), mimeType: ct.split(";")[0].trim(), label: arg };
  }
  const absPath = path.resolve(arg);
  if (!fs.existsSync(absPath)) throw new Error(`Image not found: ${absPath}`);
  const ext = path.extname(absPath).slice(1).toLowerCase();
  const mimeType =
    ext === "jpg" || ext === "jpeg" ? "image/jpeg" :
    ext === "png" ? "image/png" :
    ext === "webp" ? "image/webp" : "image/jpeg";
  return { buf: fs.readFileSync(absPath), mimeType, label: absPath };
}

const apiKey = process.env.GEMINI_API_KEY ?? "";
if (!apiKey) {
  console.error("GEMINI_API_KEY not set. Add it to E:/Secrets/Website/.env or your shell env.");
  process.exit(1);
}

// Mirror the prompt from server.ts /api/shopping/identify EXACTLY so we can
// validate prompt changes here before they ship.
const identifyPrompt = `You are a professional interior design sourcing assistant.

Identify 4 to 6 of the most prominent SHOPPABLE elements in this room photo, distributed across categories — not just furniture.

Try to include a mix when visible:
- 1–2 furniture pieces (sofa, armchair, bed, coffee/dining/side table, storage, desk, etc.)
- 1 rug or floor covering, if visible
- 1 lighting piece (pendant, chandelier, floor/table lamp, sconce), if visible
- 1 wall art / poster / framed print, if visible
- 1 wallpaper or distinctive wall covering, if a clearly patterned/textured wall treatment is present
- 1 decorative accent (vase, sculptural object, large mirror, throw pillows as a set), if visible

If a category is clearly absent from the image, skip it — do not fabricate items that aren't there. Total must be between 4 and 6 items.

For each item return:
- category: short type label, e.g. "Sofa", "Area Rug", "Pendant Light", "Wall Art", "Wallpaper", "Decorative Vase"
- description: one short phrase describing the item (used as a subtitle, max ~8 words)
- color: dominant color(s)
- material: primary material if identifiable (e.g. "velvet", "wool", "brass", "ceramic", "oak", "vinyl", "non-woven paper" for wallpaper); use "unknown" if unclear
- shape: silhouette or pattern descriptor (e.g. "rounded", "linear", "geometric", "abstract", "tufted", "vertical stripe", "floral repeat")
- style: design era/style label (e.g. "mid-century modern", "boho", "contemporary", "scandinavian", "art deco")
- search_query: 5–10 word retail search query optimized for Google Shopping, baking in color + material + style + key shape/pattern

Output ONLY valid JSON with no markdown fences and no explanation:
{"items":[{"category":"Sofa","description":"Curved navy velvet sofa","color":"navy blue","material":"velvet","shape":"low curved","style":"mid-century modern","search_query":"navy velvet curved sofa mid century modern"},{"category":"Wallpaper","description":"Green vertical stripe wallpaper","color":"sage green and cream","material":"non-woven paper","shape":"vertical stripe","style":"contemporary","search_query":"sage green vertical stripe wallpaper non-woven contemporary"}]}`;

async function main() {
  const { buf, mimeType, label } = await loadImage(imageArg);
  const base64 = buf.toString("base64");

  console.log(`📷 Image: ${label} (${(buf.byteLength / 1024).toFixed(1)} KB, ${mimeType})`);
  console.log("⏳ Calling Gemini 2.5 Flash...\n");

  const ai = new GoogleGenAI({ apiKey });
  const t0 = Date.now();
  const geminiRes = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: {
      parts: [
        { inlineData: { mimeType, data: base64 } },
        { text: identifyPrompt },
      ],
    },
  });
  const elapsed = ((Date.now() - t0) / 1000).toFixed(2);

  const rawText: string =
    (geminiRes as any).text ??
    geminiRes?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("") ??
    "";
  const cleaned = rawText.replace(/```json|```/g, "").trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

  console.log(`✅ Gemini responded in ${elapsed}s\n`);

  if (!jsonMatch) {
    console.error("❌ Could not parse JSON from response. Raw:");
    console.error(rawText);
    process.exit(1);
  }

  const parsed = JSON.parse(jsonMatch[0]);
  const items: any[] = parsed.items || [];

  console.log(`📦 Identified ${items.length} item${items.length === 1 ? "" : "s"}:\n`);
  items.forEach((it, i) => {
    console.log(`  ${i + 1}. ${it.category} — ${it.description ?? ""}`);
    console.log(`     color:    ${it.color ?? "—"}`);
    console.log(`     material: ${it.material ?? "—"}`);
    console.log(`     shape:    ${it.shape ?? "—"}`);
    console.log(`     style:    ${it.style ?? "—"}`);
    console.log(`     query:    "${it.search_query ?? "—"}"\n`);
  });

  // Sanity checks for the new mixed-category requirement.
  const cats = items.map(i => (i.category ?? "").toLowerCase());
  const has = (kw: string) => cats.some(c => c.includes(kw));
  console.log("🩺 Coverage check (warnings only — Gemini may correctly skip absent categories):");
  if (!has("rug") && !has("carpet")) console.log("   ⚠️  no rug identified");
  if (!has("light") && !has("lamp") && !has("pendant") && !has("chandelier") && !has("sconce")) console.log("   ⚠️  no lighting identified");
  if (!has("art") && !has("poster") && !has("print") && !has("painting")) console.log("   ⚠️  no wall art identified");
  if (items.length < 4 || items.length > 6) console.log(`   ⚠️  ${items.length} items returned, expected 4-6`);
}

main().catch(e => {
  console.error("Test failed:", e?.message ?? e);
  process.exit(1);
});
