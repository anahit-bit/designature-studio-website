import React from 'react';
import { useLanguage } from '../../LanguageContext';

const HomeHeroText: React.FC = () => {
  const { t } = useLanguage();
  return (
    <section className="bg-white pt-32 md:pt-40 pb-12 md:pb-14">
      <div className="max-w-[1280px] mx-auto px-6 md:px-14">
        <span className="block text-[13px] md:text-[15px] font-bold uppercase tracking-[0.26em] text-[#6B6B6B] mb-6">
          {t('home.hero.eyebrow')}
        </span>
        <h1 className="font-display font-normal text-[#0A0A0A] leading-[1.04] tracking-[-0.01em] text-[44px] sm:text-[60px] md:text-[72px] lg:text-[84px] mb-7 max-w-[880px]">
          {t('home.hero.headline.l1')}
          <br />
          {t('home.hero.headline.l2')}
        </h1>
        <p className="text-[17px] md:text-[19px] leading-[1.55] text-[#404040] max-w-[640px]">
          {t('home.hero.tagline')}
        </p>
      </div>
    </section>
  );
};

export default HomeHeroText;
