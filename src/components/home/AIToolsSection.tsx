import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../LanguageContext';
import { cld, cldSrcSet, CARD_WIDTHS } from '../../lib/cld';
import { setSigninSource } from '../../lib/signinSource';

/**
 * AI Studio section — v3.1 with real Cloudinary imagery.
 *
 * Hero demo (Layer 2) is a side-by-side before/after split. Each side
 * stacks 4 absolutely-positioned image layers and crossfades between them
 * on a 48s loop (one layer dwells for 21% of the cycle, fades out across
 * 4%, stays hidden for 71%, fades back in across 4%). The 4 layers are
 * staggered by -12s each, which keeps the cycle smooth and the
 * before/after sides synchronized across the 4 paired rooms.
 *
 * Both sides also run a slow Ken Burns zoom (24s) on top of the fade.
 * `prefers-reduced-motion` disables every animation.
 *
 * Tool card thumbnails (Layer 3) use the same cld() helper so they get
 * f_auto/q_auto AVIF/WebP delivery and a srcset for the actual card width.
 */
const AIToolsSection: React.FC = () => {
  const { t, navigateTo } = useLanguage();
  const navigate = useNavigate();

  // 4 paired before/after rooms used for the demo. Add more later by
  // appending IDs and another `.demo-layer-N` rule + animation-delay below.
  const beforeIds = ['before_2_k7jvg3', 'before_3_blruai', 'before_4_vpepte', 'before_6_s9l1sb'];
  const afterIds = ['after_2_kzpr3p', 'after_3_z5x2lg', 'after_4_xgalms', 'after_6_gmuyn5'];

  // Tool card thumbnails — one real "after" image per card.
  const toolThumbs = {
    styleQuiz: 'after_1_khwg9g',
    aiVision: 'after_2_kzpr3p',
    shoppingList: 'after_3_z5x2lg',
    roomAudit: 'after_4_xgalms',
  };

  return (
    <section className="py-20 md:py-24 bg-[#0A0A0A] text-white">
      <style>{`
        @keyframes ds-kenburns {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.08); }
        }
        @keyframes ds-layerfade {
          0%   { opacity: 1; }
          21%  { opacity: 1; }
          25%  { opacity: 0; }
          96%  { opacity: 0; }
          100% { opacity: 1; }
        }
        .ds-demo-layer {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          animation: ds-layerfade 48s ease-in-out infinite, ds-kenburns 24s ease-in-out infinite;
        }
        .ds-demo-layer-1 { animation-delay:   0s,    0s; }
        .ds-demo-layer-2 { animation-delay: -12s,   -6s; }
        .ds-demo-layer-3 { animation-delay: -24s,  -12s; }
        .ds-demo-layer-4 { animation-delay: -36s,  -18s; }
        @media (prefers-reduced-motion: reduce) {
          .ds-demo-layer { animation: none !important; }
          .ds-demo-layer:not(:first-child) { opacity: 0; }
        }
      `}</style>

      <div className="max-w-[1280px] mx-auto px-6 md:px-14">
        {/* ─── Layer 1 — Section header ─── */}
        <div className="text-center max-w-[720px] mx-auto mb-14 md:mb-16">
          <div className="w-12 h-px bg-white/30 mx-auto mb-5" aria-hidden="true" />
          <span className="inline-block text-[11px] md:text-[12px] font-bold uppercase tracking-[0.26em] text-[#0047AB] mb-4">
            {t('home.ai.eyebrow')}
          </span>
          <h2 className="font-display font-normal leading-[1.1] tracking-[-0.01em] text-[36px] md:text-[44px] lg:text-[56px]">
            {t('home.ai.headline.l1')}
            <br />
            {t('home.ai.headline.l2')}
          </h2>
          <p className="text-[16px] md:text-[17px] leading-[1.6] text-white/70 mt-5">
            {t('home.ai.lead')}
          </p>
        </div>

        {/* ─── Layer 2 — Hero demo (4-layer crossfade per side) ─── */}
        <div className="relative grid gap-1 mb-14 rounded-lg overflow-hidden grid-cols-1 sm:grid-cols-2 h-[360px] sm:h-[420px] lg:h-[480px]">
          {/* Before side */}
          <div className="relative overflow-hidden">
            <span className="absolute top-5 left-5 z-[2] bg-black/70 text-white text-[10px] font-bold tracking-[0.3em] uppercase px-3.5 py-2 rounded-sm">
              {t('home.ai.demoBefore')}
            </span>
            {beforeIds.map((id, i) => (
              <div
                key={id}
                className={`ds-demo-layer ds-demo-layer-${i + 1}`}
                style={{ backgroundImage: `url(${cld(id, 1200)})` }}
                aria-hidden="true"
              />
            ))}
          </div>
          {/* After side */}
          <div className="relative overflow-hidden">
            <span className="absolute top-5 left-5 z-[2] bg-[#0047AB] text-white text-[10px] font-bold tracking-[0.3em] uppercase px-3.5 py-2 rounded-sm">
              {t('home.ai.demoAfter')}
            </span>
            {afterIds.map((id, i) => (
              <div
                key={id}
                className={`ds-demo-layer ds-demo-layer-${i + 1}`}
                style={{ backgroundImage: `url(${cld(id, 1200)})` }}
                aria-hidden="true"
              />
            ))}
          </div>
          {/* Divider — vertical on desktop, horizontal on mobile */}
          <div
            className="pointer-events-none absolute z-[3] bg-white/[0.18] left-0 right-0 top-1/2 h-px sm:left-1/2 sm:right-auto sm:top-0 sm:bottom-0 sm:w-px sm:h-auto"
            aria-hidden="true"
          />
        </div>

        {/* ─── Layer 3 — Tool strip (4 cards with real thumbs) ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {/* Card 1 — Style Quiz */}
          <a
            href="/ai-concepts#quiz"
            onClick={(e) => { e.preventDefault(); navigate('/ai-concepts#quiz'); }}
            className="group relative block bg-white/[0.04] border border-white/[0.08] rounded-md p-5 transition-all duration-300 hover:bg-white/[0.07] hover:-translate-y-1 hover:border-white/[0.18] no-underline text-inherit"
          >
            <img
              src={cld(toolThumbs.styleQuiz, 600)}
              srcSet={cldSrcSet(toolThumbs.styleQuiz, CARD_WIDTHS)}
              sizes="(min-width: 1024px) 300px, (min-width: 768px) 50vw, 100vw"
              alt=""
              loading="lazy"
              decoding="async"
              className="w-full rounded-sm mb-4 object-cover"
              style={{ aspectRatio: '4/3' }}
            />
            <h3 className="font-display font-medium text-[26px] text-white mb-2 leading-[1.15]">
              {t('home.ai.tools.styleQuiz.title')}
            </h3>
            <p className="text-[14px] text-white/72 leading-[1.55] mb-4 min-h-[44px]">
              {t('home.ai.tools.styleQuiz.desc')}
            </p>
            <span className="flex items-center gap-2.5 border-t border-white/10 pt-3.5">
              <span className="inline-block px-2.5 py-1 rounded-full text-[9px] font-bold tracking-[0.22em] uppercase bg-white/[0.12] text-white shrink-0">
                {t('home.ai.tier.free')}
              </span>
              <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-white/65">
                {t('home.ai.tier.unlimited')}
              </span>
            </span>
          </a>

          {/* Card 2 — AI Vision (FEATURED) */}
          <a
            href="/ai-concepts#vision"
            onClick={(e) => { e.preventDefault(); navigate('/ai-concepts#vision'); }}
            className="group relative block bg-[rgba(0,71,171,0.16)] border border-[rgba(0,71,171,0.55)] rounded-md p-5 transition-all duration-300 hover:bg-[rgba(0,71,171,0.22)] hover:-translate-y-1 hover:border-[rgba(0,71,171,0.75)] no-underline text-inherit"
          >
            <span className="absolute top-3 right-3 z-[2] bg-[#0047AB] text-white text-[9px] font-bold tracking-[0.22em] uppercase px-2.5 py-1.5 rounded-sm">
              {t('home.ai.featuredBadge')}
            </span>
            <img
              src={cld(toolThumbs.aiVision, 600)}
              srcSet={cldSrcSet(toolThumbs.aiVision, CARD_WIDTHS)}
              sizes="(min-width: 1024px) 300px, (min-width: 768px) 50vw, 100vw"
              alt=""
              loading="lazy"
              decoding="async"
              className="w-full rounded-sm mb-4 object-cover"
              style={{ aspectRatio: '4/3' }}
            />
            <h3 className="font-display font-medium text-[26px] text-white mb-2 leading-[1.15]">
              {t('home.ai.tools.aiVision.title')}
            </h3>
            <p className="text-[14px] text-white/72 leading-[1.55] mb-4 min-h-[44px]">
              {t('home.ai.tools.aiVision.desc')}
            </p>
            <span className="flex items-center gap-2.5 border-t border-white/10 pt-3.5">
              <span className="inline-block px-2.5 py-1 rounded-full text-[9px] font-bold tracking-[0.22em] uppercase bg-[#0047AB] text-white shrink-0">
                {t('home.ai.tier.free')}
              </span>
              <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-white/65">
                {t('home.ai.tier.aiVisionCount')}
              </span>
            </span>
          </a>

          {/* Card 3 — Shopping List */}
          <a
            href="/ai-concepts#shopping"
            onClick={(e) => { e.preventDefault(); navigate('/ai-concepts#shopping'); }}
            className="group relative block bg-white/[0.04] border border-white/[0.08] rounded-md p-5 transition-all duration-300 hover:bg-white/[0.07] hover:-translate-y-1 hover:border-white/[0.18] no-underline text-inherit"
          >
            <img
              src={cld(toolThumbs.shoppingList, 600)}
              srcSet={cldSrcSet(toolThumbs.shoppingList, CARD_WIDTHS)}
              sizes="(min-width: 1024px) 300px, (min-width: 768px) 50vw, 100vw"
              alt=""
              loading="lazy"
              decoding="async"
              className="w-full rounded-sm mb-4 object-cover"
              style={{ aspectRatio: '4/3' }}
            />
            <h3 className="font-display font-medium text-[26px] text-white mb-2 leading-[1.15]">
              {t('home.ai.tools.shoppingList.title')}
            </h3>
            <p className="text-[14px] text-white/72 leading-[1.55] mb-4 min-h-[44px]">
              {t('home.ai.tools.shoppingList.desc')}
            </p>
            <span className="flex items-center gap-2.5 border-t border-white/10 pt-3.5">
              <span className="inline-block px-2.5 py-1 rounded-full text-[9px] font-bold tracking-[0.22em] uppercase bg-white/[0.12] text-white shrink-0">
                {t('home.ai.tier.free')}
              </span>
              <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-white/65">
                {t('home.ai.tier.shoppingListCount')}
              </span>
            </span>
          </a>

          {/* Card 4 — Room Audit (paid) */}
          <a
            href="/ai-concepts#audit"
            onClick={(e) => { e.preventDefault(); navigate('/ai-concepts#audit'); }}
            className="group relative block bg-white/[0.04] border border-white/[0.08] rounded-md p-5 transition-all duration-300 hover:bg-white/[0.07] hover:-translate-y-1 hover:border-white/[0.18] no-underline text-inherit"
          >
            <img
              src={cld(toolThumbs.roomAudit, 600)}
              srcSet={cldSrcSet(toolThumbs.roomAudit, CARD_WIDTHS)}
              sizes="(min-width: 1024px) 300px, (min-width: 768px) 50vw, 100vw"
              alt=""
              loading="lazy"
              decoding="async"
              className="w-full rounded-sm mb-4 object-cover"
              style={{ aspectRatio: '4/3' }}
            />
            <h3 className="font-display font-medium text-[26px] text-white mb-2 leading-[1.15]">
              {t('home.ai.tools.roomAudit.title')}
            </h3>
            <p className="text-[14px] text-white/72 leading-[1.55] mb-4 min-h-[44px]">
              {t('home.ai.tools.roomAudit.desc')}
            </p>
            <span className="flex items-center gap-2.5 border-t border-white/10 pt-3.5">
              <span
                className="inline-block px-2.5 py-1 rounded-full text-[9px] font-bold tracking-[0.22em] uppercase shrink-0"
                style={{ background: 'rgba(255, 215, 0, 0.18)', color: '#f4d23a' }}
              >
                {t('home.ai.tier.designPlus')}
              </span>
              <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-white/65">
                {t('home.ai.tier.roomAuditCount')}
              </span>
            </span>
          </a>
        </div>

        {/* ─── Layer 4 — Roadmap ribbon ─── */}
        <div
          className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-14 px-6 md:px-7 py-5 bg-white/[0.025] rounded-r-sm"
          style={{ borderLeft: '2px solid #0047AB' }}
        >
          <span className="text-[10px] font-bold tracking-[0.32em] uppercase text-[#0047AB] whitespace-nowrap">
            {t('home.ai.comingSoonLabel')}
          </span>
          <span className="text-[13px] leading-[1.6] text-white/60 tracking-[0.04em]">
            {t('home.ai.comingSoonItems')}
          </span>
        </div>

        {/* ─── Layer 5 — CTAs ─── */}
        <div className="flex flex-wrap gap-6 justify-center items-center">
          <button
            type="button"
            onClick={() => { setSigninSource('home_ai_section'); navigateTo('ai-concepts'); }}
            className="inline-flex items-center gap-3 px-9 py-[18px] bg-[#0047AB] text-white text-[13px] font-bold tracking-[0.25em] uppercase rounded-sm transition-transform duration-200 hover:-translate-y-0.5"
          >
            {t('home.ai.cta.tryFree')}
          </button>
          <button
            type="button"
            onClick={() => { setSigninSource('home_ai_section'); navigateTo('ai-concepts'); }}
            className="inline-flex items-center gap-3 px-4 py-[18px] text-white text-[13px] font-bold tracking-[0.25em] uppercase border-b border-white/60 transition-colors duration-200 hover:text-[#0047AB] hover:border-[#0047AB]"
          >
            {t('home.ai.cta.browseAll')}
          </button>
        </div>
      </div>
    </section>
  );
};

export default AIToolsSection;
