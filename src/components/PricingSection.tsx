import React, { useState } from 'react';
import { useLanguage } from '../LanguageContext';
import { setSigninSource } from '../lib/signinSource';
import { useConsultationCta, consultationBtnClass } from './ConsultationCTA';

const CHECK = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0 mt-0.5">
    <path d="M1.5 6l3 3 6-6" stroke="#0047AB" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);
const CHECK_W = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0 mt-0.5">
    <path d="M1.5 6l3 3 6-6" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);
const CROSS = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0 mt-0.5">
    <path d="M2 2l8 8M10 2l-8 8" stroke="rgba(0,0,0,0.4)" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const NotifyButton: React.FC<{ dark?: boolean; plan: string }> = ({ dark, plan }) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const { t } = useLanguage();

  const handleSubmit = async () => {
    if (!email || !email.includes('@')) return;
    try {
      await fetch('/api/pricing/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, plan }),
      });
    } catch { /* non-fatal */ }
    setSent(true);
    setTimeout(() => { setOpen(false); setSent(false); setEmail(''); }, 2000);
  };

  if (sent) return (
    <div className="w-full py-3.5 text-center text-[11px] font-bold uppercase tracking-[0.15em] text-[#15803d]">
      {t('pricing.notify.sent')}
    </div>
  );

  if (open) return (
    <div className="flex gap-2 mt-1">
      <input
        autoFocus
        type="email"
        placeholder="your@email.com"
        value={email}
        onChange={e => setEmail(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        className={`flex-1 px-3 py-2.5 text-[13px] border outline-none min-w-0 ${dark ? 'bg-white/10 border-white/20 text-white placeholder-white/55 focus:border-white/60' : 'bg-white border-black/25 text-black placeholder-black/55 focus:border-black/60'}`}
      />
      <button
        onClick={handleSubmit}
        className={`px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.15em] whitespace-nowrap ${dark ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-black text-white hover:bg-black/80'} transition-colors`}
      >
        {t('pricing.notify.btn')}
      </button>
    </div>
  );

  return (
    <button
      onClick={() => setOpen(true)}
      className={`w-full py-3.5 text-[11px] font-bold uppercase tracking-[0.2em] border transition-colors ${dark ? 'bg-transparent text-white/75 border-white/25 hover:border-white/45 hover:text-white' : 'bg-transparent text-black/75 border-black/25 hover:border-black/55 hover:text-black'}`}
    >
      {t('pricing.notify')}
    </button>
  );
};

const PricingSection: React.FC<{ compact?: boolean; hideHeader?: boolean }> = ({ compact, hideHeader }) => {
  const { navigateTo, t } = useLanguage();
  const bookConsultation = useConsultationCta('pricing');

  return (
    <section id="pricing" className={`${compact ? "pt-6 md:pt-8" : "pt-16 md:pt-24"} pb-16 md:pb-24 bg-white font-body`}>
      <div className="max-w-[1800px] mx-auto px-8 md:px-16">

        {!hideHeader && (
          <div className="flex flex-col items-center text-center mb-8">
            <h2 className="text-sm font-bold uppercase tracking-[0.5em] lg:tracking-[1em] text-black/65 mb-8">{t('pricing.eyebrow')}</h2>
            <h3 className="text-4xl md:text-5xl lg:text-7xl font-bold font-display tracking-architectural leading-[1] max-w-4xl mb-4">
              {t('pricing.title')}
            </h3>
            <p className="text-black/70 text-sm md:text-base font-light leading-relaxed whitespace-pre-line">
              {t('pricing.subtitle2')}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* FREE */}
          <div className="border border-black/8 p-8 flex flex-col">
            <div className="md:min-h-[420px]">
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] px-2 py-1 bg-black/5 text-black/70 w-fit mb-5 block">{t('pricing.free.badge')}</span>
              <div className="mb-4">
                <span className="text-[34px] font-bold tracking-tight leading-none text-black">$0</span>
                <span className="text-[13px] text-black/70 ml-1">{t('pricing.free.forever')}</span>
              </div>
              <div className="h-[22px] mb-3" />
              <div className="text-[15px] font-medium text-black mb-1.5">Explore</div>
              <div className="text-[13px] text-black/75 leading-relaxed mb-5 pb-5 border-b border-black/8">
                {t('pricing.free.desc')}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-black/65 mb-3 mt-2">{t('pricing.aiTools')}</div>
              <div className="flex flex-col gap-2.5">
                <div className="flex items-start gap-2"><CHECK /><span className="text-[13px] text-black/75 leading-relaxed"><strong className="text-black font-semibold">Style Quiz</strong> — {t('pricing.unlimited')}</span></div>
                <div className="flex items-start gap-2"><CHECK /><span className="text-[13px] text-black/75 leading-relaxed"><strong className="text-black font-semibold">AI Vision</strong> — {t('pricing.3concepts')}</span></div>
                <div className="flex items-start gap-2"><CHECK /><span className="text-[13px] text-black/75 leading-relaxed"><strong className="text-black font-semibold">Shopping List</strong> — {t('pricing.perConceptPDF')}</span></div>
                <div className="flex items-start gap-2"><CROSS /><span className="text-[13px] text-black/55 leading-relaxed">Room Audit · Design Brief · Cultural Advisor</span></div>
              </div>
            </div>
            <div className="pt-4 mt-auto border-t border-black/8">
              <p className="text-[12px] text-black/65 text-center mb-3 leading-snug">{t('pricing.free.note')}</p>
              <button onClick={() => { setSigninSource('pricing_cta'); navigateTo('ai-concepts'); }} className="w-full py-3.5 bg-[#0047AB] text-white text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-[#003d99] transition-colors">
                {t('pricing.free.ctaFull')}
              </button>
            </div>
          </div>

          {/* DESIGN */}
          <div className="bg-[#0a0a0a] p-8 flex flex-col">
            <div className="md:min-h-[420px]">
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] px-2 py-1 bg-[#9E5E41] text-white w-fit mb-5 block">{t('pricing.popular')}</span>
              <div className="mb-4">
                <span className="text-[34px] font-bold tracking-tight leading-none text-white">$19</span>
                <span className="text-[13px] text-white/70 ml-1">{t('pricing.month')}</span>
              </div>
              <div className="h-[22px] mb-3" />
              <div className="text-[15px] font-medium text-white mb-1.5">Design</div>
              <div className="text-[13px] text-white/75 leading-relaxed mb-5 pb-5 border-b border-white/15">
                {t('pricing.design.desc')}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/65 mb-3 mt-2">{t('pricing.aiTools')}</div>
              <div className="flex flex-col gap-2.5 mb-5">
                <div className="flex items-start gap-2"><CHECK_W /><span className="text-[13px] text-white/80 leading-relaxed">{t('pricing.everything.free')}</span></div>
                <div className="flex items-start gap-2"><CHECK_W /><span className="text-[13px] text-white/80 leading-relaxed"><strong className="text-white font-semibold">AI Vision</strong> — {t('pricing.30credits')}</span></div>
                <div className="flex items-start gap-2"><CHECK_W /><span className="text-[13px] text-white/80 leading-relaxed"><strong className="text-white font-semibold">Shopping Lists</strong> — {t('pricing.20month')} <span className="text-white/65">· {t('pricing.budgetFilter')}</span></span></div>
                <div className="flex items-start gap-2"><CHECK_W /><span className="text-[13px] text-white/80 leading-relaxed"><strong className="text-white font-semibold">Room Audit</strong> — {t('pricing.3month')}</span></div>
                <div className="flex items-start gap-2"><CHECK_W /><span className="text-[13px] text-white/80 leading-relaxed"><strong className="text-white font-semibold">Design Brief</strong> — {t('pricing.1month')}</span></div>
                <div className="flex items-start gap-2"><CHECK_W /><span className="text-[13px] text-white/80 leading-relaxed"><strong className="text-white font-semibold">{t('pricing.designerCheck')}</strong> <span className="text-white/65">— {t('pricing.designerCheck.soon')}</span></span></div>
              </div>
            </div>
            <div className="pt-4 mt-auto border-t border-white/15">
              <NotifyButton dark plan="Design $19" />
            </div>
          </div>

          {/* STUDIO */}
          <div className="border border-black/8 p-8 flex flex-col">
            <div className="md:min-h-[420px]">
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] px-2 py-1 bg-black/5 text-black/70 w-fit mb-5 block">Studio</span>
              <div className="mb-4">
                <span className="text-[34px] font-bold tracking-tight leading-none text-[#0047AB]">$49</span>
                <span className="text-[13px] text-black/70 ml-1">{t('pricing.month')}</span>
              </div>
              <div className="h-[22px] mb-3" />
              <div className="text-[15px] font-medium text-black mb-1.5">Studio</div>
              <div className="text-[13px] text-black/75 leading-relaxed mb-5 pb-5 border-b border-black/8">
                {t('pricing.studio.desc')}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-black/65 mb-3 mt-2">{t('pricing.aiTools')}</div>
              <div className="flex flex-col gap-2.5 mb-5">
                <div className="flex items-start gap-2"><CHECK /><span className="text-[13px] text-black/75 leading-relaxed">{t('pricing.everything.design')}</span></div>
                <div className="flex items-start gap-2"><CHECK /><span className="text-[13px] text-black/75 leading-relaxed"><strong className="text-black font-semibold">AI Vision</strong> — {t('pricing.300month')}</span></div>
                <div className="flex items-start gap-2"><CHECK /><span className="text-[13px] text-black/75 leading-relaxed"><strong className="text-black font-semibold">Shopping Lists</strong> — {t('pricing.300month')}</span></div>
                <div className="flex items-start gap-2"><CHECK /><span className="text-[13px] text-black/75 leading-relaxed"><strong className="text-black font-semibold">Room Audit</strong> — {t('pricing.300month')}</span></div>
                <div className="flex items-start gap-2"><CHECK /><span className="text-[13px] text-black/75 leading-relaxed"><strong className="text-black font-semibold">All 6 AI tools</strong> {t('pricing.inclCultural')}</span></div>
                <div className="flex items-start gap-2"><CHECK /><span className="text-[13px] text-black/75 leading-relaxed"><strong className="text-black font-semibold">{t('pricing.projectFolders')}</strong> — {t('pricing.saveConcepts')}</span></div>
                <div className="flex items-start gap-2"><CHECK /><span className="text-[13px] text-black/75 leading-relaxed"><strong className="text-black font-semibold">{t('pricing.designerCheck')}</strong> <span className="text-black/55">— {t('pricing.designerCheck.soon')}</span></span></div>
              </div>
            </div>
            <div className="pt-4 mt-auto border-t border-black/8">
              <NotifyButton plan="Studio $49" />
            </div>
          </div>

        </div>

        {/* Placement 1 (I-025 PR 2) — additive $99 consultation band BELOW the three
            tiers. NOT a 4th card; the tiers + their CTAs above stay untouched. Quieter
            (outlined, smaller) so it reads "and also", not "instead". */}
        <div className="mt-4 bg-[#FAFAFA] border border-black/8 px-6 py-6 md:px-10 md:py-7 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div>
            <p className="text-[14px] md:text-[15px] text-black/80 leading-snug">
              Want personalized guidance? <strong className="font-semibold text-black">Book a $99 consultation</strong>
            </p>
            <p className="text-[12px] text-black/55 leading-relaxed mt-1">
              45 minutes on Google Meet · fully creditable toward a design project.
            </p>
          </div>
          <button type="button" onClick={bookConsultation} className={`self-start md:self-auto ${consultationBtnClass}`}>
            Book a $99 consultation →
          </button>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
