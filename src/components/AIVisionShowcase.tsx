import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cld, cldSrcSet, THUMB_WIDTHS } from '../lib/cld';
import { useLanguage } from '../LanguageContext';
import FeedbackBand from './FeedbackBand';

// AI-023 — logged-out AI Vision experience.
// Cinematic State-1 hero (matches WEBSITE-PLAN-ai-vision-VARIANT-D.html) followed by
// a "More transformations" gallery of 3 example cards, then the persistent
// feedback band. No sample link, no DNA banner, no refinement strip — those
// are logged-in only.

const CLD = 'https://res.cloudinary.com/dys2k5muv/image/upload';
const SAMPLE_BEFORE = `${CLD}/v1776281427/photo_t1vo5h.png`;
const SAMPLE_AFTER  = `${CLD}/v1776281426/Designature_Studio_Generated_Concept_4_x6v5fw.png`;

const EXAMPLES = [
  {
    id: 1,
    conceptUrl: `${CLD}/after_1_wp9msc.png`,
    label: 'Rental apartment — Japandi dream',
    chip: 'Japandi',
  },
  {
    id: 2,
    conceptUrl: `${CLD}/after_2_aq8cwh.png`,
    label: 'Empty shell — Mid-Century sanctuary',
    chip: 'Mid-Century',
  },
  {
    id: 3,
    conceptUrl: `${CLD}/after_3_f14b5p.jpg`,
    label: 'Plain bedroom — Bohemian retreat',
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

      {/* ── State 1 cinematic hero — full-bleed before/after slider ── */}
      <section className="relative w-full bg-black overflow-hidden vision-hero-section">
        <div ref={sliderRef} className="relative w-full" style={{ height: '78vh', minHeight: 560 }}>
          {/* Before pane */}
          <div
            className="absolute inset-y-0 left-0 bg-cover bg-center"
            style={{ backgroundImage: `url('${cld(SAMPLE_BEFORE, 1920)}')`, width: `${sliderPos}%` }}
          />
          {/* After pane (full width, clipped by slider) */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url('${cld(SAMPLE_AFTER, 1920)}')`, clipPath: `inset(0 0 0 ${sliderPos}%)` }}
          />

          {/* Pane labels */}
          <div className="absolute top-8 left-8 z-[3]">
            <span className="bg-black/65 text-white px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.28em]">Before</span>
          </div>
          <div className="absolute top-8 right-8 z-[3]">
            <span className="bg-[#0047AB]/90 text-white px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.28em]">Mid-Century</span>
          </div>

          {/* Divider + handle */}
          <div
            className="absolute top-0 bottom-0 z-[4]"
            style={{ left: `${sliderPos}%`, width: 2, background: 'rgba(255,255,255,0.7)', transform: 'translateX(-1px)' }}
          >
            <div
              onPointerDown={handleDividerDown}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white flex items-center justify-center text-black font-bold shadow-[0_6px_22px_rgba(0,0,0,0.4)] cursor-ew-resize select-none"
              style={{ touchAction: 'none' }}
              aria-label="Drag to compare before and after"
            >
              ↔
            </div>
          </div>

          {/* Overlay scrim — sign-in CTA */}
          <div className="absolute inset-0 z-[5] flex flex-col items-center justify-center text-center px-6 pointer-events-none">
            <div className="vision-scrim bg-black/50 px-10 md:px-14 py-10 md:py-12 max-w-[720px] pointer-events-auto" style={{ backdropFilter: 'blur(8px)' }}>
              <h1 className="font-display font-normal text-white leading-[1.0] tracking-tight mb-4" style={{ fontSize: 'clamp(46px, 6vw, 86px)', letterSpacing: '-0.02em' }}>
                Your room.<br /><em className="italic text-white/80 font-light">Reimagined.</em>
              </h1>
              <p className="text-[15px] text-white/85 leading-relaxed max-w-[460px] mx-auto mb-8">
                Three concepts in thirty seconds. Drop a photo, pick a style, see it transformed — yours to keep, share, or carry into a Designature project.
              </p>
              <div className="flex flex-col items-center gap-3.5 border-t border-white/20 pt-7">
                {/* Cohesion: matches Style Quiz logged-out CTA exactly */}
                <button
                  type="button"
                  onClick={onRequestLogin}
                  className="inline-flex items-center justify-center gap-3 px-7 py-[18px] bg-[#0047AB] text-white text-[12px] font-bold uppercase tracking-[0.25em] hover:bg-[#003d99] transition-colors"
                >
                  {t('ai.quiz.signInCta')} →
                </button>
                <p className="text-[11px] text-white/65 uppercase tracking-[0.18em] text-center">
                  Free · 3 concepts · No card needed
                </p>
              </div>
            </div>
          </div>

          {/* Caption */}
          <div className="absolute bottom-5 left-0 right-0 text-center text-[10px] font-bold uppercase tracking-[0.28em] text-white/55 z-[3] pointer-events-none">
            ↔ drag to compare · this is one room, generated from one photo
          </div>
        </div>
      </section>

      {/* ── More transformations — gallery of example concepts ── */}
      <section className="bg-white py-16 md:py-20 border-t border-[#DAD2C3]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-14">
          <div className="text-center mb-12">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#0047AB] mb-3">More transformations</p>
            <h2 className="font-display text-[30px] md:text-[36px] leading-tight">See what's possible</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={onRequestLogin}
                className="group relative overflow-hidden bg-[#0A0A0A] focus:outline-none focus:ring-2 focus:ring-[#0047AB]"
                style={{ aspectRatio: '4/5' }}
                aria-label={`Sign in to see how ${ex.chip} works — ${ex.label}`}
              >
                <img
                  src={cld(ex.conceptUrl, 720, { crop: 'fill', aspectRatio: '4/5' })}
                  srcSet={cldSrcSet(ex.conceptUrl, THUMB_WIDTHS, { crop: 'fill', aspectRatio: '4/5' })}
                  sizes="(min-width: 768px) 33vw, 100vw"
                  width={720} height={900}
                  loading="lazy" decoding="async"
                  alt={ex.label}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                />
                {/* Bottom gradient overlay */}
                <div className="absolute bottom-0 left-0 right-0 px-5 pt-16 pb-5 z-[2]" style={{ background: 'linear-gradient(0deg, rgba(0,0,0,0.85), transparent)' }}>
                  <span className="inline-block px-3 py-1.5 bg-white text-black text-[10px] font-bold uppercase tracking-[0.18em] mb-3">
                    {ex.chip}
                  </span>
                  <p className="text-white text-[14px] font-medium leading-snug">{ex.label}</p>
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
