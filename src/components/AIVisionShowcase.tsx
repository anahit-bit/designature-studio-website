import React, { useState } from 'react';
import { useLanguage } from '../LanguageContext';
import { cld } from '../lib/cld';
import BeforeAfter from './studio/BeforeAfter';
import Marquee from './studio/Marquee';
import ConversionBand from './studio/ConversionBand';
import SigninVeil from './studio/SigninVeil';
import FeedbackBand from './FeedbackBand';

interface Props {
  /** Triggers the real Google sign-in flow (account-only actions). */
  onRequestLogin: () => void;
  onOpenFeedback?: () => void;
}

// ── The four real before/after transformations (Cloudinary AI/ folder — the
//    same shipped pairs the live tool uses). Prose is i18n'd; only the image
//    ids + the style marquee live here. ──
const CLD = 'https://res.cloudinary.com/dys2k5muv/image/upload/';
type Pair = { key: string; before: string; after: string };
/** Exported so the imageQuality guard can cover the shipped before/after URLs. */
export const PAIRS: Pair[] = [
  { key: 'midcentury',   before: `${CLD}AI/before_2_k7jvg3_square`, after: `${CLD}AI/after_2_kzpr3p_square` },
  { key: 'minimalism',   before: `${CLD}AI/before_7_bwczrl_square`, after: `${CLD}AI/after_7_i66inr_square` },
  { key: 'bohemian',     before: `${CLD}AI/before_1_fnbjlt_square`, after: `${CLD}AI/after_1_khwg9g_square` },
  { key: 'contemporary', before: `${CLD}AI/before_4_vpepte_square`, after: `${CLD}AI/after_4_xgalms_square` },
];

/** Marquee styles (display strings — proper-noun style names, not translated).
 *  Exported so the logged-in VisionExperience renders the identical band. */
export const STYLES = ['Mid-Century', 'Scandinavian', 'Japandi', 'Modern', 'Minimalism', 'Art Deco',
  'Bohemian', 'Industrial', 'Coastal', 'Traditional', 'Contemporary', 'Rustic', 'Mediterranean', 'Maximalist'];

const sq = (url: string, w: number) => cld(url, w, { crop: 'fill', aspectRatio: '1/1' });

/**
 * AI Vision — LOGGED-OUT one-pager (locked logged-out pattern, Appendix A).
 * A single converging "wow": four real before/after transformations the guest
 * can drag + swap for FREE. Only account actions (reimagine my room · download ·
 * shop) open the sign-in veil — exploring the samples is never gated.
 * Shell-agnostic: renders its own studio-frame, no dependency on the hub.
 */
