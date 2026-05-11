import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cld, cldSrcSet, CARD_WIDTHS } from '../lib/cld';
import { useLanguage } from '../LanguageContext';
import FeedbackBand from './FeedbackBand';

// AI-023 — logged-out AI Vision experience.
// LIGHT theme per WEBSITE-PLAN-ai-vision-mockup.html (State 1 — Logged-out hero).
// Cohesion with Style Quiz logged-out: both marketing/teaser surfaces are LIGHT;
// only the actual logged-in tool canvas goes dark/cinematic (Variant D).
//
// Layout:
//   1. White hero — eyebrow / serif h1 / lead paragraph
//   2. Contained 21/9 before-after slider card with drag handle
//   3. Cobalt sign-in CTA + meta line
//   4. Dark "More transformations" example strip — 3 cards on white tile
//   5. Persistent feedback band

const CLD = 'https://res.cloudinary.com/dys2k5muv/image/upload';

const SLIDER_BEFORE = `${CLD}/before_2_s6lh97.png`;
const SLIDER_AFTER  = `${CLD}/after_2_aq8cwh.png`;

// Responsive ladder for the 21/9 hero card (max-width ~1280px on desktop).
const HERO_WIDTHS = [768, 1024, 1440, 1920];

const EXAMPLES = [
  {
    id: 1,
    conceptUrl: `${CLD}/after_1_wp9msc.png`,
    label: 'Rental apartment — calm dream',
    chip: 'Japandi',
  },
  {
    id: 2,
    conceptUrl: `${CLD}/after_2_aq8cwh.png`,
    label: 'Empty shell — warm sanctuary',
    chip: 'Mid-Century',
  },
  {
    id: 3,
    conceptUrl: `${CLD}/after_3_f14b5p.jpg`,
    label: 'Plain bedroom — layered retreat',
    chip: 'Bohemian',
  },
];

interface Props {
  onRequestLogin: () => void;
  onOpenFeedback?: () => void;
}

export default function AIVisionShowcase({ onRequestLogin, onOpenFeedback }: Props) {
  const { t } = useLanguage();

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

  const openFeedback = () => {
    if (onOpenFeedback) onOpenFeedback();
  };

  return (
    <div className="w-full bg-white">

      {/* ── HERO (light) — eyebrow + serif h1 + lead + before/after card + CTA ── */}
      <section className="bg-white pt-16 md:pt-20 pb-20 md:pb-24">
        <div className="max-w-[1280px] mx-auto px-6 md:px-14">
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#0047AB] mb-5">AI Vision</p>
          <h1 className="font-display font-normal leading-[1.05] tracking-tight text-black mb-6 max-w-[780px]" style={{ fontSize: 'clamp(44px, 5vw, 72px)', letterSpacing: '-0.01em' }}>
            Upload your room. See it redesigned.
          </h1>
          <p className="text-[17px] text-black/75 leading-relaxed max-w-[580px] mb-12">
            Drop a photo of your space. Add inspiration if you have it, or just pick a style. In 20 seconds, three concept renders — yours to keep, share, or carry into a Designature project.
          </p>

          {/* Before/after slider — contained card, sharp images via cldSrcSet */}
          <div
            ref={sliderRef}
            className="relative w-full overflow-hidden bg-black rounded-md"
            style={{ aspectRatio: '21/9', boxShadow: '0 32px 80px rgba(0,0,0,0.18)' }}
          >
            {/* AFTER pane — fills container, clipped right of slider */}
            <img
              src={cld(SLIDER_AFTER, 1440)}
              srcSet={cldSrcSet(SLIDER_AFTER, HERO_WIDTHS)}
              sizes="(min-width: 1280px) 1280px, 100vw"
              alt="Redesigned room — Mid-Century"
              width={1920} height={823}
              loading="eager"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover"
              style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
            />
            {/* BEFORE pane — fills container, clipped left of slider */}
            <img
              src={cld(SLIDER_BEFORE, 1440)}
              srcSet={cldSrcSet(SLIDER_BEFORE, HERO_WIDTHS)}
              sizes="(min-width: 1280px) 1280px, 100vw"
              alt="Original empty room"
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
              <span className="bg-[#0047AB]/85 text-white px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.25em]">Mid-Century</span>
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

          {/* CTA — matches Style Quiz CTA exactly */}
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

      {/* ── More transformations — dark strip with 3 white example cards ── */}
      <section className="bg-[#1a1a1a] text-white py-16 md:py-20">
        <div className="max-w-[1280px] mx-auto px-6 md:px-14">
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-white/55 mb-5">More transformations</p>
          <h2 className="font-display text-[28px] md:text-[36px] leading-tight mb-9">
            Three real rooms, three styles, three results.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-[18px]">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={onRequestLogin}
                className="bg-white text-left overflow-hidden rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#0047AB] hover:-translate-y-0.5 transition-transform"
                aria-label={`Sign in to try the ${ex.chip} look — ${ex.label}`}
              >
                <div className="relative overflow-hidden" style={{ aspectRatio: '4/3' }}>
                  <img
                    src={cld(ex.conceptUrl, 800, { crop: 'fill', aspectRatio: '4/3' })}
                    srcSet={cldSrcSet(ex.conceptUrl, CARD_WIDTHS, { crop: 'fill', aspectRatio: '4/3' })}
                    sizes="(min-width: 1024px) 33vw, 100vw"
                    width={800} height={600}
                    loading="lazy" decoding="async"
                    alt={`${ex.chip} concept — ${ex.label}`}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
                <div className="px-[18px] py-3.5 text-black">
                  <span className="block text-[9px] font-bold uppercase tracking-[0.22em] text-[#0047AB] mb-1.5">{ex.chip}</span>
                  <p className="font-display text-[18px] leading-tight">{ex.label}</p>
                </div>
              </button>
            ))}
          </div>
          <div className="mt-10 flex justify-center">
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
