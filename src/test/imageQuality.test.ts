import { describe, it, expect, beforeAll } from 'vitest';
import { cld, cldSrcSet } from '../lib/cld';
import { QUIZ_ROOMS_FALLBACK, DNA_HERO_FALLBACK, QUIZ_LANDING_HERO } from '../components/StyleQuizScreen';
import { PAIRS as AI_VISION_PAIRS } from '../components/AIVisionShowcase';
import { SHOPPING_ROOMS, SHOPPING_LOGOS } from '../components/ShoppingListShowcase';

const SHOP_LOGO_BASE = 'https://res.cloudinary.com/dys2k5muv/image/upload';

/**
 * Image QUALITY + SPEED regression guard.
 *
 * Standing requirement (owner): every image on the AI-tool screens must be
 * HIGH QUALITY and LOAD FAST. Two layers:
 *
 *  1. UNIT (always runs, deterministic, no network) — every delivered image
 *     goes through cld(), which must emit `f_auto` (AVIF/WebP negotiation) +
 *     `q_auto` (intelligent quality) + a width cap. Also pins the Style-Quiz
 *     fallback dataset to the version-form delivery URL (the only form that
 *     resolves on this dynamic-folders Cloudinary account — folder-path URLs
 *     like /upload/.../Quiz/<Style>/<id> 404 here; that bug shipped once).
 *
 *  2. LIVE SMOKE (network) — actually fetches each shipped image through its
 *     real cld() transform and asserts HTTP 200 + an image/* body UNDER a
 *     per-role byte budget. This is the only reliable correctness check
 *     because folder-path validity is per-asset. It SKIPS (not fails) when the
 *     network is entirely unreachable, but FAILS hard on a 404 or an oversized
 *     payload — i.e. it catches a raw-URL/multi-MB regression or a broken ID.
 *
 * Phases 2–3: append AI Vision + Shopping shipped image URLs to LIVE_MANIFEST.
 */

// ── Per-role byte budgets (measured baselines: deck≈89KB, hero≈172KB, tile≈18KB) ──
const BUDGET = {
  hero: 520_000, // full-bleed cinematic, w_2000
  deck: 260_000, // swipe card, w_1200
  tile: 70_000,  // mosaic / loved thumb, w_420
};

const HERO_OPTS = { crop: 'fill' as const, aspectRatio: '16/9' };
const DECK_OPTS = { crop: 'fill' as const, aspectRatio: '16/11' };
const SQUARE_OPTS = { crop: 'fill' as const, aspectRatio: '1/1' };

type Case = { label: string; src: string; width: number; opts?: any; budget: number; minBytes?: number };

const LIVE_MANIFEST: Case[] = [
  { label: 'DNA result hero', src: DNA_HERO_FALLBACK, width: 2000, opts: HERO_OPTS, budget: BUDGET.hero },
  { label: 'Logged-in landing hero', src: QUIZ_LANDING_HERO, width: 2000, opts: HERO_OPTS, budget: BUDGET.hero },
  // Every Style-Quiz fallback room, at deck size — guards the exact 404 class that shipped once.
  ...Object.entries(QUIZ_ROOMS_FALLBACK).flatMap(([style, rooms]) =>
    rooms.map((r, i) => ({ label: `fallback ${style} #${i + 1}`, src: r.url, width: 1200, opts: DECK_OPTS, budget: BUDGET.deck }))
  ),
  // AI Vision (02) — the four shipped before/after explorer pairs, at the active-slider
  // size (square). Guards that the AI/ folder ids resolve + stay within the deck budget.
  ...AI_VISION_PAIRS.flatMap((p) => [
    { label: `vision ${p.key} · before`, src: p.before, width: 1200, opts: SQUARE_OPTS, budget: BUDGET.deck },
    { label: `vision ${p.key} · after`, src: p.after, width: 1200, opts: SQUARE_OPTS, budget: BUDGET.deck },
  ]),
  // Shopping List (03) — 4 curated room renders (explorer size) + 16 product thumbnails,
  // all uploaded to Cloudinary "Tool 03 Example". Guards that they resolve + stay small.
  ...SHOPPING_ROOMS.map((r) => ({ label: `shop room ${r.id}`, src: r.img, width: 1200, opts: { crop: 'fill' as const, aspectRatio: '4/3' }, budget: BUDGET.deck })),
  ...SHOPPING_ROOMS.flatMap((r) => r.items.map((it, i) => (
    { label: `shop ${r.id} product ${i + 1}`, src: it.img, width: 240, opts: SQUARE_OPTS, budget: BUDGET.tile, minBytes: 200 }
  ))),
  // Self-hosted retailer logos (small favicon-class PNGs — tiny by nature).
  ...SHOPPING_LOGOS.map((l) => ({ label: `retailer logo ${l.slug}`, src: `${SHOP_LOGO_BASE}/retailer-${l.slug}.png`, width: 64, budget: BUDGET.tile, minBytes: 120 })),
];

