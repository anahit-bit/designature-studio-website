import React from 'react';
import { useLanguage } from '../../LanguageContext';

const Voices: React.FC = () => {
  const { t } = useLanguage();

  const quotes = [
    { body: t('home.voices.q1'), source: t('home.voices.q1source') },
    { body: t('home.voices.q2'), source: t('home.voices.q2source') },
    { body: t('home.voices.q3'), source: t('home.voices.q3source') },
  ];

  return (
    <section className="py-20 md:py-24 bg-white">
      <div className="max-w-[1280px] mx-auto px-6 md:px-14">
        <div className="text-center mb-14 md:mb-16">
          <div className="w-12 h-px bg-black/20 mx-auto mb-5" aria-hidden="true" />
          <span className="inline-block text-[13px] md:text-[15px] font-bold uppercase tracking-[0.26em] text-[#6B6B6B] mb-4">
            {t('home.voices.eyebrow')}
          </span>
          <h2 className="font-display font-normal text-[#0A0A0A] leading-[1.1] tracking-[-0.01em] text-[36px] md:text-[48px] lg:text-[60px]">
            {t('home.voices.headline')}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
          {quotes.map((q, idx) => (
            <figure
              key={idx}
              className="p-8 md:p-10 bg-white border border-black/10"
            >
              <blockquote className="font-display font-normal text-[#0A0A0A] text-[20px] md:text-[24px] leading-[1.4] mb-6">
                {q.body}
              </blockquote>
              <figcaption className="text-[12px] font-semibold tracking-[0.22em] uppercase text-[#6B6B6B]">
                {q.source}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Voices;
