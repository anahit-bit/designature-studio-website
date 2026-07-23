import React, { useRef, useState } from 'react';
import { useLanguage } from '../LanguageContext';
import { cld } from '../lib/cld';
import { AuthUser } from '../AuthContext';
import { ConsultationReviewBand } from './ConsultationCTA';
import Marquee from './studio/Marquee';
import ShoppingOfflineCard from './ShoppingOfflineCard';
import { SHOPPING_LOGOS, LogoChip } from './ShoppingListShowcase';
import { SHOPPING_TAXONOMY, SHOPPING_TAXONOMY_IDS, categoryToTaxonomyId } from '../data/shoppingTaxonomy';
import { parsePrice } from '../lib/priceParse';
import { accountApi } from '../lib/accountApi';
import { fingerprint, isSaved, markSaved } from '../lib/savedMarks';

// Locked Shopping hero (lock §11 · folder "Inputs").
const SHOP_HERO = 'https://res.cloudinary.com/dys2k5muv/image/upload/v1780414472/Example_03_xyljim.png';

const COUNTRIES: { value: string; label: string; enabled: boolean }[] = [
  { value: 'us', label: '🇺🇸 United States', enabled: true },
  { value: 'gb', label: '🇬🇧 United Kingdom', enabled: true },
  { value: 'de', label: '🇩🇪 Germany — coming soon', enabled: false },
  { value: 'fr', label: '🇫🇷 France — coming soon', enabled: false },
  { value: 'am', label: '🇦🇲 Armenia — coming soon', enabled: false },
  { value: 'ae', label: '🇦🇪 UAE — coming soon', enabled: false },
  { value: 'ca', label: '🇨🇦 Canada — coming soon', enabled: false },
  { value: 'au', label: '🇦🇺 Australia — coming soon', enabled: false },
  { value: 'ch', label: '🇨🇭 Switzerland — coming soon', enabled: false },
];
/** Relative budget LEVELS — "shop that quality in EVERY category". */
const BUDGET_LEVELS = ['any', 'value', 'mid', 'premium'] as const;
type BudgetLevel = typeof BUDGET_LEVELS[number];
/** Typical per-category price bands per level, keyed by taxonomy id (single source of truth, #9).
 *  v1 constant fallback; the search session (#12) sources these from the Sanity retailer tiers. */
const BUDGET_BANDS: Record<Exclude<BudgetLevel, 'any'>, Record<string, string>> = {
  value:   { seating: '$300–900', 'tables-desks': '$150–600', storage: '$200–800', beds: '$300–900', lighting: '$40–150', rugs: '$80–300', textiles: '$30–150', 'art-decor': '$30–150' },
  mid:     { seating: '$900–2,200', 'tables-desks': '$600–1,500', storage: '$800–2,000', beds: '$900–2,200', lighting: '$150–450', rugs: '$300–800', textiles: '$150–500', 'art-decor': '$150–500' },
  premium: { seating: '$2,200+', 'tables-desks': '$1,500+', storage: '$2,000+', beds: '$2,200+', lighting: '$450+', rugs: '$800+', textiles: '$500+', 'art-decor': '$500+' },
};
const priceOf = (s?: string) => parsePrice(s); // whole-dollar value; fixes the $179,900 cents bug

interface Props {
  user: AuthUser | null;
  shoppingResults: any[];
  /** Free tier: identified-but-not-searched items (names only) — the upgrade teaser. Empty for paid. */
  shoppingTeaser: { category: string; label: string }[];
  /** Total items identify enumerated (searched + teaser). */
  shoppingTotalIdentified: number;
  shoppingItems: any[];
  shoppingLoading: boolean;
  shoppingError: string | null;
  shoppingDone: boolean;
  shoppingOffline: { code: 'disabled' | 'daily_budget_exceeded'; resetAt?: string } | null;
  standaloneShoppingImage: string | null;
  searchSourceImage: string | null;
  searchSourceIsStandalone: boolean;
  selectedConceptUrl: string | null;
  shoppingCountry: string;
  setShoppingCountry: (v: string) => void;
  onStartOver: () => void;
  /** Return to Step-1 (Entry) preserving inputs (the paid Find refinement → re-run). */
  onEditSearch: () => void;
  /** Return to the existing results from the Entry screen WITHOUT re-running (no list cost). */
  onBackToResults: () => void;
  processShoppingFile: (file: File) => void;
  handleShopDrop: (e: React.DragEvent) => void;
  /** Runs identify→search; budget + Find-scope opts pass through to the search call. */
  runSearch: (opts?: { budgetLevel?: string; roomCap?: number | null; scopeIds?: string[] | null }) => void;
  /** #11: fetch ONE alternate product for an item, excluding sources already shown (paid; 1 credit). */
  fetchAlternate: (item: any, excludeSources: string[]) => Promise<any | null>;
  handleDownloadShoppingPDF: () => void | Promise<void>;
  navigateTo: (page: string) => void;
}

