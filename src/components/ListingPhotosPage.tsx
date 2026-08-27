import React, { useState } from 'react';
import { useLanguage } from '../LanguageContext';
import { trackCalendly } from '../lib/track';
import { trackEvent } from '../lib/analytics';
import { cld } from '../lib/cld';
import BeforeAfter from './studio/BeforeAfter';
import { PAIRS } from './AIVisionShowcase';
import { VISION_STYLES_FULL } from './VisionExperience';
import {
  LISTING_PHOTOS_FAQ,
  type ListingPhotosFaqItem,
} from '../data/listingPhotosFaq';

/**
 * /listing-photos — "Your listing isn't the problem. The photos are."
 *
 * The paid-search landing page for the US campaign aimed at short-term-rental
 * hosts and real-estate agents/sellers. Full campaign spec, ad copy, keywords
 * and the Ads Editor import files live in docs/marketing/google-ads/.
 *
 * Why a dedicated page rather than pointing ads at /ai-concepts: ad-to-page
 * message match is most of Quality Score, and /ai-concepts speaks to
 * homeowners redesigning a room they live in — a different job than "my
 * listing is not converting". This page also earns its keep organically (it is
 * indexed, sitemapped, prerendered and carries FAQPage schema), so the spend
 * leaves something behind when it stops.
 *
 * ── Copy rules (these are not stylistic preferences) ──────────────────────
 *   1. NO unsubstantiated performance claims. No invented percentages about
 *      bookings, days on market, or sale price. Google Ads policy plus FTC
 *      substantiation both apply, and the ad and the page must agree.
 *   2. The virtually-staged disclosure band is load-bearing, not filler. An AI
 *      restyle must never be presented as the room's current state.
 *   3. Only sell what ships today: AI Vision restyle, Shopping List, Room
 *      Audit, the $99 consultation, full studio projects. The fal virtual-
 *      staging engine is parked (services/aiVision/virtualStaging.ts) — keep it
 *      out of this page until it is switched on.
 *
 * The #hosts and #agents anchors are the ad-group-level deep links: the STR ad
 * group lands on #hosts, the agent ad group on #agents. Don't rename them
 * without updating docs/marketing/google-ads/ads.csv.
 *
 * English-only by design (the audience is US), matching the /deliverables
 * precedent — it is not wired into LanguageContext translations.
 *
 * Header/Footer chrome is supplied by ListingPhotosRoute in src/App.tsx.
 */

/** Free 15-min intro chat — same Calendly link the header/studio surfaces use. */
const FREE_CONVO_URL = 'https://calendly.com/hello-designature/quick-conversation';

// ── Shared atoms (mirrors the /deliverables design system) ──────────────────
const BTN =
  'inline-flex items-center justify-center gap-2 px-6 py-3.5 text-[12px] font-bold uppercase tracking-[0.16em] whitespace-nowrap transition-colors duration-300';
const BTN_PRIMARY = `${BTN} bg-[#0A0A0A] text-white hover:bg-[#333333]`;
const BTN_SECONDARY = `${BTN} border border-[#0A0A0A] text-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-white`;
const EYEBROW = 'block text-[11px] font-bold uppercase tracking-[0.28em] text-[#6B6B6B] mb-4';
const WarmRule: React.FC = () => <div className="w-11 h-px bg-[#9E5E41] mx-auto mb-6" />;

/**
 * At-a-glance strip. Every cell is a fact about the product, not a claim about
 * the visitor's results — see copy rule 1 in the header.
 */
const GLANCE = [
  { num: '1', label: 'Photo is all we need' },
  // Derived, not typed: the selectable style list is VISION_STYLES_FULL, and a
  // hard-coded count here would quietly become a false claim the day it changes.
  { num: String(VISION_STYLES_FULL.length), label: 'Interior styles' },
  { num: '3', label: 'Free concepts · no card' },
  { num: 'Real', label: 'Products · real prices' },
];

