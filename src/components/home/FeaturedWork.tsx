import React, { useMemo } from 'react';
import { useLanguage } from '../../LanguageContext';
import { useProjects } from '../../ProjectsContext';
import ResponsiveImage from '../ResponsiveImage';
import { CARD_WIDTHS } from '../../lib/cld';

/**
 * Featured Work — asymmetric 5-card grid.
 * 1 large feature card spans 2 rows; 4 smaller cards fill the rest.
 *
 * Source: ProjectsContext (Sanity-backed with bundled fallback). On every
 * mount we Fisher-Yates shuffle the full list and take 5, so each page load
 * surfaces a different cross-section of the studio's work. Shuffle is
 * memoized on `projects`, so navigating away and back within the same
 * session will not reshuffle until the data refetches or the page reloads.
 *
 * The grid container is wider than the rest of the page (max-w-[1800px])
 * so the photography reads as a statement on big screens. The eyebrow +
 * headline keep the page's narrower 1280 rhythm.
 */
const FeaturedWork: React.FC = () => {
  const { language, t, navigateTo } = useLanguage();
  const { projects } = useProjects();

  const featured = useMemo(() => {
    const arr = [...projects];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, 5);
  }, [projects]);

  if (featured.length === 0) return null;

  return (
    <section className="py-20 md:py-24 bg-white">
      <div className="max-w-[1280px] mx-auto px-6 md:px-14">
        <div className="text-center mb-14 md:mb-16">
          <div className="w-12 h-px bg-black/20 mx-auto mb-5" aria-hidden="true" />
          <span className="inline-block text-[13px] md:text-[15px] font-bold uppercase tracking-[0.26em] text-[#6B6B6B] mb-4">
            {t('home.work.eyebrow')}
          </span>
          <h2 className="font-display font-normal text-[#0A0A0A] leading-[1.1] tracking-[-0.01em] text-[36px] md:text-[48px] lg:text-[60px]">
            {t('home.work.headline')}
          </h2>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-6 md:px-14">
        <div
          className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]"
          style={{ gridAutoRows: '460px' }}
        >
          {featured.map((p, idx) => {
            const isFeature = idx === 0;
            const title = p.titleEN;
            // Locations come from Sanity in the form "City, Country" (e.g.
            // "Yerevan, Armenia"). Residential cards surface the city; commercial
            // cards surface the country, so projects abroad read at a glance.
            const locStr = p.locationEN;
            const [city = '', country = ''] = locStr.split(',').map(s => s.trim());
            const categoryLabel = p.categoryEN;
            const location =
              p.categoryEN === 'Commercial'
                ? country
                  ? `${categoryLabel} · ${country}`
                  : categoryLabel
                : city
                  ? `${categoryLabel} · ${city}`
                  : categoryLabel;

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => navigateTo('project-detail', p.id)}
                className={`group relative overflow-hidden bg-neutral-200 cursor-pointer text-left ${
                  isFeature ? 'lg:row-span-2 md:col-span-2 lg:col-span-1 md:row-span-2' : ''
                }`}
                style={isFeature ? { minHeight: 340 } : undefined}
                aria-label={title}
              >
                <ResponsiveImage
                  src={p.imageUrl}
                  alt={title}
                  aspectRatio={isFeature ? '5/6' : '4/5'}
                  crop="fill"
                  sizes={isFeature
                    ? '(min-width: 1024px) 50vw, (min-width: 768px) 100vw, 100vw'
                    : '(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 100vw'}
                  widths={CARD_WIDTHS}
                  baseWidth={isFeature ? 960 : 480}
                  priority={idx < 2}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                />
                <div
                  className="absolute inset-x-0 bottom-0 px-5 py-5 md:px-6 md:py-6 text-white"
                  style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.78) 100%)' }}
                >
                  <div className="font-display font-normal text-[22px] md:text-[24px] leading-[1.15]">
                    {title}
                  </div>
                  <div className="text-[12px] tracking-[0.22em] uppercase text-white/75 mt-1.5">
                    {location}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-10 md:mt-12 text-center">
          <button
            type="button"
            onClick={() => navigateTo('portfolio')}
            className="inline-flex items-center gap-3 text-[14px] font-bold uppercase tracking-[0.22em] text-[#0047AB] hover:opacity-80 transition-opacity"
          >
            {t('home.work.cta')}
          </button>
        </div>
      </div>
    </section>
  );
};

export default FeaturedWork;
