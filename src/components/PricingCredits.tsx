import React, { useState } from 'react';
import { useLanguage } from '../LanguageContext';
import { setSigninSource } from '../lib/signinSource';
import { useConsultationCta, consultationBtnClass } from './ConsultationCTA';
import { EXPLORER_TOOLS, PHASES } from './studio/explorerRoster';
import {
  CREDIT_PRICES,
  CREDIT_PLANS,
  CREDITS_PER_SPACE,
  creditsFor,
  planById,
  type PlanId,
} from '../data/creditPricing';

/**
 * S-031 — /pricing on the credit model.
 *
 * Replaces the Free / Design $19 / Studio $49 feature-gated tiers. Every number here is
 * derived from `creditPricing.ts`, which is the same source the cost-floor test guards —
 * so the page cannot drift from the model the way hand-typed tier tables do.
 *
 * Two copy rules from the `Tier Matrix` sheet are binding on this file:
 *   R4 — say what people TYPICALLY do, never what they are ALLOWED to do. No "up to N
 *        rooms": nothing counts rooms, credits are the only limit.
 *   R5 — "that's about N redesigns", never "N redesigns included". The moment it reads as
 *        a promise it becomes a per-tool allowance, and we are maintaining 76 numbers.
 */

const CHECK: React.FC<{ light?: boolean }> = ({ light }) => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0 mt-1">
    <path d="M1.5 6l3 3 6-6" stroke={light ? 'rgba(255,255,255,.5)' : '#0047AB'} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const nf = (n: number) => n.toLocaleString('en-US');

/** The four tools whose credit price people should be able to hold in their head. */
const ANCHORS = ['redesign', 'shop', 'palette', 'plan-room'] as const;
const ANCHOR_BLURB: Record<string, string> = {
  redesign: 'One photoreal render of your space',
  shop: 'One buyable product list + PDF',
  palette: 'One coordinated colour scheme',
  'plan-room': 'One to-scale furniture layout',
};

/** "That's about" — R5 wording. Guidance, never an allowance. */
const AboutBox: React.FC<{ credits: number; dark?: boolean; monthly?: boolean; foot: string }> = ({
  credits, dark, monthly, foot,
}) => {
  const per = monthly ? ' / mo' : '';
  const rows: [string, string][] = [
    ['Room redesigns', nf(Math.floor(credits / creditsFor('redesign'))) + per],
    ['Shopping lists', nf(Math.floor(credits / creditsFor('shop'))) + per],
    ['Spaces, end to end', nf(Math.floor(credits / CREDITS_PER_SPACE)) + per],
  ];
  return (
    <div className={`border p-4 my-4 ${dark ? 'border-white/20 bg-white/[0.06]' : 'border-black/10 bg-[#FAFAFA]'}`}>
      <span className={`block text-[9.5px] font-bold uppercase tracking-[0.18em] mb-2.5 ${dark ? 'text-[#C97A60]' : 'text-[#9E5E41]'}`}>
        That&rsquo;s about
      </span>
      <ul className="flex flex-col gap-1.5">
        {rows.map(([label, value]) => (
          <li key={label} className={`flex justify-between items-baseline gap-3 text-[13px] ${dark ? 'text-white/80' : 'text-black/75'}`}>
            <span>{label}</span>
            <strong className={`font-bold tabular-nums whitespace-nowrap ${dark ? 'text-white' : 'text-black'}`}>{value}</strong>
          </li>
        ))}
      </ul>
      <p className={`text-[11.5px] leading-snug mt-2.5 pt-2.5 border-t ${dark ? 'text-white/60 border-white/15' : 'text-black/55 border-black/10'}`}>
        {foot}
      </p>
    </div>
  );
};

