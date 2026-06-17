import React, { useState } from 'react';
import { useLanguage } from '../LanguageContext';
import { cld } from '../lib/cld';
import Marquee from './studio/Marquee';
import ConversionBand from './studio/ConversionBand';
import SigninVeil from './studio/SigninVeil';
import { parsePrice } from '../lib/priceParse';

interface Props {
  /** Triggers the real Google sign-in flow (account-only actions). */
  onRequestLogin: () => void;
}

const CLD = 'https://res.cloudinary.com/dys2k5muv/image/upload';

type Item = { cat: string; name: string; retailer: string; price: string; img: string; url: string };
type Room = { id: string; label: string; style: string; img: string; items: Item[] };

// ── The four curated sample rooms (D4: STATIC, zero-Serper, always available).
//    Imagery uploaded to Cloudinary "Tool 03 Example"; product links are REAL
//    retailer pages (open in a new tab, never gated — A5 rule 14). Prices are
//    indicative samples. ──
export const SHOPPING_ROOMS: Room[] = [
  {
    id: 'living', label: 'Living room', style: 'Mid-Century', img: `${CLD}/shopping-room-living.webp`,
    items: [
      { cat: 'Sofa', name: 'Abisko Velvet Sofa · Yarrow Gold', retailer: 'Article', price: '$1,799', img: `${CLD}/shopping-living-1.webp`, url: 'https://www.article.com/product/22589/abisko-91-velvet-sofa-plush-yarrow-gold' },
      { cat: 'Coffee Table', name: 'Pirita Travertine Coffee Table', retailer: 'Kavehome', price: '$649', img: `${CLD}/shopping-living-2.webp`, url: 'https://kavehome.com/en/en/p/pirita-coffee-table-in-beige-travertine-with-solid-oak-wood-legs-with-a-natural-coloured-finish-147-x-65cm-fsc-100' },
      { cat: 'Storage', name: 'Open Plan Low Bookcase', retailer: 'Blu Dot', price: '$1,499', img: `${CLD}/shopping-living-3.webp`, url: 'https://www.bludot.com/products/open-plan-large-low-bookcase-with-storage?variant=44723223625907' },
      { cat: 'Lighting', name: 'Lia Pendant Light', retailer: 'Crate & Barrel', price: '$349', img: `${CLD}/shopping-living-4.webp`, url: 'https://www.crateandbarrel.com/lia-pendant-light-with-shade-30/s594344' },
    ],
  },
  {
    id: 'patio', label: 'Patio', style: 'Mediterranean', img: `${CLD}/shopping-room-patio.webp`,
    items: [
      { cat: 'Outdoor Sofa', name: 'Upland Teak Outdoor Sofa', retailer: 'AllModern', price: '$1,299', img: `${CLD}/shopping-patio-1.webp`, url: 'https://www.allmodern.com/outdoor/pdp/modway-upland-102-teak-outdoor-sofa-a000363803.html' },
      { cat: 'Coffee Table', name: 'Labra Cement Coffee Table', retailer: 'Kavehome', price: '$549', img: `${CLD}/shopping-patio-2.webp`, url: 'https://kavehome.com/en/en/p/labra-coffee-table-in-cement-and-acacia-wood-140-x-70-cm-fsc-100' },
      { cat: 'Side Table', name: 'Mesquida Terracotta Side Table', retailer: 'Kavehome', price: '$229', img: `${CLD}/shopping-patio-3.webp`, url: 'https://kavehome.com/en/en/p/mesquida-outdoor-side-table-in-ceramic-with-glazed-terracotta-finish-o-36cm' },
      { cat: 'Rug', name: 'Mira Indoor/Outdoor Rug · 8×10', retailer: 'Article', price: '$399', img: `${CLD}/shopping-patio-4.webp`, url: 'https://www.article.com/product/29408/mira-8-x-10-indoor-outdoor-rug-checkered-brown' },
    ],
  },
  {
    id: 'bedroom', label: 'Bedroom', style: 'Warm Minimal', img: `${CLD}/shopping-room-bedroom.webp`,
    items: [
      { cat: 'Bed', name: 'Adelaide Curved Upholstered King', retailer: 'Crate & Barrel', price: '$1,999', img: `${CLD}/shopping-bedroom-1.webp`, url: 'https://www.crateandbarrel.com/adelaide-curved-upholstered-king-bed/s434009' },
      { cat: 'Bench', name: 'Anneli Storage Bench', retailer: 'Crate & Barrel', price: '$899', img: `${CLD}/shopping-bedroom-2.webp`, url: 'https://www.crateandbarrel.com/anneli-54-upholstered-storage-bench/s122081' },
      { cat: 'Nightstand', name: 'Claremont Round Nightstand', retailer: 'West Elm', price: '$499', img: `${CLD}/shopping-bedroom-3.webp`, url: 'https://www.westelm.com/products/claremont-round-nightstand-h13510/?pkey=sWE&sb=WE' },
      { cat: 'Lighting', name: 'Shiloh Sconce', retailer: 'West Elm', price: '$199', img: `${CLD}/shopping-bedroom-4.webp`, url: 'https://www.westelm.com/products/shiloh-sconce-12-h13833/?pkey=clighting&sb=WE' },
    ],
  },
  {
    id: 'dining', label: 'Dining room', style: 'Modern Organic', img: `${CLD}/shopping-room-dining.webp`,
    items: [
      { cat: 'Cabinet', name: 'MP Emman Glass Cabinet', retailer: 'West Elm', price: '$1,899', img: `${CLD}/shopping-dining-1.webp`, url: 'https://www.westelm.com/products/mp-emman-glass-cabinet-mp739/?pkey=cfurniture&sb=WE' },
      { cat: 'Lighting', name: 'Simone Linear 2-Light Chandelier', retailer: 'West Elm', price: '$599', img: `${CLD}/shopping-dining-2.webp`, url: 'https://www.westelm.com/products/simone-linear-2-light-chandelier-h13597/?pkey=sWE&sb=WE' },
      { cat: 'Dining Chair', name: 'Via Velvet Dining Chair · Olive', retailer: 'Crate & Barrel', price: '$399', img: `${CLD}/shopping-dining-3.webp`, url: 'https://www.crateandbarrel.com/via-olive-green-velvet-walnut-wood-dining-chair/s139291' },
      { cat: 'Dining Table', name: 'Dine & Unwind Walnut Table', retailer: 'Article', price: '$1,499', img: `${CLD}/shopping-dining-4.webp`, url: 'https://www.article.com/furniture-bundles/606/the-dine-and-unwind-bundle' },
    ],
  },
];

