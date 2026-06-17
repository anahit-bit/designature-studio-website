import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Download, RefreshCw } from 'lucide-react';
import { cld, cldSrcSet } from '../lib/cld';
import { useLanguage } from '../LanguageContext';
import FeedbackBand from './FeedbackBand';
import Marquee from './studio/Marquee';
import { STYLES } from './AIVisionShowcase';

// Responsive ladders matched to the surfaces they serve.
// AI-030f: HERO_FULL + RESULT_AFTER ladders widened so high-DPR / 4K
// displays can pick a higher-res Cloudinary delivery and avoid browser
// upscaling on the showcase slider and the result hero.
const HERO_FULL_WIDTHS = [768, 1024, 1440, 1920, 2400, 2880]; // 78vh full-bleed slider
const HERO_USER_WIDTHS = [768, 1280, 1600];                   // user's room as hero
const RESULT_AFTER_WIDTHS = [768, 1024, 1400, 1920, 2400];    // 70% pane (and the 30% before pane reuses same ladder)
const VARIANT_THUMB_WIDTH = 200;                              // 64×48 thumbs — small fixed

// Image quality split — Cloudinary's e_upscale rejects sources >4.2 MP,
// so we only enhance the small AI-rendered "after" images. "Before" images
// (source photos, often 4000×5000+) just get q_auto:best + mild sharpen.
const BEFORE_OPTS = { quality: 'best' as const, sharpen: 40 };
const AFTER_OPTS  = { quality: 'best' as const, enhance: true, sharpen: 80 };
const THUMB_AFTER_OPTS = { quality: 'best' as const, enhance: true, sharpen: 60 };

// AI-023 Variant D — full-bleed editorial gallery flow.
// Spec: WEBSITE-PLAN-ai-vision-VARIANT-D.html.

export const VISION_STYLES_FULL = [
  'Mid-Century', 'Japandi', 'Coastal', 'Modern', 'Bohemian', 'Rustic',
  'Industrial', 'Art Deco', 'Minimalist', 'Maximalist', 'Biophilic',
] as const;

export const ROOM_TYPES_FULL = [
  'Living', 'Dining', 'Bedroom', 'Kitchen', 'Bathroom',
  'Home Office', 'Hallway', 'Kids Room', 'Outdoor',
] as const;

const SAMPLE_BEFORE = 'https://res.cloudinary.com/dys2k5muv/image/upload/v1776281427/photo_t1vo5h.png';
const SAMPLE_AFTER = 'https://res.cloudinary.com/dys2k5muv/image/upload/v1776281426/Designature_Studio_Generated_Concept_4_x6v5fw.png';

interface VisionExperienceProps {
  roomImage: string | null;
  inspirationImages: string[];
  selectedStyle: string;
  setSelectedStyle: (s: string) => void;
  selectedRoom: string;
  setSelectedRoom: (s: string) => void;
  isProcessing: boolean;
  results: string[];
  sessionConceptArchive: string[];
  allSessionConcepts: string[];
  selectedConceptIndex: number;
  setSelectedConceptIndex: (i: number) => void;
  selectedConceptUrl: string | null;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>, type: 'inspiration' | 'room') => void;
  handleDrop: (e: React.DragEvent, type: 'inspiration' | 'room') => void;
  handleGenerate: (isVariation?: boolean, isSampleRun?: boolean) => void;
  handleReset: () => void;
  handleDownload: (dataUrl: string, n?: number) => void;
  handleTrySampleRoom: () => void;
  removeInspirationImage: (i: number) => void;
  handlePinterestPaste: (url: string) => Promise<void>;
  pinterestUrl: string;
  setPinterestUrl: (s: string) => void;
  pinterestError: string;
  setPinterestError: (s: string) => void;
  pinterestLoading: boolean;
  isGenerateDisabled: boolean;
  isSampleLoading: boolean;
  processingStage: 'extract' | 'generate';
  processingPhase: number;
  PROCESSING_PHASES: string[];
  maxConceptSlots: number;
  generationsLeft: number;
  unlimitedLabel: string;
  remainingLabel: string;
  quizResult: { style: string; pct: number }[];
  quizDone: boolean;
  isPaid: boolean;
  navigateTo: (p: string) => void;
  setFeedbackOpen: (b: boolean) => void;
  shopCurrentConcept: () => void;
  /** Carry the selected concept into Shopping (Entry, no auto-search) + switch tools. */
  onShopThisRoom: (conceptUrl: string) => void;
  validationError: string | null;
  error: string | null;
  setError: (e: string | null) => void;
  isLightboxOpen: boolean;
  setIsLightboxOpen: (b: boolean) => void;
  translateStyle: (s: string) => string;
}

const DNA_BANNER_DISMISSED_KEY = 'ai_vision_dna_banner_dismissed';

