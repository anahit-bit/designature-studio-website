
import React, { useState, useEffect } from 'react';
import { Instagram, Facebook, ChevronRight } from 'lucide-react';
import { getHeroSlides } from '../constants';
import { useLanguage } from '../LanguageContext';


const Hero: React.FC = () => {
  const [current, setCurrent] = useState(0);
  const { language, t, navigateTo } = useLanguage();
  const slides = getHeroSlides(language);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <section className="relative w-full h-screen min-h-screen overflow-hidden bg-black font-body">
      {/* Background Slides with high-priority inline styling and cross-fade */}
      {slides.map((slide, index) => (
        <div 
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-[2000ms] ease-[cubic-bezier(0.23,1,0.32,1)] ${
            index === current ? 'opacity-100 z-10' : 'opacity-0 z-0'
          }`}
          style={{
            backgroundImage: `url(${slide.imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            height: '100vh',
            width: '100%'
          }}
        >
          {/* Subtle dark overlay to ensure text legibility over high-end renders - Increased to 30% */}
          <div className="absolute inset-0 bg-black/30 z-[11] pointer-events-none" />
        </div>
      ))}

      {/* Hero Content - Elevated Layer */}
      <div className="relative z-20 h-full max-w-[1800px] mx-auto px-8 md:px-16 flex flex-col justify-end pb-32 pointer-events-none">
        <div className="max-w-4xl pointer-events-auto">
          <div className="overflow-hidden mb-4">
            <p className="text-white/60 text-sm md:text-base font-bold tracking-[0.5em] uppercase slide-in-from-bottom">
              {t('hero.studio2021')}
            </p>
          </div>
          <h1 className={`font-bold font-display text-white tracking-architectural leading-[0.85] mb-12 ${language === 'am' ? 'text-3xl md:text-5xl lg:text-[5.5vw]' : 'text-4xl md:text-6xl lg:text-[8vw]'}`}>
            {slides[current].title.split(' ').map((word, i) => (
              <span key={i} className="inline-block mr-[0.2em] fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                {word}
              </span>
            ))}
          </h1>
          
          <div className="flex flex-col md:flex-row md:items-center gap-12">
            <p className="text-base md:text-xl font-light text-white/70 max-w-xl leading-relaxed fade-in" style={{ animationDelay: '500ms' }}>
              {slides[current].subtitle}
            </p>
            <button
              onClick={() => navigateTo('portfolio')}
              className="group flex items-center gap-6 text-white text-sm md:text-base font-bold uppercase tracking-[0.4em] fade-in"
              style={{ animationDelay: '700ms' }}
            >
              <span className="border-b border-white pb-1 group-hover:text-white/50 group-hover:border-white/50 transition-all">{t('btn.explore')}</span>
              <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all">
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Social Media Sidebar Overlay */}
      <div className="absolute right-6 md:right-10 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-10 text-white/60">
        <a href="https://www.instagram.com/designature_interior/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-all duration-300 transform hover:scale-110"><Instagram className="w-5 h-5" /></a>
        <a href="https://www.facebook.com/Designature.Design.Studio" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-all duration-300 transform hover:scale-110"><Facebook className="w-5 h-5" /></a>
      </div>

      {/* Slide Navigation Dots */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-30 flex gap-3">
        {slides.map((_, index) => (
          <button 
            key={index}
            onClick={() => setCurrent(index)}
            className={`h-2 rounded-full transition-all duration-500 ${
              index === current ? 'bg-white w-8' : 'bg-white/20 w-2 hover:bg-white/50'
            }`}
          />
        ))}
      </div>
    </section>
  );
};

export default Hero;
