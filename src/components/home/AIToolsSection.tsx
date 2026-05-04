import React from 'react';
import { useLanguage } from '../../LanguageContext';
import ResponsiveImage from '../ResponsiveImage';
import { CARD_WIDTHS } from '../../lib/cld';

interface TilePair {
  before: string;
  after: string;
  badge: string;
  badgeLive?: boolean;
  delay: number;
  alt: string;
}

/**
 * Section 5 — Dynamic AI tiles + right-side copy.
 *
 * Each tile shows two stacked image layers (before / after). The "after"
 * layer crossfades on a 7s loop while a slow Ken Burns zoom (20s) is
 * applied to both layers. Stagger delays prevent the three tiles from
 * cycling in sync.
 *
 * Production TODO: each tile should cycle through 3-4 different rooms,
 * not just one before/after pair. For this localhost build, single pair
 * per tile is OK — owner will add more variants later (S-013 follow-up).
 */
const AIToolsSection: React.FC = () => {
  const { t, navigateTo } = useLanguage();

  const tiles: TilePair[] = [
    {
      before: 'https://res.cloudinary.com/dys2k5muv/image/upload/before_1_tjwkhh.jpg',
      after: 'https://res.cloudinary.com/dys2k5muv/image/upload/after_1_wp9msc.png',
      badge: t('home.ai.badge.live'),
      badgeLive: true,
      delay: 0.5,
      alt: 'AI Vision concept demo',
    },
    {
      before: 'https://res.cloudinary.com/dys2k5muv/image/upload/before_2_s6lh97.png',
      after: 'https://res.cloudinary.com/dys2k5muv/image/upload/after_2_aq8cwh.png',
      badge: t('home.ai.badge.quiz'),
      delay: 1,
      alt: 'Style Quiz preview',
    },
    {
      before: 'https://res.cloudinary.com/dys2k5muv/image/upload/before_3_mne2jp.jpg',
      after: 'https://res.cloudinary.com/dys2k5muv/image/upload/after_3_f14b5p.jpg',
      badge: t('home.ai.badge.list'),
      delay: 3,
      alt: 'Shopping List preview',
    },
  ];

  return (
    <section className="py-20 md:py-24 bg-[#0A0A0A] text-white">
      <style>{`
        @keyframes ds-kenburns {
          0%   { transform: scale(1.0) translate(0, 0); }
          50%  { transform: scale(1.08) translate(-1%, -0.5%); }
          100% { transform: scale(1.0) translate(0, 0); }
        }
        @keyframes ds-crossfade {
          0%, 38%   { opacity: 1; }
          50%, 88%  { opacity: 0; }
          100%      { opacity: 1; }
        }
        .ai-tile { position: relative; overflow: hidden; border-radius: 4px; background: #1a1a1a; }
        .ai-tile-layer { position: absolute; inset: 0; }
        .ai-tile-layer.before { animation: ds-kenburns 20s ease-in-out infinite; }
        .ai-tile-layer.after  { animation: ds-kenburns 20s ease-in-out infinite, ds-crossfade 7s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .ai-tile-layer.before, .ai-tile-layer.after { animation: none; }
        }
      `}</style>

      <div className="max-w-[1280px] mx-auto px-6 md:px-14">
        <div className="text-center mb-14 md:mb-16">
          <div className="w-12 h-px bg-white/30 mx-auto mb-5" aria-hidden="true" />
          <span className="inline-block text-[13px] md:text-[15px] font-bold uppercase tracking-[0.26em] text-white/65 mb-4">
            {t('home.ai.eyebrow')}
          </span>
          <h2 className="font-display font-normal leading-[1.1] tracking-[-0.01em] text-[34px] md:text-[44px] lg:text-[56px] max-w-[900px] mx-auto">
            {t('home.ai.headline')}
          </h2>
        </div>

        <div className="grid gap-12 lg:gap-16 lg:grid-cols-[1.5fr_1fr] items-stretch">
          {/* Left: dynamic tile canvas */}
          <div
            className="grid gap-2 grid-cols-2 grid-rows-2"
            style={{ height: 'clamp(380px, 56vh, 540px)' }}
          >
            {/* Feature tile spans 2 rows */}
            <div className="ai-tile row-span-2">
              <div className="ai-tile-layer before">
                <ResponsiveImage
                  src={tiles[0].before}
                  alt={`${tiles[0].alt} (before)`}
                  aspectRatio="4/5"
                  crop="fill"
                  sizes="(min-width: 1024px) 40vw, 50vw"
                  widths={CARD_WIDTHS}
                  baseWidth={640}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="ai-tile-layer after" style={{ animationDelay: '0s, 0.5s' }}>
                <ResponsiveImage
                  src={tiles[0].after}
                  alt={`${tiles[0].alt} (after)`}
                  aspectRatio="4/5"
                  crop="fill"
                  sizes="(min-width: 1024px) 40vw, 50vw"
                  widths={CARD_WIDTHS}
                  baseWidth={640}
                  className="w-full h-full object-cover"
                />
              </div>
              <span
                className="absolute top-4 left-4 z-[5] text-[10px] font-bold tracking-[0.25em] uppercase text-white px-3 py-1.5 rounded-full backdrop-blur-md"
                style={{ background: tiles[0].badgeLive ? 'rgba(0,71,171,0.85)' : 'rgba(0,0,0,0.6)' }}
              >
                {tiles[0].badge}
              </span>
            </div>

            {/* Tile 2 (top right) */}
            <div className="ai-tile">
              <div className="ai-tile-layer before">
                <ResponsiveImage
                  src={tiles[1].before}
                  alt={`${tiles[1].alt} (before)`}
                  aspectRatio="1/1"
                  crop="fill"
                  sizes="(min-width: 1024px) 20vw, 25vw"
                  widths={CARD_WIDTHS}
                  baseWidth={480}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="ai-tile-layer after" style={{ animationDelay: `0s, ${tiles[1].delay}s` }}>
                <ResponsiveImage
                  src={tiles[1].after}
                  alt={`${tiles[1].alt} (after)`}
                  aspectRatio="1/1"
                  crop="fill"
                  sizes="(min-width: 1024px) 20vw, 25vw"
                  widths={CARD_WIDTHS}
                  baseWidth={480}
                  className="w-full h-full object-cover"
                />
              </div>
              <span
                className="absolute top-4 left-4 z-[5] text-[10px] font-bold tracking-[0.25em] uppercase text-white px-3 py-1.5 rounded-full backdrop-blur-md"
                style={{ background: 'rgba(0,0,0,0.6)' }}
              >
                {tiles[1].badge}
              </span>
            </div>

            {/* Tile 3 (bottom right) */}
            <div className="ai-tile">
              <div className="ai-tile-layer before">
                <ResponsiveImage
                  src={tiles[2].before}
                  alt={`${tiles[2].alt} (before)`}
                  aspectRatio="1/1"
                  crop="fill"
                  sizes="(min-width: 1024px) 20vw, 25vw"
                  widths={CARD_WIDTHS}
                  baseWidth={480}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="ai-tile-layer after" style={{ animationDelay: `0s, ${tiles[2].delay}s` }}>
                <ResponsiveImage
                  src={tiles[2].after}
                  alt={`${tiles[2].alt} (after)`}
                  aspectRatio="1/1"
                  crop="fill"
                  sizes="(min-width: 1024px) 20vw, 25vw"
                  widths={CARD_WIDTHS}
                  baseWidth={480}
                  className="w-full h-full object-cover"
                />
              </div>
              <span
                className="absolute top-4 left-4 z-[5] text-[10px] font-bold tracking-[0.25em] uppercase text-white px-3 py-1.5 rounded-full backdrop-blur-md"
                style={{ background: 'rgba(0,0,0,0.6)' }}
              >
                {tiles[2].badge}
              </span>
            </div>
          </div>

          {/* Right: copy */}
          <div className="flex flex-col justify-center">
            <h3 className="font-display font-normal leading-[1.15] text-[28px] md:text-[34px] lg:text-[42px] mb-6">
              {t('home.ai.title')}
            </h3>
            <p className="text-[16px] md:text-[17px] leading-[1.6] text-white/75 mb-9 max-w-[420px]">
              {t('home.ai.desc')}
            </p>

            <ul className="mb-10">
              {[
                { name: t('home.ai.tool1.name'), tag: t('home.ai.tool1.tag') },
                { name: t('home.ai.tool2.name'), tag: t('home.ai.tool2.tag') },
                { name: t('home.ai.tool3.name'), tag: t('home.ai.tool3.tag') },
              ].map((tool) => (
                <li
                  key={tool.name}
                  className="flex justify-between items-center py-4 border-b border-white/15 text-[16px] md:text-[17px]"
                >
                  <span className="font-medium tracking-[0.04em]">{tool.name}</span>
                  <span className="text-[13px] font-semibold tracking-[0.22em] uppercase text-white/65">
                    {tool.tag}
                  </span>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => navigateTo('ai-concepts')}
              className="inline-flex items-center text-[13px] font-bold tracking-[0.25em] uppercase text-white border-b border-white pb-3 w-fit hover:opacity-80 transition-opacity"
            >
              {t('home.ai.cta')}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AIToolsSection;
