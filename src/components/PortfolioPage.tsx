
import React, { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '../LanguageContext';
import { useProjects } from '../ProjectsContext';
import { ArrowLeft } from 'lucide-react';
import ResponsiveImage from './ResponsiveImage';
import { CARD_WIDTHS } from '../lib/cld';
import type { ProjectData } from '../constants';

/** Fisher-Yates shuffle (pure — returns a new array). */
function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const PortfolioPage: React.FC = () => {
  const { language, t, navigateTo, portfolioFilter, setPortfolioFilter } = useLanguage();
  const { projects } = useProjects();
  const [filter, setFilter] = useState<'All' | 'Residential' | 'Commercial'>(portfolioFilter);

  // Synchronize internal filter state with context filter if it changes externally
  useEffect(() => {
    setFilter(portfolioFilter);
  }, [portfolioFilter]);

  // Mosaic hero covers: 1 Commercial + 3 Residential, each pool shuffled, then
  // the combined four shuffled again for tile order. Memoized on `projects` so
  // the mix varies per load but stays stable while navigating within a session
  // (same pattern as FeaturedWork). Edge cases keep the grid full: no Commercial
  // → 4 Residential; <3 Residential → backfill from any remaining project; fewer
  // than 4 projects total → the column count shrinks so no blank tile is rendered.
  const mosaic = useMemo(() => {
    const commercial = shuffle(projects.filter(p => p.categoryEN === 'Commercial'));
    const residential = shuffle(projects.filter(p => p.categoryEN === 'Residential'));

    const picks: ProjectData[] = [];
    const used = new Set<string>();
    const take = (p?: ProjectData) => {
      if (p && !used.has(p.id)) { used.add(p.id); picks.push(p); }
    };

    take(commercial[0]);
    residential.slice(0, 3).forEach(take);

    // Backfill to four from any remaining project (covers no-commercial and
    // thin-residential cases). Nothing to add when there are <4 projects total.
    if (picks.length < 4) {
      shuffle(projects).forEach(p => { if (picks.length < 4) take(p); });
    }

    return shuffle(picks).slice(0, 4);
  }, [projects]);

  // Columns track the tile count so short data sets leave no empty cell. Classes
  // are literal (not interpolated) so Tailwind keeps them in the build.
  const n = mosaic.length;
  const mosaicCols =
    n >= 4 ? 'grid-cols-2 md:grid-cols-4' :
    n === 3 ? 'grid-cols-3' :
    n === 2 ? 'grid-cols-2' :
    'grid-cols-1';

  const filteredProjects = useMemo(() => {
    const sorted = [...projects].sort((a, b) => Number(b.id) - Number(a.id));
    if (filter === 'All') return sorted;
    return sorted.filter(p => p.categoryEN === filter);
  }, [filter, projects]);

  const handleFilterChange = (newFilter: 'All' | 'Residential' | 'Commercial') => {
    setFilter(newFilter);
    setPortfolioFilter(newFilter);
  };

  return (
    <div className="min-h-screen bg-white font-body text-black">

      {/* ══════════════════════════════════════════
          MOSAIC HERO — leads with the work. The fixed Header floats over it,
          same as the Studio / Services / Pricing photo heroes.
          ══════════════════════════════════════════ */}
      <section className="relative w-full h-[58vh] md:h-[64vh] min-h-[420px] max-h-[680px] overflow-hidden bg-black">
        {/* Tiles */}
        {mosaic.length > 0 && (
          <div className={`absolute inset-0 grid ${mosaicCols} gap-[3px]`}>
            {mosaic.map((project, idx) => (
              <div key={project.id} className="relative overflow-hidden bg-neutral-900">
                <ResponsiveImage
                  src={project.imageUrl}
                  alt={language === 'en' ? project.titleEN : project.titleAM}
                  aspectRatio="4/5"
                  crop="fill"
                  sizes="(min-width: 768px) 25vw, 50vw"
                  widths={CARD_WIDTHS}
                  baseWidth={480}
                  priority={idx < 4}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.1), rgba(0,0,0,0.5))' }}
                  aria-hidden
                />
              </div>
            ))}
          </div>
        )}

        {/* Back link — top-left, cleared below the fixed header */}
        <button
          onClick={() => navigateTo('home')}
          className="absolute top-24 md:top-28 left-8 md:left-16 z-20 text-[11px] font-bold uppercase tracking-[0.35em] text-white/80 hover:text-white transition-colors flex items-center gap-2 group w-fit"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
          {t('portfolio.backHome')}
        </button>

        {/* Centered overlay title */}
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-6 pointer-events-none">
          <span className="text-[11px] md:text-[12px] font-bold uppercase tracking-[0.34em] text-white/85 mb-4">
            {language === 'en' ? 'Selected projects' : 'Ընտրված նախագծեր'}
          </span>
          <h1 className="text-3xl md:text-5xl lg:text-[5.5vw] font-bold font-display text-white tracking-architectural leading-[0.85] uppercase animate-in fade-in slide-in-from-bottom duration-1000">
            {t('portfolio.title')}
          </h1>
          <span aria-hidden className="block w-20 h-[2px] bg-[#9E5E41] mt-7" />
        </div>
      </section>

      {/* ══════════════════════════════════════════
          BELOW THE HERO — filter tabs + project grid (logic unchanged)
          ══════════════════════════════════════════ */}
      <div className="max-w-[1800px] mx-auto px-8 md:px-16 pt-16 md:pt-24 pb-20 md:pb-40">

        {/* Filter Navigation */}
        <div className="flex justify-end mb-12 md:mb-16">
          <div className="flex flex-wrap gap-x-6 gap-y-3 md:gap-10 border-b border-black/5 pb-4">
            {[
              { key: 'All', label: t('port.all') },
              { key: 'Residential', label: t('port.residential') },
              { key: 'Commercial', label: t('port.commercial') }
            ].map((cat) => (
              <button
                key={cat.key}
                onClick={() => handleFilterChange(cat.key as any)}
                className={`text-[13px] md:text-base font-bold uppercase tracking-[0.15em] md:tracking-[0.2em] transition-all relative ${
                  filter === cat.key ? 'text-black' : 'text-black/65 hover:text-black'
                }`}
              >
                {cat.label}
                {filter === cat.key && (
                  <span className="absolute -bottom-[17px] left-0 w-full h-[1px] bg-black animate-in slide-in-from-left-2" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 3-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((project, idx) => (
            <button
              type="button"
              key={project.id}
              onClick={() => navigateTo('project-detail', project.id)}
              aria-label={language === 'en' ? project.titleEN : project.titleAM}
              className="group relative aspect-[4/5] bg-neutral-100 overflow-hidden cursor-pointer text-left w-full appearance-none border-0 p-0"
            >
              <ResponsiveImage
                src={project.imageUrl}
                alt={language === 'en' ? project.titleEN : project.titleAM}
                aspectRatio="4/5"
                crop="fill"
                sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                widths={CARD_WIDTHS}
                baseWidth={480}
                priority={idx < 3}
                className="w-full h-full object-cover object-top opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)]"
                style={{ imageRendering: '-webkit-optimize-contrast' }}
              />

              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-700 flex flex-col justify-end p-10">
                <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-700">
                  <p className="text-sm md:text-base font-bold uppercase tracking-[0.4em] text-white/80 mb-3">
                    {language === 'en' ? project.categoryEN : project.categoryAM}
                  </p>
                  <h4 className="text-2xl md:text-3xl font-bold font-display tracking-architectural uppercase text-white leading-none">
                    {language === 'en' ? project.titleEN : project.titleAM}
                  </h4>
                </div>
              </div>

              <div className="absolute top-8 right-8 border border-white/20 px-3 py-1 opacity-0 group-hover:opacity-100 transition-all duration-700">
                <span className="text-xs font-bold text-white tracking-widest">{t('portfolio.view')}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PortfolioPage;
