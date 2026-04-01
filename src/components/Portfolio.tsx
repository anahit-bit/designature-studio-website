
import React, { useState } from 'react';
import { getProjects } from '../constants';
import { useLanguage } from '../LanguageContext';

const Portfolio: React.FC = () => {
  const [filter, setFilter] = useState<'All' | 'Residential' | 'Commercial'>('All');
  const { language, t, navigateTo, setSelectedProjectId } = useLanguage();
  const projects = getProjects(language);

  // Filter projects by matching the localized category string correctly across languages
  const filteredProjects = projects.filter(p => {
    if (filter === 'All') return true;
    
    // Mapping English filter keys to localized category values for robust comparison
    const categoryMap: Record<string, Record<string, string>> = {
      en: { Residential: 'Residential', Commercial: 'Commercial' },
      am: { Residential: 'Բնակելի', Commercial: 'Կոմերցիոն' }
    };
    
    return p.category === categoryMap[language][filter];
  });

  return (
    <section id="projects" className="py-24 md:py-32 bg-white font-body">
      <div className="max-w-[1440px] mx-auto px-6 md:px-12">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
          <div>
            <h2 className="text-sm md:text-base font-bold uppercase tracking-[0.2em] text-neutral-400 mb-4">{t('port.title')}</h2>
            <h3 className="text-5xl md:text-6xl lg:text-7xl font-bold font-display tracking-architectural leading-tight capitalize">
              {t('port.heading')}
            </h3>
          </div>
          
          <div className="flex gap-8">
            {(['All', 'Residential', 'Commercial'] as const).map((cat) => (
              <button 
                key={cat}
                onClick={() => setFilter(cat)}
                className={`text-sm md:text-base font-bold uppercase tracking-widest pb-1 transition-all ${
                  filter === cat ? 'text-black border-b-2 border-black' : 'text-neutral-400 border-b-2 border-transparent'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {filteredProjects.map((project) => (
            <div 
              key={project.id}
              onClick={() => {
                setSelectedProjectId(project.id);
                navigateTo('project-detail');
              }}
              className="group cursor-pointer"
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-neutral-100 mb-6">
                <img 
                  src={project.imageUrl} 
                  alt={project.title} 
                  className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-500" />
              </div>
              <h4 className="text-xl font-bold font-display tracking-tight mb-1">{project.title}</h4>
              <p className="text-sm md:text-base text-neutral-400 uppercase tracking-widest">{project.category}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Portfolio;