// ─────────────────────────────────────────────────────────────────────────────
describe('image delivery — cld() optimization invariants (unit)', () => {
  const sample = QUIZ_ROOMS_FALLBACK['Mid-Century'][0].url;

  it('always emits f_auto + q_auto for Cloudinary URLs', () => {
    const url = cld(sample, 1200);
    expect(url).toContain('f_auto');
    expect(url).toMatch(/q_auto/);
    expect(url).toContain('w_1200');
  });

  it('fill crop adds c_fill + g_auto + derived height', () => {
    const url = cld(sample, 1200, DECK_OPTS);
    expect(url).toContain('c_fill');
    expect(url).toContain('g_auto');
    expect(url).toContain('w_1200');
    expect(url).toContain('h_825'); // 1200 * 11/16
  });

  it('maps quality presets and numeric quality correctly', () => {
    expect(cld(sample, 320, { quality: 'best' })).toContain('q_auto:best');
    expect(cld(sample, 320, { quality: 90 })).toContain('q_90');
  });

  it('strips a stale transform segment and rebuilds canonically', () => {
    const stale = 'https://res.cloudinary.com/dys2k5muv/image/upload/w_4000,h_4000,c_fill,g_auto/v1774950187/12_iwshvs.jpg';
    const url = cld(stale, 800, DECK_OPTS);
    expect(url).not.toContain('w_4000');
    expect(url).toContain('w_800');
    expect(url).toContain('v1774950187/12_iwshvs.jpg');
    expect(url).toContain('f_auto');
  });

  it('passes through non-Cloudinary / data / svg URLs unchanged', () => {
    expect(cld('https://example.com/a.jpg', 800)).toBe('https://example.com/a.jpg');
    expect(cld('data:image/png;base64,AAAA', 800)).toBe('data:image/png;base64,AAAA');
    expect(cld('https://res.cloudinary.com/dys2k5muv/image/upload/v1/logo.svg', 800)).toContain('.svg');
  });

  it('builds a responsive srcSet with width descriptors', () => {
    const ss = cldSrcSet(sample, [768, 1200, 1600], DECK_OPTS);
    // URLs contain commas (f_auto,q_auto,...), so count width descriptors, not comma-splits.
    expect(ss.match(/\b\d+w\b/g)).toHaveLength(3);
    expect(ss).toContain('768w');
    expect(ss).toContain('1600w');
    expect((ss.match(/f_auto/g) || []).length).toBe(3);
  });
});

describe('Style-Quiz fallback dataset — delivery form (unit)', () => {
  const all = Object.values(QUIZ_ROOMS_FALLBACK).flat();

  it('covers all 15 styles', () => {
    expect(Object.keys(QUIZ_ROOMS_FALLBACK)).toHaveLength(15);
    Object.values(QUIZ_ROOMS_FALLBACK).forEach((rooms) => expect(rooms.length).toBeGreaterThanOrEqual(1));
  });

  // The account holds TWO generations of asset, and they have different valid
  // URL shapes — a single rule cannot cover both.
  //
  // ROOT assets (the original 9 styles) were uploaded before folder scoping, so
  // their public_id is a bare id. Only the version form resolves for them; a
  // folder-path URL 404s, and that bug shipped once.
  //
  // FOLDER-SCOPED assets (the 6 styles added 2026-08-31) were uploaded with
  // `folder`, so the path IS the public_id and /upload/v<ver>/Quiz/<Style>/<id>
  // is the canonical form. All 12 verified 200 before this test was relaxed.
  //
  // Requiring version-form of everything would now reject perfectly good URLs;
  // dropping the rule entirely would let the original 404 bug back in.
  it('root assets use version-form, folder-scoped assets use the full Quiz path', () => {
    for (const { url } of all) {
      if (url.includes('/Quiz/')) {
        expect(url, url).toMatch(/\/image\/upload\/v\d+\/Quiz\/[^/]+\/[^/]+\.\w+$/);
      } else {
        expect(url, url).toMatch(/\/image\/upload\/v\d+\/[^/]+\.\w+$/);
      }
    }
  });

  it('every fallback URL is optimizable through cld()', () => {
    for (const { url } of all) {
      const out = cld(url, 1200, DECK_OPTS);
      expect(out).toContain('f_auto');
      expect(out).toMatch(/q_auto/);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
async function fetchImg(url: string, ms = 20000): Promise<{ status: number; bytes: number; type: string }> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: ac.signal,
      headers: { Accept: 'image/avif,image/webp,image/*,*/*' },
    });
    const buf = await res.arrayBuffer();
    return { status: res.status, bytes: buf.byteLength, type: res.headers.get('content-type') || '' };
  } finally {
    clearTimeout(timer);
  }
}

describe('image delivery — live quality + speed smoke', () => {
  let online = false;

  beforeAll(async () => {
    // Tiny probe; if the network is unreachable we skip (don't false-fail CI).
    try {
      const r = await fetchImg(cld(DNA_HERO_FALLBACK, 48, { crop: 'fill', aspectRatio: '1/1' }), 8000);
      online = r.status === 200 && r.bytes > 0;
    } catch {
      online = false;
    }
    if (!online) console.warn('[imageQuality] network unreachable — live smoke skipped');
  }, 12000);

  for (const c of LIVE_MANIFEST) {
    it(`${c.label} → 200 + ≤${Math.round(c.budget / 1024)}KB`, async (ctx) => {
      if (!online) return ctx.skip();
      const url = cld(c.src, c.width, c.opts);
      const r = await fetchImg(url);
      expect(r.status, `${c.label} HTTP status for ${url}`).toBe(200);
      expect(r.type, `${c.label} content-type`).toMatch(/^image\//);
      expect(r.bytes, `${c.label} payload bytes (budget ${c.budget})`).toBeLessThanOrEqual(c.budget);
      // Floor tuned for photographic heroes/decks; tile-class cutouts + favicon
      // logos are legitimately tiny, so they carry a lower per-case floor.
      expect(r.bytes, `${c.label} non-empty body`).toBeGreaterThan(c.minBytes ?? 800);
    }, 30000);
  }
});
