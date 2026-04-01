
import React from 'react';
import { PROJECTS_LIST } from '../constants';
import { useLanguage } from '../LanguageContext';

const ProjectSection: React.FC = () => {
  const { language, t, navigateTo, setSelectedProjectId } = useLanguage();
  
  // Sort by numeric ID descending — highest ID = most recent, take top 4
  const featuredProjects = [...PROJECTS_LIST]
    .sort((a, b) => Number(b.id) - Number(a.id))
    .slice(0, 4);

  return (
    <section id="featured-projects" className="pt-16 md:pt-24 pb-0 bg-white font-body">
      <div className="max-w-[1800px] mx-auto px-8 md:px-16">
        {/* Centered Section Header */}
        <div className="flex flex-col items-center text-center mb-10 md:mb-12">
          <h2 className="text-sm md:text-base font-bold uppercase tracking-[1em] text-black/30 mb-8">{t('pro.title')}</h2>
          <h3 className="text-4xl md:text-6xl lg:text-7xl font-bold font-display tracking-architectural leading-[1] max-w-4xl mb-10">
            {t('pro.heading')}
          </h3>
          <p className="text-black/60 text-sm md:text-lg font-medium max-w-2xl leading-relaxed">
            {t('pro.subtext')}
          </p>
        </div>

        {/* 2-Column Project Grid with 3D Interaction */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24 mb-10 md:mb-12">
          {featuredProjects.map((project) => (
            <div 
              key={project.id} 
              onClick={() => {
                setSelectedProjectId(project.id);
                navigateTo('project-detail');
              }}
              className="group cursor-pointer transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-4"
            >
              <div className="aspect-[4/5] overflow-hidden bg-neutral-100 mb-4 relative shadow-sm group-hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.12)] transition-all duration-700">
                <img 
                  src={project.imageUrl} 
                  alt={language === 'en' ? project.titleEN : project.titleAM} 
                  className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-1000 group-hover:scale-105"
                />
                {/* Subtle overlay removed for "constant color" clarity, adding a very faint depth shadow on hover */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/[0.02] transition-colors duration-700" />
              </div>
              
              <div className="space-y-2 px-1">
                <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-black/40">
                  {language === 'en' ? project.categoryEN : project.categoryAM}
                </p>
                <h4 className="text-xl md:text-2xl font-bold font-display tracking-tight uppercase transition-transform duration-700 group-hover:translate-x-2">
                  {language === 'en' ? project.titleEN : project.titleAM}
                </h4>
              </div>
            </div>
          ))}
        </div>

        {/* Centered Sharp Rectangular View All Button */}
        <div className="flex justify-center">
          <button 
            onClick={() => navigateTo('portfolio')}
            className="px-16 py-6 bg-white border border-black rounded-none text-sm md:text-base font-bold uppercase tracking-[0.5em] transition-all duration-500 hover:bg-[#0047AB] hover:text-white hover:border-transparent active:bg-[#003d99]"
          >
            {t('btn.viewAllProjects')}
          </button>
        </div>
      </div>
    </section>
  );
};

export default ProjectSection;
