/**
 * IDENTIFY TEST HARNESS — Shopping List search-accuracy (P3), dev-only.
 *
 * Runs the Gemini IDENTIFY step in ISOLATION against real room photos and prints
 * a plain-text report: what was detected, which taxonomy category each maps to,
 * the FREE-tier top-4 pick (most prominent, spread across categories), and any
 * items that failed to map. NO Serper, NO credits, NO DB — just Gemini + image.
 *
 * Purpose: tune the identify prompt until detection is reliably correct AND every
 * item lands in one of the 8 predefined categories, BEFORE wiring it into
 * /api/shopping/identify. Once the prompt is good here, we port it to server.ts.
 *
 * Usage (run with tsx, the same runner as the server):
 *   npx tsx scripts/test-identify.ts                      # all images in scripts/identify-test-images/
 *   npx tsx scripts/test-identify.ts path/to/room.jpg     # one image
 *   npx tsx scripts/test-identify.ts --json               # also dump raw JSON per image
 *
 * Requires GEMINI_API_KEY (read from .env or E:/Secrets/Website/.env, like the server).
 */
import dotenv from 'dotenv';
import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import {
  SHOPPING_TAXONOMY,
  SHOPPING_TAXONOMY_IDS,
  categoryToTaxonomyId,
} from '../src/data/shoppingTaxonomy.js';

// ── Env (mirror server.ts: local .env first, then the Secrets fallback) ───────
const FALLBACK_ENV_PATH = 'E:/Secrets/Website/.env';
dotenv.config({
  path: existsSync('.env') ? '.env' : existsSync(FALLBACK_ENV_PATH) ? FALLBACK_ENV_PATH : undefined,
});

const IMAGE_DIR = path.resolve('scripts/identify-test-images');
const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const MIME: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
const FREE_TIER_ITEMS = 4;
const wantJson = process.argv.includes('--json');

interface IdItem {
  name: string;
  taxonomyId: string;
  category?: string;
  color?: string;
  material?: string;
  style?: string;
  shape?: string;
  prominence?: number;
  confidence?: number;
  search_query?: string;
}

// ── The prompt under test. THIS is what we tune; the server prompt mirrors it. ─
const taxonomyForPrompt = SHOPPING_TAXONOMY
  .map((c) => `  - ${c.id}: ${c.detects.slice(0, 9).join(', ')}`)
  .join('\n');

const IDENTIFY_PROMPT = `You are a professional interior design sourcing assistant analyzing ONE room photo.

GOAL: list every DISTINCT, clearly-visible, shoppable object in the room, each mapped to exactly ONE category id from the fixed taxonomy below.

TAXONOMY (id: example object types that belong to it):
${taxonomyForPrompt}

RULES:
- List ONLY objects you can actually see in THIS photo. Never invent, assume, or add "typical" items.
- Each entry is ONE distinct physical object. Never list the same object twice and never split it (a sectional sofa = one "seating" item).
- Ignore tiny, blurry, heavily-cropped, or barely-visible objects, and built-in architecture (windows, doors, flooring, the ceiling).
- Every item's "taxonomyId" MUST be one of the ids above, copied verbatim. If an object fits none of them, OMIT it.
- Map by FUNCTION, not by looks: a sideboard / credenza / TV unit / bookcase = storage (NEVER seating); a pendant or lamp = lighting; a framed print / mirror / vase / sculpture = art-decor; a coffee/side/console/dining table = tables-desks.
- LIGHTING — only list DECORATIVE, separately-purchasable fixtures: chandeliers, pendants, flush / semi-flush ceiling mounts, floor lamps, table lamps, wall sconces. DO NOT list recessed / can / cove / track / strip or any other built-in lighting — treat those as architecture and skip them. A hanging ceiling fixture with multiple bulbs, arms, tiers, or globes is a CHANDELIER (or pendant) — never call it a "recessed light". A statement ceiling fixture over a seating or dining area is a focal point — score its prominence HIGH.
- "prominence" = how visually dominant the object is in the photo, 0-100 (combine size + centrality + how in-focus it is).

For EACH item return:
- name: 1-3 word plain name (e.g. "Sofa", "Floor lamp", "Area rug", "Sideboard")
- taxonomyId: exactly one id from the taxonomy above, verbatim
- category: short human label for the object type
- color: dominant color(s) you see
- material: primary material, or "unknown"
- style: design era/style, or "unknown"
- shape: silhouette / form / pattern, or "unknown"
- prominence: integer 0-100
- confidence: number 0-1 (how sure it is really there AND correctly categorized)
- search_query: 5-10 word retail search query (color + material + shape + category + style)

Output ONLY valid JSON, no markdown fences, no commentary:
{"items":[{"name":"Sofa","taxonomyId":"seating","category":"Sofa","color":"navy blue","material":"velvet","style":"mid-century modern","shape":"low curved","prominence":95,"confidence":0.97,"search_query":"navy velvet curved sofa mid century modern"}]}`;

// ── FREE-tier pick: MAIN pieces only, spread across categories ────────────────
// Free tier = the big, anchoring pieces: furniture (seating / tables / storage /
// beds) + lighting + rugs. Textiles (cushions, curtains, throws) and art-decor
// (art, vases, objects) are SECONDARY — only used to fill if there aren't 4 mains.
const FREE_MAIN_CATEGORIES = ['seating', 'tables-desks', 'storage', 'beds', 'lighting', 'rugs'];

