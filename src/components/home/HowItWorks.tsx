import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../LanguageContext';

const HowItWorks: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const steps = [
    { n: '01', title: t('home.how.s1.title'), desc: t('home.how.s1.desc'), tools: t('home.how.s1.tools') },
    { n: '02', title: t('home.how.s2.title'), desc: t('home.how.s2.desc'), tools: t('home.how.s2.tools') },
    { n: '03', title: t('home.how.s3.title'), desc: t('home.how.s3.desc'), tools: t('home.how.s3.tools') },
    { n: '04', title: t('home.how.s4.title'), desc: t('home.how.s4.desc'), tools: t('home.how.s4.tools') },
  ];

  return (
    <section className="py-20 md:py-24 bg-white">
      <div className="max-w-[1280px] mx-auto px-6 md:px-14">
        <div className="text-center mb-14 md:mb-16">
          <div className="w-12 h-px bg-black/20 mx-auto mb-5" aria-hidden="true" />
          <span className="inline-block text-[13px] md:text-[15px] font-bold uppercase tracking-[0.26em] text-[#6B6B6B] mb-4">
            {t('home.how.eyebrow')}
          </span>
          <h2 className="font-display font-normal text-[#0A0A0A] leading-[1.1] tracking-[-0.01em] text-[36px] md:text-[48px] lg:text-[60px]">
            {t('home.how.headline')}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-9 md:gap-12">
          {steps.map((step) => (
            <div key={step.n} className="relative pt-11 border-t border-black/10">
              <span
                className="absolute -top-4 left-0 bg-white pr-3 font-display font-medium text-[28px] md:text-[30px] text-[#8E3F2D]"
              >
                {step.n}
              </span>
              <h3 className="font-display font-normal text-[26px] md:text-[28px] text-[#0A0A0A] mb-3.5">
                {step.title}
              </h3>
              <p className="text-[15px] md:text-base text-[#404040] leading-[1.6]">
                {step.desc}
              </p>
              <div className="mt-5 text-[12px] font-semibold uppercase tracking-[0.22em] text-[#6B6B6B]">
                {step.tools}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-14 md:mt-16 flex flex-col items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/deliverables')}
            className="inline-flex items-center gap-3 text-[14px] font-bold uppercase tracking-[0.22em] text-[#0047AB] hover:opacity-80 transition-opacity"
            aria-label={t('home.how.cta')}
          >
            {t('home.how.cta')}
          </button>
          <span className="text-[13px] text-[#6B6B6B] tracking-[0.04em]">
            {t('home.how.ctaSub')}
          </span>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