/** Retailer marquee logos — self-hosted on Cloudinary (no live favicon dependency). */
export const SHOPPING_LOGOS: { slug: string; name: string }[] = [
  { slug: 'westelm', name: 'West Elm' }, { slug: 'crateandbarrel', name: 'Crate & Barrel' },
  { slug: 'article', name: 'Article' }, { slug: 'kavehome', name: 'Kavehome' },
  { slug: 'bludot', name: 'Blu Dot' }, { slug: 'allmodern', name: 'AllModern' },
  { slug: 'cb2', name: 'CB2' }, { slug: 'potterybarn', name: 'Pottery Barn' },
  { slug: 'ikea', name: 'IKEA' }, { slug: 'wayfair', name: 'Wayfair' },
];
const logoUrl = (slug: string) => `${CLD}/retailer-${slug}.png`;
const priceNum = (s: string) => parsePrice(s); // shared parser (drops cents, handles "$1,799.00")

/** A retailer logo chip with a graceful text fallback if the image misses.
 *  Exported so the logged-in ShoppingExperience renders the identical band. */
export const LogoChip: React.FC<{ slug: string; name: string }> = ({ slug, name }) => {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className="text-[15px] font-bold text-black/45">{name}</span>;
  return (
    <span className="inline-flex items-center h-[34px]" title={name}>
      <img
        src={cld(logoUrl(slug), 64)}
        alt={name}
        className="h-7 w-auto max-w-[120px] object-contain grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition"
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    </span>
  );
};

