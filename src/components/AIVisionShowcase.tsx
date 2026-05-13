import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cld, cldSrcSet } from '../lib/cld';
import { useLanguage } from '../LanguageContext';
import FeedbackBand from './FeedbackBand';

// AI-023 — logged-out AI Vision experience.
// LIGHT theme. Square 1:1 hero matched by 2-column layout (slider + side panel)
// per the cropped-image mockup (WEBSITE-PLAN-ai-vision-cropped-mockup.html).
//
// Layout:
//   1. White hero (eyebrow + serif h1 + lead)
//   2. Two-column stage:
//        - 1:1 before/after slider (manually-cropped square sources)
//        - Cream side panel: featured-pair eyebrow + name + desc, cobalt CTA,
//          meta line, Free/3-tools stats
//   3. Dark "More transformations" strip — 3 square split before|after cards
//        Click a card → swap with main hero, smooth-scroll, all 4 pairs visible.
//   4. Persistent feedback band

const CLD = 'https://res.cloudinary.com/dys2k5muv/image/upload';

type Pair = {
  id: number;
  before: string;
  after: string;
  style: string;
  name: string;
  desc: string;
};

// Manually-cropped 1:1 square sources uploaded to Cloudinary folder "AI/"
// with the `_square` suffix (originals preserved). See
// scripts/upload-cropped-vision-pairs.ts for the upload step.
const ALL_PAIRS: Record<number, Pair> = {
  7: {
    id: 7,
    before: `${CLD}/AI/before_7_bwczrl_square`,
    after:  `${CLD}/AI/after_7_i66inr_square`,
    style: 'Minimalism',
    name: 'Minimalism · living room',
    desc: "A bare-shell room transformed into a calm Minimalism living space — full ceiling, full floor, the room you'd actually walk into.",
  },
  1: {
    id: 1,
    before: `${CLD}/AI/before_1_fnbjlt_square`,
    after:  `${CLD}/AI/after_1_khwg9g_square`,
    style: 'Bohemian',
    name: 'Plain bedroom — layered retreat',
    desc: 'A bare room reimagined as a Bohemian bedroom — rattan chair, layered rug, soft window light.',
  },
  2: {
    id: 2,
    before: `${CLD}/AI/before_2_k7jvg3_square`,
    after:  `${CLD}/AI/after_2_kzpr3p_square`,
    style: 'Mid-Century',
    name: 'Empty shell — warm sanctuary',
    desc: 'An empty shell becomes a Mid-Century living space — soft sofa, warm light, pieces that earn their place.',
  },
  4: {
    id: 4,
    before: `${CLD}/AI/before_4_vpepte_square`,
    after:  `${CLD}/AI/after_4_xgalms_square`,
    style: 'Contemporary',
    name: 'Bright lounge — refined ease',
    desc: 'An empty bright room turned into a refined Contemporary lounge — clean lines, soft palette, an inviting calm.',
  },
};

// Hero is 1:1 square. The manually-cropped square sources are all 768-3000px
// natively, so no e_upscale needed (some exceed the 4.2 MP cap anyway and
// would 400). q_auto:best + mild sharpen is enough.
// Hero displays up to 950×950 (cap). The `sizes` hint below is inflated to
// 1900px so the browser picks the w_1920 srcset entry — 2× source-vs-display
// is a crisper downsample than 1×. q_auto:best + e_sharpen:60 is the natural-
// looking sweet spot (heavier q_100 + sharpen:100 produced visible halos and
// 5 MB files; this delivers ~half the bytes with a more photographic finish).
const HERO_WIDTHS = [800, 1280, 1600, 1920, 2400];
const HERO_OPTS = { crop: 'fill' as const, aspectRatio: '1/1', quality: 'best' as const, sharpen: 60 };

// Card halves use the same square sources at smaller widths.
const HALF_WIDTHS = [320, 480, 640, 800];
const HALF_OPTS = { crop: 'fill' as const, aspectRatio: '1/1', quality: 'best' as const, sharpen: 50 };

const SLIDER_MIN = 3;
const SLIDER_MAX = 97;

interface Props {
  onRequestLogin: () => void;
  onOpenFeedback?: () => void;
}

