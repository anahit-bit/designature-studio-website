import React from 'react';
import { useLanguage } from '../../LanguageContext';
import { trackCalendly } from '../../lib/track';
import { useStartProjectCta } from '../ConsultationCTA';

const CALENDLY_URL = 'https://calendly.com/hello-designature/quick-conversation';

const ClosingBand: React.FC = () => {
  const { t } = useLanguage();
  const startProject = useStartProjectCta('home_closing');

  return (
    <section className="py-24 md:py-28 bg-[#0B2240] text-white text-center">
      <div className="max-w-[1280px] mx-auto px-6 md:px-14">
        <div className="w-12 h-px bg-[#9E5E41] mx-auto mb-5" aria-hidden="true" />
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
          {/* Primary — Start a project (→ /studio#contact form). White pill = inverse of the
              navy Start-a-project token, since this section is navy. */}
          <button
            type="button"
            onClick={startProject}
            className="inline-flex flex-col items-center justify-center gap-1.5 px-10 md:px-12 py-6 md:py-7 rounded-none bg-white text-[#0B2240] font-bold tracking-[0.25em] uppercase text-[13px] transition-transform hover:-translate-y-0.5 min-w-[280px] md:min-w-[300px]"
          >
            <span>Start a project →</span>
            <span className="text-[12px] font-medium tracking-[0.18em] text-[#0B2240]/60">
              Work with the studio
            </span>
          </button>

          {/* Secondary — free intro chat. White-outline ghost = quieter than the primary. */}
          <a
            href={CALENDLY_URL}
            onClick={(e) => { e.preventDefault(); trackCalendly(CALENDLY_URL, 'home_closing'); }}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-col items-center justify-center gap-1.5 px-10 md:px-12 py-6 md:py-7 rounded-none bg-transparent border border-white/40 text-white font-bold tracking-[0.25em] uppercase text-[13px] transition-colors hover:border-white min-w-[280px] md:min-w-[300px] no-underline"
          >
            <span>Let's talk →</span>
            <span className="text-[12px] font-medium tracking-[0.18em] text-white/55">
              A free intro call
            </span>
          </a>
        </div>
      </div>
    </section>
  );
};

export default ClosingBand;
