
import React, { useEffect, useState } from 'react';
import { useLanguage } from '../LanguageContext';
import { PROJECTS_LIST, ProjectData } from '../constants';
import { ArrowLeft } from 'lucide-react';

const ProjectDetail: React.FC = () => {
  const { language, t, navigateTo, selectedProjectId } = useLanguage();
  const [project, setProject] = useState<ProjectData | null>(null);

  useEffect(() => {
    if (selectedProjectId) {
      const found = PROJECTS_LIST.find(p => p.id === selectedProjectId);
      if (found) setProject(found);
    }
  }, [selectedProjectId]);

  if (!project) return null;

  const title = language === 'en' ? project.titleEN : project.titleAM;
  const description = language === 'en' ? project.descriptionEN : project.descriptionAM;
  const location = language === 'en' ? project.locationEN : project.locationAM;

  const ImageOrPlaceholder = ({ src, aspect, labelKey, n }: { src?: string; aspect: string; labelKey: string; n?: number }) => {
    const label = t(labelKey).replace('{n}', n?.toString() || '');
    if (!src) {
      return (
        <div className={`w-full ${aspect} bg-neutral-50 flex flex-col items-center justify-center border border-dashed border-neutral-200`}>
          <span className="text-sm md:text-base font-bold uppercase tracking-[0.3em] text-black/20">{label}</span>
          <span className="text-[8px] uppercase tracking-widest text-black/10 mt-2">{t('portfolio.noImage')}</span>
        </div>
      );
    }
    return (
      <div className={`w-full overflow-hidden bg-neutral-100 group ${aspect} relative`}>
        <img
          src={src}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-105"
          alt={label}
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/[0.02] transition-colors duration-700 pointer-events-none" />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white text-black font-body pt-20">
      
      {/* 1. Navigation & Title Area */}
      <div className="max-w-[1800px] mx-auto px-8 md:px-16 pt-12">
        <button 
          onClick={() => navigateTo('portfolio')}
          className="text-sm md:text-base font-bold uppercase tracking-widest text-black/40 hover:text-black transition-colors flex items-center gap-2 group mb-12"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" /> 
          {t('portfolio.back')}
        </button>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-12 mb-16">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold font-display tracking-architectural uppercase leading-[0.9]">
            {title}
          </h1>
          <p className="text-black/50 text-xs md:text-sm font-medium max-w-md leading-relaxed italic">
            {description}
          </p>
        </div>
      </div>

      {/* 2. Meta Bar */}
      <div className="border-y border-black/5 bg-neutral-50/50 mb-12">
        <div className="max-w-[1800px] mx-auto px-8 md:px-16 py-8 flex flex-wrap gap-16 md:gap-32">
          <div className="flex flex-col gap-1">
            <span className="text-sm md:text-base font-bold uppercase tracking-[0.3em] text-black/30">{t('port.detail.location')}</span>
            <span className="text-sm md:text-base font-bold font-display uppercase tracking-tight">{location}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm md:text-base font-bold uppercase tracking-[0.3em] text-black/30">{t('port.detail.area')}</span>
            <span className="text-sm md:text-base font-bold font-display uppercase tracking-tight">{project.area}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm md:text-base font-bold uppercase tracking-[0.3em] text-black/30">{t('port.detail.date')}</span>
            <span className="text-sm md:text-base font-bold font-display uppercase tracking-tight">{project.date}</span>
          </div>
        </div>
      </div>

      {/* 3. GALLERY SEQUENCE */}
      <section className="pb-24">
        <div className="max-w-[1800px] mx-auto px-8 md:px-16 flex flex-col gap-5">
          
          {/* Photo 1 — Full width landscape (16:9) */}
          <ImageOrPlaceholder 
            src={project.gallery[0]} 
            aspect="aspect-video" 
            labelKey="portfolio.mainPerspective" 
          />

          {/* Info block mid-gallery */}
          <div className="bg-neutral-50 border border-black/5 p-10 md:p-16 flex flex-col md:flex-row gap-12 items-start md:items-center">
            <div className="max-w-2xl">
              <h3 className="text-2xl md:text-3xl font-bold font-display uppercase tracking-tight mb-4">{title}</h3>
              <p className="text-black/40 text-sm md:text-base italic leading-relaxed">{description}</p>
            </div>
          </div>

          {/* Photos 2+3 — Portrait pair (4:5) */}
          <div className="grid grid-cols-2 gap-5">
            <ImageOrPlaceholder 
              src={project.gallery[1]} 
              aspect="aspect-[4/5]" 
              labelKey="portfolio.detailView1" 
            />
            <ImageOrPlaceholder 
              src={project.gallery[2]} 
              aspect="aspect-[4/5]" 
              labelKey="portfolio.detailView2" 
            />
          </div>

          {/* Photo 4 — Full width landscape (16:9) */}
          <ImageOrPlaceholder 
            src={project.gallery[3]} 
            aspect="aspect-video" 
            labelKey="portfolio.widePerspective" 
          />

          {/* Photos 5+6 — Landscape pair (4:3) */}
          <div className="grid grid-cols-2 gap-5">
            <ImageOrPlaceholder 
              src={project.gallery[4]} 
              aspect="aspect-[4/3]" 
              labelKey="portfolio.contextView1" 
            />
            <ImageOrPlaceholder 
              src={project.gallery[5]} 
              aspect="aspect-[4/3]" 
              labelKey="portfolio.contextView2" 
            />
          </div>

          {/* Photos 7+8+9 — Trio (Square) */}
          <div className="grid grid-cols-3 gap-5">
            <ImageOrPlaceholder 
              src={project.gallery[6]} 
              aspect="aspect-square" 
              labelKey="portfolio.closeup1" 
            />
            <ImageOrPlaceholder 
              src={project.gallery[7]} 
              aspect="aspect-square" 
              labelKey="portfolio.closeup2" 
            />
            <ImageOrPlaceholder 
              src={project.gallery[8]} 
              aspect="aspect-square" 
              labelKey="portfolio.closeup3" 
            />
          </div>

          {/* Photos 10+11 — Final portrait pair (4:5) */}
          <div className="grid grid-cols-2 gap-5">
            <ImageOrPlaceholder 
              src={project.gallery[9]} 
              aspect="aspect-[4/5]" 
              labelKey="portfolio.atmosphere1" 
            />
            <ImageOrPlaceholder 
              src={project.gallery[10]} 
              aspect="aspect-[4/5]" 
              labelKey="portfolio.atmosphere2" 
            />
          </div>

          {/* 4. ADDITIONAL IMAGES (Infinite Pattern: Pair 4:5 -> Trio Square) */}
          {project.gallery.length > 11 && (
            <div className="flex flex-col gap-5">
              {(() => {
                const remaining = project.gallery.slice(11);
                const chunks = [];
                for (let i = 0; i < remaining.length; i += 5) {
                  const pair = remaining.slice(i, i + 2);
                  const trio = remaining.slice(i + 2, i + 5);
                  
                  if (pair.length > 0) {
                    chunks.push(
                      <div key={`pair-${i}`} className={`grid gap-5 ${
                        pair.length === 1 ? 'grid-cols-1' : 
                        'grid-cols-2'
                      }`}>
                        {pair.map((img, idx) => (
                          <ImageOrPlaceholder 
                            key={`img-pair-${i}-${idx}`}
                            src={img} 
                            aspect="aspect-[4/5]" 
                            labelKey="portfolio.additionalView"
                            n={12 + i + idx}
                          />
                        ))}
                      </div>
                    );
                  }

                  if (trio.length > 0) {
                    chunks.push(
                      <div key={`trio-${i}`} className={`grid gap-5 ${
                        trio.length === 1 ? 'grid-cols-1' : 
                        trio.length === 2 ? 'grid-cols-2' : 
                        'grid-cols-3'
                      }`}>
                        {trio.map((img, idx) => (
                          <ImageOrPlaceholder 
                            key={`img-trio-${i}-${idx}`}
                            src={img} 
                            aspect="aspect-square" 
                            labelKey="portfolio.additionalView"
                            n={12 + i + pair.length + idx}
                          />
                        ))}
                      </div>
                    );
                  }
                }
                return chunks;
              })()}
            </div>
          )}
        </div>
      </section>

      {/* Footer Navigation */}
      <section className="border-t border-black/5 bg-white py-24 group cursor-pointer overflow-hidden relative">
        <div className="max-w-[1800px] mx-auto px-8 md:px-16 text-center">
          <span className="text-sm md:text-base font-bold uppercase tracking-[0.5em] text-black/40 mb-8 inline-block">{t('portfolio.next')}</span>
          <h4 className="text-3xl md:text-5xl lg:text-7xl font-bold font-display tracking-architectural leading-none uppercase transition-all duration-700">
             {t('portfolio.exploreMore')}
          </h4>
          <button 
            onClick={() => navigateTo('portfolio')}
            className="mt-20 px-12 py-5 bg-transparent border border-black text-black text-sm md:text-base font-bold uppercase tracking-[0.5em] transition-all duration-500 hover:bg-black hover:text-white"
          >
            {t('portfolio.return')}
          </button>
        </div>
      </section>
    </div>
  );
};

export default ProjectDetail;
