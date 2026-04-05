
import React, { useState, useMemo, useEffect } from 'react';
import { PROJECTS_LIST } from '../constants';
import { useLanguage } from '../LanguageContext';
import { ArrowLeft } from 'lucide-react';

const PortfolioPage: React.FC = () => {
  const { language, t, navigateTo, portfolioFilter, setPortfolioFilter, setSelectedProjectId } = useLanguage();
  const [filter, setFilter] = useState<'All' | 'Residential' | 'Commercial'>(portfolioFilter);

  // Synchronize internal filter state with context filter if it changes externally
  useEffect(() => {
    setFilter(portfolioFilter);
  }, [portfolioFilter]);

  const filteredProjects = useMemo(() => {
    if (filter === 'All') return PROJECTS_LIST;
    return PROJECTS_LIST.filter(p => p.categoryEN === filter);
  }, [filter]);

  const handleFilterChange = (newFilter: 'All' | 'Residential' | 'Commercial') => {
    setFilter(newFilter);
    setPortfolioFilter(newFilter);
  };

  return (
    <div className="min-h-screen bg-white pt-32 md:pt-48 pb-20 md:pb-40 font-body text-black">
      <div className="max-w-[1800px] mx-auto px-8 md:px-16">
        
        {/* Navigation & Header */}
        <div className="flex flex-col mb-24 md:mb-32">
          <button 
            onClick={() => navigateTo('home')}
            className="text-[9px] font-bold uppercase tracking-[0.35em] text-black/30 mb-10 hover:text-black transition-colors flex items-center gap-2 group w-fit"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" /> 
            {t('portfolio.backHome')}
          </button>
          
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-12">
            <div>
              <h1 className="text-3xl md:text-5xl lg:text-[5.5vw] font-bold font-display tracking-architectural leading-[0.85] uppercase animate-in fade-in slide-in-from-bottom duration-1000">
                {t('portfolio.title')}
              </h1>
            </div>

            {/* Filter Navigation */}
            <div className="flex gap-10 border-b border-black/5 pb-4">
              {[
                { key: 'All', label: t('port.all') },
                { key: 'Residential', label: t('port.residential') },
                { key: 'Commercial', label: t('port.commercial') }
              ].map((cat) => (
                <button 
                  key={cat.key}
                  onClick={() => handleFilterChange(cat.key as any)}
                  className={`text-sm md:text-base font-bold uppercase tracking-[0.2em] transition-all relative ${
                    filter === cat.key ? 'text-black' : 'text-black/30 hover:text-black/60'
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
        </div>

        {/* 3-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((project) => (
            <div 
              key={project.id} 
              onClick={() => {
                setSelectedProjectId(project.id);
                navigateTo('project-detail');
              }}
              className="group relative aspect-[4/5] bg-neutral-100 overflow-hidden cursor-pointer"
            >
              <img 
                src={project.imageUrl} 
                alt={language === 'en' ? project.titleEN : project.titleAM} 
                loading="lazy"
                className="w-full h-full object-cover object-top opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)]"
                style={{ imageRendering: '-webkit-optimize-contrast' }}
              />
              
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-700 flex flex-col justify-end p-10">
                <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-700">
                  <p className="text-sm md:text-base font-bold uppercase tracking-[0.4em] text-white/60 mb-3">
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PortfolioPage;
