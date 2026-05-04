import React from 'react';
import { useLanguage } from '../../LanguageContext';

const CALENDLY_URL = 'https://calendly.com/designature-studio-us/free_consultation';

const ClosingBand: React.FC = () => {
  const { t, navigateTo } = useLanguage();

  return (
    <section className="py-24 md:py-28 bg-[#0B2240] text-white text-center">
      <div className="max-w-[1280px] mx-auto px-6 md:px-14">
        <div className="w-12 h-px bg-white/30 mx-auto mb-5" aria-hidden="true" />
        <span className="inline-block text-[13px] md:text-[15px] font-bold uppercase tracking-[0.26em] text-white/60 mb-5">
          {t('home.closing.eyebrow')}
        </span>
        <h2 className="font-display font-normal leading-[1.05] tracking-[-0.01em] text-[40px] md:text-[52px] lg:text-[64px] mb-6">
          {t('home.closing.headline')}
        </h2>
        <p className="text-[16px] md:text-[17px] leading-[1.6] text-white/75 max-w-[560px] mx-auto mb-12 md:mb-14">
          {t('home.closing.sub')}
        </p>

        <div className="flex flex-col md:flex-row gap-5 md:gap-6 justify-center items-center flex-wrap">
          <button
            type="button"
            onClick={() => navigateTo('ai-concepts')}
            className="inline-flex flex-col items-center justify-center gap-1.5 px-10 md:px-12 py-6 md:py-7 rounded-full bg-white text-[#0B2240] font-bold tracking-[0.25em] uppercase text-[13px] transition-transform hover:-translate-y-0.5 min-w-[280px] md:min-w-[300px]"
          >
            <span>{t('home.closing.ai.label')}</span>
            <span className="text-[12px] font-medium tracking-[0.18em] text-[#0B2240]/60">
              {t('home.closing.ai.sub')}
            </span>
          </button>

          <a
            href={CALENDLY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-col items-center justify-center gap-1.5 px-10 md:px-12 py-6 md:py-7 rounded-full bg-white text-[#0B2240] font-bold tracking-[0.25em] uppercase text-[13px] transition-transform hover:-translate-y-0.5 min-w-[280px] md:min-w-[300px] no-underline"
          >
            <span>{t('home.closing.book.label')}</span>
            <span className="text-[12px] font-medium tracking-[0.18em] text-[#0B2240]/60">
              {t('home.closing.book.sub')}
            </span>
          </a>
        </div>
      </div>
    </section>
  );
};

export default ClosingBand;
