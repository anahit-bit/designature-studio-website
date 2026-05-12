import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cld, cldSrcSet, THUMB_WIDTHS } from '../lib/cld';
import { useLanguage } from '../LanguageContext';
import FeedbackBand from './FeedbackBand';

// AI-023 — logged-out AI Vision experience.
// LIGHT theme per WEBSITE-PLAN-ai-vision-mockup.html.
//
// Layout:
//   1. White hero — eyebrow / serif h1 / lead
//   2. Contained 21/9 before/after slider — draggable, swappable
//   3. Cobalt sign-in CTA + meta line
//   4. Dark "More transformations" strip — 3 split before|after cards
//      Click a card → main hero re-renders with that pair, smooth-scrolls
//      back to the hero, card gets a cobalt outline + "now showing" suffix.
//   5. Persistent feedback band

const CLD = 'https://res.cloudinary.com/dys2k5muv/image/upload';

// Featured pair shown in the main hero on initial load. Not in the card row.
const FEATURED_PAIR = {
  id: 'featured' as const,
  before: `${CLD}/before_7_bwczri`,
  after:  `${CLD}/after_7_i66inr`,
  style: 'Minimalism',
};

type CardPair = {
  id: 1 | 2 | 4;
  before: string;
  after: string;
  style: string;
  name: string;
};

const CARD_PAIRS: CardPair[] = [
  {
    id: 1,
    before: `${CLD}/before_1_fnbjlt`,
    after:  `${CLD}/after_1_khwg9g`,
    style: 'Bohemian',
    name: 'Plain bedroom — layered retreat',
  },
  {
    id: 2,
    before: `${CLD}/before_2_k7jvg3`,
    after:  `${CLD}/after_2_kzpr3p`,
    style: 'Mid-Century',
    name: 'Empty shell — warm sanctuary',
  },
  {
    id: 4,
    before: `${CLD}/before_4_vpepte`,
    after:  `${CLD}/after_4_xgalms`,
    style: 'Contemporary',
    name: 'Bright lounge — refined ease',
  },
];

const HERO_WIDTHS = [768, 1024, 1440, 1920];

interface Props {
  onRequestLogin: () => void;
  onOpenFeedback?: () => void;
}

