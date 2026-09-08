import { describe, it, expect, beforeAll } from 'vitest';
import { cld, cldSrcSet } from '../lib/cld';
import {
  QUIZ_ROOMS_FALLBACK, DNA_HERO_FALLBACK, QUIZ_LANDING_HERO,
  QUIZ_DECK_RATIO, QUIZ_DECK_IMAGE_OPTS,
  QUIZ_HERO_SOURCES, QUIZ_HERO_SIZES, QUIZ_MOSAIC_SOURCES, QUIZ_MOSAIC_SIZES,
} from '../components/StyleQuizScreen';
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

/** Widest rung of the real hero ladder — the heaviest thing a visitor can pull. */
const HERO_TOP = QUIZ_HERO_SOURCES[QUIZ_HERO_SOURCES.length - 1];
const HERO_OPTS = { crop: 'fill' as const, aspectRatio: HERO_TOP.ratio };
const HERO_WIDTH = HERO_TOP.widths[HERO_TOP.widths.length - 1];
/** The real deck delivery options, imported so the smoke test can never drift from the screen. */
const DECK_OPTS = QUIZ_DECK_IMAGE_OPTS;
const FILL_OPTS = { crop: 'fill' as const, aspectRatio: '16/11' };
const SQUARE_OPTS = { crop: 'fill' as const, aspectRatio: '1/1' };

type Case = { label: string; src: string; width: number; opts?: any; budget: number; minBytes?: number };