export default function AIVisionShowcase({ onRequestLogin, onOpenFeedback }: Props) {
  const { t } = useLanguage();

  // Click-swap state — main owns one pair, three card slots own the others.
  const [mainId, setMainId] = useState<number>(7);
  const [slotIds, setSlotIds] = useState<[number, number, number]>([1, 2, 4]);
  const mainPair = ALL_PAIRS[mainId];
  const slotPairs = slotIds.map(id => ALL_PAIRS[id]);

  const heroRef = useRef<HTMLDivElement>(null);

  // Drag-to-compare divider
  const sliderRef = useRef<HTMLDivElement>(null);
  const [sliderPos, setSliderPos] = useState(50);
  const [dragging, setDragging] = useState(false);

  const clampSlider = (v: number) => Math.max(SLIDER_MIN, Math.min(SLIDER_MAX, v));

  const handleDividerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const handleDividerMove = useCallback((e: PointerEvent) => {
    if (!dragging || !sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    setSliderPos(clampSlider((x / rect.width) * 100));
  }, [dragging]);
  const handleDividerUp = useCallback(() => setDragging(false), []);

  useEffect(() => {
    if (!dragging) return;
    window.addEventListener('pointermove', handleDividerMove);
    window.addEventListener('pointerup', handleDividerUp);
    return () => {
      window.removeEventListener('pointermove', handleDividerMove);
      window.removeEventListener('pointerup', handleDividerUp);
    };
  }, [dragging, handleDividerMove, handleDividerUp]);

  // Reset divider to center on pair swap.
  useEffect(() => { setSliderPos(50); }, [mainId]);

  const handleCardClick = (slotIdx: 0 | 1 | 2) => {
    const clickedPairId = slotIds[slotIdx];
    const previousMainId = mainId;
    setMainId(clickedPairId);
    setSlotIds(prev => {
      const next: [number, number, number] = [...prev] as [number, number, number];
      next[slotIdx] = previousMainId;
      return next;
    });
    requestAnimationFrame(() => {
      heroRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const openFeedback = () => {
    if (onOpenFeedback) onOpenFeedback();
  };

  return (
    <div className="w-full bg-white">

      {/* ── HERO (light) — layout mirrors Style Quiz logged-out (1.4fr / 1fr) ── */}
      <section ref={heroRef} className="bg-white py-16 md:py-20">
        <div className="px-8 md:px-16">
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#0047AB] mb-5">AI Vision</p>
          <h1 className="font-display font-normal tracking-tight leading-[1.05] text-black mb-5 max-w-[720px]" style={{ fontSize: 'clamp(40px, 5vw, 64px)' }}>
            Upload your room. See it redesigned.
          </h1>
          <p className="text-[17px] text-black/75 max-w-[560px] leading-relaxed mb-12">
            Drop a room photo, add 2–3 references, pick a style. Thirty seconds later: three concepts of your space, reimagined — yours to keep, share, or carry into a Designature project.
          </p>

          {/* Two-column stage — slider (1.4fr) + 3-step side panel (1fr) */}
          <div className="grid lg:grid-cols-[1.4fr_1fr] gap-10 lg:gap-14 items-stretch">

            {/* Square before/after slider — sharp corners + shadow match Style Quiz.
                Capped at 950×950 on wide screens — same cap on Style Quiz so
                both heroes match position + size. */}
            <div
              ref={sliderRef}
              className="relative w-full max-w-[950px] mx-auto overflow-hidden bg-black shadow-[0_28px_60px_rgba(0,0,0,0.18)]"
              style={{ aspectRatio: '1/1' }}
            >
              {/* AFTER pane — clipped right of slider */}
              <img
                key={`after-${mainPair.id}`}
                src={cld(mainPair.after, 1024, HERO_OPTS)}
                srcSet={cldSrcSet(mainPair.after, HERO_WIDTHS, HERO_OPTS)}
                sizes="(min-width: 1024px) min(1900px, 100vw), 100vw"
                alt={`Redesigned room — ${mainPair.style}`}
                width={1024} height={1024}
                loading="eager"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover"
                style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
              />
              {/* BEFORE pane — clipped left of slider */}
              <img
                key={`before-${mainPair.id}`}
                src={cld(mainPair.before, 1024, HERO_OPTS)}
                srcSet={cldSrcSet(mainPair.before, HERO_WIDTHS, HERO_OPTS)}
                sizes="(min-width: 1024px) min(1900px, 100vw), 100vw"
                alt="Original room"
                width={1024} height={1024}
                loading="eager"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover"
                style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
              />

              {/* Labels */}
              <div className="absolute top-5 left-5 z-[3]">
                <span className="bg-black/65 text-white px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.25em]">Before</span>
              </div>
              <div className="absolute top-5 right-5 z-[3]">
                <span className="bg-[#0047AB]/85 text-white px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.25em]">{mainPair.style}</span>
              </div>

              {/* Divider + handle */}
              <div
                className="absolute top-0 bottom-0 z-[4] pointer-events-none"
                style={{ left: `${sliderPos}%`, width: 2, background: 'rgba(255,255,255,0.78)', transform: 'translateX(-1px)' }}
              />
              <div
                onPointerDown={handleDividerDown}
                className="absolute top-1/2 z-[5] -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white flex items-center justify-center text-black font-bold shadow-[0_6px_22px_rgba(0,0,0,0.45)] cursor-ew-resize select-none text-[14px]"
                style={{ left: `${sliderPos}%`, touchAction: 'none' }}
                aria-label="Drag to compare before and after"
              >
                ↔
              </div>

            </div>

            {/* Right-side panel — 3-step explainer + bottom-anchored CTA.
                Style mirrors Style Quiz logged-out exactly (cobalt-outlined
                step circles, justify-between distributes steps + CTA). */}
            <aside className="flex flex-col gap-10 justify-between">
              <div className="flex flex-col gap-7">
                {[
                  { n: '1', title: 'Drop a room photo',   body: "Any room of your home. Phone snapshots are fine — better light helps, but isn't required." },
                  { n: '2', title: 'Add 2–3 inspirations', body: 'Reference photos or Pinterest pins — these tell the AI what direction to take.' },
                  { n: '3', title: 'See three concepts',   body: 'Thirty seconds of generation. Yours to keep, share with a friend, or carry into a Designature project.' },
                ].map(s => (
                  <div key={s.n} className="grid grid-cols-[36px_1fr] gap-5 items-start">
                    <div className="w-8 h-8 rounded-full border-[1.5px] border-[#0047AB] text-[#0047AB] font-display text-lg flex items-center justify-center">{s.n}</div>
                    <div>
                      <h4 className="text-[13px] font-bold uppercase tracking-[0.18em] text-black mb-1.5">{s.title}</h4>
                      <p className="text-[14px] text-black/75 leading-relaxed">{s.body}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3.5 border-t border-[#DAD2C3] pt-7">
                <button
                  type="button"
                  onClick={onRequestLogin}
                  className="inline-flex items-center justify-center gap-3 px-7 py-[18px] bg-[#0047AB] text-white text-[12px] font-bold uppercase tracking-[0.25em] hover:bg-[#003d99] transition-colors"
                >
                  {t('ai.quiz.signInCta')} →
                </button>
                <p className="text-[11px] text-black/65 uppercase tracking-[0.18em] text-center">
                  Free · 3 generations · No card needed
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* ── More transformations — dark strip with 3 square split cards ── */}
      <section className="bg-[#1a1a1a] text-white py-14 md:py-18">
        <div className="max-w-[1280px] mx-auto px-6 md:px-14">
          <div className="flex flex-wrap items-end justify-between gap-6 mb-8">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-white/55 mb-2">More transformations</p>
              <h2 className="font-display text-[26px] md:text-[32px] leading-tight">
                Three real rooms, three styles, three results.
              </h2>
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/55">
              Tap a card to load it in the slider above ↑
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-[18px]">
            {slotPairs.map((pair, idx) => (
              <button
                key={`slot-${idx}-${pair.id}`}
                type="button"
                onClick={() => handleCardClick(idx as 0 | 1 | 2)}
                className="vision-card-ba bg-white text-left overflow-hidden rounded-md transition-all hover:-translate-y-0.5 focus:outline-none"
                aria-label={`Swap ${pair.style} into the main comparison slider above`}
                style={{ cursor: 'zoom-in' }}
              >
                {/* Square card — split before|after */}
                <div className="relative grid grid-cols-2 overflow-hidden" style={{ aspectRatio: '1/1' }}>
                  <div className="relative overflow-hidden bg-[#f0ece4]">
                    <img
                      src={cld(pair.before, 480, HALF_OPTS)}
                      srcSet={cldSrcSet(pair.before, HALF_WIDTHS, HALF_OPTS)}
                      sizes="(min-width: 768px) 16vw, 50vw"
                      width={480} height={480}
                      loading="lazy" decoding="async"
                      alt={`Before — ${pair.name}`}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </div>
                  <div className="relative overflow-hidden bg-[#f0ece4]" style={{ borderLeft: '1px solid rgba(255,255,255,0.6)' }}>
                    <img
                      src={cld(pair.after, 480, HALF_OPTS)}
                      srcSet={cldSrcSet(pair.after, HALF_WIDTHS, HALF_OPTS)}
                      sizes="(min-width: 768px) 16vw, 50vw"
                      width={480} height={480}
                      loading="lazy" decoding="async"
                      alt={`After — ${pair.name}`}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </div>
                  <span className="absolute top-2.5 left-2.5 bg-black/55 text-white text-[9px] font-bold uppercase tracking-[0.22em] px-2 py-1">
                    Before
                  </span>
                  <span className="absolute top-2.5 right-2.5 bg-[#0047AB]/85 text-white text-[9px] font-bold uppercase tracking-[0.22em] px-2 py-1">
                    After
                  </span>
                </div>
                <div className="px-[18px] py-3.5 text-black">
                  <span className="block text-[9px] font-bold uppercase tracking-[0.22em] text-[#0047AB] mb-1.5">{pair.style}</span>
                  <p className="font-display text-[18px] leading-tight">{pair.name}</p>
                </div>
              </button>
            ))}
          </div>

          <p className="text-center mt-7 text-[11px] font-bold uppercase tracking-[0.22em] text-white/55">
            All four pairs always visible — click a card to swap it into the slider
          </p>
          <div className="mt-7 flex justify-center">
            <button
              type="button"
              onClick={onRequestLogin}
              className="inline-flex items-center justify-center gap-3 px-7 py-[18px] bg-[#0047AB] text-white text-[12px] font-bold uppercase tracking-[0.25em] hover:bg-[#003d99] transition-colors"
            >
              {t('ai.quiz.signInCta')} →
            </button>
          </div>
        </div>
      </section>

      <FeedbackBand onOpenFeedback={openFeedback} />
    </div>
  );
}