export default function AIVisionShowcase({ onRequestLogin, onOpenFeedback }: Props) {
  const { t } = useLanguage();

  // Active pair: defaults to featured (pair 7). Clicking a card sets it; last-clicked wins.
  const [activeId, setActiveId] = useState<'featured' | 1 | 2 | 4>('featured');
  const activePair = activeId === 'featured'
    ? FEATURED_PAIR
    : (CARD_PAIRS.find(p => p.id === activeId) ?? FEATURED_PAIR);

  const heroRef = useRef<HTMLDivElement>(null);

  // ── Before/after slider — drag the divider ──
  const sliderRef = useRef<HTMLDivElement>(null);
  const [sliderPos, setSliderPos] = useState(50);
  const [dragging, setDragging] = useState(false);

  const handleDividerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const handleDividerMove = useCallback((e: PointerEvent) => {
    if (!dragging || !sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    setSliderPos((x / rect.width) * 100);
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

  // Reset divider to center on pair swap so the new pair is shown equally.
  useEffect(() => { setSliderPos(50); }, [activeId]);

  const handleCardClick = (id: 1 | 2 | 4) => {
    setActiveId(id);
    // Wait one frame so the swap has rendered before we scroll.
    requestAnimationFrame(() => {
      heroRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const openFeedback = () => {
    if (onOpenFeedback) onOpenFeedback();
  };

  return (
    <div className="w-full bg-white">

      {/* ── HERO (light) — eyebrow + serif h1 + lead + before/after card + CTA ── */}
      <section ref={heroRef} className="bg-white pt-16 md:pt-20 pb-20 md:pb-24">
        <div className="max-w-[1280px] mx-auto px-6 md:px-14">
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#0047AB] mb-5">AI Vision</p>
          <h1 className="font-display font-normal leading-[1.05] tracking-tight text-black mb-6 max-w-[780px]" style={{ fontSize: 'clamp(44px, 5vw, 72px)', letterSpacing: '-0.01em' }}>
            Upload your room. See it redesigned.
          </h1>
          <p className="text-[17px] text-black/75 leading-relaxed max-w-[580px] mb-12">
            Drop a photo of your space. Add inspiration if you have it, or just pick a style. In 20 seconds, three concept renders — yours to keep, share, or carry into a Designature project.
          </p>

          {/* Contained 21/9 before/after slider — swappable via card clicks below */}
          <div
            ref={sliderRef}
            className="relative w-full overflow-hidden bg-black rounded-md"
            style={{ aspectRatio: '21/9', boxShadow: '0 32px 80px rgba(0,0,0,0.18)' }}
          >
            {/* AFTER pane — full width, clipped right of slider */}
            <img
              key={`after-${activePair.id}`}
              src={cld(activePair.after, 1440)}
              srcSet={cldSrcSet(activePair.after, HERO_WIDTHS)}
              sizes="(min-width: 1280px) 1280px, 100vw"
              alt={`Redesigned room — ${activePair.style}`}
              width={1920} height={823}
              loading="eager"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover"
              style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
            />
            {/* BEFORE pane — full width, clipped left of slider */}
            <img
              key={`before-${activePair.id}`}
              src={cld(activePair.before, 1440)}
              srcSet={cldSrcSet(activePair.before, HERO_WIDTHS)}
              sizes="(min-width: 1280px) 1280px, 100vw"
              alt="Original room"
              width={1920} height={823}
              loading="eager"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover"
              style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
            />

            {/* Pane labels */}
            <div className="absolute top-6 left-6 z-[3]">
              <span className="bg-black/65 text-white px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.25em]">Before</span>
            </div>
            <div className="absolute top-6 right-6 z-[3]">
              <span className="bg-[#0047AB]/85 text-white px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.25em]">{activePair.style}</span>
            </div>

            {/* Divider + handle */}
            <div
              className="absolute top-0 bottom-0 z-[4]"
              style={{ left: `${sliderPos}%`, width: 2, background: 'rgba(255,255,255,0.7)', transform: 'translateX(-1px)' }}
            >
              <div
                onPointerDown={handleDividerDown}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white flex items-center justify-center text-black font-bold shadow-[0_4px_16px_rgba(0,0,0,0.3)] cursor-ew-resize select-none text-[14px]"
                style={{ touchAction: 'none' }}
                aria-label="Drag to compare"
              >
                ↔
              </div>
            </div>

            {/* Bottom-center "Drag to compare" tag */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[3] pointer-events-none">
              <span className="bg-white/95 text-black px-5 py-2 font-display text-[16px] font-medium">
                Drag to compare →
              </span>
            </div>
          </div>

          {/* CTA — matches Style Quiz logged-out CTA exactly */}
          <div className="mt-14 flex flex-col items-start gap-3.5">
            <button
              type="button"
              onClick={onRequestLogin}
              className="inline-flex items-center justify-center gap-3 px-7 py-[18px] bg-[#0047AB] text-white text-[12px] font-bold uppercase tracking-[0.25em] hover:bg-[#003d99] transition-colors"
            >
              {t('ai.quiz.signInCta')} →
            </button>
            <p className="text-[11px] text-[#6B6B6B] uppercase tracking-[0.18em]">
              Free · 3 generations · No card needed
            </p>
          </div>
        </div>
      </section>

      {/* ── More transformations — dark strip with 3 split before|after cards ── */}
      <section className="bg-[#1a1a1a] text-white py-16 md:py-20">
        <div className="max-w-[1280px] mx-auto px-6 md:px-14">
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-white/55 mb-5">More transformations</p>
          <h2 className="font-display text-[28px] md:text-[36px] leading-tight mb-9">
            Three real rooms, three styles, three results.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-[18px]">
            {CARD_PAIRS.map((pair) => {
              const isActive = activeId === pair.id;
              return (
                <button
                  key={pair.id}
                  type="button"
                  onClick={() => handleCardClick(pair.id)}
                  className="vision-card-ba bg-white text-left overflow-hidden rounded-[4px] transition-all hover:-translate-y-0.5 focus:outline-none"
                  aria-pressed={isActive}
                  aria-label={`Show ${pair.style} transformation in the slider above`}
                  style={{ cursor: 'zoom-in' }}
                >
                  {/* Split before|after — 4/3 card, 50/50 columns */}
                  <div className="relative grid grid-cols-2" style={{ aspectRatio: '4/3' }}>
                    <div className="relative overflow-hidden bg-[#f0ece4]">
                      <img
                        src={cld(pair.before, 480, { crop: 'fill', aspectRatio: '2/3' })}
                        srcSet={cldSrcSet(pair.before, THUMB_WIDTHS, { crop: 'fill', aspectRatio: '2/3' })}
                        sizes="(min-width: 768px) 16vw, 50vw"
                        width={480} height={720}
                        loading="lazy" decoding="async"
                        alt={`Before — ${pair.name}`}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    </div>
                    <div className="relative overflow-hidden bg-[#f0ece4]" style={{ borderLeft: '1px solid rgba(255,255,255,0.45)' }}>
                      <img
                        src={cld(pair.after, 480, { crop: 'fill', aspectRatio: '2/3' })}
                        srcSet={cldSrcSet(pair.after, THUMB_WIDTHS, { crop: 'fill', aspectRatio: '2/3' })}
                        sizes="(min-width: 768px) 16vw, 50vw"
                        width={480} height={720}
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
                  {/* Meta — chip + serif name */}
                  <div className="px-[18px] py-3.5 text-black">
                    <span className="block text-[9px] font-bold uppercase tracking-[0.22em] text-[#0047AB] mb-1.5">
                      {pair.style}{isActive && <span className="text-[#6B6B6B] font-normal normal-case tracking-normal"> · now showing</span>}
                    </span>
                    <p className="font-display text-[18px] leading-tight">{pair.name}</p>
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-center mt-7 text-[11px] font-bold uppercase tracking-[0.22em] text-white/55">
            Tap a transformation to load it in the comparison slider above ↑
          </p>
          <div className="mt-9 flex justify-center">
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

      {/* Persistent feedback band */}
      <FeedbackBand onOpenFeedback={openFeedback} />
    </div>
  );
}