const LIVE_MANIFEST: Case[] = [
  { label: 'DNA result hero', src: DNA_HERO_FALLBACK, width: HERO_WIDTH, opts: HERO_OPTS, budget: BUDGET.hero },
  { label: 'Logged-in landing hero', src: QUIZ_LANDING_HERO, width: HERO_WIDTH, opts: HERO_OPTS, budget: BUDGET.hero },
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
    const url = cld(sample, 1200, FILL_OPTS);
    expect(url).toContain('c_fill');
    expect(url).toContain('g_auto');
    expect(url).toContain('w_1200');
    expect(url).toContain('h_825'); // 1200 * 11/16
  });

  it('pad crop fits the whole image and never crops', () => {
    const url = cld(sample, 1200, { crop: 'pad', aspectRatio: '37/27' });
    expect(url).toContain('c_pad');
    expect(url).toContain('b_auto:predominant_gradient');
    expect(url).toContain('h_876'); // 1200 * 27/37
    // c_pad must never fall back to a cropping transform.
    expect(url).not.toContain('c_fill');
    expect(url).not.toContain('g_auto');
  });

  it('pad background is overridable', () => {
    expect(cld(sample, 800, { crop: 'pad', aspectRatio: '1/1', background: 'auto:border' })).toContain('b_auto:border');
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

/**
 * The deck used to deliver c_fill at 16:11. The Quiz library is 208 renders at
 * 1184x864 plus 81 legacy 1:1 squares, so that setting threw away 31% of the
 * height of every square — cove lighting, pendants and ceilings cropped out of
 * the very rooms people are being asked to judge.
 */
/**
 * Hero + mosaic art direction (regression).
 *
 * Both used to be delivered at a single flat ratio with no srcSet, so the
 * browser cover-cropped a SECOND time to reach the real band. Ratios below are
 * MEASURED on the running page, not assumed — see QUIZ_HERO_SOURCES.
 */
describe('Style-Quiz hero + mosaic — one informed crop, not two blind ones', () => {
  /** Band ratio actually painted at each viewport width. */
  const HERO_BAND: [number, number][] = [
    [390, 0.624], [640, 0.961], [768, 1.006], [1024, 1.035],
    [1280, 1.426], [1440, 1.508], [1680, 1.601], [1920, 1.857],
  ];
  /** Mosaic cell ratio actually painted at each viewport width. */
  const TILE_BAND: [number, number][] = [
    [390, 0.775], [640, 1.000], [768, 0.493], [1024, 0.504],
    [1280, 0.704], [1440, 0.746], [1680, 0.795], [1920, 0.924],
  ];

  const ratioOf = (r: string) => { const [a, b] = r.split('/').map(Number); return a / b; };
  /** The rung a browser picks: first source whose media query matches. */
  const pick = (sources: typeof QUIZ_HERO_SOURCES, vw: number) =>
    sources.find(s => {
      if (!s.media) return true;
      const m = s.media.match(/max-width:\s*(\d+)px/);
      return m ? vw <= Number(m[1]) : true;
    })!;
  /** Fraction of the delivered image still visible after object-fit: cover. */
  const kept = (delivered: number, band: number) => (delivered > band ? band / delivered : delivered / band);

  it('every hero source is a valid ratio and only the last is unconditional', () => {
    QUIZ_HERO_SOURCES.forEach((s, i) => {
      expect(ratioOf(s.ratio), s.ratio).toBeGreaterThan(0);
      expect(s.widths.length, s.ratio).toBeGreaterThan(1);
      if (i < QUIZ_HERO_SOURCES.length - 1) expect(s.media, `rung ${i}`).toBeTruthy();
      else expect(s.media, 'last rung must be the unconditional fallback').toBeUndefined();
    });
  });

  it('hero media queries ascend, so the first match is the narrowest rung', () => {
    const caps = QUIZ_HERO_SOURCES.filter(s => s.media)
      .map(s => Number(s.media!.match(/max-width:\s*(\d+)px/)![1]));
    expect(caps).toEqual([...caps].sort((a, b) => a - b));
  });

  it('hero keeps at least 80% of the picture at every measured viewport', () => {
    for (const [vw, band] of HERO_BAND) {
      const k = kept(ratioOf(pick(QUIZ_HERO_SOURCES, vw).ratio), band);
      expect(k, `hero @${vw}px kept ${(k * 100).toFixed(1)}%`).toBeGreaterThan(0.8);
    }
  });

  it('mosaic tiles keep at least 80% at every measured viewport', () => {
    for (const [vw, band] of TILE_BAND) {
      const k = kept(ratioOf(pick(QUIZ_MOSAIC_SOURCES, vw).ratio), band);
      expect(k, `tile @${vw}px kept ${(k * 100).toFixed(1)}%`).toBeGreaterThan(0.8);
    }
  });

  it('beats the old flat 16:9 hero everywhere it used to hurt', () => {
    for (const [vw, band] of HERO_BAND.filter(([w]) => w <= 1280)) {
      const now = kept(ratioOf(pick(QUIZ_HERO_SOURCES, vw).ratio), band);
      const before = kept(16 / 9, band);
      expect(now, `hero @${vw}px`).toBeGreaterThan(before);
    }
  });

  it('emits c_fill with the rung ratio and real width descriptors', () => {
    const src = QUIZ_LANDING_HERO;
    for (const s of QUIZ_HERO_SOURCES) {
      const ss = cldSrcSet(src, s.widths, { crop: 'fill', aspectRatio: s.ratio });
      expect(ss).toContain('c_fill');
      expect(ss.match(/\b\d+w\b/g), s.ratio).toHaveLength(s.widths.length);
      const [a, b] = s.ratio.split('/').map(Number);
      expect(ss, s.ratio).toContain(`h_${Math.round((s.widths[0] * b) / a)}`);
    }
  });

  it('ships sizes hints so a phone never pulls a desktop hero', () => {
    expect(QUIZ_HERO_SIZES).toMatch(/vw/);
    expect(QUIZ_MOSAIC_SIZES).toMatch(/vw/);
    // The old code hard-requested w_2000 on every viewport.
    const narrowest = QUIZ_HERO_SOURCES[0];
    expect(Math.min(...narrowest.widths)).toBeLessThan(800);
  });
});

describe('Style-Quiz deck — never crops the room (regression)', () => {
  it('deck frame matches the native ratio of the 1184x864 render set', () => {
    const [w, h] = QUIZ_DECK_RATIO.split('/').map(Number);
    expect(w / h).toBeCloseTo(1184 / 864, 5);
  });

  it('deck delivery pads instead of cropping', () => {
    expect(QUIZ_DECK_IMAGE_OPTS.crop).toBe('pad');
    expect(QUIZ_DECK_IMAGE_OPTS.aspectRatio).toBe(QUIZ_DECK_RATIO);
  });

  it('no fallback room is cropped at deck size, whatever its native ratio', () => {
    for (const { url } of Object.values(QUIZ_ROOMS_FALLBACK).flat()) {
      const out = cld(url, 1200, QUIZ_DECK_IMAGE_OPTS);
      expect(out, url).toContain('c_pad');
      expect(out, url).not.toContain('c_fill');
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