/**
 * Shopping List — LOGGED-IN experience (locked 4-state, ai-shopping-LOGGED-IN-mockup-v4).
 * Pipeline (identify→search→PDF) + offline guardrails live in AIConceptsPage, called via props.
 * Gating (§9 · D6 + addendum): Country is FREE. The finer controls (Find scope · Budget · Categories ·
 * Group by · per-card favourite/include/set-as-best · retailer alternatives · Save) are REAL,
 * working controls — fully interactive for PAID/owner, and greyed + 🔒-lockchip + non-interactive for
 * FREE via the `.studio-frame.as-free .paid` pattern (pointer-events:none does the disabling, so the
 * SAME interactive markup serves both tiers). They refine the displayed result set client-side; the
 * Serper search itself is unchanged. Download PDF = everyone. Free = session-only.
 */
const ShoppingExperience: React.FC<Props> = (p) => {
  const { t } = useLanguage();
  const fileRef = useRef<HTMLInputElement>(null);
  const tier = p.user?.isPaid ? '' : ' as-free';
  const isPaidUser = !!p.user?.isPaid || (p.user?.shoppingListsLeft ?? 0) >= 999;

  const conceptUrl = p.selectedConceptUrl;
  const sourceImg = p.searchSourceImage || p.standaloneShoppingImage || conceptUrl || null;
  const listsLeft = p.user?.shoppingListsLeft ?? 3;
  const unlimited = listsLeft >= 999;
  const quotaLine = unlimited ? t('ai.unlimited') : `${listsLeft} ${t('ai.shopli.listsLeft')}`;

  // ── PAID refinement controls (real state; gated for free by .paid/as-free) ──
  // Find scope = MULTI-SELECT over the canonical taxonomy (paid refinement). Default = all on.
  const [findCats, setFindCats] = useState<Set<string>>(() => new Set(SHOPPING_TAXONOMY_IDS));
  const [budgetLevel, setBudgetLevel] = useState<BudgetLevel>('any');
  const [capOn, setCapOn] = useState(false);
  const [capValue, setCapValue] = useState<string>('');
  const [explainOpen, setExplainOpen] = useState(false);
  const roomCap = capOn && capValue ? Number(capValue) || null : null;
  const toggleCap = (on: boolean) => { setCapOn(on); if (on) setBudgetLevel('any'); };
  const [groupBy, setGroupBy] = useState<'list' | 'budget' | 'zone'>('list');
  const [bestIdx, setBestIdx] = useState<Record<number, number>>({});
  const [favourites, setFavourites] = useState<Set<number>>(new Set());

  // ── AC-002 — "Save list" persists the matched list to the user's Library so
  // it can be re-opened / re-downloaded later. Items live in metadata (no image
  // upload); sourceImg gives the list a thumbnail when available.
  const [listSaved, setListSaved] = useState(false);
  const [savingList, setSavingList] = useState(false);
  const listMark = p.shoppingResults.length ? fingerprint(JSON.stringify(p.shoppingResults)) : '';
  const listAlreadySaved = listSaved || (!!listMark && isSaved(listMark));
  const handleSaveList = async () => {
    if (savingList || listAlreadySaved || p.shoppingResults.length === 0) return;
    if (!isPaidUser) { p.navigateTo('pricing'); return; } // saving is paid-only
    setSavingList(true);
    try {
      const count = p.shoppingResults.length;
      await accountApi.saveLibraryItem({
        tool: 'shopping',
        title: `Shopping list — ${count} item${count === 1 ? '' : 's'}`,
        thumbnailUrl: sourceImg ?? undefined,
        metadata: { items: p.shoppingResults, country: p.shoppingCountry },
      });
      if (listMark) markSaved(listMark);
      setListSaved(true);
    } catch {
      /* non-fatal — the list is still downloadable as a PDF */
    } finally {
      setSavingList(false);
    }
  };
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const toggleNum = (s: Set<number>, v: number) => { const n = new Set(s); n.has(v) ? n.delete(v) : n.add(v); return n; };
  const toggleStr = (s: Set<string>, v: string) => { const n = new Set(s); n.has(v) ? n.delete(v) : n.add(v); return n; };
  const allOn = findCats.size === SHOPPING_TAXONOMY_IDS.length;
  const toggleAll = () => setFindCats(allOn ? new Set() : new Set(SHOPPING_TAXONOMY_IDS));
  /** A result group is shown if "All" is on, or its detected category maps to a selected taxonomy id. */
  const groupVisible = (cat?: string) => allOn || findCats.has(categoryToTaxonomyId(cat) || '');

  const offline = !!p.shoppingOffline;
  const view: 'landing' | 'entry' | 'scanning' | 'results' =
    p.shoppingDone && p.shoppingResults.length > 0 ? 'results'
      : p.shoppingLoading ? 'scanning'
        : (p.standaloneShoppingImage || conceptUrl) ? 'entry'
          : 'landing';

  // Normalize a group → its product list (free `products[]` or paid `byRetailer[]`).
  // #11: search returns ONE best match per item; extra options are fetched on demand.
  const productsOf = (group: any): any[] => (group.products && group.products.length > 0)
    ? group.products
    : (group.byRetailer || []).filter((e: any) => e.product).map((e: any) => ({ ...e.product, source: e.retailer }));

  // ── On-demand alternates (#11) — one extra retailer option per item, fetched only
  //    when the user asks (paid). Candidates = [server best, ...fetched alts]. ──
  const [altsByItem, setAltsByItem] = useState<Record<number, any[]>>({});
  const [altLoading, setAltLoading] = useState<Record<number, boolean>>({});
  const [altError, setAltError] = useState<Record<number, boolean>>({});
  const candidatesOf = (g: any, i: number): any[] => [...productsOf(g), ...(altsByItem[i] || [])];
  const onFindAnother = async (i: number, g: any, candidates: any[]) => {
    if (altLoading[i]) return;
    setAltLoading((s) => ({ ...s, [i]: true }));
    setAltError((s) => ({ ...s, [i]: false }));
    try {
      const exclude = candidates.map((c) => c.source).filter(Boolean);
      const alt = await p.fetchAlternate(g.item, exclude);
      if (alt && alt.link) setAltsByItem((s) => ({ ...s, [i]: [...(s[i] || []), alt] }));
      else setAltError((s) => ({ ...s, [i]: true }));
    } catch {
      setAltError((s) => ({ ...s, [i]: true }));
    } finally {
      setAltLoading((s) => ({ ...s, [i]: false }));
    }
  };

  // Interactive chip (real button; .paid wrapper greys+disables it for free).
  const selChip = (label: string, active: boolean, onClick: () => void) => (
    <button type="button" onClick={onClick} className={`px-4 py-2 border text-[11px] font-semibold transition ${active ? 'border-[#0047AB] bg-[#0047AB] text-white' : 'border-black/15 text-black/65 hover:border-black/40'}`}>{label}</button>
  );

  const countrySelect = (
    <div className="relative">
      <select
        value={p.shoppingCountry}
        onChange={(e) => p.setShoppingCountry(e.target.value)}
        className="w-full appearance-none border border-black/20 bg-white px-3.5 py-2.5 pr-9 text-[12px] font-semibold text-black/80 outline-none focus:border-[#0047AB] cursor-pointer"
      >
        {COUNTRIES.map((c) => <option key={c.value} value={c.value} disabled={!c.enabled}>{c.label}</option>)}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-black/60 text-[11px]">▾</span>
    </div>
  );

  // ── STATE 0 · LANDING ──────────────────────────────────────────────────
  const renderLanding = () => (
    <>
      <div className="statushdr">
        <div className="flex items-center gap-2.5"><span className="w-2 h-2 rounded-full bg-[#0047AB]" /><span className="text-[12px] font-bold uppercase tracking-[0.3em] text-black/60">{t('ai.shopli.statusReady')}</span></div>
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-black/60">{quotaLine}</span>
      </div>
      <div className="hero">
        <div className="hero-media"><img src={cld(SHOP_HERO, 2000, { crop: 'fill', aspectRatio: '16/9' })} alt="" /></div>
        <div className="hero-scrim" />
        <span className="badge-dark absolute top-6 left-6 text-[10px] font-bold uppercase tracking-[0.22em] px-3 py-1.5 z-10">{t('ai.shopli.yourRoom')}</span>
        <span className="badge-cobalt absolute top-6 right-6 text-[10px] font-bold uppercase tracking-[0.22em] px-3 py-1.5 z-10">{t('ai.shopli.itemsFound')}</span>
        <div className="hero-overlay" style={{ zIndex: 20 }}>
          <div className="glass px-10 py-10 md:px-12 md:py-12 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.34em] text-white/70 mb-3">{t('ai.shoppingList')}</p>
            <h1 className="hl text-[52px] md:text-[76px] leading-[0.92] mb-3">{t('ai.shopli.heroTitle')}<br /><em>{t('ai.shopli.heroTitleEm')}</em></h1>
            <span className="block w-16 h-[2px] rule-oxide mx-auto mb-5" />
            <p className="text-[14px] text-white/80 leading-relaxed max-w-[400px] mx-auto mb-8">{t('ai.shopli.heroSub')}</p>
            <button type="button" onClick={() => fileRef.current?.click()} className="cta-primary text-[12px] font-bold uppercase tracking-[0.24em] px-11 py-4 transition">{t('ai.shopli.uploadCta')}</button>
            {conceptUrl && (
              <div className="flex items-center justify-center gap-5 mt-5">
                <button type="button" onClick={() => p.runSearch({ budgetLevel, roomCap, scopeIds: allOn ? null : [...findCats] })} className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70 border-b border-white/30 pb-0.5 hover:text-white transition">{t('ai.shopli.shopConcept')}</button>
              </div>
            )}
          </div>
        </div>
        <span className="cap absolute bottom-6 left-1/2 -translate-x-1/2 text-[9px] font-bold uppercase tracking-[0.25em] px-4 py-2 z-10">{t('ai.shopli.heroCap')}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 border-b border-black/[0.08] text-center">
        <div className="px-8 py-7 border-r border-black/[0.08]"><p className="text-[11px] font-bold uppercase tracking-[0.28em] kicker mb-1.5">{t('ai.shopli.v1k')}</p><p className="text-[14px] text-black/55 leading-relaxed">{t('ai.shopli.v1b')}</p></div>
        <div className="px-8 py-7 border-r border-black/[0.08]"><p className="text-[11px] font-bold uppercase tracking-[0.28em] kicker mb-1.5">{t('ai.shopli.v2k')}</p><p className="text-[14px] text-black/55 leading-relaxed">{t('ai.shopli.v2b')}</p></div>
        <div className="px-8 py-7"><p className="text-[11px] font-bold uppercase tracking-[0.28em] kicker mb-1.5">{t('ai.shopli.v3k')}</p><p className="text-[14px] text-black/55 leading-relaxed">{t('ai.shopli.v3b')}</p></div>
      </div>
      <Marquee label={t('ai.shop.searchedAcross')} items={SHOPPING_LOGOS.map((l) => <LogoChip key={l.slug} slug={l.slug} name={l.name} />)} />
    </>
  );

  // ── STATE 1 · ENTRY ────────────────────────────────────────────────────
  const renderEntry = () => (
    <>
      <div className="titlehdr">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#9E5E41] mb-1.5">{t('ai.shoppingList')}</p>
          <h1 className="font-display text-[34px] md:text-[42px] leading-[1.0] text-black">{t('ai.shopli.entryTitle')} <em className="italic">{t('ai.shopli.entryTitleEm')}</em></h1>
        </div>
        <div className="flex items-center gap-4 pb-1">
          {p.shoppingResults.length > 0 && (
            <button
              type="button"
              onClick={p.onBackToResults}
              className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0047AB] border border-[#0047AB]/40 px-4 py-2 hover:border-[#0047AB] hover:bg-[#0047AB]/5 transition whitespace-nowrap"
            >
              ← {t('ai.shopli.backToList')}
            </button>
          )}
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-black/60 whitespace-nowrap">{quotaLine}</span>
        </div>
      </div>
      <div className="grid lg:grid-cols-[42%_58%] items-start" style={{ gap: '1px', background: 'rgba(0,0,0,.08)' }}>
        {/* LEFT — source image */}
        <div className="bg-white self-stretch" onDragOver={(e) => e.preventDefault()} onDrop={p.handleShopDrop}>
          <div className="relative bg-[#0e0e0e] overflow-hidden lg:sticky lg:top-0" style={{ aspectRatio: '1/1' }}>
            {sourceImg && <img src={cld(sourceImg, 1100, { crop: 'fill', aspectRatio: '1/1' })} alt="" className="absolute inset-0 w-full h-full object-cover" decoding="async" />}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(0,0,0,.15) 0%,rgba(0,0,0,0) 30%,rgba(0,0,0,.45) 100%)' }} />
            <span className="absolute top-6 left-6 bg-[#0047AB] text-white text-[9px] font-bold uppercase tracking-[0.22em] px-3 py-1.5">{t('ai.shopli.imageShopping')}</span>
            <button type="button" onClick={() => fileRef.current?.click()} className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/90 text-black text-[9px] font-bold uppercase tracking-[0.2em] px-4 py-2.5 hover:bg-white transition-colors">{t('ai.shopli.changeImage')}</button>
          </div>
          <p className="text-[10px] text-black/60 uppercase tracking-[0.16em] px-6 py-3">{t('ai.shopli.sourceCaption')}</p>
        </div>
        {/* RIGHT — controls */}
        <div className="bg-white p-6 md:p-9 flex flex-col gap-5" style={{ minHeight: 620 }}>
          <div className="px-6 py-4 text-white" style={{ background: '#0047AB' }}>
            <p className="text-[9px] font-bold uppercase tracking-[0.32em] text-white/75 mb-1.5">{t('ai.shopli.yourSearch')}</p>
            <p className="text-[15px] font-bold tracking-[0.04em]">{COUNTRIES.find((c) => c.value === p.shoppingCountry)?.label.replace(/^[^ ]+ /, '').replace(/ — .*/, '') || 'United States'} <span className="text-white/55 mx-0.5">·</span> {allOn ? t('ai.shopli.allCats') : `${findCats.size} ${t('ai.shopli.categoriesSel')}`}</p>
            <p className="font-display italic text-[19px] leading-snug mt-2 text-white/90">{t('ai.shopli.spottedLine')}</p>
          </div>
          {/* STEP 1 — country FREE + Find scope PAID */}
          <div>
            <div className="flex items-center gap-3 mb-1"><span className="w-5 h-5 bg-black text-white text-[9px] flex items-center justify-center font-bold">1</span><span className="text-[12px] font-bold uppercase tracking-[0.3em] text-black/70">{t('ai.shopli.whereToShop')}</span><span className="text-[10px] font-semibold text-[#9E5E41] tracking-[0.06em] uppercase">{t('ai.shopli.setsRetailers')}</span></div>
            <div className="mt-3">
              <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-black/60 mb-2 block">{t('ai.shopli.country')}</label>
              {countrySelect}
            </div>
            <div className="paid mt-3">
              <span className="lockchip">🔒 {t('ai.shopli.paid')}</span>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-black/60 mb-2">{t('ai.shopli.find')} <span className="text-black/40 normal-case tracking-normal font-semibold">· {t('ai.shopli.multiSelect')}</span></p>
              <div className="flex flex-wrap gap-2">
                {selChip(t('ai.shopli.findAll'), allOn, toggleAll)}
                {SHOPPING_TAXONOMY.map((c) => selChip(t(c.labelKey), findCats.has(c.id), () => setFindCats(toggleStr(findCats, c.id)))) }
              </div>
            </div>
          </div>
          {/* Optional refinements — PAID, real controls */}
          <div className="paid border border-black/12">
            <span className="lockchip">🔒 {t('ai.shopli.paid')}</span>
            <div className="w-full flex items-center justify-between px-4 py-3">
              <span className="text-[11px] font-bold uppercase tracking-[0.24em] text-black/60">{t('ai.shopli.optionalRefinements')}</span>
              <span className="text-[10px] text-black/55 uppercase tracking-[0.14em]">{t('ai.shopli.refinementsHint')} ▴</span>
            </div>
            <div className="px-4 pb-5 pt-2 flex flex-col gap-4">
              {/* Budget LEVEL — relative, "that quality in every category" */}
              <div className="flex items-center gap-3"><span className="w-5 h-5 border border-black/25 text-black/60 text-[9px] flex items-center justify-center font-bold">2</span><span className="text-[11px] font-bold uppercase tracking-[0.26em] text-black/60">{t('ai.shopli.budgetLevel')}</span></div>
              <p className="text-[11px] text-black/55 -mt-2">{t('ai.shopli.budgetLevelHelp')}</p>
              <div className={`grid grid-cols-4 gap-2 ${capOn ? 'opacity-50 pointer-events-none' : ''}`}>
                {BUDGET_LEVELS.map((lv) => {
                  const on = budgetLevel === lv;
                  return (
                    <button key={lv} type="button" onClick={() => { if (!capOn) setBudgetLevel(lv); }}
                      className={`border px-2 py-3 text-center transition ${on ? 'border-[#0047AB] bg-[#0047AB]/[0.06] shadow-[inset_0_0_0_1px_#0047AB]' : 'border-black/15 hover:border-black/40'}`}>
                      <div className={`text-[12px] font-bold uppercase tracking-[0.06em] ${on ? 'text-[#0047AB]' : 'text-black/80'}`}>{t(`ai.shopli.budget.${lv}`)}</div>
                      <div className="text-[9px] text-black/50 mt-0.5">{t(`ai.shopli.budgetSub.${lv}`)}</div>
                    </button>
                  );
                })}
              </div>
              {/* "What do these mean?" — per-category bands (default collapsed) */}
              <div>
                <button type="button" onClick={() => setExplainOpen((o) => !o)} className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0047AB] hover:underline flex items-center gap-1.5">
                  <span aria-hidden>{explainOpen ? '▾' : '▸'}</span> {t('ai.shopli.whatMean')}
                </button>
                {explainOpen && (
                  <div className="border border-black/10 mt-3 reveal-up">
                    <div className="px-4 py-2.5 bg-neutral-50 border-b border-black/10 text-[10px] font-bold uppercase tracking-[0.2em] text-black/55">
                      {budgetLevel === 'any' ? t('ai.shopli.bandsNoFilter') : t('ai.shopli.bandsHead').replace('{level}', t(`ai.shopli.budget.${budgetLevel}`))}
                    </div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 px-4 py-4">
                      {SHOPPING_TAXONOMY.map((c) => (
                        <div key={c.id} className="flex justify-between text-[12px]">
                          <span className="text-black/60">{t(c.labelKey)}</span>
                          <span className={budgetLevel === 'any' ? 'text-black/35' : 'font-semibold text-black/80'}>{budgetLevel === 'any' ? t('ai.shopli.bandAny') : BUDGET_BANDS[budgetLevel][c.id]}</span>
                        </div>
                      ))}
                    </div>
                    <p className="px-4 pb-3 text-[10px] text-black/40">{t('ai.shopli.bandsCaption')}</p>
                  </div>
                )}
              </div>
              {/* Optional whole-room cap → auto-Any + lock levels */}
              <div className="border-t border-black/8 pt-4">
                <label className="flex items-center gap-2.5 cursor-pointer mb-2">
                  <input type="checkbox" checked={capOn} onChange={(e) => toggleCap(e.target.checked)} className="w-4 h-4 accent-[#0047AB]" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-black/70">{t('ai.shopli.capLabel')}</span>
                  <span className="text-[10px] text-black/45 normal-case tracking-normal">{t('ai.shopli.optional')}</span>
                </label>
                {capOn && (
                  <div className="ml-7 flex items-center gap-3">
                    <span className="text-[11px] font-semibold text-black/55">{t('ai.shopli.keepUnder')}</span>
                    <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40 text-[12px]">$</span>
                      <input type="number" value={capValue} onChange={(e) => setCapValue(e.target.value)} placeholder="6,000" className="w-[120px] border border-black/20 pl-[22px] pr-3 py-2 text-[13px] font-semibold outline-none focus:border-[#0047AB]" /></div>
                  </div>
                )}
                {capOn && <p className="ml-7 mt-2 text-[11px] text-[#9E5E41]">{t('ai.shopli.capNote')}</p>}
              </div>
            </div>
          </div>
          <div className="mt-auto pt-1 flex items-center gap-4">
            <button type="button" onClick={() => p.runSearch({ budgetLevel, roomCap, scopeIds: allOn ? null : [...findCats] })} disabled={!sourceImg || listsLeft <= 0} className="cta-primary flex-1 text-[13px] font-bold uppercase tracking-[0.25em] py-4 transition disabled:opacity-40 disabled:cursor-not-allowed">{t('ai.shopli.findProducts')}</button>
            <span className="text-[11px] text-black/60 uppercase tracking-[0.18em] whitespace-nowrap">~15 {t('ai.shopli.sec')}</span>
          </div>
          {listsLeft <= 0 && !p.user?.isPaid && (
            <div className="bg-white border border-black/10 p-5 text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-black/55 mb-1.5">{t('ai.shopli.freeComplete')}</p>
              <p className="text-[14px] font-bold text-black mb-4 leading-snug">{t('ai.shopli.usedAll')}</p>
              <button type="button" onClick={() => p.navigateTo('pricing')} className="bg-[#0047AB] text-white px-6 py-3 text-[10px] font-bold uppercase tracking-[0.28em] hover:bg-[#003d99] transition-colors">{t('ai.shopli.upgrade')}</button>
            </div>
          )}
        </div>
      </div>
      <Marquee label={t('ai.shop.searchedAcross')} items={SHOPPING_LOGOS.map((l) => <LogoChip key={l.slug} slug={l.slug} name={l.name} />)} />
    </>
  );

  // ── STATE 2 · SCANNING ─────────────────────────────────────────────────
  const renderScanning = () => {
    return (
      <>
        <div className="statushdr">
          <div className="flex items-center gap-2.5"><span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /><span className="text-[12px] font-bold uppercase tracking-[0.3em] text-black/60">{t('ai.shopli.identifying')}</span></div>
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-black/60">{t('ai.shopli.usingOne').replace('{n}', String(listsLeft))}</span>
        </div>
        <div className="hero">
          <div className="hero-media"><img src={cld(sourceImg || SHOP_HERO, 2000, { crop: 'fill', aspectRatio: '16/9' })} alt="" /></div>
          <div className="absolute inset-0 bg-black/60" />
          <div className="scanline" aria-hidden />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 text-center px-8 z-10">
            <div className="w-12 h-12 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-white/70">~15 {t('ai.shopli.sec')}</p>
            <p className="hl text-[30px] md:text-[40px] text-white/95 leading-tight animate-pulse max-w-[680px]">{t('ai.shopli.searchingPhrase')}</p>
          </div>
        </div>
      </>
    );
  };

  // ── STATE 3 · RESULTS ──────────────────────────────────────────────────
  const productLink = (link?: string, retailer?: string) => (
    link && link !== '#'
      ? <a href={link} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#0047AB] border-b border-[#0047AB]/40 hover:border-[#0047AB] transition">{t('ai.shop.viewAt')} {retailer} →</a>
      : <span className="text-[10px] uppercase tracking-[0.14em] text-black/45">{retailer}</span>
  );

  const renderResults = () => {
    // Build the displayed groups (original index preserved for control state).
    let groups = p.shoppingResults
      .map((g: any, i: number) => ({ g, i }))
      .filter(({ g }) => groupVisible(g.item?.category));
    const primaryPrice = ({ g, i }: { g: any; i: number }) => {
      const candidates = candidatesOf(g, i);
      const bi = Math.min(bestIdx[i] ?? 0, Math.max(0, candidates.length - 1));
      return priceOf(candidates[bi]?.price);
    };
    if (groupBy === 'budget') groups = [...groups].sort((a, b) => primaryPrice(b) - primaryPrice(a));
    else if (groupBy === 'zone') groups = [...groups].sort((a, b) => (a.g.item?.category || '').localeCompare(b.g.item?.category || ''));

    const activeGroups = groups.filter(({ i }) => !excluded.has(i));
    const total = activeGroups.reduce((s, gr) => s + primaryPrice(gr), 0);
    const count = activeGroups.length;
    const groupByBtn = (key: 'list' | 'budget' | 'zone', label: string) => (
      <button type="button" onClick={() => setGroupBy(key)} className={`text-[10px] font-bold uppercase tracking-[0.14em] px-3 py-1.5 transition ${groupBy === key ? 'bg-black text-white' : 'text-black/55 hover:text-black'}`}>{label}</button>
    );

    return (
      <>
        <div className="statushdr">
          <div className="flex items-center gap-2.5"><span className="w-2 h-2 rounded-full bg-[#15803d]" /><span className="text-[12px] font-bold uppercase tracking-[0.3em] text-black/60">{t('ai.shopli.listReady').replace('{n}', String(count))}</span></div>
          <div className="flex gap-2">
            <button type="button" onClick={p.onEditSearch} className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/60 border border-black/15 px-4 py-2 hover:border-black/40 hover:text-black transition">{t('ai.shopli.editSearch')}</button>
            <button type="button" onClick={p.onStartOver} className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/60 border border-black/15 px-4 py-2 hover:border-black/40 hover:text-black transition">{t('ai.shopli.startOver')}</button>
          </div>
        </div>
        <div className="px-6 md:px-10 py-8">
          <div className="grid lg:grid-cols-[1fr_1.15fr] gap-12 items-start">
            <div className="lg:sticky lg:top-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] kicker mb-3">{t('ai.shopli.yourInterior')}</p>
              <div className="relative overflow-hidden bg-black shadow-[0_24px_50px_rgba(0,0,0,0.18)]" style={{ aspectRatio: '1/1' }}>
                {sourceImg && <img src={cld(sourceImg, 1100, { crop: 'fill', aspectRatio: '1/1' })} alt="" className="w-full h-full object-cover" decoding="async" />}
              </div>
              <p className="text-[11px] text-black/60 mt-3 leading-relaxed">{p.searchSourceIsStandalone ? t('ai.shopli.fromUpload') : t('ai.shopli.fromConcept')}</p>
            </div>
            <div>
              {/* INPUTS SUMMARY — visible to all tiers */}
              <div className="border border-black/10 bg-neutral-50 px-4 py-3 mb-4 flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] font-bold uppercase tracking-[0.16em] text-black/55">
                  <span>{COUNTRIES.find((c) => c.value === p.shoppingCountry)?.label.replace(/^[^ ]+ /, '').replace(/ — .*/, '') || 'United States'}</span>
                  <span className="text-black/20">·</span>
                  <span>{allOn ? t('ai.shopli.allCats') : (SHOPPING_TAXONOMY.filter((c) => findCats.has(c.id)).map((c) => t(c.labelKey)).join(', ') || t('ai.shopli.noneSel'))}</span>
                  <span className="text-black/20">·</span>
                  <span>{t('ai.shopli.budgetLabel')}: {t(`ai.shopli.budget.${budgetLevel}`)}{roomCap ? ` · ≤$${roomCap.toLocaleString()}` : ''}</span>
                </div>
                <p className="text-[11px] font-semibold text-black/70">
                  {isPaidUser
                    ? `${p.shoppingTotalIdentified || count} ${t('ai.shopli.items')}`
                    : t('ai.shopli.freeCountLine').replace('{m}', String(p.shoppingTotalIdentified || count)).replace('{n}', String(p.shoppingResults.length))}
                </p>
              </div>
              <div className="flex items-end justify-between mb-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] kicker">{t('ai.shopli.yourList')}</p>
                <p className="text-[12px] font-bold">{t('ai.shopli.estTotal')} · <span className={roomCap && total > roomCap ? 'text-[#9E5E41]' : 'text-black'}>${total.toLocaleString()}</span>{roomCap && total > roomCap && <span className="ml-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9E5E41]">{t('ai.shopli.overCap')}</span>}</p>
              </div>
              {/* Group by — PAID, real */}
              <div className="paid mb-4">
                <span className="lockchip">🔒 {t('ai.shopli.paid')}</span>
                <div className="flex items-center gap-2 border border-black/12 bg-neutral-50 px-3 py-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-black/60">{t('ai.shopli.groupBy')}</span>
                  {groupByBtn('list', t('ai.shopli.listOrder'))}{groupByBtn('budget', t('ai.shopli.budgetTier'))}{groupByBtn('zone', t('ai.shopli.roomZone'))}
                </div>
              </div>
              <div className="flex flex-col gap-3">
                {groups.map(({ g, i }, displayIdx) => {
                  const candidates = candidatesOf(g, i);
                  const bi = Math.min(bestIdx[i] ?? 0, Math.max(0, candidates.length - 1));
                  const best = candidates[bi];
                  const altCards = candidates.map((pr: any, k: number) => ({ pr, k })).filter(({ k }) => k !== bi);
                  const isExcluded = excluded.has(i);
                  const isFav = favourites.has(i);
                  const loadingAlt = !!altLoading[i];
                  return (
                    <div key={i} className={`bg-white border ${isExcluded ? 'border-black/10 opacity-50' : 'border-black/10'}`}>
                      <div className="flex items-stretch">
                        <div className="relative flex-shrink-0 overflow-hidden bg-neutral-100 flex items-center justify-center" style={{ width: 'clamp(78px,24%,112px)', aspectRatio: '1/1' }}>
                          {best?.thumbnail
                            ? <img src={best.thumbnail} alt={best.title || g.item?.category} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                            : <span className="text-black/25 text-[10px] font-bold uppercase tracking-wide px-2 text-center">{g.item?.category}</span>}
                          <span className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-black/80 text-white text-[10px] font-bold flex items-center justify-center">{displayIdx + 1}</span>
                        </div>
                        <div className="min-w-0 flex-1 px-4 py-3 flex flex-col justify-center gap-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[9px] font-bold uppercase tracking-[0.2em] kicker">{g.item?.category}</p>
                            <div className="flex items-center gap-2">
                              <span className="paid"><span className="lockchip">🔒</span>
                                <button type="button" onClick={() => setFavourites(toggleNum(favourites, i))} title={t('ai.shopli.favourite')} className={`text-[14px] leading-none transition ${isFav ? 'text-[#9E5E41]' : 'text-black/35 hover:text-[#9E5E41]'}`}>{isFav ? '♥' : '♡'}</button>
                              </span>
                              <span className="paid"><span className="lockchip">🔒</span>
                                <button type="button" onClick={() => setExcluded(toggleNum(excluded, i))} title={t('ai.shopli.include')} className={`text-[11px] font-bold w-5 h-5 border flex items-center justify-center transition ${isExcluded ? 'border-black/30 text-transparent' : 'border-[#0047AB] bg-[#0047AB] text-white'}`}>✓</button>
                              </span>
                            </div>
                          </div>
                          <p className="text-[13px] font-semibold leading-[1.3]">{best?.title || g.item?.description || g.item?.category}</p>
                          <div className="flex items-center justify-between gap-3 mt-1 pt-2 border-t border-black/10">
                            {productLink(best?.link, best?.source)}
                            {best?.price && <span className="text-[13px] font-bold whitespace-nowrap">{best.price}</span>}
                          </div>
                        </div>
                      </div>
                      {/* fetched alternates (on demand) */}
                      {altCards.length > 0 && (
                        <div className="flex gap-2.5 px-4 py-3 overflow-x-auto border-t border-black/8">
                          {altCards.map(({ pr, k }) => (
                            <div key={k} className="flex-shrink-0 w-[150px] border border-black/10 bg-neutral-50 p-2.5">
                              <p className="text-[9px] font-bold uppercase tracking-[0.12em] kicker truncate">{pr.source}</p>
                              <p className="text-[13px] font-semibold leading-tight line-clamp-2 my-0.5">{pr.title}</p>
                              <p className="text-[12px] font-bold">{pr.price}</p>
                              {pr.link && pr.link !== '#' && <a href={pr.link} target="_blank" rel="noopener noreferrer" className="block text-[9px] font-bold uppercase tracking-[0.1em] text-[#0047AB] mt-1 hover:underline">{t('ai.shop.viewAt')} {pr.source} →</a>}
                              <button type="button" onClick={() => setBestIdx({ ...bestIdx, [i]: k })} className="mt-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[#0047AB] hover:underline">↑ {t('ai.shopli.setAsBest')}</button>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* on-demand "find another option" — PAID, one extra Serper call for THIS item */}
                      <div className="paid border-t border-black/8">
                        <span className="lockchip">🔒 {t('ai.shopli.paid')}</span>
                        <button type="button" onClick={() => onFindAnother(i, g, candidates)} disabled={loadingAlt}
                          className="w-full text-left px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#0047AB] hover:bg-[#0047AB]/5 transition disabled:opacity-50 flex items-center gap-2">
                          {loadingAlt ? t('ai.shopli.findingAlt') : t('ai.shopli.findAnother')}
                        </button>
                        {altError[i] && <p className="px-4 pb-2 text-[10px] text-[#9E5E41]">{t('ai.shopli.noAltFound')}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* FREE-TIER TEASER — identified-but-not-searched items (names only, locked) + upgrade CTA.
                  Server sends an empty teaser for paid, so this naturally hides for paid users. */}
              {p.shoppingTeaser.length > 0 && (
                <div className="mt-5 border border-dashed border-black/25 bg-neutral-50 p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#9E5E41] mb-3">{t('ai.shopli.teaserTitle')}</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {p.shoppingTeaser.map((it, k) => (
                      <span key={k} className="inline-flex items-center gap-1.5 border border-black/15 bg-white/70 px-3 py-2 text-[11px] grayscale opacity-80">
                        <span aria-hidden>🔒</span>
                        <span className="font-semibold text-black/70">{it.category}</span>
                        {it.label && it.label !== it.category && <span className="text-black/45">· {it.label}</span>}
                      </span>
                    ))}
                  </div>
                  <button type="button" onClick={() => p.navigateTo('pricing')} className="w-full bg-[#0047AB] text-white text-[12px] font-bold uppercase tracking-[0.22em] py-3.5 hover:bg-[#003d99] transition-colors">
                    {t('ai.shopli.upgradeToShop').replace('{n}', String(p.shoppingTeaser.length))}
                  </button>
                </div>
              )}
              <div className="border-t border-[#DAD2C3] mt-7 pt-6 flex flex-col gap-3">
                <button type="button" onClick={() => void p.handleDownloadShoppingPDF()} className="w-full bg-black text-white text-[12px] font-bold uppercase tracking-[0.22em] py-4 flex items-center justify-center gap-2 hover:bg-black/85 transition">{t('ai.shopli.downloadPdf')}</button>
                <div className="paid">
                  <span className="lockchip">🔒 {t('ai.shopli.paid')}</span>
                  <button type="button" onClick={handleSaveList} disabled={savingList || listAlreadySaved} className="w-full inline-flex items-center justify-center gap-2 border border-[#0047AB] text-[#0047AB] text-[11px] font-bold uppercase tracking-[0.2em] py-3.5 hover:bg-[#0047AB]/5 transition disabled:opacity-60">{listAlreadySaved ? '✓ Saved to My Studio' : savingList ? 'Saving…' : t('ai.shopli.saveList')}</button>
                </div>
                <p className="text-[11px] text-black/60 text-center leading-relaxed">{t('ai.shopli.disclaimer')}</p>
              </div>
            </div>
          </div>
        </div>
        {/* One conversion band per AI result — $99 review + full-project rung.
            Replaces the old "Book the studio → /pricing" mis-point. */}
        <ConsultationReviewBand tool="shopping" />
      </>
    );
  };

  return (
    <div className={`studio-frame${tier} bg-white w-full`} id="shop-this-look">
      <input ref={fileRef} type="file" className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) p.processShoppingFile(f); e.target.value = ''; }} />
      {offline
        ? <div className="px-6 md:px-10 py-10"><ShoppingOfflineCard code={p.shoppingOffline!.code} resetAt={p.shoppingOffline!.resetAt} /></div>
        : view === 'results' ? renderResults()
          : view === 'scanning' ? renderScanning()
            : view === 'entry' ? renderEntry()
              : renderLanding()}
    </div>
  );
};

export default ShoppingExperience;
