/**
 * Regression tests for:
 *  1. Shopping search query format — must NOT use site: operator
 *  2. Serper API live check — queries with retailer name return results
 *  3. extractCloudinaryPath helper
 *  4. Multi-attribute scoring logic (QUIZ_IMAGE_WEIGHTS + TIER_POINTS)
 *  5. Vote-history undo reverses all style deltas
 */

import { describe, it, expect } from 'vitest';
import { QUIZ_IMAGE_WEIGHTS, TIER_POINTS } from '../data/quizImageWeights';

// ─────────────────────────────────────────────────────────────────────────────
// 1. SHOPPING QUERY FORMAT
// ─────────────────────────────────────────────────────────────────────────────

/** Mirror of the query-building logic in server.ts (paid tier). */
function buildPaidQuery(searchQuery: string, shopName: string): string {
  return `${searchQuery} "${shopName}"`;
}

const PER_RETAILER_SHOPS = [
  { name: 'Blu Dot',        domain: 'bludot.com' },
  { name: 'CB2',            domain: 'cb2.com' },
  { name: 'West Elm',       domain: 'westelm.com' },
  { name: 'Article',        domain: 'article.com' },
  { name: 'Crate & Barrel', domain: 'crateandbarrel.com' },
  { name: 'IKEA',           domain: 'ikea.com' },
  { name: 'AllModern',      domain: 'allmodern.com' },
  { name: 'Room & Board',   domain: 'roomandboard.com' },
];