/** The diagnosis: three ways a perfectly good room photographs badly. */
const DIAGNOSIS = [
  {
    num: '01',
    title: 'It reads empty.',
    body: 'An under-furnished room gives the eye nothing to measure against, so it photographs smaller and colder than it is. Guests read "bare"; buyers read "needs work".',
    tag: 'Symptom: plenty of views, few enquiries',
  },
  {
    num: '02',
    title: 'It reads dated.',
    body: 'One wrong sofa, one builder-grade fixture, one wall colour from a decade ago — at thumbnail size that single element dates the whole room before anyone reads the description.',
    tag: 'Symptom: saved, then never booked',
  },
  {
    num: '03',
    title: 'It reads like everyone else.',
    body: 'The same grey sectional and the same beige wall as the other forty listings on the page. Nothing wrong with it, and nothing to remember it by either.',
    tag: 'Symptom: you compete on price alone',
  },
];

/** The three steps, matched 1:1 to the tools that actually run them. */
const STEPS = [
  {
    num: 'Step 01',
    title: 'Upload one photo',
    body: 'A phone photo of the room as it is today. No measuring, no floor plan, no account needed to look around first.',
    out: 'Takes: about a minute',
  },
  {
    num: 'Step 02',
    title: 'Pick a style, get your room back',
    body: `AI Vision returns a photoreal restyle of your actual space — same walls, same windows, same layout, new furniture and finishes. ${VISION_STYLES_FULL.length} styles, from Coastal to Mid-Century.`,
    out: 'Output: photoreal room preview',
  },
  {
    num: 'Step 03',
    title: 'Open the shopping list',
    body: 'Every piece in the render is matched to real, currently listed products with prices and links — West Elm, Pottery Barn, Crate & Barrel, CB2, Wayfair, Article. Swap anything that misses.',
    out: 'Output: a list you can actually order from',
  },
];

/** The two ad groups, made visible. Anchors are referenced by ads.csv. */
const AUDIENCES = [
  {
    id: 'hosts',
    eyebrow: 'Short-term & vacation rental hosts',
    title: 'You own the room. So change the room.',
    body: 'A host is the rare case where the render is not a fantasy — you can actually buy the sofa. Restyle the unit, order from the list, shoot the real result, and the listing photos stop being the weak link.',
    points: [
      'Test a direction before you spend anything on furniture',
      'Get the whole room costed before you commit — real retailer prices',
      'Style a turnover unit consistently across every bedroom',
      'Keep the layout you already know works for cleaning and turnovers',
    ],
  },
  {
    id: 'agents',
    eyebrow: 'Agents, sellers & owners',
    title: 'Show the seller what the room could be.',
    body: 'Pre-listing conversations go faster with a picture. Use a restyle to make the case for what to change before the shoot — and hand over a costed list so "the living room needs work" becomes a decision instead of an argument.',
    points: [
      'Turn vague prep advice into one image the seller can react to',
      'Price the recommendation instead of guessing at it',
      'Label anything you publish as virtually staged — we give you the line',
      'Bring in a designer for the listings where it is worth it',
    ],
  },
];

/** Two shipped before/after pairs, reused from the live AI Vision showcase. */
const sq = (url: string, w: number) => cld(url, w, { crop: 'fill', aspectRatio: '1/1' });
const SHOWCASE = [
  { pair: PAIRS[2], caption: 'Bohemian — living room' },
  { pair: PAIRS[0], caption: 'Mid-Century — living room' },
];

// ── FAQ ────────────────────────────────────────────────────────────────────

/**
 * Render an answer with its optional in-copy links applied. The schema in
 * server/seo/jsonld.ts emits the same string as plain text, so the two can
 * never disagree — this only decorates.
 */