const PricingCredits: React.FC<{ compact?: boolean; hideHeader?: boolean }> = ({ compact, hideHeader }) => {
  const { navigateTo, t } = useLanguage();
  const bookConsultation = useConsultationCta('pricing');

  /** Which rung of the one-time card is open. Only one panel shows at a time. */
  const [rung, setRung] = useState<PlanId>('project');

  const free = planById('free')!;
  const monthly = planById('monthly')!;
  const rungs = CREDIT_PLANS.filter((p) => p.card === 'One-time payment');
  const active = planById(rung)!;

  const startFree = () => {
    setSigninSource('pricing');
    navigateTo('ai-concepts');
  };

  return (
    <section id="pricing" className={`${compact ? 'pt-6 md:pt-8' : 'pt-16 md:pt-24'} pb-16 md:pb-24 bg-white font-body`}>
      <div className="max-w-[1800px] mx-auto px-8 md:px-16">

        {!hideHeader && (
          <div className="flex flex-col items-center text-center mb-8">
            <h2 className="text-sm font-bold uppercase tracking-[0.5em] lg:tracking-[1em] text-black/65 mb-8">{t('pricing.eyebrow')}</h2>
            <h3 className="text-4xl md:text-5xl lg:text-7xl font-bold font-display tracking-architectural leading-[1] max-w-4xl mb-4">
              {t('pricing.title')}
            </h3>
          </div>
        )}

        {/* ── How credits work — the anchor lives here, before any plan ────────── */}
        <div className="border border-black/10 p-6 md:p-10 mb-4 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-6 lg:gap-12 items-center">
          <div>
            <h4 className="font-display font-bold uppercase text-2xl md:text-4xl leading-none mb-3.5">How credits work</h4>
            <p className="text-[14.5px] leading-relaxed text-black/75">
              Every tool has a price in credits. You buy credits, then spend them on whatever you actually need &mdash;
              ten attempts at one difficult kitchen, or one pass at every room in the house.
            </p>
            <p className="text-[14.5px] leading-relaxed text-black/75 mt-2.5">
              We don&rsquo;t decide that for you. There&rsquo;s no &ldquo;3 renders and 2 shopping lists&rdquo; &mdash; if you want
              thirty renders and no shopping lists, that&rsquo;s your call.
            </p>
            <a href="#tool-credits" className="inline-block mt-3.5 text-[12.5px] font-semibold text-[#0047AB] border-b border-[#0047AB]/30 no-underline">
              See what every tool costs &darr;
            </a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
            {ANCHORS.map((id) => {
              const tool = EXPLORER_TOOLS.find((x) => x.id === id);
              return (
                <div key={id} className="border border-black/10 bg-[#FAFAFA] p-4">
                  <span className="block text-[30px] font-bold tabular-nums leading-none text-[#8E3F2D]">
                    {creditsFor(id)}
                    <em className="not-italic text-[12px] font-semibold tracking-[0.14em] uppercase text-black/55 ml-1.5">credits</em>
                  </span>
                  <strong className="block text-[13.5px] font-semibold mt-1">{tool?.name ?? id}</strong>
                  <small className="block text-[11.5px] leading-snug text-black/55">{ANCHOR_BLURB[id]}</small>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── The three cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)_minmax(0,1fr)] gap-4 items-stretch">

          {/* FREE */}
          <div className="border border-black/8 p-8 flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] px-2 py-1 bg-black/5 text-black/70 w-fit mb-5">No card needed</span>
            <h4 className="font-display font-bold uppercase text-2xl md:text-3xl leading-none mb-2.5">Free</h4>
            <p className="text-[13.5px] leading-relaxed text-black/75 pb-4 mb-4 border-b border-black/8">
              Try every tool on your own room before paying anything. No card, no expiry.
            </p>
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-[44px] font-bold leading-none tabular-nums">{free.credits}</span>
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-black/55 leading-tight">credits<br />once</span>
              <span className="ml-auto text-[22px] font-bold tabular-nums">$0<em className="not-italic text-[12px] font-normal text-black/55"> forever</em></span>
            </div>
            <AboutBox credits={free.credits} foot="Find My Style is free and unlimited on every plan — it never costs credits." />
            <ul className="flex flex-col gap-2 flex-1">
              {['Every tool unlocked — nothing hidden', 'Watermarked exports', 'Personal use'].map((f) => (
                <li key={f} className="flex gap-2 text-[13px] leading-snug text-black/75"><CHECK />{f}</li>
              ))}
            </ul>
            <div className="pt-4 mt-5 border-t border-black/8">
              <p className="text-[12px] text-black/55 text-center mb-3 leading-snug">{free.credits} credits, once. Not per month.</p>
              <button type="button" onClick={startFree}
                className="block w-full text-center bg-[#0047AB] text-white text-[11px] font-bold uppercase tracking-[0.2em] py-3.5">
                Start free &mdash; no card needed
              </button>
            </div>
          </div>

          {/* ONE-TIME PAYMENT — rungs with an inline panel under the selected one */}
          <div className="bg-[#0a0a0a] text-white border border-[#0a0a0a] p-8 flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] px-2 py-1 bg-[#9E5E41] text-white w-fit mb-5">Most popular</span>
            <h4 className="font-display font-bold uppercase text-2xl md:text-3xl leading-none mb-2.5">One-time payment</h4>
            <p className="text-[13.5px] leading-relaxed text-white/78 pb-4 mb-4 border-b border-white/15">
              For a single project &mdash; your place, a family member&rsquo;s, a flat you&rsquo;re renovating. Buy credits once,
              use them at your own pace, no recurring bill. Credits never expire, so you move at the pace the builders move.
            </p>

            <div className="flex flex-col gap-2" role="group" aria-label="Choose a pack size">
              {rungs.map((p) => {
                const on = p.id === rung;
                return (
                  <div key={p.id} className="flex flex-col min-w-0">
                    <button
                      type="button"
                      onClick={() => setRung(p.id)}
                      aria-pressed={on}
                      aria-expanded={on}
                      aria-controls={`about-${p.id}`}
                      className={`text-left grid grid-cols-[16px_minmax(0,1fr)_auto] gap-3 items-center border p-4 transition-colors ${
                        on ? 'bg-white text-black border-white' : 'border-white/20 text-white hover:border-white/50'
                      }`}
                    >
                      <span aria-hidden className={`w-3.5 h-3.5 rounded-full border-[1.5px] relative ${on ? 'border-[#9E5E41]' : 'border-white/50'}`}>
                        {on && <span className="absolute inset-[3px] rounded-full bg-[#9E5E41]" />}
                      </span>
                      <span>
                        <strong className="block text-[14px] font-semibold">{p.rung}</strong>
                        <small className={`block text-[11.5px] tabular-nums mt-0.5 ${on ? 'text-black/55' : 'text-white/60'}`}>
                          {nf(p.credits)} credits
                        </small>
                      </span>
                      <span className="text-[19px] font-bold tabular-nums whitespace-nowrap">${p.priceUsd}</span>
                    </button>
                    {on && (
                      <div id={`about-${p.id}`} className="-mt-px">
                        <AboutBox
                          credits={p.credits}
                          dark
                          foot={`Or any mix you like — one space taken start to finish runs roughly ${CREDITS_PER_SPACE} credits.`}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <ul className="flex flex-col gap-2 flex-1 mt-4">
              {[
                <><strong className="text-white font-semibold">Credits never expire</strong> — use them over two years if the job takes that long</>,
                <>Move up any time — pay only the difference</>,
                <>Clean exports, no watermark</>,
                <>Project folder + one bound PDF</>,
              ].map((f, i) => (
                <li key={i} className="flex gap-2 text-[13px] leading-snug text-white/80"><CHECK light />{f}</li>
              ))}
            </ul>

            <div className="pt-4 mt-5 border-t border-white/15">
              <p className="text-[12px] text-white/60 text-center mb-3 leading-snug">Fully creditable toward a design project with the studio</p>
              <button type="button"
                className="block w-full text-center bg-white text-black text-[11.5px] font-bold uppercase tracking-[0.2em] py-4">
                Get {nf(active.credits)} credits &mdash; ${active.priceUsd}
              </button>
            </div>
          </div>

          {/* MONTHLY SUBSCRIPTION */}
          <div className="border border-black/8 p-8 flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] px-2 py-1 bg-black/5 text-black/70 w-fit mb-5">For professionals</span>
            <h4 className="font-display font-bold uppercase text-2xl md:text-3xl leading-none mb-2.5">Monthly subscription</h4>
            <p className="text-[13.5px] leading-relaxed text-black/75 pb-4 mb-4 border-b border-black/8">
              For continuous work &mdash; staging, short-lets, client projects, rentals. Credits refill every month,
              because the work never finishes.
            </p>
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-[44px] font-bold leading-none tabular-nums">{nf(monthly.credits)}</span>
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-black/55 leading-tight">credits<br />a month</span>
              <span className="ml-auto text-[22px] font-bold tabular-nums text-[#0047AB]">
                ${monthly.priceUsd}<em className="not-italic text-[12px] font-normal text-black/55"> / mo</em>
              </span>
            </div>
            <AboutBox credits={monthly.credits} monthly foot="Credits refill on your billing date. They don't roll over." />
            <ul className="flex flex-col gap-2 flex-1">
              {[
                <><strong className="text-black font-semibold">Commercial licence</strong> — client work, listings, rentals</>,
                <><strong className="text-black font-semibold">White-label PDF</strong> — your name on it, not ours</>,
                <>Invoice in your business name</>,
                <>Unlimited project folders</>,
              ].map((f, i) => (
                <li key={i} className="flex gap-2 text-[13px] leading-snug text-black/75"><CHECK />{f}</li>
              ))}
            </ul>
            <div className="pt-4 mt-5 border-t border-black/8">
              <p className="text-[12px] text-black/55 text-center mb-3 leading-snug">
                ${monthly.annualPriceUsd} / year &mdash; two months free
              </p>
              <button type="button"
                className="block w-full text-center bg-[#0047AB] text-white text-[11px] font-bold uppercase tracking-[0.2em] py-3.5">
                Get {nf(monthly.credits)} credits a month &mdash; ${monthly.priceUsd}
              </button>
            </div>
          </div>
        </div>

        {/* $99 consultation band — unchanged from the live page (I-025 PR 2) */}
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

        {/* ── Every tool, every plan ──────────────────────────────────────────── */}
        <div id="tool-credits" className="mt-16 scroll-mt-28">
          <div className="flex flex-col items-center text-center mb-8">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/55 mb-3">Nothing hidden</span>
            <h3 className="text-3xl md:text-5xl font-bold font-display uppercase tracking-architectural leading-none">
              What every tool costs
            </h3>
            <p className="text-black/70 text-sm md:text-base font-light leading-relaxed max-w-2xl mt-3">
              The credit price of each tool, and how many you&rsquo;d get spending a whole plan on that one thing.
              Nobody spends this way &mdash; it&rsquo;s here so you can see exactly what you&rsquo;re buying.
            </p>
          </div>

          <div className="overflow-x-auto border border-black/10">
            <table className="w-full border-collapse min-w-[780px]">
              <thead>
                <tr>
                  <th className="text-left text-[10px] font-bold uppercase tracking-[0.13em] text-black/55 bg-[#FAFAFA] px-4 py-3 border-b border-black/10">Tool</th>
                  <th className="text-right text-[10px] font-bold uppercase tracking-[0.13em] text-black/55 bg-[#FAFAFA] px-4 py-3 border-b border-black/10">Costs</th>
                  {CREDIT_PLANS.map((p) => (
                    <th key={p.id}
                      className={`text-right text-[10px] font-bold uppercase tracking-[0.13em] px-4 py-3 border-b border-black/10 whitespace-nowrap ${
                        p.id === rung ? 'bg-black text-white' : 'bg-[#FAFAFA] text-black/55'
                      }`}>
                      {p.rung ?? p.card}
                      <span className="block font-normal normal-case tracking-normal">{nf(p.credits)} cr</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PHASES.map((phase, pi) => {
                  const tools = EXPLORER_TOOLS.filter((x) => x.phase === pi);
                  if (!tools.length) return null;
                  return (
                    <React.Fragment key={phase.name}>
                      <tr>
                        <th colSpan={2 + CREDIT_PLANS.length}
                          className="text-left text-[10px] font-bold uppercase tracking-[0.18em] text-black/55 bg-[#FAFAFA] px-4 py-2 border-b border-black/10">
                          {phase.name}
                        </th>
                      </tr>
                      {tools.map((tool) => {
                        const cr = creditsFor(tool.id);
                        return (
                          <tr key={tool.id}>
                            <th scope="row" className="text-left font-medium text-[13.5px] px-4 py-2.5 border-b border-black/10">
                              {tool.name}
                              <span className={`inline-block text-[9px] font-bold uppercase tracking-[0.1em] px-1.5 border ml-2 align-[1px] ${
                                tool.status === 'live' ? 'border-[#15803d]/35 text-[#15803d]' : 'border-black/10 text-black/55'
                              }`}>
                                {tool.status === 'live' ? 'Live' : 'Soon'}
                              </span>
                            </th>
                            <td className="text-right tabular-nums font-bold text-[15px] px-4 py-2.5 border-b border-black/10">
                              {cr === 0 ? 'Free' : cr}
                            </td>
                            {CREDIT_PLANS.map((p) => (
                              <td key={p.id}
                                className={`text-right tabular-nums text-[13.5px] px-4 py-2.5 border-b border-black/10 ${
                                  p.id === rung ? 'bg-[#9E5E41]/[0.08] font-bold' : ''
                                }`}>
                                {cr === 0 ? 'Unlimited' : nf(Math.floor(p.credits / cr)) + (p.recurring ? ' / mo' : '')}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
                <tr>
                  <th scope="row" className="text-left font-semibold text-[13.5px] bg-black text-white px-4 py-3">One space, start to finish</th>
                  <td className="text-right tabular-nums font-semibold bg-black text-white px-4 py-3">{CREDITS_PER_SPACE}</td>
                  {CREDIT_PLANS.map((p) => (
                    <td key={p.id} className={`text-right tabular-nums font-semibold px-4 py-3 ${p.id === rung ? 'bg-[#8E3F2D] text-white' : 'bg-black text-white'}`}>
                      {Math.floor(p.credits / CREDITS_PER_SPACE)}{p.recurring ? ' / mo' : ''}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[12px] text-black/55 mt-3">
            Highlighted column follows the pack you picked above · <span className="text-[#15803d] font-semibold">Live</span> works today ·
            everything marked Soon is included the day it lands, at no extra cost.
          </p>
        </div>
      </div>
    </section>
  );
};

export default PricingCredits;
