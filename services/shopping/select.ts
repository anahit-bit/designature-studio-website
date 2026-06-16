/**
 * Shopping List — item selection helpers (pure): dedupe identical detections and
 * pick the FREE-tier set. Ported from the owner-approved identify harness
 * (scripts/test-identify.ts) so the live endpoint and the harness agree.
 *
 * FREE tier = the 4 main anchoring pieces (furniture + lighting + rugs), spread
 * across categories. Textiles + art-decor are SECONDARY — only used to fill a
 * slot when fewer than 4 main pieces exist in the room.
 */

export interface SelItem {
  taxonomyId: string;
  category?: string;
  name?: string;
  description?: string;
  color?: string;
  prominence?: number;
  /** Count of identical detections merged into this entry (dedupeItems). */
  quantity?: number;
  [k: string]: unknown;
}

/** Categories that count as "main" for the FREE-tier pick. */
export const FREE_MAIN_CATEGORIES = ['seating', 'tables-desks', 'storage', 'beds', 'lighting', 'rugs'];

const norm = (s?: string) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * Merge identical detections (same category + name + color within a taxonomy)
 * into one entry carrying a `quantity`, so we don't burn a Serper credit per
 * duplicate and the paid list doesn't read as "Small Framed Art ×5". Distinct
 * pieces (a navy sofa and a grey sofa) stay separate. Keeps the highest
 * prominence and preserves first-seen order.
 */
export function dedupeItems<T extends SelItem>(items: T[]): T[] {
  const byKey = new Map<string, T>();
  const order: string[] = [];
  for (const it of items) {
    const key = `${it.taxonomyId}|${norm(it.category || it.name)}|${norm(it.color)}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.quantity = (existing.quantity ?? 1) + 1;
      if ((it.prominence ?? 0) > (existing.prominence ?? 0)) existing.prominence = it.prominence;
    } else {
      byKey.set(key, { ...it, quantity: 1 });
      order.push(key);
    }
  }
  return order.map((k) => byKey.get(k)!);
}

/**
 * FREE-tier pick: up to `n` MAIN pieces, diversity-first by prominence (one per
 * category, then fill from remaining mains), falling back to SECONDARY
 * (textiles / art-decor) only when there aren't `n` mains.
 */
export function pickFreeItems<T extends SelItem>(items: T[], n = 4): T[] {
  const byProminence = (xs: T[]) => [...xs].sort((a, b) => (b.prominence ?? 0) - (a.prominence ?? 0));
  const main = byProminence(items.filter((i) => FREE_MAIN_CATEGORIES.includes(i.taxonomyId)));
  const secondary = byProminence(items.filter((i) => !FREE_MAIN_CATEGORIES.includes(i.taxonomyId)));
  const picked: T[] = [];
  const usedCats = new Set<string>();
  // Pass 1: diversity over MAIN — top item from each unused main category.
  for (const it of main) {
    if (picked.length >= n) break;
    if (!usedCats.has(it.taxonomyId)) { picked.push(it); usedCats.add(it.taxonomyId); }
  }
  // Pass 2: still short → next most-prominent MAIN items, ignoring category.
  for (const it of main) {
    if (picked.length >= n) break;
    if (!picked.includes(it)) picked.push(it);
  }
  // Pass 3: no mains left → SECONDARY by prominence.
  for (const it of secondary) {
    if (picked.length >= n) break;
    picked.push(it);
  }
  return picked;
}
