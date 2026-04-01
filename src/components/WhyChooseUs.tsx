import React from 'react';
import { useLanguage } from '../LanguageContext';

const WhyChooseUs: React.FC = () => {
  const { t, language, navigateTo } = useLanguage();

  const pillars = [
    {
      id: 'engineering',
      titleKey: 'why.p1.title',
      descKey: 'why.p1.desc',
      icon: (
        <svg width="20" height="20" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 2L3 6v5c0 4.5 3.5 8.5 8 9.5 4.5-1 8-5 8-9.5V6L11 2z"/>
          <path d="M7 11l3 3 5-5"/>
        </svg>
      ),
    },
    {
      id: 'global',
      titleKey: 'why.p2.title',
      descKey: 'why.p2.desc',
      icon: (
        <svg width="20" height="20" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <path d="M11 3c0 0-4 3-4 8s4 8 4 8M11 3c0 0 4 3 4 8s-4 8-4 8M3 11h16"/>
        </svg>
      ),
    },
    {
      id: 'process',
      titleKey: 'why.p3.title',
      descKey: 'why.p3.desc',
      icon: (
        <svg width="20" height="20" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 2v4M11 16v4M2 11h4M16 11h4"/>
          <circle cx="11" cy="11" r="4"/>
          <path d="M4.9 4.9l2.8 2.8M14.3 14.3l2.8 2.8M4.9 17.1l2.8-2.8M14.3 7.7l2.8-2.8"/>
        </svg>
      ),
    },
    {
      id: 'remote',
      titleKey: 'why.p4.title',
      descKey: 'why.p4.desc',
      icon: (
        <svg width="20" height="20" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4" width="18" height="13" rx="1"/>
          <path d="M6 20h10M11 17v3"/>
          <path d="M6 9l3 3 7-5"/>
        </svg>
      ),
    },
  ];

  return (
    <section id="why-choose-us" className="pt-16 md:pt-24 pb-16 md:pb-24 bg-white font-body">
      <div className="max-w-[1800px] mx-auto px-8 md:px-16">

        {/* Header */}
        <div className="flex flex-col items-center text-center mb-8 md:mb-10">
          <h2 className="text-sm md:text-base font-bold uppercase tracking-[1em] text-black/30 mb-8">
            {t('why.title')}
          </h2>
          <h3 className="text-4xl md:text-6xl lg:text-7xl font-bold font-display tracking-architectural leading-[1] max-w-5xl mb-10">
            {t('why.heading')}
          </h3>
          <p className="text-black/60 text-sm md:text-lg font-medium max-w-3xl leading-relaxed">
            {t('why.desc')}
          </p>
        </div>

        {/* Option B — pillars list left, AI statement right */}
        <div className="grid grid-cols-1 lg:grid-cols-2 border border-black/8">

          {/* Left — pillar list */}
          <div className="divide-y divide-black/8 border-r border-black/8">
            {pillars.map((pillar) => (
              <div key={pillar.id} className="flex items-start gap-5 px-8 py-7 hover:bg-neutral-50 transition-colors duration-200 group">
                <div className="flex-shrink-0 mt-0.5 text-black group-hover:text-[#0047AB] transition-colors duration-200">
                  {pillar.icon}
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-black group-hover:text-[#0047AB] transition-colors duration-200 mb-1.5">
                    {t(pillar.titleKey)}
                  </div>
                  <div className="text-[11px] text-black/50 leading-relaxed">
                    {t(pillar.descKey)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Right — AI differentiator panel */}
          <div className="bg-[#0a0a0a] px-10 py-12 flex flex-col justify-center gap-6">
            <div className="text-[8px] font-bold uppercase tracking-[0.3em] text-[#0047AB]">
              {language === 'en' ? 'The human edge' : ''}
            </div>
            <h4 className="font-display text-4xl md:text-5xl font-bold text-white leading-[0.92] tracking-tight uppercase">
              AI helps you<br />explore.<br /><span className="italic font-light text-white/40">We make it</span><br /><span className="italic font-light text-white/40">extraordinary.</span>
            </h4>
            <p className="text-[11px] text-white/40 leading-[1.9] max-w-sm">
              {language === 'en'
                ? <>Our tools let you visualise and discover — but the <span className="text-white/75 font-medium">design decisions that make a space uniquely yours</span> come from a trained eye, years of engineering knowledge, and genuine creative instinct. That&apos;s the part AI can&apos;t replicate.</>
                : 'Our AI tools help you explore. The design vision is ours.'}
            </p>
            <button
              onClick={() => window.open('https://calendly.com/designature-studio-us/free_consultation', '_blank')}
              className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#0047AB] hover:text-white transition-colors duration-200 text-left w-fit mt-2"
            >
              {language === 'en' ? 'Book a consultation →' : 'Book a consultation →'}
            </button>
          </div>

        </div>
      </div>
    </section>
  );
};

export default WhyChooseUs;