describe('Shopping search — query format', () => {
  it('paid query uses quoted retailer name, NOT site: operator', () => {
    for (const shop of PER_RETAILER_SHOPS) {
      const q = buildPaidQuery('modern black sofa', shop.name);
      expect(q).toContain(`"${shop.name}"`);
      expect(q).not.toContain('site:');
      expect(q).not.toContain(shop.domain);
    }
  });

  it('paid query includes the item search_query verbatim', () => {
    const itemQuery = 'mid century modern light oak lounge chair';
    const q = buildPaidQuery(itemQuery, 'Blu Dot');
    expect(q.startsWith(itemQuery)).toBe(true);
  });

  it('generates 8 separate queries for 8 retailers', () => {
    const queries = PER_RETAILER_SHOPS.map(s => buildPaidQuery('sofa', s.name));
    expect(queries).toHaveLength(8);
    // All must be unique
    expect(new Set(queries).size).toBe(8);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. SERPER LIVE INTEGRATION — retailer-name queries return results
//    Opt-in only: set LIVE_SERPER_TEST=1 AND provide SERPER_API_KEY to run.
//    Default: skipped (no live HTTP, no credits burned). The 2026-05-04 ~875
//    Serper credit burn (incident memo project_serper_credit_incident.md)
//    made it clear we never want this file silently hitting the live API.
// ─────────────────────────────────────────────────────────────────────────────

const LIVE_SERPER_TEST = process.env.LIVE_SERPER_TEST === '1';
const SERPER_KEY = (process.env.SERPER_API_KEY || '').trim();
const runLive = LIVE_SERPER_TEST && SERPER_KEY ? it : it.skip;

describe('Serper API — live smoke test (opt-in)', () => {
  runLive('retailer-name query returns at least 1 shopping result for Blu Dot', async () => {
    const q = buildPaidQuery('modern sofa', 'Blu Dot');
    const res = await fetch('https://google.serper.dev/shopping', {
      method: 'POST',
      headers: { 'X-API-KEY': SERPER_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q, gl: 'us', hl: 'en', num: 6 }),
    });
    const data = await res.json() as { shopping?: unknown[] };
    expect(res.ok).toBe(true);
    expect(Array.isArray(data.shopping)).toBe(true);
    expect((data.shopping ?? []).length).toBeGreaterThan(0);
  }, 15_000);

  runLive('site: query returns 0 results (confirming old approach was broken)', async () => {
    const q = 'modern sofa site:bludot.com';
    const res = await fetch('https://google.serper.dev/shopping', {
      method: 'POST',
      headers: { 'X-API-KEY': SERPER_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q, gl: 'us', hl: 'en', num: 6 }),
    });
    const data = await res.json() as { shopping?: unknown[] };
    expect(res.ok).toBe(true);
    // site: queries consistently return 0 shopping results
    expect((data.shopping ?? []).length).toBe(0);
  }, 15_000);
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. extractCloudinaryPath HELPER
// ─────────────────────────────────────────────────────────────────────────────

/** Mirror of extractCloudinaryPath from AIConceptsPage.tsx */
function extractCloudinaryPath(url: string): string {
  const match = url.match(/Quiz\/[^?]+/);
  return match ? match[0] : '';
}

describe('extractCloudinaryPath', () => {
  it('strips host and transform params', () => {
    const url = 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Bohemian/1_piprtp.png';
    expect(extractCloudinaryPath(url)).toBe('Quiz/Bohemian/1_piprtp.png');
  });

  it('works without transform params', () => {
    const url = 'https://res.cloudinary.com/dys2k5muv/image/upload/Quiz/Modern/3_2_be2ubi.jpg';
    expect(extractCloudinaryPath(url)).toBe('Quiz/Modern/3_2_be2ubi.jpg');
  });

  it('handles Art-Deco hyphen in folder name', () => {
    const url = 'https://res.cloudinary.com/dys2k5muv/image/upload/Quiz/Art-Deco/14_uwyjdr.png';
    expect(extractCloudinaryPath(url)).toBe('Quiz/Art-Deco/14_uwyjdr.png');
  });

  it('returns empty string for non-quiz URLs', () => {
    expect(extractCloudinaryPath('https://example.com/image.jpg')).toBe('');
  });

  it('extracted path matches a key in QUIZ_IMAGE_WEIGHTS', () => {
    const url = 'https://res.cloudinary.com/dys2k5muv/image/upload/v1/Quiz/Bohemian/1_piprtp.png';
    const path = extractCloudinaryPath(url);
    expect(QUIZ_IMAGE_WEIGHTS[path]).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. MULTI-ATTRIBUTE SCORING LOGIC
// ─────────────────────────────────────────────────────────────────────────────

/** Mirror of the scoring block in handleQuizVote */
function computeStyleChanges(imagePath: string, fallbackStyle: string): Record<string, number> {
  const changes: Record<string, number> = {};
  const weights = QUIZ_IMAGE_WEIGHTS[imagePath];
  if (weights) {
    changes[weights.primary] = (changes[weights.primary] || 0) + TIER_POINTS.primary;
    for (const s of weights.strong) changes[s] = (changes[s] || 0) + TIER_POINTS.strong;
    for (const s of weights.hint)   changes[s] = (changes[s] || 0) + TIER_POINTS.hint;
  } else {
    changes[fallbackStyle] = TIER_POINTS.primary;
  }
  return changes;
}

describe('Multi-attribute scoring', () => {
  it('TIER_POINTS values are 3 / 1 / 0.3', () => {
    expect(TIER_POINTS.primary).toBe(3);
    expect(TIER_POINTS.strong).toBe(1);
    expect(TIER_POINTS.hint).toBe(0.3);
  });

  it('pure primary image gives only primary style points', () => {
    // Art Deco/6_slhnwf.png has no strong/hint
    const changes = computeStyleChanges('Quiz/Art-Deco/6_slhnwf.png', 'Art Deco');
    expect(changes['Art Deco']).toBe(3);
    expect(Object.keys(changes)).toHaveLength(1);
  });

  it('image with strong styles distributes points correctly', () => {
    // Bohemian/1_piprtp.png: primary=Bohemian, strong=[Mid-Century, Rustic]
    const changes = computeStyleChanges('Quiz/Bohemian/1_piprtp.png', 'Bohemian');
    expect(changes['Bohemian']).toBe(3);
    expect(changes['Mid-Century']).toBe(1);
    expect(changes['Rustic']).toBe(1);
    expect(Object.keys(changes)).toHaveLength(3);
  });

  it('image with hint styles distributes hint points (0.3)', () => {
    // Art-Deco/14_uwyjdr.png: primary=Art Deco, strong=[Transitional], hint=[Mid-Century]
    const changes = computeStyleChanges('Quiz/Art-Deco/14_uwyjdr.png', 'Art Deco');
    expect(changes['Art Deco']).toBe(3);
    expect(changes['Transitional']).toBe(1);
    expect(changes['Mid-Century']).toBeCloseTo(0.3);
  });

  it('untagged image falls back to primary points on folder style', () => {
    const changes = computeStyleChanges('Quiz/Unknown/mystery.jpg', 'Japandi');
    expect(changes['Japandi']).toBe(3);
    expect(Object.keys(changes)).toHaveLength(1);
  });

  it('QUIZ_IMAGE_WEIGHTS has entries for all 15 style folders', () => {
    const folders = new Set(
      Object.keys(QUIZ_IMAGE_WEIGHTS).map(k => k.split('/')[1])
    );
    const expected = [
      'Art-Deco', 'Bohemian', 'Coastal', 'Industrial', 'Japandi', 'Mid-Century',
      'Modern', 'Rustic', 'Transitional',
      // Added 2026-08-31 so the quiz can return every style AI Vision offers.
      'Biophilic', 'Minimalist', 'Maximalist', 'Dopamine', 'Trend-2026', 'Warm-Contemporary',
    ];
    for (const f of expected) expect(folders.has(f)).toBe(true);
    expect(folders.size, 'a folder appeared that no style claims').toBe(expected.length);
  });

  // The correctly-spelled asset this used to assert was one of the 43 photographs
  // destroyed on 2026-09-01, so it is no longer in the table. The half that still
  // means something is the misspelling — it must never reappear.
  it('the Coastal ezeifi typo never comes back', () => {
    expect(QUIZ_IMAGE_WEIGHTS['Quiz/Coastal/10_ezeifi.jpg']).toBeUndefined();
  });

  // 93 surviving photographs + 150 studio renders (15 styles x 10 rooms), which
  // sit together in each folder by the owner's decision.
  //
  // It was 136 photographs. On 2026-09-01 an upload run with overwrite:true
  // destroyed 43 of them on Cloudinary — they had display names colliding with
  // the room names we upload under, there was no backup on the account, and they
  // are unrecoverable. Their weight entries were removed because they can never
  // match anything again.
  //
  // Pinned exactly: a silent drop makes the quiz less accurate while nothing
  // visibly breaks, and an image with no weights row still "works" — it just
  // quietly scores primary-only.
  it('total image count is 243', () => {
    expect(Object.keys(QUIZ_IMAGE_WEIGHTS)).toHaveLength(243);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. VOTE UNDO — styleChanges reversal
// ─────────────────────────────────────────────────────────────────────────────

/** Mirror of handleQuizBack undo logic */
function applyUndo(
  quizVotes: Record<string, number>,
  styleChanges: Record<string, number>
): Record<string, number> {
  const updated = { ...quizVotes };
  for (const [s, pts] of Object.entries(styleChanges)) {
    updated[s] = Math.max(0, (updated[s] || 0) - pts);
    if (updated[s] === 0) delete updated[s];
  }
  return updated;
}

describe('Vote undo — back button reversal', () => {
  it('reverses a single-style love vote', () => {
    const before = { Japandi: 3 };
    const changes = { Japandi: 3 };
    const after = applyUndo(before, changes);
    expect(after['Japandi']).toBeUndefined();
    expect(Object.keys(after)).toHaveLength(0);
  });

  it('reverses a multi-style love vote without affecting other votes', () => {
    const before = { Bohemian: 6, 'Mid-Century': 2, Rustic: 2, Modern: 3 };
    // Last vote was Bohemian/1_piprtp.png: +3 Bohemian, +1 Mid-Century, +1 Rustic
    const changes = { Bohemian: 3, 'Mid-Century': 1, Rustic: 1 };
    const after = applyUndo(before, changes);
    expect(after['Bohemian']).toBe(3);
    expect(after['Mid-Century']).toBe(1);
    expect(after['Rustic']).toBe(1);
    expect(after['Modern']).toBe(3); // untouched
  });

  it('clamps to 0 and removes key when result would go negative', () => {
    const before = { Coastal: 1 };
    const changes = { Coastal: 3 }; // more than what's there
    const after = applyUndo(before, changes);
    expect(after['Coastal']).toBeUndefined();
  });

  it('reverses hint points (0.3) correctly', () => {
    const before = { 'Art Deco': 3, Transitional: 1, 'Mid-Century': 0.3 };
    const changes = { 'Art Deco': 3, Transitional: 1, 'Mid-Century': 0.3 };
    const after = applyUndo(before, changes);
    expect(Object.keys(after)).toHaveLength(0);
  });
});
