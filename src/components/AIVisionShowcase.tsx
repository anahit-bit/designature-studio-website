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

const ALL_PAIRS: Record<number, Pair> = {
  7: {
    id: 7,
    before: `${CLD}/before_7_bwczrl`,
    after:  `${CLD}/after_7_i66inr`,
    style: 'Minimalism',
    name: 'Minimalism · living room',
    desc: "A bare-shell room transformed into a calm Minimalism living space — full ceiling, full floor, the room you'd actually walk into.",
  },
  1: {
    id: 1,
    before: `${CLD}/before_1_fnbjlt`,
    after:  `${CLD}/after_1_khwg9g`,
    style: 'Bohemian',
    name: 'Plain bedroom — layered retreat',
    desc: 'A bare room reimagined as a Bohemian bedroom — rattan chair, layered rug, soft window light.',
  },
  2: {
    id: 2,
    before: `${CLD}/before_2_k7jvg3`,
    after:  `${CLD}/after_2_kzpr3p`,
    style: 'Mid-Century',
    name: 'Empty shell — warm sanctuary',
    desc: 'An empty shell becomes a Mid-Century living space — soft sofa, warm light, pieces that earn their place.',
  },
  4: {
    id: 4,
    before: `${CLD}/before_4_vpepte`,
    after:  `${CLD}/after_4_xgalms`,
    style: 'Contemporary',
    name: 'Bright lounge — refined ease',
    desc: 'An empty bright room turned into a refined Contemporary lounge — clean lines, soft palette, an inviting calm.',
  },
};

// Hero is 1:1 square (sources are manually cropped to square).
// AFTER images are AI-rendered (~1 MP) — e_upscale + sharpen recovers detail.
// BEFORE images are source photos (often >4 MP) — e_upscale would 400, so just
// q_auto:best + mild sharpen.
const HERO_WIDTHS = [640, 800, 1024, 1280];
const HERO_BEFORE_OPTS = { crop: 'fill' as const, aspectRatio: '1/1', quality: 'best' as const, sharpen: 40 };
const HERO_AFTER_OPTS  = { crop: 'fill' as const, aspectRatio: '1/1', quality: 'best' as const, enhance: true, sharpen: 80 };

// Card halves are 1:2 vertical slivers within the square card grid.
// object-fit:cover on the half cell means the image center-crops to fit.
// At 1280 viewport, md+ each card is 33vw ≈ 420px wide, half ≈ 210px.
const HALF_WIDTHS = [320, 480, 640, 800];
const HALF_BEFORE_OPTS = { crop: 'fill' as const, aspectRatio: '1/1', quality: 'best' as const, sharpen: 40 };
const HALF_AFTER_OPTS  = { crop: 'fill' as const, aspectRatio: '1/1', quality: 'best' as const, enhance: true, sharpen: 60 };

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

      {/* ── HERO (light) ── */}
      <section ref={heroRef} className="bg-white pt-16 md:pt-20 pb-20 md:pb-24">
        <div className="max-w-[1280px] mx-auto px-6 md:px-14">
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#0047AB] mb-5">AI Vision</p>
          <h1 className="font-display font-normal leading-[1.05] tracking-tight text-black mb-6 max-w-[780px]" style={{ fontSize: 'clamp(44px, 5vw, 72px)', letterSpacing: '-0.01em' }}>
            Upload your room. See it redesigned.
          </h1>
          <p className="text-[17px] text-black/75 leading-relaxed max-w-[560px] mb-11">
            Drop a photo of your space. Add inspiration if you have it, or just pick a style. In 20 seconds, three concept renders — yours to keep, share, or carry into a Designature project.
          </p>

          {/* Two-column stage — square slider + cream side panel */}
          <div className="grid gap-10 lg:gap-14 items-start grid-cols-1 lg:grid-cols-[1fr_320px]">

            {/* Square before/after slider */}
            <div
              ref={sliderRef}
              className="relative w-full overflow-hidden bg-black rounded-md"
              style={{ aspectRatio: '1/1', boxShadow: '0 32px 80px rgba(0,0,0,0.18)' }}
            >
              {/* AFTER pane — clipped right of slider */}
              <img
                key={`after-${mainPair.id}`}
                src={cld(mainPair.after, 1024, HERO_AFTER_OPTS)}
                srcSet={cldSrcSet(mainPair.after, HERO_WIDTHS, HERO_AFTER_OPTS)}
                sizes="(min-width: 1024px) 800px, 100vw"
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
                src={cld(mainPair.before, 1024, HERO_BEFORE_OPTS)}
                srcSet={cldSrcSet(mainPair.before, HERO_WIDTHS, HERO_BEFORE_OPTS)}
                sizes="(min-width: 1024px) 800px, 100vw"
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

              {/* Bottom-center hint */}
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-[3] pointer-events-none">
                <span className="bg-white/96 text-black px-5 py-2 font-display text-[15px] font-medium">
                  Drag to compare →
                </span>
              </div>
            </div>

            {/* Right-side panel — featured pair + sign-in CTA */}
            <aside className="bg-[#F4EFE7] border border-[#DAD2C3] rounded-md p-7 md:p-8 flex flex-col gap-5 self-stretch">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#0047AB] mb-2">Featured transformation</p>
                <h3 className="font-display text-[26px] md:text-[30px] leading-tight text-black mb-3">{mainPair.name}</h3>
                <p className="text-[13px] text-[#404040] leading-relaxed">{mainPair.desc}</p>
              </div>

              <div className="h-px bg-[#DAD2C3]" />

              <button
                type="button"
                onClick={onRequestLogin}
                className="inline-flex items-center justify-center gap-2.5 px-6 py-[18px] bg-[#0047AB] text-white text-[12px] font-bold uppercase tracking-[0.22em] hover:bg-[#003d99] transition-colors"
              >
                {t('ai.quiz.signInCta')} →
              </button>
              <p className="text-[11px] uppercase tracking-[0.22em] text-[#6B6B6B] text-center">
                Free · 3 generations · No card needed
              </p>

              <div className="h-px bg-[#DAD2C3]" />

              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="font-display text-[28px] leading-none text-black">Free</div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-[#6B6B6B] mt-1">To explore</div>
                </div>
                <div className="flex-1 text-right">
                  <div className="font-display text-[28px] leading-none text-black">3</div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-[#6B6B6B] mt-1">Live AI tools</div>
                </div>
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
                      src={cld(pair.before, 480, HALF_BEFORE_OPTS)}
                      srcSet={cldSrcSet(pair.before, HALF_WIDTHS, HALF_BEFORE_OPTS)}
                      sizes="(min-width: 768px) 16vw, 50vw"
                      width={480} height={480}
                      loading="lazy" decoding="async"
                      alt={`Before — ${pair.name}`}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </div>
                  <div className="relative overflow-hidden bg-[#f0ece4]" style={{ borderLeft: '1px solid rgba(255,255,255,0.6)' }}>
                    <img
                      src={cld(pair.after, 480, HALF_AFTER_OPTS)}
                      srcSet={cldSrcSet(pair.after, HALF_WIDTHS, HALF_AFTER_OPTS)}
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