/**
 * Shopping List — LOGGED-OUT one-pager (locked pattern, Appendix A · §9 · D4/D5).
 * Four rooms we've ALREADY shopped: a switcher → sticky room render + a real,
 * clickable shopping list (View at {retailer} → opens the real product page).
 * Exploring is FREE and ALWAYS available (D5 — no Serper, unaffected by offline).
 * Only account actions (make this for MY room · download · save) open the veil.
 * Shell-agnostic: renders its own studio-frame, no dependency on the hub.
 */
const ShoppingListShowcase: React.FC<Props> = ({ onRequestLogin }) => {
  const { t } = useLanguage();
  const [active, setActive] = useState(0);
  const [veilOpen, setVeilOpen] = useState(false);
  const [veilReason, setVeilReason] = useState('');

  const openSignin = (reasonKey: string) => { setVeilReason(t(reasonKey)); setVeilOpen(true); };

  const room = SHOPPING_ROOMS[active];
  const total = '$' + room.items.reduce((s, it) => s + priceNum(it.price), 0).toLocaleString();

  return (
    <div className="studio-frame bg-white w-full">

      {/* status bar — logged-out delta: quota replaced by a sign-in affordance */}
      <div className="statushdr">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-[#0047AB]" />
          <span className="text-[12px] font-bold uppercase tracking-[0.3em] text-black/60">{t('ai.shop.statusSample')}</span>
        </div>
        <button type="button" onClick={() => openSignin('ai.shop.reasonShop')}
          className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#0047AB] border-b border-[#0047AB]/40 pb-0.5 hover:border-[#0047AB] transition">
          {t('ai.shop.signInLink')}
        </button>
      </div>

      {/* ── HERO — cinematic launchpad (a room we've already shopped) ── */}
      <div className="hero">
        <div className="hero-media">
          <img src={cld(`${CLD}/shopping-room-living.webp`, 2000, { crop: 'fill', aspectRatio: '16/9' })} alt="" />
        </div>
        <div className="hero-scrim" />
        <span className="badge-dark absolute top-6 left-6 text-[10px] font-bold uppercase tracking-[0.22em] px-3 py-1.5 z-10">{t('ai.shop.sampleRoom')}</span>
        <span className="badge-cobalt absolute top-6 right-6 text-[10px] font-bold uppercase tracking-[0.22em] px-3 py-1.5 z-10">{t('ai.shop.piecesMatched')}</span>

        <div className="hero-overlay">
          <div className="glass px-10 py-10 md:px-12 md:py-12 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.34em] text-white/70 mb-3">{t('ai.shoppingList')}</p>
            <h1 className="hl text-[52px] md:text-[76px] leading-[0.92] mb-3">{t('ai.shop.heroTitle')}<br /><em>{t('ai.shop.heroTitleEm')}</em></h1>
            <span className="block w-16 h-[2px] rule-oxide mx-auto mb-5" />
            <p className="text-[14px] text-white/80 leading-relaxed max-w-[410px] mx-auto mb-8">
              {t('ai.shop.heroSub')} <span className="text-white font-semibold">{t('ai.shop.heroSubBold')}</span>
            </p>
            <button type="button"
              onClick={() => document.getElementById('shop-explore')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="cta-primary text-[12px] font-bold uppercase tracking-[0.24em] px-11 py-4 transition">
              {t('ai.shop.exploreCta')}
            </button>
            <div className="flex items-center justify-center gap-5 mt-5">
              <button type="button" onClick={() => openSignin('ai.shop.reasonShop')}
                className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70 border-b border-white/30 pb-0.5 hover:text-white transition">
                {t('ai.shop.shopYourRoom')}
              </button>
            </div>
          </div>
        </div>
        <span className="cap absolute bottom-6 left-1/2 -translate-x-1/2 text-[9px] font-bold uppercase tracking-[0.25em] px-4 py-2 z-10">{t('ai.shop.heroCap')}</span>
      </div>

      {/* value strip (lives once, under the hero) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 border-b border-black/[0.08] text-center">
        <div className="px-8 py-7 border-r border-black/[0.08]"><p className="text-[11px] font-bold uppercase tracking-[0.28em] kicker mb-1.5">{t('ai.shop.v1k')}</p><p className="text-[14px] text-black/65 leading-relaxed">{t('ai.shop.v1b')}</p></div>
        <div className="px-8 py-7 border-r border-black/[0.08]"><p className="text-[11px] font-bold uppercase tracking-[0.28em] kicker mb-1.5">{t('ai.shop.v2k')}</p><p className="text-[14px] text-black/65 leading-relaxed">{t('ai.shop.v2b')}</p></div>
        <div className="px-8 py-7"><p className="text-[11px] font-bold uppercase tracking-[0.28em] kicker mb-1.5">{t('ai.shop.v3k')}</p><p className="text-[14px] text-black/65 leading-relaxed">{t('ai.shop.v3b')}</p></div>
      </div>

      {/* ── THE WOW — four rooms we already shopped (explorer) ── */}
      <section id="shop-explore" className="px-6 md:px-10 py-12 scroll-mt-24">
        <div className="max-w-[1180px] mx-auto">
          <div className="text-center mb-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.32em] kicker mb-2">{t('ai.shop.exploreKicker')}</p>
            <h2 className="hl text-black text-[40px] md:text-[56px] leading-[0.95]">{t('ai.shop.exploreTitle')} <em>{t('ai.shop.exploreTitleEm')}</em></h2>
            <p className="text-[14px] text-black/60 leading-relaxed max-w-[540px] mx-auto mt-3">{t('ai.shop.exploreSub')}</p>
          </div>

          {/* room switcher tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 mb-9 max-w-[920px] mx-auto">
            {SHOPPING_ROOMS.map((r, i) => (
              <button key={r.id} type="button" onClick={() => setActive(i)}
                className={`ctab block${i === active ? ' active' : ''}`} style={{ aspectRatio: '4/3' }} aria-label={r.label}>
                <img src={cld(r.img, 480, { crop: 'fill', aspectRatio: '4/3' })} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                <span className="ctab-veil" />
                <span className="absolute bottom-0 left-0 right-0 px-3 py-2 text-left bg-gradient-to-t from-black/70 to-transparent">
                  <span className="block text-[9px] font-bold uppercase tracking-[0.2em] text-white/70">0{i + 1}</span>
                  <span className="block text-[13px] font-bold text-white leading-tight">{r.label}</span>
                </span>
              </button>
            ))}
          </div>

          {/* active room */}
          <div className="grid lg:grid-cols-[1fr_1.12fr] gap-10 lg:gap-12 items-start">
            {/* LEFT: the room (sticky) */}
            <div className="lg:sticky lg:top-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] kicker">{room.style} · {room.label}</p>
                <span className="badge-cobalt text-[9px] font-bold uppercase tracking-[0.2em] px-3 py-1.5">{room.items.length} {t('ai.shop.matched')}</span>
              </div>
              <div className="relative overflow-hidden bg-black shadow-[0_24px_50px_rgba(0,0,0,0.18)]" style={{ aspectRatio: '4/3' }}>
                <img src={cld(room.img, 1200, { crop: 'fill', aspectRatio: '4/3' })} alt={`${room.style} ${room.label}`} className="w-full h-full object-cover" decoding="async" />
              </div>
              <p className="text-[11px] text-black/60 mt-3 leading-relaxed">{t('ai.shop.roomHint')}</p>
            </div>

            {/* RIGHT: the shopping list */}
            <div>
              <div className="flex items-end justify-between mb-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] kicker">{t('ai.shop.theList')}</p>
                <p className="text-[12px] font-bold">{t('ai.shop.estTotal')} · <span className="text-black">{total}</span></p>
              </div>

              <div className="flex flex-col gap-3">
                {room.items.map((it, k) => (
                  <div key={k} className="bg-white border border-black/10">
                    <div className="flex items-stretch">
                      <div className="relative flex-shrink-0 overflow-hidden bg-neutral-100" style={{ width: 'clamp(84px,26%,120px)', aspectRatio: '1/1' }}>
                        <img src={cld(it.img, 240, { crop: 'fill', aspectRatio: '1/1' })} alt={it.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                        <span className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-black/80 text-white text-[10px] font-bold flex items-center justify-center">{k + 1}</span>
                      </div>
                      <div className="min-w-0 flex-1 px-4 py-3 flex flex-col justify-center gap-1">
                        <p className="text-[9px] font-bold uppercase tracking-[0.2em] kicker">{it.cat}</p>
                        <p className="text-[13px] font-semibold leading-[1.3]">{it.name}</p>
                        <div className="flex items-center justify-between gap-3 mt-1 pt-2 border-t border-black/10">
                          <a href={it.url} target="_blank" rel="noopener noreferrer"
                            className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#0047AB] border-b border-[#0047AB]/40 hover:border-[#0047AB] transition">
                            {t('ai.shop.viewAt')} {it.retailer} →
                          </a>
                          <span className="text-[13px] font-bold whitespace-nowrap">{it.price}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* account-only actions → sign-in gate */}
              <div className="border-t border-[#DAD2C3] mt-7 pt-6 flex flex-col gap-3">
                <button type="button" onClick={() => openSignin('ai.shop.reasonShop')}
                  className="w-full cta-primary text-[13px] font-bold uppercase tracking-[0.22em] py-4 flex items-center justify-center gap-2 transition">
                  {t('ai.shop.makeForMyRoom')}
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => openSignin('ai.shop.reasonDownload')}
                    className="border border-black/15 text-black/70 text-[11px] font-bold uppercase tracking-[0.14em] py-3.5 hover:border-black/45 hover:text-black transition">
                    {t('ai.shop.downloadPdf')}
                  </button>
                  <button type="button" onClick={() => openSignin('ai.shop.reasonSave')}
                    className="border border-black/15 text-black/70 text-[11px] font-bold uppercase tracking-[0.14em] py-3.5 hover:border-black/45 hover:text-black transition">
                    {t('ai.shop.saveList')}
                  </button>
                </div>
                <p className="text-[11px] text-black/60 text-center leading-relaxed mt-1">
                  {t('ai.shop.footnote')}{' '}
                  <button type="button" onClick={() => openSignin('ai.shop.reasonShop')} className="font-bold text-[#0047AB] hover:underline">{t('ai.shop.signInLink')}</button>{' '}
                  {t('ai.shop.footnote2')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* retailer marquee (self-hosted Cloudinary logos · text fallback) */}
      <Marquee label={t('ai.shop.searchedAcross')} items={SHOPPING_LOGOS.map((l) => <LogoChip key={l.slug} slug={l.slug} name={l.name} />)} />

      {/* CONVERSION BAND */}
      <ConversionBand
        kicker={t('ai.shop.convKicker')}
        headline={<>{t('ai.shop.convHeadline')} <em>{t('ai.shop.convHeadlineEm')}</em></>}
        actions={
          <>
            <button type="button" onClick={() => openSignin('ai.shop.reasonShop')}
              className="bg-white text-black text-sm font-bold uppercase tracking-[0.24em] px-8 py-4 hover:bg-white/90 transition">
              {t('ai.shop.signInToStart')}
            </button>
            <button type="button" onClick={() => openSignin('ai.shop.reasonShop')}
              className="border border-white/30 text-white text-sm font-bold uppercase tracking-[0.24em] px-8 py-4 hover:bg-white/10 transition">
              {t('ai.shop.bookStudio')}
            </button>
          </>
        }
      />

      {/* sign-in veil — opened only by account actions */}
      <SigninVeil
        open={veilOpen}
        onClose={() => setVeilOpen(false)}
        onSignIn={() => { setVeilOpen(false); onRequestLogin(); }}
        kicker={t('ai.shop.veilKicker')}
        title={<>{t('ai.shop.veilTitle')} <em className="italic">{t('ai.shop.veilTitleEm')}</em></>}
        lead={<>{t('ai.shop.veilLead')} <span className="font-semibold text-black">{veilReason || t('ai.shop.reasonShop')}</span>.</>}
        note={t('ai.shop.veilNote')}
        googleLabel={t('ai.shop.veilGoogle')}
        fineprint={t('ai.shop.veilFineprint')}
        dismissLabel={t('ai.shop.veilDismiss')}
      />
    </div>
  );
};

export default ShoppingListShowcase;
