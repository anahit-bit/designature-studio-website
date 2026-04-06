import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

const CTABanner: React.FC = () => {
  const { t, language } = useLanguage();

  return (
    <section className="bg-black text-white font-body border-t border-white/6">
      <div className="max-w-[1800px] mx-auto px-8 md:px-16 py-14 md:py-16 flex flex-col md:flex-row items-center justify-between gap-8">

        {/* Left — message */}
        <div className="flex flex-col gap-3 md:max-w-2xl">
          <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-white/25">
            {language === 'en' ? 'Free — no commitment needed' : 'Free — no commitment needed'}
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold font-display tracking-tight leading-[0.95] text-white">
            {t('cta.banner.title')}
          </h2>
          <p className="text-white/40 text-sm md:text-base font-light leading-relaxed mt-1">
            {t('cta.banner.subtext')}
          </p>
        </div>

        {/* Right — CTA */}
        <a
          href="https://calendly.com/designature-studio-us/free_consultation"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex-shrink-0 inline-flex items-center gap-4 bg-white text-black px-10 py-5 text-[10px] font-bold uppercase tracking-[0.4em] hover:bg-[#0047AB] hover:text-white transition-all duration-300"
        >
          {t('cta.banner.btn')}
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </a>

      </div>
    </section>
  );
};

export default CTABanner;