const FaqAnswer: React.FC<{ item: ListingPhotosFaqItem; onNavigate: (to: string) => void }> = ({
  item,
  onNavigate,
}) => {
  if (!item.links?.length) return <>{item.a}</>;

  // Apply links in the order they appear in the answer so slicing stays linear.
  const ordered = [...item.links].sort((a, b) => item.a.indexOf(a.text) - item.a.indexOf(b.text));
  const nodes: React.ReactNode[] = [];
  let rest = item.a;
  ordered.forEach((link, i) => {
    const at = rest.indexOf(link.text);
    if (at === -1) return;
    nodes.push(rest.slice(0, at));
    nodes.push(
      <button
        key={`${link.to}-${i}`}
        type="button"
        onClick={() => onNavigate(link.to)}
        className="underline underline-offset-2 decoration-[#9E5E41]/50 hover:decoration-[#9E5E41] text-[#0A0A0A]"
      >
        {link.text}
      </button>
    );
    rest = rest.slice(at + link.text.length);
  });
  nodes.push(rest);
  return <>{nodes}</>;
};

const FaqRow: React.FC<{
  item: ListingPhotosFaqItem;
  open: boolean;
  onToggle: () => void;
  onNavigate: (to: string) => void;
}> = ({ item, open, onToggle, onNavigate }) => (
  <div className="border-b border-black/10">
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="w-full flex items-start justify-between gap-6 text-left py-6 group"
    >
      <span className="font-display font-normal text-[19px] md:text-[22px] leading-snug text-[#0A0A0A]">
        {item.q}
      </span>
      <span
        aria-hidden
        className={`shrink-0 mt-1 text-[#9E5E41] text-[20px] leading-none transition-transform duration-300 ${
          open ? 'rotate-45' : ''
        }`}
      >
        +
      </span>
    </button>
    {open && (
      <p className="text-[15px] leading-[1.7] text-[#404040] max-w-[70ch] pb-7 -mt-1">
        <FaqAnswer item={item} onNavigate={onNavigate} />
      </p>
    )}
  </div>
);

// ── Page ───────────────────────────────────────────────────────────────────