export default function VisionExperience(p: VisionExperienceProps) {
  const { t } = useLanguage();
  // ── State derivation ──
  const state: 1 | 2 | 3 =
    p.results.length > 0 || p.sessionConceptArchive.length > 0 ? 3 :
    p.roomImage ? 2 : 1;

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

  // ── DNA fast-track banner state ──
  const [dnaBannerVisible, setDnaBannerVisible] = useState(false);
  const [dnaBannerFading, setDnaBannerFading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!p.quizDone || p.quizResult.length === 0) return;
    try {
      if (sessionStorage.getItem(DNA_BANNER_DISMISSED_KEY)) return;
    } catch { /* sessionStorage blocked */ }
    setDnaBannerVisible(true);
  }, [p.quizDone, p.quizResult.length]);

  const dismissDnaBanner = (apply: boolean) => {
    if (apply && p.quizResult[0]) {
      p.setSelectedStyle(p.quizResult[0].style);
    }
    setDnaBannerFading(true);
    try { sessionStorage.setItem(DNA_BANNER_DISMISSED_KEY, '1'); } catch { /* blocked */ }
    setTimeout(() => setDnaBannerVisible(false), 220);
  };

  // ── Inspiration upload helpers ──
  const inspoFileRef = useRef<HTMLInputElement>(null);
  const roomFileRef = useRef<HTMLInputElement>(null);
  const replaceFileRef = useRef<HTMLInputElement>(null);
  const [pinterestPanelOpen, setPinterestPanelOpen] = useState(false);
  // Optional refinements (style + room) — open by default per lock §9 / B4.4.
  const [refinementsOpen, setRefinementsOpen] = useState(true);

  // ── Generate click — fires generation, then smooth-scrolls to the hero
  //    (where the processing animation is shown). Scroll is deferred via
  //    setTimeout so React's re-render from setIsProcessing(true) doesn't
  //    clobber the smooth animation — same pattern as AIConceptsPage:2457.
  //    Used by BOTH the hero overlay button and the bottom-of-strip button.
  const heroRef = useRef<HTMLElement>(null);
  const handleGenerateClick = () => {
    p.handleGenerate(false, false);
    setTimeout(() => {
      if (heroRef.current) {
        heroRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 80);
  };

  // ── Hidden file inputs (one shared for room) ──
  const renderHiddenFileInputs = () => (
    <>
      <input ref={roomFileRef} type="file" className="hidden" accept="image/*" onChange={(e) => p.handleFileChange(e, 'room')} />
      <input ref={replaceFileRef} type="file" className="hidden" accept="image/*" onChange={(e) => p.handleFileChange(e, 'room')} />
      <input ref={inspoFileRef} type="file" className="hidden" accept="image/*" multiple onChange={(e) => p.handleFileChange(e, 'inspiration')} />
    </>
  );

  // ── DNA banner (above hero) ──
  const renderDnaBanner = () => {
    if (!dnaBannerVisible) return null;
    const primary = p.quizResult[0]?.style ?? '';
    const secondary = p.quizResult[1]?.style ?? '';
    const top3 = p.quizResult.slice(0, 3).map(r => `${Math.round(r.pct)}% ${p.translateStyle(r.style)}`).join(' · ');
    return (
      <div
        className={`vision-dna-banner bg-[#0047AB] text-white px-6 md:px-14 py-5 md:py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-opacity duration-200 ${dnaBannerFading ? 'opacity-0' : 'opacity-100'}`}
        role="region"
        aria-label="Apply your design DNA"
      >
        <div>
          <div className="font-display text-[22px] md:text-[26px] leading-tight mb-1">
            Apply your DNA — {p.translateStyle(primary)}{secondary && ` + ${p.translateStyle(secondary)}`}
          </div>
          <div className="text-[12px] text-white/85 tracking-wide">From your recent Style Quiz · {top3}</div>
        </div>
        <div className="actions flex gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => dismissDnaBanner(false)}
            className="px-4 py-3 bg-transparent text-white border border-white/50 text-[10px] font-bold uppercase tracking-[0.22em] hover:bg-white/10 transition-colors"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={() => dismissDnaBanner(true)}
            className="px-6 py-3 bg-white text-[#0047AB] text-[11px] font-bold uppercase tracking-[0.22em] hover:bg-white/95 transition-colors"
          >
            Apply DNA ✦
          </button>
        </div>
      </div>
    );
  };

  // ── State 1 — landing hero (full-bleed before/after slider) ──
  const renderState1Hero = () => (
    <section
      className="relative w-full bg-black overflow-hidden vision-hero-section"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => p.handleDrop(e, 'room')}
    >
      <div ref={sliderRef} className="relative w-full" style={{ height: '78vh', minHeight: 560 }}>
        {/* AFTER pane — fills container, visible right of slider */}
        <img
          src={cld(SAMPLE_AFTER, 1440, AFTER_OPTS)}
          srcSet={cldSrcSet(SAMPLE_AFTER, HERO_FULL_WIDTHS, AFTER_OPTS)}
          sizes="100vw"
          alt="Redesigned concept"
          width={1920} height={1080}
          loading="eager"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
        />
        {/* BEFORE pane — fills container, visible left of slider */}
        <img
          src={cld(SAMPLE_BEFORE, 1440, BEFORE_OPTS)}
          srcSet={cldSrcSet(SAMPLE_BEFORE, HERO_FULL_WIDTHS, BEFORE_OPTS)}
          sizes="100vw"
          alt="Original room"
          width={1920} height={1080}
          loading="eager"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
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
          >
            ↔
          </div>
        </div>

        {/* Overlay scrim + editorial text */}
        <div className="absolute inset-0 z-[5] flex flex-col items-center justify-center text-center px-6 pointer-events-none">
          <div className="vision-scrim bg-black/50 px-10 md:px-14 py-10 md:py-12 max-w-[720px] pointer-events-auto" style={{ backdropFilter: 'blur(8px)' }}>
            <h1 className="font-display font-normal text-white leading-[1.0] tracking-tight mb-4" style={{ fontSize: 'clamp(46px, 6vw, 86px)', letterSpacing: '-0.02em' }}>
              Your room.<br /><em className="italic text-white/80 font-light">Reimagined.</em>
            </h1>
            {/* oxide accent rule — matches Style Quiz + Shopping landing heroes */}
            <span aria-hidden className="block w-16 h-[2px] bg-[#8E3F2D] mx-auto mb-5" />
            <p className="text-[15px] text-white/85 leading-relaxed max-w-[460px] mx-auto mb-8">
              Three concepts in thirty seconds. Drop a photo, pick a style, see it transformed — yours to keep, share, or carry into a Designature project.
            </p>
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => roomFileRef.current?.click()}
                className="bg-[#0047AB] text-white px-12 py-5 text-[12px] font-bold uppercase tracking-[0.3em] inline-flex items-center gap-3 hover:bg-[#003d99] transition-colors rounded-sm"
              >
                ✦ Upload your room →
              </button>
            </div>
          </div>
        </div>

        {/* Caption */}
        <div className="absolute bottom-5 left-0 right-0 text-center text-[10px] font-bold uppercase tracking-[0.28em] text-white/55 z-[3] pointer-events-none">
          ↔ drag to compare · this is one room, generated from one photo
        </div>
      </div>
    </section>
  );

  // ── State 2 — user uploaded; user's room as full-bleed hero ──
  const renderState2Hero = () => {
    const inspoSummary =
      p.inspirationImages.length === 0
        ? '0 inspirations added'
        : `${p.inspirationImages.length} inspiration${p.inspirationImages.length === 1 ? '' : 's'} added`;
    const styleLabel = p.selectedStyle ? p.translateStyle(p.selectedStyle) : 'No style preset';
    const roomLabel = p.selectedRoom || 'Auto-detect room';

    return (
      <section ref={heroRef} className="relative w-full bg-black overflow-hidden vision-hero-section" style={{ height: '78vh', minHeight: 560 }}>
        {/* User's room — object-fit:contain (no crop).
            roomImage is a data: URL (from upload) so cld() / srcset are no-ops
            and pass through; sizes attribute is set for any future cdn-backed flow. */}
        {p.roomImage && (
          <img
            src={cld(p.roomImage, 1600)}
            srcSet={cldSrcSet(p.roomImage, HERO_USER_WIDTHS)}
            sizes="(min-width: 1024px) 1280px, 100vw"
            alt="Your room"
            loading="eager"
            decoding="async"
            className="absolute inset-0 w-full h-full object-contain"
            style={{ background: '#000' }}
          />
        )}

        {/* Top overlay — status + replace */}
        <div className="absolute top-0 inset-x-0 px-6 md:px-8 py-5 text-white z-[4] flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.25em]" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.55), transparent)' }}>
          <span>{p.isProcessing ? 'Generating…' : 'Your room · ready to generate'}</span>
          <button
            type="button"
            onClick={() => replaceFileRef.current?.click()}
            className="underline underline-offset-4 text-white/85 hover:text-white transition-colors"
          >
            ← Replace photo
          </button>
        </div>

        {/* Bottom overlay — title + meta + generate */}
        <div className="absolute bottom-0 inset-x-0 px-6 md:px-8 pt-14 pb-12 z-[4] text-center" style={{ background: 'linear-gradient(0deg, rgba(0,0,0,0.85), transparent)' }}>
          <h2 className="font-display font-normal text-white leading-[1.05] mb-3" style={{ fontSize: 'clamp(34px, 4.5vw, 62px)' }}>
            Now show me the <em className="italic text-white/80">magic</em>.
          </h2>
          <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/65 mb-7">
            Style: {styleLabel} · {roomLabel} · {inspoSummary}
          </div>
          {p.isProcessing ? (
            <div className="inline-flex items-center gap-3 text-white">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span className="text-[12px] font-bold uppercase tracking-[0.28em]">
                {p.processingStage === 'extract' ? 'Analyzing references…' : p.PROCESSING_PHASES[p.processingPhase]}
              </span>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={handleGenerateClick}
                disabled={p.isGenerateDisabled}
                className="bg-[#0047AB] text-white px-12 py-5 text-[12px] font-bold uppercase tracking-[0.3em] inline-flex items-center gap-3 hover:bg-[#003d99] transition-colors rounded-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ✦ Generate concept
              </button>
              {/* Disabled-state hint — explains why generate is greyed out */}
              {p.isGenerateDisabled && p.inspirationImages.length === 0 && !p.selectedStyle && (
                <p className="mt-4 text-[11px] text-white/65 uppercase tracking-[0.22em] font-bold">
                  Add an inspiration or pick a style below to continue
                </p>
              )}
            </>
          )}
          {p.validationError && (
            <p className="mt-4 text-[11px] text-red-300 uppercase tracking-[0.18em]">{p.validationError}</p>
          )}
        </div>
      </section>
    );
  };

  // ── AI-030: detect concept image aspect on load, swap result hero layout
  //    for portrait inputs (50/50 + object-contain) vs landscape (30/70 + object-cover).
  //    Reset on selectedConceptUrl change so variant swaps re-measure. ──
  // AI-030i: the JSX <img onLoad> handler doesn't reliably fire when React
  // reuses the same DOM element across selectedConceptUrl changes (especially
  // for browser-cached images). Measure via `new Image()` in an effect
  // instead — fires synchronously for cached images and on load for fresh
  // ones, in both cases independent of React reconciliation. Owner DevTools
  // 2026-05-22 confirmed data-concept-aspect="null" despite the concept
  // being visibly portrait — onLoad never reached the setter.
  const [conceptAspect, setConceptAspect] = useState<number | null>(null);
  useEffect(() => {
    if (!p.selectedConceptUrl) {
      setConceptAspect(null);
      return;
    }
    let cancelled = false;
    setConceptAspect(null);
    const probe = new Image();
    probe.onload = () => {
      if (cancelled) return;
      if (probe.naturalWidth > 0 && probe.naturalHeight > 0) {
        setConceptAspect(probe.naturalWidth / probe.naturalHeight);
      }
    };
    probe.onerror = () => {
      if (cancelled) return;
      // leave conceptAspect null → defaults to landscape layout (safe fallback)
      console.warn('[ai-vision] concept image aspect probe failed to load');
    };
    probe.src = p.selectedConceptUrl;
    // If the image is already in cache, complete may already be true at
    // this point — fire the handler synchronously rather than waiting.
    if (probe.complete && probe.naturalWidth > 0 && probe.naturalHeight > 0) {
      setConceptAspect(probe.naturalWidth / probe.naturalHeight);
    }
    return () => { cancelled = true; };
  }, [p.selectedConceptUrl]);

  // ── Share concept — native share where available, otherwise copy to clipboard ──
  const [shareToast, setShareToast] = useState<string | null>(null);
  const handleShare = async () => {
    if (!p.selectedConceptUrl) return;
    const title = 'My Designature AI concept';
    const text = `My room — ${p.selectedStyle ? p.translateStyle(p.selectedStyle) : 'AI concept'}`;
    try {
      if (typeof navigator !== 'undefined' && (navigator as any).share && /Mobi|Android/i.test(navigator.userAgent)) {
        await (navigator as any).share({ title, text, url: window.location.href });
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(window.location.href);
        setShareToast('Link copied');
        setTimeout(() => setShareToast(null), 2000);
      }
    } catch {
      /* user dismissed native share */
    }
  };

  // ── State 3 — results (30/70 landscape OR 50/50 portrait + variant thumbs + meta-bar) ──
  const renderState3Hero = () => {
    // AI-030: while conceptAspect is null (still measuring on first paint),
    // default to landscape to avoid layout shift. Square (>= 1.0) is also
    // treated as landscape since object-cover handles 1:1 fine.
    const isPortrait = conceptAspect !== null && conceptAspect < 1.0;
    // AI-030f + h: in portrait mode the section holds TWO portrait images
    // side-by-side (50/50 split). So the section aspect is 2 × image_aspect,
    // not image_aspect alone — otherwise each pane is half as wide as the
    // image needs and the image letterboxes left/right inside each pane,
    // creating black space BETWEEN the two images. With sideBySideAspect:
    //   - section width = 2 × image_width, fitting two abutting images
    //   - each pane = section_width / 2 = image_width, exact fit
    //   - no internal letterboxing; black bars only on outer edges (from
    //     the wrapper bg-black) so the layout reads
    //     [black] [original] [concept] [black]
    // Owner direction 2026-05-21: "two images must abut to each other".
    const sideBySideAspect = isPortrait ? conceptAspect! * 2 : 1;
    const sectionStyle: React.CSSProperties = isPortrait
      ? {
          height: `min(90vh, calc(100vw * ${1 / sideBySideAspect}))`,
          width: `calc(min(90vh, calc(100vw * ${1 / sideBySideAspect})) * ${sideBySideAspect})`,
          minHeight: 560,
          maxWidth: '100vw',
        }
      : { height: '78vh', minHeight: 560 };
    const beforeWidth = isPortrait ? '50%' : '30%';
    const afterWidth = isPortrait ? '50%' : '70%';
    const dividerLeft = isPortrait ? '50%' : '30%';
    // AI-030g: always object-contain so the full generated image is visible.
    // Letterboxing is acceptable; cropping pixels from the generated concept
    // is not (owner direction 2026-05-21). For landscape concepts inside
    // landscape panes the panes are roughly matched-aspect, so letterboxing
    // is mostly invisible — it only shows when image aspect ≠ pane aspect.
    const imgFit = 'object-contain';
    const ariaLabel = isPortrait ? 'Result · portrait layout' : 'Result · landscape layout';

    return (
      <div className="w-full bg-black">
      <section
        className={`relative bg-black overflow-hidden vision-hero-section vision-result-hero ${isPortrait ? 'mx-auto' : 'w-full'}`}
        style={sectionStyle}
        aria-label={ariaLabel}
        data-concept-aspect={conceptAspect ?? 'null'}
        data-side-by-side-aspect={sideBySideAspect}
        data-is-portrait={String(isPortrait)}
      >
        {/* 30/70 (landscape) or 50/50 (portrait) split — desktop. Mobile collapses to single after pane (CSS). */}
        <div className="absolute inset-y-0 left-0 vision-pane-before overflow-hidden" style={{ width: beforeWidth }}>
          {p.roomImage && (
            <img
              src={cld(p.roomImage, 1400, BEFORE_OPTS)}
              srcSet={cldSrcSet(p.roomImage, RESULT_AFTER_WIDTHS, BEFORE_OPTS)}
              sizes={isPortrait ? '(min-width: 1024px) 50vw, 100vw' : '(min-width: 1024px) 30vw, 100vw'}
              alt="Original room"
              loading="eager"
              decoding="async"
              className={`absolute inset-0 w-full h-full ${imgFit}`}
            />
          )}
        </div>
        <div
          className="absolute inset-y-0 right-0 vision-pane-after overflow-hidden"
          style={{ width: afterWidth, cursor: p.selectedConceptUrl ? 'zoom-in' : 'default' }}
          onClick={() => p.selectedConceptUrl && p.setIsLightboxOpen(true)}
        >
          {/* NOTE: cld() passes data URLs through unchanged (cld.ts:71), so
              e_upscale in AFTER_OPTS never applies to Gemini outputs (which
              arrive as data:image/png;base64,...). For higher quality at hero
              size, the right fix is uploading the Gemini result to Cloudinary
              first, then resizing through cld() — separate ticket, since it
              adds latency + Cloudinary credit cost. */}
          {p.selectedConceptUrl && (
            <img
              src={cld(p.selectedConceptUrl, 1400, AFTER_OPTS)}
              srcSet={cldSrcSet(p.selectedConceptUrl, RESULT_AFTER_WIDTHS, AFTER_OPTS)}
              sizes={isPortrait ? '(min-width: 1024px) 50vw, 100vw' : '(min-width: 1024px) 70vw, 100vw'}
              alt="Concept"
              loading="eager"
              decoding="async"
              className={`absolute inset-0 w-full h-full ${imgFit}`}
              onLoad={(e) => {
                const img = e.currentTarget;
                if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                  setConceptAspect(img.naturalWidth / img.naturalHeight);
                }
              }}
            />
          )}
        </div>
        {/* Divider */}
        <div className="absolute inset-y-0 vision-divider z-[3]" style={{ left: dividerLeft, width: 2, background: 'rgba(255,255,255,0.6)', transform: 'translateX(-1px)' }} />

        {/* Pane labels */}
        <div className="absolute top-6 left-6 z-[3] vision-label-before">
          <span className="bg-black/65 text-white px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.25em]">Original</span>
        </div>
        <div className="absolute top-6 right-6 z-[3]">
          <span className="bg-[#0047AB]/90 text-white px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.25em]">
            Concept{p.selectedStyle ? ` · ${p.translateStyle(p.selectedStyle)}` : ''}
          </span>
        </div>

        {/* Variant thumbs — top-right above the meta-bar */}
        {p.allSessionConcepts.length > 1 && (
          <div className="absolute right-6 z-[3] flex gap-1.5 vision-variants" style={{ bottom: 130 }}>
            {p.allSessionConcepts.slice(0, 6).map((img, idx) => (
              <button
                key={`v-${idx}`}
                type="button"
                onClick={() => p.setSelectedConceptIndex(idx)}
                className={`relative overflow-hidden transition-all ${p.selectedConceptIndex === idx ? 'ring-2 ring-[#0047AB]' : 'opacity-75 hover:opacity-100'}`}
                style={{ width: 64, height: 48, boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}
                aria-label={`Variant ${idx + 1}`}
              >
                <img
                  src={cld(img, VARIANT_THUMB_WIDTH, { crop: 'fill', aspectRatio: '4/3', ...THUMB_AFTER_OPTS })}
                  alt=""
                  width={VARIANT_THUMB_WIDTH} height={150}
                  loading="lazy" decoding="async"
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}

        {/* Meta-bar */}
        <div className="absolute bottom-0 inset-x-0 px-6 md:px-8 pt-10 pb-7 z-[4] flex flex-wrap items-end justify-between gap-5" style={{ background: 'linear-gradient(0deg, rgba(0,0,0,0.85), transparent)' }}>
          <div className="text-white">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/70 mb-1.5">
              Designed in seconds · {p.selectedConceptIndex + 1} of {p.allSessionConcepts.length}
            </p>
            <h3 className="font-display text-[26px] md:text-[36px] leading-tight">
              Your {p.selectedRoom || 'room'}{p.selectedStyle ? `, ${p.translateStyle(p.selectedStyle)}` : ''}.
            </h3>
          </div>
          <div className="flex gap-2 flex-wrap">
            {p.generationsLeft > 0 && (
              <button
                type="button"
                onClick={() => p.handleGenerate(true, false)}
                disabled={p.isProcessing}
                className="px-5 py-3 bg-transparent text-white border border-white/40 hover:border-white text-[10px] font-bold uppercase tracking-[0.22em] inline-flex items-center gap-2 disabled:opacity-40"
              >
                <RefreshCw className="w-3 h-3" /> Variation
              </button>
            )}
            {p.selectedConceptUrl && (
              <button
                type="button"
                onClick={() => p.selectedConceptUrl && p.handleDownload(p.selectedConceptUrl, p.selectedConceptIndex + 1)}
                className="px-5 py-3 bg-transparent text-white border border-white/40 hover:border-white text-[10px] font-bold uppercase tracking-[0.22em] inline-flex items-center gap-2"
              >
                <Download className="w-3 h-3" /> Download
              </button>
            )}
            <button
              type="button"
              onClick={handleShare}
              className="px-5 py-3 bg-transparent text-white border border-white/40 hover:border-white text-[10px] font-bold uppercase tracking-[0.22em]"
            >
              Share
            </button>
            {p.selectedConceptUrl && (
              <button
                type="button"
                onClick={() => p.selectedConceptUrl && p.onShopThisRoom(p.selectedConceptUrl)}
                className="px-5 py-3 bg-[#0047AB] text-white border border-[#0047AB] hover:bg-[#003d99] text-[10px] font-bold uppercase tracking-[0.22em] inline-flex items-center gap-2"
              >
                {t('ai.vision.shopThisRoom')} →
              </button>
            )}
            <button
              type="button"
              onClick={p.handleReset}
              disabled={p.isProcessing}
              className="px-3 py-3 bg-transparent text-white/70 border border-white/25 hover:border-white/55 hover:text-white text-[10px] font-bold uppercase tracking-[0.22em] inline-flex items-center gap-1 disabled:opacity-40"
              aria-label="Reset"
              title="Start over"
            >
              <X className="w-3 h-3" /> Reset
            </button>
          </div>
        </div>

        {p.error && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[6] bg-red-500/95 text-white px-5 py-3 text-[11px] font-bold uppercase tracking-[0.22em] flex items-center gap-3 shadow-2xl">
            {p.error}
            <button type="button" onClick={() => p.setError(null)} className="underline">Dismiss</button>
          </div>
        )}
      </section>
      {/* CONVERSION BAND — end-of-funnel booking (demoted "Get this designed" out of
          the action bar, where "Shop this room" is now the primary forward step). */}
      <div className="bg-black text-white px-6 md:px-10 py-7 flex flex-col md:flex-row items-center justify-between gap-5 border-t border-white/10">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/70 mb-1">{t('ai.vision.bandKicker')}</p>
          <h3 className="font-display text-3xl">{t('ai.vision.bandHeadline')} <em className="italic text-white/80">{t('ai.vision.bandHeadlineEm')}</em></h3>
        </div>
        <button type="button" onClick={() => p.navigateTo('studio')} className="bg-white text-black text-sm font-bold uppercase tracking-[0.24em] px-8 py-4 hover:bg-white/90 transition-colors whitespace-nowrap">{t('ai.vision.getDesigned')} →</button>
      </div>
      </div>
    );
  };

  // ── Refinement strip — shown in State 1 + 2 only ──
  // ── State 1 · SETUP — locked two-column split (white frame, dark room well +
  //    cobalt controls), matching the v4 logged-in mockup. Replaces the cream
  //    refinement strip + room-as-hero; reuses the inspiration grid + chips. ──
  const renderSetup = () => {
    const styleLabel = p.selectedStyle ? p.translateStyle(p.selectedStyle) : t('ai.vision.autoStyle');
    const roomLabel = p.selectedRoom || t('ai.vision.autoRoom');
    const quota = p.generationsLeft >= 999 ? p.unlimitedLabel : `${p.generationsLeft} ${p.remainingLabel}`;
    return (
    <section className="bg-white">
      {/* titlehdr */}
      <div className="flex items-end justify-between gap-5 px-6 md:px-10 py-6 border-b border-black/[0.08]">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#8E3F2D] mb-1.5">{t('ai.aiVision')}</p>
          <h1 className="font-display text-[34px] md:text-[42px] leading-[1.0] text-black">{t('ai.vision.setupTitle')} <em className="italic">{t('ai.vision.setupTitleEm')}</em></h1>
        </div>
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-black/60 pb-1 whitespace-nowrap">{quota}</span>
      </div>

      <div className="grid lg:grid-cols-[42%_58%] items-start" style={{ gap: '1px', background: 'rgba(0,0,0,.08)' }}>
        {/* LEFT — the room being redesigned (dark well, sticky) */}
        <div className="bg-white self-stretch" onDragOver={(e) => e.preventDefault()} onDrop={(e) => p.handleDrop(e, 'room')}>
          <div className="relative bg-[#0e0e0e] overflow-hidden lg:sticky lg:top-0" style={{ aspectRatio: '1/1' }}>
            {p.roomImage && (
              <img src={cld(p.roomImage, 1100)} srcSet={cldSrcSet(p.roomImage, HERO_USER_WIDTHS)} sizes="(min-width:1024px) 600px, 100vw" alt="Your room" className="absolute inset-0 w-full h-full object-contain" decoding="async" />
            )}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(0,0,0,.15) 0%,rgba(0,0,0,0) 30%,rgba(0,0,0,.45) 100%)' }} />
            <span className="absolute top-6 left-6 bg-black/[0.62] text-white text-[9px] font-bold uppercase tracking-[0.22em] px-3 py-1.5">{t('ai.vision.theRoom')}</span>
            <button type="button" onClick={() => replaceFileRef.current?.click()} className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/90 text-black text-[9px] font-bold uppercase tracking-[0.2em] px-4 py-2.5 hover:bg-white transition-colors">{t('ai.vision.changePhoto')}</button>
          </div>
          <p className="text-[10px] text-black/60 uppercase tracking-[0.16em] px-6 py-3">{t('ai.vision.keepProportions')}</p>
        </div>

        {/* RIGHT — controls (Step 1 always visible · refinements optional) */}
        <div className="bg-white p-6 md:p-9 flex flex-col gap-5" style={{ minHeight: 620 }}>
          {/* live concept summary (solid cobalt) */}
          <div className="px-6 py-4 text-white" style={{ background: '#0047AB' }}>
            <p className="text-[9px] font-bold uppercase tracking-[0.32em] text-white/75 mb-1.5">{t('ai.vision.yourConcept')}</p>
            <p className="text-[15px] font-bold tracking-[0.04em]">{styleLabel} <span className="text-white/55 mx-0.5">·</span> {roomLabel}</p>
            <p className="font-display italic text-[19px] leading-snug mt-2 text-white/90">{t('ai.vision.summaryLine').replace('{n}', String(p.inspirationImages.length))}</p>
          </div>

          {/* STEP 1 · inspiration (required) */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="w-5 h-5 bg-black text-white text-[9px] flex items-center justify-center font-bold">1</span>
              <span className="text-[12px] font-bold uppercase tracking-[0.3em] text-black/70">{t('ai.vision.step1Inspiration')}</span>
              <span className="text-[10px] font-semibold text-[#8E3F2D] tracking-[0.06em] uppercase">{t('ai.vision.step1Required')}</span>
            </div>
            <p className="text-[11px] text-black/60">{t('ai.vision.step1Help')}</p>
          <div
            className="grid grid-cols-5 gap-2.5 max-w-[560px] mx-auto w-full"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => p.handleDrop(e, 'inspiration')}
          >
            {Array.from({ length: 5 }).map((_, slotIdx) => {
              const img = p.inspirationImages[slotIdx];
              if (img) {
                return (
                  <div key={slotIdx} className="relative aspect-square overflow-hidden border border-black/10 group bg-white">
                    <img src={img} alt={`Inspiration ${slotIdx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => p.removeInspirationImage(slotIdx)}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                      aria-label={`Remove inspiration ${slotIdx + 1}`}
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                );
              }
              return (
                <button
                  key={slotIdx}
                  type="button"
                  onClick={() => inspoFileRef.current?.click()}
                  className="aspect-square bg-white border border-dashed border-black/20 hover:border-black/55 hover:bg-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-[#0047AB]/40 focus:border-[#0047AB] transition-colors flex items-center justify-center text-black/40 text-[22px] font-thin"
                  aria-label={`Add inspiration ${slotIdx + 1} of 5`}
                >
                  +
                </button>
              );
            })}
          </div>
          {/* Meta row */}
          <div className="flex items-center justify-center gap-3.5 text-[11px] uppercase tracking-[0.18em] font-bold text-[#6B6B6B]">
            <span>{p.inspirationImages.length} / 5 photos</span>
            <span className="text-[#DAD2C3]">·</span>
            <button
              type="button"
              onClick={() => { setPinterestPanelOpen(o => !o); p.setPinterestError(''); }}
              className="inline-flex items-center gap-2 hover:text-black transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#E60023]" />
              Or paste a Pinterest pin
            </button>
          </div>
          {/* Pinterest inline panel */}
          {pinterestPanelOpen && (
            <div className="max-w-[460px] mx-auto w-full flex flex-col gap-1.5 mt-1">
              <div className="flex gap-1.5">
                <input
                  type="url"
                  value={p.pinterestUrl}
                  autoFocus
                  onChange={e => { p.setPinterestUrl(e.target.value); p.setPinterestError(''); }}
                  onPaste={e => {
                    const pasted = e.clipboardData.getData('text');
                    if (pasted.includes('pinterest.com') || pasted.includes('pin.it')) {
                      e.preventDefault();
                      void p.handlePinterestPaste(pasted);
                    }
                  }}
                  onKeyDown={e => e.key === 'Enter' && void p.handlePinterestPaste(p.pinterestUrl)}
                  placeholder="https://www.pinterest.com/pin/..."
                  className="flex-1 border border-black/15 bg-white px-3 py-2 text-[12px] text-black/80 placeholder:text-black/45 focus:outline-none focus:border-[#E60023]/55"
                  disabled={p.pinterestLoading}
                />
                <button
                  type="button"
                  onClick={() => void p.handlePinterestPaste(p.pinterestUrl)}
                  disabled={p.pinterestLoading || !p.pinterestUrl.trim()}
                  className="px-4 py-2 bg-[#E60023] text-white text-[10px] font-bold uppercase tracking-[0.15em] disabled:opacity-40 hover:bg-[#c4001e] transition-colors"
                >
                  {p.pinterestLoading ? '...' : 'Add'}
                </button>
              </div>
              {p.pinterestError && (
                <span className="text-[10px] text-red-500">{p.pinterestError}</span>
              )}
            </div>
          )}
        </div>

        {/* OPTIONAL refinements — style + room, open by default (lock §9 / B4.4) */}
        <div className="border border-black/12 bg-white">
          <button
            type="button"
            onClick={() => setRefinementsOpen((o) => !o)}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
            aria-expanded={refinementsOpen}
          >
            <span className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#8E3F2D]">{t('ai.vision.optionalRefinements')}</span>
            <span className="text-[10px] text-black/55 uppercase tracking-[0.14em]">{t('ai.vision.autoDetected')} <span aria-hidden>{refinementsOpen ? '▴' : '▾'}</span></span>
          </button>
          <div className={`overflow-hidden transition-all duration-300 ${refinementsOpen ? 'max-h-[1600px]' : 'max-h-0'}`}>
            <div className="px-4 pb-6 pt-2 flex flex-col gap-8">

        {/* Style */}
        <div className="flex flex-col gap-3">
          <div className="text-center font-display text-[18px] text-[#404040]">
            Style
            <span className="ml-2 font-body text-[11px] tracking-[0.2em] uppercase font-bold text-[#6B6B6B]">optional</span>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => p.setSelectedStyle('')}
              className={`px-4 py-2.5 rounded-full text-[11px] font-bold uppercase tracking-[0.16em] border transition-all ${p.selectedStyle === '' ? 'bg-black text-white border-black' : 'bg-white text-[#404040] border-black/15 hover:border-black/55 hover:text-black'}`}
            >
              No preference
            </button>
            {VISION_STYLES_FULL.map((style) => {
              const isPrimaryDna = p.quizDone && p.quizResult[0]?.style === style && p.selectedStyle === style;
              const isActive = p.selectedStyle === style;
              const base = 'px-4 py-2.5 rounded-full text-[11px] font-bold uppercase tracking-[0.16em] border transition-all';
              const classes = isPrimaryDna
                ? `${base} bg-[#0047AB] text-white border-[#0047AB]`
                : isActive
                  ? `${base} bg-black text-white border-black`
                  : `${base} bg-white text-[#404040] border-black/15 hover:border-black/55 hover:text-black`;
              return (
                <button
                  key={style}
                  type="button"
                  onClick={() => p.setSelectedStyle(style)}
                  className={classes}
                >
                  {isPrimaryDna && '✦ '}{p.translateStyle(style)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Which room */}
        <div className="flex flex-col gap-3">
          <div className="text-center font-display text-[18px] text-[#404040]">
            Which room?
            <span className="ml-2 font-body text-[11px] tracking-[0.2em] uppercase font-bold text-[#6B6B6B]">optional</span>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => p.setSelectedRoom('')}
              className={`px-4 py-2.5 rounded-full text-[11px] font-bold uppercase tracking-[0.16em] border transition-all ${p.selectedRoom === '' ? 'bg-black text-white border-black' : 'bg-white text-[#404040] border-black/15 hover:border-black/55 hover:text-black'}`}
            >
              Auto-detect
            </button>
            {ROOM_TYPES_FULL.map((room) => (
              <button
                key={room}
                type="button"
                onClick={() => p.setSelectedRoom(room)}
                className={`px-4 py-2.5 rounded-full text-[11px] font-bold uppercase tracking-[0.16em] border transition-all ${p.selectedRoom === room ? 'bg-black text-white border-black' : 'bg-white text-[#404040] border-black/15 hover:border-black/55 hover:text-black'}`}
              >
                {room}
              </button>
            ))}
          </div>
        </div>
            </div>
          </div>
        </div>

        {/* Bottom Generate concept — mirrors the hero-overlay button so users
            who scroll past the chips don't have to scroll back up. Shares the
            same handler and disabled binding. */}
        <div className="flex flex-col items-center gap-3 pt-2">
          {p.isGenerateDisabled && p.inspirationImages.length === 0 && !p.selectedStyle && (
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#6B6B6B]">
              Add 2–3 inspirations or pick a style to generate
            </p>
          )}
          <button
            type="button"
            onClick={handleGenerateClick}
            disabled={p.isGenerateDisabled || p.isProcessing}
            className="bg-[#0047AB] text-white px-12 py-5 text-[12px] font-bold uppercase tracking-[0.3em] inline-flex items-center gap-3 hover:bg-[#003d99] transition-colors rounded-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ✦ Generate concept
          </button>
        </div>

        {/* Quota counter (compact) */}
        <div className="flex items-center justify-center gap-3 text-[11px] uppercase tracking-[0.22em] font-bold text-[#6B6B6B] mt-1">
          <span>{p.unlimitedLabel === 'Unlimited' && p.generationsLeft >= 999 ? p.unlimitedLabel : `${p.generationsLeft} ${p.remainingLabel}`}</span>
        </div>

        {/* Quota exhausted (free tier) */}
        {p.generationsLeft <= 0 && !p.isPaid && (
          <div className="bg-white border border-black/10 p-5 max-w-[520px] mx-auto w-full text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-black/55 mb-1.5">Free tier complete</p>
            <p className="text-[14px] font-bold text-black mb-4 leading-snug">You've used your 3 free concepts.</p>
            <button
              type="button"
              onClick={() => p.navigateTo('pricing')}
              className="bg-[#0047AB] text-white px-6 py-3 text-[10px] font-bold uppercase tracking-[0.28em] hover:bg-[#003d99] transition-colors inline-flex items-center gap-2"
            >
              ✦ Upgrade plan
            </button>
          </div>
        )}
        </div>
      </div>
    </section>
    );
  };

  // ── State 2 · GENERATING — distinct full-screen working state (lock §9 / B4.4).
  //    Shown only for a FRESH generation (no concept yet); variations keep the
  //    inline results UX so the AI-030 result hero isn't disrupted.
  const renderGenerating = () => {
    const styleLabel = p.selectedStyle ? p.translateStyle(p.selectedStyle) : t('ai.vision.autoStyle');
    const roomLabel = p.selectedRoom || t('ai.vision.autoRoom');
    const phrase = p.processingStage === 'extract'
      ? p.PROCESSING_PHASES[0]
      : (p.PROCESSING_PHASES[p.processingPhase] ?? p.PROCESSING_PHASES[0]);
    const bg = p.roomImage || SAMPLE_BEFORE;
    return (
      <section ref={heroRef} className="relative w-full overflow-hidden bg-black" style={{ minHeight: '72vh' }}>
        <img src={cld(bg, 1600, { crop: 'fill', aspectRatio: '16/9' })} alt="" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
        <div className="absolute inset-0 bg-black/72" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 text-center px-8">
          <div className="w-12 h-12 border-2 border-white/15 border-t-white rounded-full animate-spin" />
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-white/70">{t('ai.vision.generating')}</p>
          <p className="font-display text-[30px] md:text-[40px] leading-tight text-white/95 max-w-[680px] animate-pulse">{phrase}</p>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/45">{styleLabel} · {roomLabel}</p>
          <p className="text-[9px] text-white/35 uppercase tracking-widest">{t('ai.vision.generatingUsually')}</p>
        </div>
      </section>
    );
  };

  // Fresh generation in flight (no concept yet) → dedicated generating screen.
  const showGenerating = p.isProcessing && p.results.length === 0;

  return (
    <>
      {renderHiddenFileInputs()}
      {renderDnaBanner()}

      {showGenerating && renderGenerating()}

      {/* State 0 · Landing — cinematic before/after launchpad (upload / sample). */}
      {!showGenerating && state === 1 && renderState1Hero()}
      {/* State 1 · Setup — locked two-column (room well + cobalt controls). */}
      {!showGenerating && state === 2 && renderSetup()}
      {/* State 3 · Results — AI-030 aspect-preserved, no-crop result hero. */}
      {!showGenerating && state === 3 && renderState3Hero()}

      {/* Locked marquee band (§2) — Landing + Setup only, identical to the logged-out showcase.
          Wrapped in a `.studio-frame` because the `.marquee` / `.marquee-track` CSS is scoped to
          it (VisionExperience itself isn't a studio-frame); scoped to just the band so none of
          studio-frame's other component rules touch Vision's bespoke markup. */}
      {!showGenerating && (state === 1 || state === 2) && (
        <div className="studio-frame">
          <Marquee label={t('ai.vision.anyStyle')} items={STYLES} />
        </div>
      )}

      <FeedbackBand onOpenFeedback={() => p.setFeedbackOpen(true)} />

      {shareToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-black text-white px-5 py-3 z-[70] text-[11px] font-bold uppercase tracking-[0.22em] shadow-2xl">
          {shareToast}
        </div>
      )}
    </>
  );
}
