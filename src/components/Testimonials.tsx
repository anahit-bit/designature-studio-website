
import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { testimonialsData } from '../testimonialsData';
import { useLanguage } from '../LanguageContext';
import { Testimonial } from '../types';

const Testimonials: React.FC = () => {
  const { language, t } = useLanguage();
  const [selectedTestimonials, setSelectedTestimonials] = useState<Testimonial[]>([]);

  useEffect(() => {
    const shuffled = [...testimonialsData].sort(() => 0.5 - Math.random());
    setSelectedTestimonials(shuffled.slice(0, 4));
  }, []);

  return (
    <section id="testimonials" className="py-16 md:py-24 bg-white font-body">
      <div className="max-w-[1800px] mx-auto px-8 md:px-16">
        <div className="flex flex-col items-center text-center mb-10 md:mb-12">
          <h2 className="text-sm md:text-base font-bold uppercase tracking-[1em] text-black/30 mb-8">
            {t('test.title')}
          </h2>
          <h3 className="text-4xl md:text-6xl lg:text-7xl font-bold font-display tracking-architectural leading-[1] max-w-4xl mb-10">
            {t('test.heading')}
          </h3>
          <p className="text-black/60 text-sm md:text-lg font-medium max-w-2xl leading-relaxed">
            {t('test.subtext')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {selectedTestimonials.map((item) => (
            <div 
              key={item.id}
              className="group relative bg-white p-6 lg:p-8 border border-neutral-100 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-[#0047AB] hover:-translate-y-1 hover:shadow-xl flex flex-col h-full"
            >
              <div className="flex gap-1 mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`w-3 h-3 transition-all duration-300 ${i < item.stars ? 'fill-[#0047AB] text-[#0047AB]' : 'text-neutral-100'}`} 
                  />
                ))}
              </div>

              <blockquote className="mb-8 flex-1">
                <p className={`text-lg lg:text-xl font-display font-medium text-black/90 leading-relaxed ${language === 'en' ? 'italic' : ''}`}>
                  "{language === 'en' ? item.text_en : item.text_am}"
                </p>
              </blockquote>

              <div className="flex flex-col items-start mt-auto">
                <span className="text-sm md:text-base font-bold font-body text-neutral-800 tracking-widest uppercase">
                  {item.name}
                </span>
                <span className="text-[10px] font-bold font-body uppercase tracking-[0.3em] text-neutral-400 mt-2">
                  {item.country}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 md:mt-24 text-center">
          <a 
            href="mailto:info@designature.studio" 
            className="text-sm md:text-base font-bold uppercase tracking-[0.4em] text-black/40 hover:text-[#0047AB] transition-colors duration-300 border-b border-transparent hover:border-[#0047AB] pb-1"
          >
            {language === 'en' ? 'Share your feedback with us' : 'Կիսվեք Ձեր կարծիքով մեզ հետ'}
          </a>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