const ListingPhotosPage: React.FC = () => {
  const { navigateTo } = useLanguage();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  /**
   * Every CTA on this page fires one GA4 event with the surface that produced
   * it. `listing_photos_cta` is the event the Google Ads campaign imports as a
   * secondary conversion while the account has no purchase history — see
   * docs/marketing/google-ads/README.md, "Conversions".
   */
  const cta = (name: string, to: 'ai-concepts' | 'pricing' | 'consultation' | 'services') => () => {
    trackEvent('listing_photos_cta', { cta: name });
    navigateTo(to);
    window.scrollTo({ top: 0 });
  };

  const goRoute = (to: string) => {
    if (to === '/pricing') navigateTo('pricing');
    else if (to === '/consultation') navigateTo('consultation');
    else if (to === '/services') navigateTo('services');
    else if (to === '/ai-concepts') navigateTo('ai-concepts');
    window.scrollTo({ top: 0 });
  };

  const bookFreeChat = () => {
    trackEvent('listing_photos_cta', { cta: 'free_chat' });
    trackCalendly(FREE_CONVO_URL, 'listing-photos');
  };

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <main className="bg-white text-[#0A0A0A] font-body text-[14px] leading-[1.55]">
      {/* ══════════ HERO ══════════ */}
      <section className="bg-white pt-[150px] md:pt-[220px] pb-14 lg:pb-20">
        <div className="max-w-[1240px] mx-auto px-7 text-center">
          <div className="w-11 h-px bg-[#9E5E41] mx-auto mb-8" />
          <span className={EYEBROW}>For US hosts, agents &amp; owners</span>
          <h1 className="font-display font-normal text-[#0A0A0A] leading-[1.05] tracking-[-0.01em] text-[44px] md:text-[68px] lg:text-[86px] max-w-[17ch] mx-auto mb-7">
            Your listing isn&rsquo;t the problem. The photos are.
          </h1>
          <p className="text-[17px] md:text-[19px] leading-[1.6] text-[#404040] max-w-[64ch] mx-auto mb-10">
            Before you drop the nightly rate again, look at the first three images. Upload one photo
            of the room and Designature shows you the same space restyled — then hands you the
            shopping list of real products, at real prices, that get it there. Free to start, no card.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button type="button" onClick={cta('hero_primary', 'ai-concepts')} className={BTN_PRIMARY}>
              Restyle my room free →
            </button>
            <button type="button" onClick={() => scrollTo('how')} className={BTN_SECONDARY}>
              See how it works
            </button>
          </div>
          <p className="text-[12px] text-[#6B6B6B] mt-6">
            3 free concepts · no credit card · your photo is yours
          </p>
        </div>
      </section>

      {/* ══════════ AT A GLANCE ══════════ */}
      <section className="bg-[#FAFAFA] py-14">
        <div className="max-w-[1240px] mx-auto px-7">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#DAD2C3] border border-[#DAD2C3]">
            {GLANCE.map((cell) => (
              <div key={cell.label} className="bg-[#FAFAFA] px-5 py-7 text-center">
                <div className="font-display font-normal text-[40px] md:text-[48px] leading-none text-[#0A0A0A] mb-2.5">
                  {cell.num}
                </div>
                <div className="text-[11px] md:text-[12px] font-bold uppercase tracking-[0.2em] text-[#6B6B6B]">
                  {cell.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ DIAGNOSIS ══════════ */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-[1240px] mx-auto px-7">
          <div className="text-center mb-12 lg:mb-16">
            <WarmRule />
            <span className={EYEBROW}>Three ways a good room photographs badly</span>
            <h2 className="font-display font-normal text-[#0A0A0A] leading-[1.05] tracking-[-0.01em] text-[34px] md:text-[46px] lg:text-[54px] max-w-[24ch] mx-auto mb-5">
              The space is fine. The picture of it isn&rsquo;t.
            </h2>
            <p className="text-[16px] leading-[1.6] text-[#404040] max-w-[62ch] mx-auto">
              A guest or a buyer decides from a thumbnail, in about the time it takes to scroll past
              it. These are the three failures we see most often — and none of them need a renovation
              to fix.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {DIAGNOSIS.map((card) => (
              <div key={card.num} className="relative bg-white border border-black/10 px-6 py-8">
                <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#9E5E41] mb-3">
                  {card.num}
                </div>
                <h3 className="font-display font-normal text-[24px] leading-tight text-[#0A0A0A] mb-3">
                  {card.title}
                </h3>
                <p className="text-[13px] leading-[1.65] text-[#404040]">{card.body}</p>
                <div className="mt-5 pt-3.5 border-t border-black/[0.08] text-[11px] font-bold uppercase tracking-[0.16em] text-[#6B6B6B]">
                  {card.tag}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ HOW IT WORKS + BEFORE/AFTER ══════════ */}
      <section id="how" className="py-16 lg:py-24 bg-[#FAFAFA] scroll-mt-24">
        <div className="max-w-[1240px] mx-auto px-7">
          <div className="text-center mb-12 lg:mb-16">
            <WarmRule />
            <span className={EYEBROW}>How it works</span>
            <h2 className="font-display font-normal text-[#0A0A0A] leading-[1.05] tracking-[-0.01em] text-[34px] md:text-[46px] lg:text-[54px] max-w-[22ch] mx-auto mb-5">
              One photo in. A room and a receipt out.
            </h2>
            <p className="text-[16px] leading-[1.6] text-[#404040] max-w-[62ch] mx-auto">
              Drag the sliders below — these are real rooms our tool reworked, not stock renders.
            </p>
          </div>

          {/* Real before/after pairs from the live AI Vision showcase.
              `.ba` styles are scoped under .studio-frame in src/index.css. */}
          <div className="studio-frame grid grid-cols-1 md:grid-cols-2 gap-4 mb-14">
            {SHOWCASE.map(({ pair, caption }) => (
              <figure key={pair.key} className="m-0">
                <BeforeAfter
                  beforeSrc={sq(pair.before, 1200)}
                  afterSrc={sq(pair.after, 1200)}
                  beforeAlt={`Room before Designature AI Vision restyle — ${caption}`}
                  afterAlt={`The same room restyled by Designature AI Vision — ${caption}`}
                  beforeLabel="Before"
                  afterLabel="After"
                  className="w-full aspect-square"
                />
                <figcaption className="mt-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[#6B6B6B]">
                  {caption}
                </figcaption>
              </figure>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {STEPS.map((step) => (
              <div key={step.num} className="bg-white border border-black/10 px-6 py-8">
                <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#9E5E41] mb-3">
                  {step.num}
                </div>
                <h3 className="font-display font-normal text-[24px] leading-tight text-[#0A0A0A] mb-3">
                  {step.title}
                </h3>
                <p className="text-[13px] leading-[1.65] text-[#404040]">{step.body}</p>
                <div className="mt-5 pt-3.5 border-t border-black/[0.08] text-[11px] font-bold uppercase tracking-[0.16em] text-[#6B6B6B]">
                  {step.out}
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <button type="button" onClick={cta('how_primary', 'ai-concepts')} className={BTN_PRIMARY}>
              Try it on my room →
            </button>
          </div>
        </div>
      </section>

      {/* ══════════ AUDIENCES ══════════ */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-[1240px] mx-auto px-7">
          <div className="text-center mb-12 lg:mb-16">
            <WarmRule />
            <span className={EYEBROW}>Who this is for</span>
            <h2 className="font-display font-normal text-[#0A0A0A] leading-[1.05] tracking-[-0.01em] text-[34px] md:text-[46px] lg:text-[54px] max-w-[24ch] mx-auto">
              Two jobs, one starting point.
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {AUDIENCES.map((a) => (
              <div
                key={a.id}
                id={a.id}
                className="bg-[#FAFAFA] border border-[#DAD2C3] px-7 py-9 scroll-mt-24"
              >
                <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#9E5E41] mb-4">
                  {a.eyebrow}
                </div>
                <h3 className="font-display font-normal text-[28px] md:text-[32px] leading-tight text-[#0A0A0A] mb-4">
                  {a.title}
                </h3>
                <p className="text-[14px] leading-[1.7] text-[#404040] mb-6">{a.body}</p>
                <ul className="space-y-3 mb-8">
                  {a.points.map((p) => (
                    <li key={p} className="flex gap-3 text-[13px] leading-[1.6] text-[#404040]">
                      <span aria-hidden className="text-[#9E5E41] mt-px">
                        —
                      </span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={cta(`audience_${a.id}`, 'ai-concepts')}
                  className={BTN_SECONDARY}
                >
                  Start with one photo →
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ HONESTY / DISCLOSURE ══════════ */}
      <section className="py-16 lg:py-20 bg-[#0A0A0A] text-white">
        <div className="max-w-[1000px] mx-auto px-7">
          <div className="w-11 h-px bg-[#9E5E41] mb-8" />
          <span className="block text-[11px] font-bold uppercase tracking-[0.28em] text-white/50 mb-5">
            Read this before you publish anything
          </span>
          <h2 className="font-display font-normal leading-[1.1] tracking-[-0.01em] text-[30px] md:text-[42px] max-w-[22ch] mb-7">
            We restyle the room. We don&rsquo;t restyle the truth.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-[14px] leading-[1.75] text-white/75">
            <p>
              An AI restyle shows what a space could look like — not what it looks like today. Never
              present one as a current photo of the property. If you publish a restyled image in a
              listing, label it <strong className="text-white font-semibold">&ldquo;virtually staged&rdquo;</strong>;
              many US MLSs require that disclosure and some states legislate it. The use we recommend
              is the honest one: restyle to decide what to buy, furnish the room for real, then
              photograph the real room.
            </p>
            <p>
              The shopping list points at real products from real retailers. Some of those links may
              earn us a small commission at no cost to you — it never changes what gets recommended,
              and we will swap any pick you don&rsquo;t like. We are an interior design studio, not a
              photography service and not a booking-performance service: what we can promise is a
              better-designed room, not a number.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════ WITH A DESIGNER ══════════ */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-[1240px] mx-auto px-7">
          <div className="text-center mb-12">
            <WarmRule />
            <span className={EYEBROW}>When the tool isn&rsquo;t enough</span>
            <h2 className="font-display font-normal text-[#0A0A0A] leading-[1.05] tracking-[-0.01em] text-[34px] md:text-[46px] lg:text-[54px] max-w-[24ch] mx-auto mb-5">
              There is a designer behind this.
            </h2>
            <p className="text-[16px] leading-[1.6] text-[#404040] max-w-[62ch] mx-auto">
              Designature is a working interior design studio — the AI tools are the fast front door,
              not the whole practice. When a property is worth more than a restyle, bring in a human.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-black/10 px-6 py-8">
              <h3 className="font-display font-normal text-[24px] leading-tight mb-3">
                Free 15-minute chat
              </h3>
              <p className="text-[13px] leading-[1.65] text-[#404040] mb-6">
                Bring your listing photos. We&rsquo;ll tell you straight whether the problem is the
                room, the styling, or the shot.
              </p>
              <button type="button" onClick={bookFreeChat} className={BTN_SECONDARY}>
                Book the free chat
              </button>
            </div>
            <div className="border border-black/10 px-6 py-8">
              <h3 className="font-display font-normal text-[24px] leading-tight mb-3">
                $99 consultation
              </h3>
              <p className="text-[13px] leading-[1.65] text-[#404040] mb-6">
                One-to-one with a designer: a direction for the space, what to change first, and what
                it will cost to change it.
              </p>
              <button
                type="button"
                onClick={cta('designer_consultation', 'consultation')}
                className={BTN_SECONDARY}
              >
                Book a consultation
              </button>
            </div>
            <div className="border border-black/10 px-6 py-8">
              <h3 className="font-display font-normal text-[24px] leading-tight mb-3">
                Full studio project
              </h3>
              <p className="text-[13px] leading-[1.65] text-[#404040] mb-6">
                Brief, concept, photoreal renders and a contractor-ready drawing set — for a whole
                unit or a whole building.
              </p>
              <button
                type="button"
                onClick={cta('designer_services', 'services')}
                className={BTN_SECONDARY}
              >
                See the services
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ FAQ ══════════ */}
      <section id="faq" className="py-16 lg:py-24 bg-[#FAFAFA] scroll-mt-24">
        <div className="max-w-[900px] mx-auto px-7">
          <div className="text-center mb-10 lg:mb-14">
            <WarmRule />
            <span className={EYEBROW}>Questions we get from hosts and agents</span>
            <h2 className="font-display font-normal text-[#0A0A0A] leading-[1.05] tracking-[-0.01em] text-[34px] md:text-[46px] mx-auto">
              Straight answers.
            </h2>
          </div>
          <div className="border-t border-black/10">
            {LISTING_PHOTOS_FAQ.map((item, i) => (
              <FaqRow
                key={item.q}
                item={item}
                open={openFaq === i}
                onToggle={() => setOpenFaq(openFaq === i ? null : i)}
                onNavigate={goRoute}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ CLOSING ══════════ */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-[1240px] mx-auto px-7 text-center">
          <div className="w-11 h-px bg-[#9E5E41] mx-auto mb-8" />
          <h2 className="font-display font-normal text-[#0A0A0A] leading-[1.05] tracking-[-0.01em] text-[36px] md:text-[52px] lg:text-[62px] max-w-[18ch] mx-auto mb-7">
            Start with the room you like least.
          </h2>
          <p className="text-[16px] md:text-[18px] leading-[1.6] text-[#404040] max-w-[58ch] mx-auto mb-10">
            One photo, one style, about a minute. If the restyle doesn&rsquo;t change how you see the
            space, you&rsquo;ve lost nothing but the minute.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button type="button" onClick={cta('closing_primary', 'ai-concepts')} className={BTN_PRIMARY}>
              Restyle my room free →
            </button>
            <button type="button" onClick={cta('closing_pricing', 'pricing')} className={BTN_SECONDARY}>
              See pricing
            </button>
          </div>
        </div>
      </section>
    </main>
  );
};

export default ListingPhotosPage;