function pickFreeFour(items: IdItem[]): IdItem[] {
  const byProminence = (xs: IdItem[]) => [...xs].sort((a, b) => (b.prominence ?? 0) - (a.prominence ?? 0));
  const main = byProminence(items.filter((i) => FREE_MAIN_CATEGORIES.includes(i.taxonomyId)));
  const secondary = byProminence(items.filter((i) => !FREE_MAIN_CATEGORIES.includes(i.taxonomyId)));
  const picked: IdItem[] = [];
  const usedCats = new Set<string>();
  // Pass 1: diversity over MAIN — highest-prominence item from each unused category.
  for (const it of main) {
    if (picked.length >= FREE_TIER_ITEMS) break;
    if (!usedCats.has(it.taxonomyId)) { picked.push(it); usedCats.add(it.taxonomyId); }
  }
  // Pass 2: still short → next most-prominent MAIN items, ignoring category.
  for (const it of main) {
    if (picked.length >= FREE_TIER_ITEMS) break;
    if (!picked.includes(it)) picked.push(it);
  }
  // Pass 3: no mains left → fall back to SECONDARY (textiles / art-decor) by prominence.
  for (const it of secondary) {
    if (picked.length >= FREE_TIER_ITEMS) break;
    picked.push(it);
  }
  return picked;
}

// ── Validate / normalize each item's category against the 8 taxonomy ids ──────
function normalize(items: IdItem[]): { mapped: IdItem[]; unmapped: IdItem[] } {
  const mapped: IdItem[] = [];
  const unmapped: IdItem[] = [];
  for (const it of items) {
    let id = (it.taxonomyId || '').trim();
    if (!SHOPPING_TAXONOMY_IDS.includes(id)) {
      // Fallback: try mapping the free-text name/category to a taxonomy id.
      id = categoryToTaxonomyId(it.taxonomyId) || categoryToTaxonomyId(it.category) || categoryToTaxonomyId(it.name) || '';
    }
    if (SHOPPING_TAXONOMY_IDS.includes(id)) mapped.push({ ...it, taxonomyId: id });
    else unmapped.push(it);
  }
  return { mapped, unmapped };
}

async function identify(ai: GoogleGenAI, file: string): Promise<IdItem[]> {
  const ext = path.extname(file).toLowerCase();
  const b64 = readFileSync(file).toString('base64');
  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [{ inlineData: { mimeType: MIME[ext], data: b64 } }, { text: IDENTIFY_PROMPT }] },
  });
  const raw = (res as any).text ?? res?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? '').join('') ?? '';
  const m = raw.replace(/```json|```/g, '').match(/\{[\s\S]*\}/);
  if (!m) throw new Error('No JSON in Gemini response');
  return (JSON.parse(m[0]).items || []) as IdItem[];
}

function pad(s: string, n: number): string { return s.length >= n ? s : s + ' '.repeat(n - s.length); }

async function run() {
  const key = process.env.GEMINI_API_KEY ?? '';
  if (!key) { console.error('✗ GEMINI_API_KEY not set (.env or E:/Secrets/Website/.env).'); process.exit(1); }

  const arg = process.argv.slice(2).find((a) => !a.startsWith('--'));
  let files: string[];
  if (arg) {
    files = [path.resolve(arg)];
  } else {
    if (!existsSync(IMAGE_DIR)) { console.error(`✗ Drop room photos into ${IMAGE_DIR} first.`); process.exit(1); }
    files = readdirSync(IMAGE_DIR)
      .filter((f) => IMAGE_EXT.has(path.extname(f).toLowerCase()))
      .map((f) => path.join(IMAGE_DIR, f));
  }
  if (!files.length) { console.error(`✗ No images found. Add .jpg/.png/.webp to ${IMAGE_DIR}.`); process.exit(1); }

  const ai = new GoogleGenAI({ apiKey: key });
  console.log(`\nIDENTIFY harness — ${files.length} image(s) · model gemini-2.5-flash\n${'═'.repeat(64)}`);

  for (const file of files) {
    if (!existsSync(file) || !statSync(file).isFile()) { console.log(`\n${path.basename(file)} — not found, skipped`); continue; }
    try {
      const items = await identify(ai, file);
      const { mapped, unmapped } = normalize(items);
      const free = pickFreeFour(mapped);
      const cats = [...new Set(mapped.map((i) => i.taxonomyId))];

      console.log(`\n■ ${path.basename(file)}`);
      console.log(`  AI identified ${mapped.length} item(s) [PAID view — all categories]:`);
      mapped
        .sort((a, b) => (b.prominence ?? 0) - (a.prominence ?? 0))
        .forEach((it, i) => {
          const conf = it.confidence != null ? ` ·${Math.round(it.confidence * 100)}%` : '';
          const prom = it.prominence != null ? `${it.prominence}` : '—';
          console.log(`    ${i + 1}. ${pad('[' + it.taxonomyId + ']', 16)} ${pad(it.name, 16)} — ${[it.color, it.material, it.shape].filter((x) => x && x !== 'unknown').join(' ') || it.category || ''}  (prom ${prom}${conf})`);
        });
      console.log(`  → categories covered: ${cats.join(', ') || 'none'}`);
      console.log(`  → FREE (top ${FREE_TIER_ITEMS} main pieces — furniture/lighting/rugs, spread across categories): ${free.map((i) => `${i.name} [${i.taxonomyId}]`).join(', ') || 'none'}`);
      if (unmapped.length) console.log(`  ⚠ unmapped (dropped): ${unmapped.map((i) => `${i.name}[${i.taxonomyId}]`).join(', ')}`);
      else console.log(`  ✓ every item mapped to a category`);
      if (wantJson) console.log('  raw:', JSON.stringify(items));
    } catch (e: any) {
      console.log(`\n■ ${path.basename(file)} — ERROR: ${e?.message ?? e}`);
    }
  }
  console.log(`\n${'═'.repeat(64)}\nDone.\n`);
}

run();