const AIVisionShowcase: React.FC<Props> = ({ onRequestLogin, onOpenFeedback }) => {
  const { t } = useLanguage();
  const [active, setActive] = useState(0);
  const [veilOpen, setVeilOpen] = useState(false);
  const [veilReason, setVeilReason] = useState('');

  const openSignin = (reasonKey: string) => {
    setVeilReason(t(reasonKey));
    setVeilOpen(true);
  };

  const p = PAIRS[active];
  const pk = (suffix: string) => t(`ai.vision.pair.${p.key}.${suffix}`);

  return (
    <div className="studio-frame bg-white w-full">

      {/* status bar — logged-out delta: quota replaced by a sign-in affordance */}
      <div className="statushdr">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-[#0047AB]" />
          <span className="text-[12px] font-bold uppercase tracking-[0.3em] text-black/60">{t('ai.vision.statusSample')}</span>
        </div>
        <button type="button" onClick={() => openSignin('ai.vision.reasonReimagine')}
          className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#0047AB] border-b border-[#0047AB]/40 pb-0.5 hover:border-[#0047AB] transition">
          {t('ai.vision.signIn')}
        </button>
      </div>

      {/* ── HERO — cinematic before/after of a room we already reimagined ── */}
      <div className="hero">
        <BeforeAfter
          beforeSrc={sq(PAIRS[0].before, 2000)}
          afterSrc={sq(PAIRS[0].after, 2000)}
          style={{ position: 'absolute', inset: 0 }}
        />
        <div className="hero-scrim" />
        <span className="badge-dark absolute top-6 left-6 text-[10px] font-bold uppercase tracking-[0.22em] px-3 py-1.5 z-10">{t('ai.vision.before')}</span>
        <span className="badge-cobalt absolute top-6 right-6 text-[10px] font-bold uppercase tracking-[0.22em] px-3 py-1.5 z-10">Mid-Century</span>

        {/* z-20 lifts the glass + CTAs ABOVE the BeforeAfter range layer (z-5);
            overlay stays pointer-events:none so exposed hero areas still drag. */}
        <div className="hero-overlay" style={{ zIndex: 20 }}>
          <div className="glass px-10 py-10 md:px-12 md:py-12 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.34em] text-white/70 mb-3">{t('ai.aiVision')}</p>
            <h1 className="hl text-[52px] md:text-[76px] leading-[0.92] mb-3">{t('ai.vision.heroTitle')}<br /><em>{t('ai.vision.heroTitleEm')}</em></h1>
            <span className="block w-16 h-[2px] rule-oxide mx-auto mb-5" />
            <p className="text-[14px] text-white/80 leading-relaxed max-w-[410px] mx-auto mb-8">
              {t('ai.vision.heroSub')} <span className="text-white font-semibold">{t('ai.vision.heroSubBold')}</span>
            </p>
            <button type="button"
              onClick={() => document.getElementById('av-explore')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="cta-primary text-[12px] font-bold uppercase tracking-[0.24em] px-11 py-4 transition">
              {t('ai.vision.exploreCta')}
            </button>
            <div className="flex items-center justify-center gap-5 mt-5">
              <button type="button" onClick={() => openSignin('ai.vision.reasonReimagine')}
                className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70 border-b border-white/30 pb-0.5 hover:text-white transition">
                {t('ai.vision.uploadYourRoom')}
              </button>
            </div>
          </div>
        </div>
        <span className="cap absolute bottom-6 left-1/2 -translate-x-1/2 text-[9px] font-bold uppercase tracking-[0.25em] px-4 py-2 z-10">{t('ai.vision.dragCompare')}</span>
      </div>

      {/* value strip (lives once, under the hero) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 border-b border-black/[0.08] text-center">
        <div className="px-8 py-7 border-r border-black/[0.08]"><p className="text-[11px] font-bold uppercase tracking-[0.28em] kicker mb-1.5">{t('ai.vision.v1k')}</p><p className="text-[14px] text-black/65 leading-relaxed">{t('ai.vision.v1b')}</p></div>
        <div className="px-8 py-7 border-r border-black/[0.08]"><p className="text-[11px] font-bold uppercase tracking-[0.28em] kicker mb-1.5">{t('ai.vision.v2k')}</p><p className="text-[14px] text-black/65 leading-relaxed">{t('ai.vision.v2b')}</p></div>
        <div className="px-8 py-7"><p className="text-[11px] font-bold uppercase tracking-[0.28em] kicker mb-1.5">{t('ai.vision.v3k')}</p><p className="text-[14px] text-black/65 leading-relaxed">{t('ai.vision.v3b')}</p></div>
      </div>

      {/* ── THE WOW — four real transformations (explorer) ── */}
      <section id="av-explore" className="px-6 md:px-10 py-12 scroll-mt-24">
        <div className="max-w-[1180px] mx-auto">
          <div className="text-center mb-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.32em] kicker mb-2">{t('ai.vision.exploreKicker')}</p>
            <h2 className="hl text-black text-[40px] md:text-[56px] leading-[0.95]">{t('ai.vision.exploreTitle')} <em>{t('ai.vision.exploreTitleEm')}</em></h2>
            <p className="text-[14px] text-black/60 leading-relaxed max-w-[540px] mx-auto mt-3">{t('ai.vision.exploreSub')}</p>
          </div>

          {/* transformation switcher (split before|after tiles) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 mb-9 max-w-[920px] mx-auto">
            {PAIRS.map((pair, i) => (
              <button key={pair.key} type="button" onClick={() => setActive(i)}
                className={`ctab block${i === active ? ' active' : ''}`} style={{ aspectRatio: '1/1' }}
                aria-label={t(`ai.vision.pair.${pair.key}.style`)}>
                <span className="absolute inset-0 grid grid-cols-2">
                  <img src={sq(pair.before, 480)} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                  <img src={sq(pair.after, 480)} alt="" className="w-full h-full object-cover" style={{ borderLeft: '1px solid rgba(255,255,255,.6)' }} loading="lazy" decoding="async" />
                </span>
                <span className="ctab-veil" />
                <span className="absolute bottom-0 left-0 right-0 px-3 py-2 text-left bg-gradient-to-t from-black/75 to-transparent">
                  <span className="block text-[9px] font-bold uppercase tracking-[0.2em] text-white/70">0{i + 1}</span>
                  <span className="block text-[13px] font-bold text-white leading-tight">{t(`ai.vision.pair.${pair.key}.style`)}</span>
                </span>
              </button>
            ))}
          </div>

          {/* active transformation */}
          <div className="grid lg:grid-cols-[1fr_0.92fr] gap-10 lg:gap-12 items-start">
            {/* LEFT: the before/after slider (sticky) */}
            <div className="lg:sticky lg:top-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] kicker">{pk('kicker')}</p>
                <span className="badge-cobalt text-[9px] font-bold uppercase tracking-[0.2em] px-3 py-1.5">{t('ai.vision.genTime')}</span>
              </div>
              <BeforeAfter
                key={p.key}
                beforeSrc={sq(p.before, 1200)}
                afterSrc={sq(p.after, 1200)}
                beforeLabel={t('ai.vision.before')}
                afterLabel={`${t('ai.vision.after')} · ${pk('style')}`}
                className="bg-[#0c0c0c] shadow-[0_24px_50px_rgba(0,0,0,0.18)]"
                style={{ aspectRatio: '1/1' }}
              />
              <p className="text-[11px] text-black/60 mt-3 leading-relaxed">{t('ai.vision.dragHint')}</p>
            </div>

            {/* RIGHT: what changed + gated actions */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] kicker mb-2">{pk('style')}</p>
              <h3 className="hl text-black text-[30px] md:text-[36px] leading-[1.05] mb-3">{pk('name')}</h3>
              <p className="text-[14px] text-black/70 leading-relaxed mb-6">{pk('desc')}</p>

              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-black/55 mb-3">{t('ai.vision.whatChanged')}</p>
              <ul className="flex flex-col gap-2.5 mb-7">
                {['c1', 'c2', 'c3'].map((c) => (
                  <li key={c} className="flex items-start gap-3 text-[13px] text-black/75 leading-relaxed">
                    <span className="mt-[7px] w-1.5 h-1.5 flex-shrink-0 rounded-full bg-[#0047AB]" />{pk(c)}
                  </li>
                ))}
              </ul>

              {/* account-only actions → sign-in gate (the conversion levers) */}
              <div className="border-t border-[#DAD2C3] pt-6 flex flex-col gap-3">
                <button type="button" onClick={() => openSignin('ai.vision.reasonReimagine')}
                  className="w-full cta-primary text-[13px] font-bold uppercase tracking-[0.22em] py-4 flex items-center justify-center gap-2 transition">
                  {t('ai.vision.reimagineMyRoom')}
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => openSignin('ai.vision.reasonDownload')}
                    className="border border-black/15 text-black/70 text-[11px] font-bold uppercase tracking-[0.14em] py-3.5 hover:border-black/45 hover:text-black transition">
                    {t('ai.vision.download')}
                  </button>
                  <button type="button" onClick={() => openSignin('ai.vision.reasonShop')}
                    className="border border-[#0047AB] text-[#0047AB] text-[11px] font-bold uppercase tracking-[0.14em] py-3.5 hover:bg-[#0047AB]/5 transition">
                    {t('ai.vision.shopThisRoom')}
                  </button>
                </div>
                <p className="text-[11px] text-black/60 text-center leading-relaxed mt-1">
                  {t('ai.vision.exploreFootnote')}{' '}
                  <button type="button" onClick={() => openSignin('ai.vision.reasonReimagine')} className="font-bold text-[#0047AB] hover:underline">{t('ai.vision.signIn')}</button>{' '}
                  {t('ai.vision.exploreFootnote2')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* styles marquee */}
      <Marquee label={t('ai.vision.anyStyle')} items={STYLES} />

      {/* CONVERSION BAND — the single clear endpoint */}
      <ConversionBand
        kicker={t('ai.vision.convKicker')}
        headline={<>{t('ai.vision.convHeadline')} <em>{t('ai.vision.convHeadlineEm')}</em></>}
        actions={
          <>
            <button type="button" onClick={() => openSignin('ai.vision.reasonReimagine')}
              className="bg-white text-black text-sm font-bold uppercase tracking-[0.24em] px-8 py-4 hover:bg-white/90 transition">
              {t('ai.vision.signInToStart')}
            </button>
            <button type="button" onClick={() => onOpenFeedback?.()}
              className="border border-white/30 text-white text-sm font-bold uppercase tracking-[0.24em] px-8 py-4 hover:bg-white/10 transition">
              {t('ai.bookConversation')}
            </button>
          </>
        }
      />

      <FeedbackBand onOpenFeedback={() => onOpenFeedback?.()} />

      {/* sign-in veil — opened only by account actions */}
      <SigninVeil
        open={veilOpen}
        onClose={() => setVeilOpen(false)}
        onSignIn={() => { setVeilOpen(false); onRequestLogin(); }}
        kicker={t('ai.vision.veilKicker')}
        title={<>{t('ai.vision.veilTitle')} <em className="italic">{t('ai.vision.veilTitleEm')}</em></>}
        lead={<>{t('ai.vision.veilLead')} <span className="font-semibold text-black">{veilReason || t('ai.vision.reasonReimagine')}</span>.</>}
        note={t('ai.vision.veilNote')}
        googleLabel={t('ai.vision.veilGoogle')}
        fineprint={t('ai.vision.veilFineprint')}
        dismissLabel={t('ai.vision.veilDismiss')}
      />
    </div>
  );
};

export default AIVisionShowcase;
