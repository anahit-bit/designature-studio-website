import React from 'react';
import { useLanguage } from '../../LanguageContext';

/**
 * AI Studio section — v3.1 (Hero Demo + Tool Strip + Roadmap Ribbon + CTAs).
 *
 * Replaces the previous abstract 3-tile design. Reads as a real product
 * showcase rather than decorative imagery: a big before/after split that
 * cycles through transformations, then a 4-tool strip with tier pills, a
 * roadmap ribbon hinting at platform ambition, and two CTAs.
 *
 * PRODUCTION TODO: replace the 12 gradient stops in the @keyframes
 * `ds-demoaftercycle` with real Cloudinary URLs of AI Vision before/after
 * pairs (use cld() helper). One stop ≈ 5s of dwell time inside the 60s loop.
 */
const AIToolsSection: React.FC = () => {
  const { t, navigateTo } = useLanguage();

  return (
    <section className="py-20 md:py-24 bg-[#0A0A0A] text-white">
      <style>{`
        @keyframes ds-kenburns {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.08); }
        }
        @keyframes ds-demoaftercycle {
          0%     { background: linear-gradient(135deg, #c5a880 0%, #6e553a 100%); }
          8.33%  { background: linear-gradient(135deg, #8da3b3 0%, #3e556a 100%); }
          16.67% { background: linear-gradient(135deg, #d6c4a8 0%, #6b5d4a 100%); }
          25%    { background: linear-gradient(135deg, #6b8e7e 0%, #2a3f37 100%); }
          33.33% { background: linear-gradient(135deg, #2e3e5a 0%, #b39574 100%); }
          41.67% { background: linear-gradient(135deg, #c97e5a 0%, #d6c4a8 100%); }
          50%    { background: linear-gradient(135deg, #e0bdb6 0%, #8a8290 100%); }
          58.33% { background: linear-gradient(135deg, #4a5359 0%, #8b6f4e 100%); }
          66.67% { background: linear-gradient(135deg, #b07a4f 0%, #6b6557 100%); }
          75%    { background: linear-gradient(135deg, #9bab8e 0%, #d6cdb8 100%); }
          83.33% { background: linear-gradient(135deg, #d49b91 0%, #ddc7b7 100%); }
          91.67% { background: linear-gradient(135deg, #5a3a3c 0%, #8b6f4e 100%); }
          100%   { background: linear-gradient(135deg, #c5a880 0%, #6e553a 100%); }
        }
        .ds-demo-before-img {
          background: linear-gradient(135deg, #6a6a6a 0%, #2a2a2a 100%);
          animation: ds-kenburns 24s ease-in-out infinite;
        }
        .ds-demo-after-img {
          animation: ds-kenburns 24s ease-in-out infinite, ds-demoaftercycle 60s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .ds-demo-before-img, .ds-demo-after-img { animation: none !important; }
          .ds-demo-after-img { background: linear-gradient(135deg, #c5a880 0%, #6e553a 100%); }
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

        {/* ─── Layer 2 — Hero demo (before/after split) ─── */}
        <div
          className="relative grid gap-1 mb-14 rounded-lg overflow-hidden grid-cols-1 sm:grid-cols-2 h-[360px] sm:h-[420px] lg:h-[480px]"
        >
          {/* Before */}
          <div className="relative overflow-hidden">
            <span className="absolute top-5 left-5 z-[2] bg-black/70 text-white text-[10px] font-bold tracking-[0.3em] uppercase px-3.5 py-2 rounded-sm">
              {t('home.ai.demoBefore')}
            </span>
            <div className="ds-demo-before-img absolute inset-0" aria-hidden="true" />
          </div>
          {/* After */}
          <div className="relative overflow-hidden">
            <span className="absolute top-5 left-5 z-[2] bg-[#0047AB] text-white text-[10px] font-bold tracking-[0.3em] uppercase px-3.5 py-2 rounded-sm">
              {t('home.ai.demoAfter')}
            </span>
            <div className="ds-demo-after-img absolute inset-0" aria-hidden="true" />
          </div>
          {/* Divider — vertical on desktop, horizontal on mobile */}
          <div
            className="pointer-events-none absolute z-[3] bg-white/[0.18] left-0 right-0 top-1/2 h-px sm:left-1/2 sm:right-auto sm:top-0 sm:bottom-0 sm:w-px sm:h-auto"
            aria-hidden="true"
          />
        </div>

        {/* ─── Layer 3 — Tool strip (4 cards) ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {/* Card 1 — Style Quiz */}
          <a
            href="/ai-concepts"
            onClick={(e) => { e.preventDefault(); navigateTo('ai-concepts'); }}
            className="group relative block bg-white/[0.04] border border-white/[0.08] rounded-md p-5 transition-all duration-300 hover:bg-white/[0.07] hover:-translate-y-1 hover:border-white/[0.18] no-underline text-inherit"
          >
            <div
              className="w-full rounded-sm mb-4"
              style={{ aspectRatio: '4/3', background: 'linear-gradient(135deg, #4a5a6a 0%, #1c2530 100%)' }}
              aria-hidden="true"
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
            href="/ai-concepts"
            onClick={(e) => { e.preventDefault(); navigateTo('ai-concepts'); }}
            className="group relative block bg-[rgba(0,71,171,0.16)] border border-[rgba(0,71,171,0.55)] rounded-md p-5 transition-all duration-300 hover:bg-[rgba(0,71,171,0.22)] hover:-translate-y-1 hover:border-[rgba(0,71,171,0.75)] no-underline text-inherit"
          >
            <span className="absolute top-3 right-3 z-[2] bg-[#0047AB] text-white text-[9px] font-bold tracking-[0.22em] uppercase px-2.5 py-1.5 rounded-sm">
              {t('home.ai.featuredBadge')}
            </span>
            <div
              className="w-full rounded-sm mb-4"
              style={{ aspectRatio: '4/3', background: 'linear-gradient(135deg, #c5a880 0%, #6b5d4a 100%)' }}
              aria-hidden="true"
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
            href="/ai-concepts"
            onClick={(e) => { e.preventDefault(); navigateTo('ai-concepts'); }}
            className="group relative block bg-white/[0.04] border border-white/[0.08] rounded-md p-5 transition-all duration-300 hover:bg-white/[0.07] hover:-translate-y-1 hover:border-white/[0.18] no-underline text-inherit"
          >
            <div
              className="w-full rounded-sm mb-4"
              style={{ aspectRatio: '4/3', background: 'linear-gradient(135deg, #8b6f4e 0%, #3a2d1e 100%)' }}
              aria-hidden="true"
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
            href="/ai-concepts"
            onClick={(e) => { e.preventDefault(); navigateTo('ai-concepts'); }}
            className="group relative block bg-white/[0.04] border border-white/[0.08] rounded-md p-5 transition-all duration-300 hover:bg-white/[0.07] hover:-translate-y-1 hover:border-white/[0.18] no-underline text-inherit"
          >
            <div
              className="w-full rounded-sm mb-4"
              style={{ aspectRatio: '4/3', background: 'linear-gradient(135deg, #5a7080 0%, #2a3540 100%)' }}
              aria-hidden="true"
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
            onClick={() => navigateTo('ai-concepts')}
            className="inline-flex items-center gap-3 px-9 py-[18px] bg-[#0047AB] text-white text-[13px] font-bold tracking-[0.25em] uppercase rounded-sm transition-transform duration-200 hover:-translate-y-0.5"
          >
            {t('home.ai.cta.tryFree')}
          </button>
          <button
            type="button"
            onClick={() => navigateTo('ai-concepts')}
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
