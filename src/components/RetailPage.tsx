import React, { useEffect, useMemo, useState } from 'react'
import { Search, MapPin, Phone, Globe, Instagram, Facebook, BadgePercent, CheckCircle2, X } from 'lucide-react'
import { fetchArmenianRetailers } from '../lib/sanity'
import {
  FALLBACK_ARMENIAN_RETAILERS,
  type ArmenianRetailer,
  type Budget,
  type CollabClass,
} from '../data/armenianRetailers'

const OXIDE = '#9E5E41'
const NAVY = '#0B2240'

const BUDGET_LABEL: Record<Budget, string> = { low: 'Low', mid: 'Mid', high: 'High' }

/** favicon for a retailer website (fast, no upload needed until logos are added). */
function faviconFor(website?: string): string | null {
  if (!website) return null
  try {
    const host = new URL(website).hostname
    return `https://www.google.com/s2/favicons?sz=64&domain=${host}`
  } catch {
    return null
  }
}

/** Turn bare domains / URLs inside notes into clickable links. */
function linkify(text: string): React.ReactNode {
  const parts = text.split(/(\bhttps?:\/\/[^\s,)]+|\b[a-z0-9-]+\.(?:com|am|ru|net|co|es|io)\b)/gi)
  return parts.map((part, i) => {
    if (/^(https?:\/\/|[a-z0-9-]+\.(?:com|am|ru|net|co|es|io)\b)/i.test(part)) {
      const href = part.startsWith('http') ? part : `https://${part}`
      return (
        <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="underline decoration-black/30 hover:decoration-black">
          {part}
        </a>
      )
    }
    return <React.Fragment key={i}>{part}</React.Fragment>
  })
}

// ── Clickable badge helpers ───────────────────────────────────────────────────
// Every badge on a card is a filter toggle: click to filter by it, click the
// same one (or its chip in the active-filter bar) to clear.

const CategoryBadge: React.FC<{ value: string; active: boolean; onClick: () => void }> = ({ value, active, onClick }) => (
  <button
    onClick={onClick}
    title={`Filter by ${value}`}
    className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium transition hover:opacity-85"
    style={{ background: active ? OXIDE : NAVY, color: 'white' }}
  >
    {value}
  </button>
)

const BudgetBadge: React.FC<{ budget?: Budget; active: boolean; onClick: () => void }> = ({ budget, active, onClick }) => {
  if (!budget) return null
  return (
    <button
      onClick={onClick}
      title={`Filter by ${BUDGET_LABEL[budget]} budget`}
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition hover:opacity-85"
      style={active ? { background: OXIDE, color: 'white' } : { background: '#F3ECE8', color: OXIDE }}
    >
      {BUDGET_LABEL[budget]} budget
    </button>
  )
}

const ClassBadge: React.FC<{ value: CollabClass; active: boolean; onClick: () => void }> = ({ value, active, onClick }) => (
  <button
    onClick={onClick}
    title={`Filter by Class ${value}`}
    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition hover:border-black/40 ${
      active ? 'border text-white' : 'border border-black/15 text-black/60'
    }`}
    style={active ? { background: NAVY, borderColor: NAVY } : undefined}
  >
    Class {value}
  </button>
)

const TagChip: React.FC<{ value: string; active: boolean; onClick: () => void }> = ({ value, active, onClick }) => (
  <button
    onClick={onClick}
    title={`Show all "${value}" shops`}
    className={`rounded px-1.5 py-0.5 text-[11px] transition ${
      active ? 'text-white' : 'bg-black/[0.04] text-black/50 hover:bg-black/10'
    }`}
    style={active ? { background: OXIDE } : undefined}
  >
    #{value}
  </button>
)

const RetailerCard: React.FC<{
  r: ArmenianRetailer
  category: string
  budget: 'All' | Budget
  collabClass: 'All' | CollabClass
  activeTag: string | null
  onCategory: (v: string) => void
  onBudget: (v: Budget) => void
  onClass: (v: CollabClass) => void
  onTag: (v: string) => void
}> = ({ r, category, budget, collabClass, activeTag, onCategory, onBudget, onClass, onTag }) => {
  const favicon = faviconFor(r.website)
  return (
    <div className="group flex flex-col rounded-2xl border border-black/10 bg-white p-5 transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#FAFAFA] ring-1 ring-black/5">
          {favicon ? (
            <img src={favicon} alt="" className="h-7 w-7" loading="lazy" />
          ) : (
            <span className="font-display text-lg" style={{ color: NAVY }}>
              {r.nameEN.charAt(0)}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-xl leading-tight" style={{ color: NAVY }}>
            {r.nameEN}
          </h3>
          {r.nameAM && r.nameAM !== r.nameEN && (
            <p className="truncate text-sm text-black/50">{r.nameAM}</p>
          )}
        </div>
        {r.status === 'active' && (
          <CheckCircle2 size={16} className="mt-1 shrink-0 text-green-600" aria-label="Verified operating" />
        )}
      </div>

      {/* Meta row — all clickable filters */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <CategoryBadge value={r.category} active={category === r.category} onClick={() => onCategory(r.category)} />
        <BudgetBadge budget={r.budget} active={!!r.budget && budget === r.budget} onClick={() => r.budget && onBudget(r.budget)} />
        {r.collabClass && r.collabClass !== 'unsorted' && (
          <ClassBadge value={r.collabClass} active={collabClass === r.collabClass} onClick={() => onClass(r.collabClass as CollabClass)} />
        )}
      </div>

      {r.description && <p className="mt-3 text-sm leading-relaxed text-black/70">{r.description}</p>}

      {r.deal && (
        <div
          className="mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-xs"
          style={{ background: '#F3ECE8', color: OXIDE }}
        >
          <BadgePercent size={14} className="mt-0.5 shrink-0" />
          <span className="font-medium leading-snug">{r.deal}</span>
        </div>
      )}

      {r.notes && (
        <div className="mt-3 rounded-lg border border-dashed border-black/15 bg-black/[0.02] px-3 py-2 text-xs leading-snug text-black/60">
          <span className="font-semibold uppercase tracking-wider text-black/45" style={{ fontSize: '10px' }}>
            Ships from / notes
          </span>
          <p className="mt-1">{linkify(r.notes)}</p>
        </div>
      )}

      {r.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {r.tags.map((t) => (
            <TagChip key={t} value={t} active={activeTag === t} onClick={() => onTag(t)} />
          ))}
        </div>
      )}

      {/* Footer: contact */}
      <div className="mt-auto pt-4">
        {(r.contact || r.phone || r.address) && (
          <div className="space-y-1 text-xs text-black/60">
            {r.contact && <div>{r.contact}</div>}
            {r.phone && (
              <div className="flex items-center gap-1.5">
                <Phone size={12} /> {r.phone}
              </div>
            )}
            {r.address && (
              <div className="flex items-center gap-1.5">
                <MapPin size={12} /> {r.address}
              </div>
            )}
          </div>
        )}
        <div className="mt-3 flex items-center gap-3">
          {r.website && (
            <a href={r.website} target="_blank" rel="noopener noreferrer" className="text-black/50 hover:text-black" aria-label="Website">
              <Globe size={17} />
            </a>
          )}
          {r.instagram && (
            <a href={r.instagram} target="_blank" rel="noopener noreferrer" className="text-black/50 hover:text-black" aria-label="Instagram">
              <Instagram size={17} />
            </a>
          )}
          {r.facebook && (
            <a href={r.facebook} target="_blank" rel="noopener noreferrer" className="text-black/50 hover:text-black" aria-label="Facebook">
              <Facebook size={17} />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

/** A removable pill in the active-filter bar. */
const ActiveFilter: React.FC<{ label: string; onClear: () => void }> = ({ label, onClear }) => (
  <button
    onClick={onClear}
    className="inline-flex items-center gap-1 rounded-full border border-black/15 bg-white px-2.5 py-1 text-xs text-black/70 hover:border-black/40"
  >
    {label}
    <X size={12} />
  </button>
)

const RetailPage: React.FC = () => {
  const [retailers, setRetailers] = useState<ArmenianRetailer[]>(
    () => FALLBACK_ARMENIAN_RETAILERS.filter((r) => r.status === 'active'),
  )
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('All')
  const [budget, setBudget] = useState<'All' | Budget>('All')
  const [collabClass, setCollabClass] = useState<'All' | CollabClass>('All')
  const [activeTag, setActiveTag] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    fetchArmenianRetailers().then((list) => {
      if (alive && list.length) setRetailers(list)
    })
    return () => {
      alive = false
    }
  }, [])

  const categories = useMemo(() => {
    const set = new Set(retailers.map((r) => r.category).filter(Boolean))
    return ['All', ...Array.from(set).sort()]
  }, [retailers])

  // Toggle helpers — clicking an already-active value clears it.
  const toggleCategory = (v: string) => setCategory((c) => (c === v ? 'All' : v))
  const toggleBudget = (v: Budget) => setBudget((b) => (b === v ? 'All' : v))
  const toggleClass = (v: CollabClass) => setCollabClass((c) => (c === v ? 'All' : v))
  const toggleTag = (v: string) => setActiveTag((t) => (t === v ? null : v))

  const clearAll = () => {
    setQuery('')
    setCategory('All')
    setBudget('All')
    setCollabClass('All')
    setActiveTag(null)
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return retailers.filter((r) => {
      if (category !== 'All' && r.category !== category) return false
      if (budget !== 'All' && r.budget !== budget) return false
      if (collabClass !== 'All' && r.collabClass !== collabClass) return false
      if (activeTag && !(r.tags ?? []).includes(activeTag)) return false
      if (!q) return true
      const hay = [r.nameEN, r.nameAM, r.category, r.deal, r.description, ...(r.tags ?? [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [retailers, query, category, budget, collabClass, activeTag])

  const hasFilters = query || category !== 'All' || budget !== 'All' || collabClass !== 'All' || activeTag

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {/* Compact internal header — no marketing chrome */}
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-black/10 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-3xl" style={{ color: NAVY }}>
              Retail Network
            </h1>
            <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-black/50">
              Internal
            </span>
          </div>
          <p className="mt-1 text-sm text-black/55">
            Supplier &amp; collaboration directory · Designature Studio. For internal use.
          </p>
        </div>
        <div className="text-sm text-black/50">
          {retailers.length} {retailers.length === 1 ? 'shop' : 'shops'} total
        </div>
      </header>

      {/* Controls */}
      <div className="sticky top-0 z-10 -mx-6 mb-6 border-b border-black/10 bg-[#F5F6F8]/95 px-6 py-4 backdrop-blur">
        <div className="flex flex-col gap-3">
          {/* Row 1: search + budget + class */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search shops, tags, materials…"
                className="w-full rounded-full border border-black/15 bg-white py-2 pl-9 pr-4 text-sm outline-none focus:border-black/40"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="mr-1 text-[11px] uppercase tracking-wider text-black/40">Budget</span>
                {(['All', 'low', 'mid', 'high'] as const).map((b) => (
                  <button
                    key={b}
                    onClick={() => setBudget(b)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                      budget === b ? 'text-white' : 'border border-black/15 text-black/60 hover:border-black/40'
                    }`}
                    style={budget === b ? { background: OXIDE } : undefined}
                  >
                    {b === 'All' ? 'All' : BUDGET_LABEL[b]}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1">
                <span className="mr-1 text-[11px] uppercase tracking-wider text-black/40">Class</span>
                {(['All', 'A', 'B', 'C'] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCollabClass(c)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                      collabClass === c ? 'text-white' : 'border border-black/15 text-black/60 hover:border-black/40'
                    }`}
                    style={collabClass === c ? { background: NAVY } : undefined}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {/* Row 2: category chips */}
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`rounded-full px-3 py-1 text-xs transition ${
                  category === c ? 'text-white' : 'border border-black/10 text-black/55 hover:border-black/30'
                }`}
                style={category === c ? { background: NAVY } : undefined}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Result count + active filters */}
      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-black/55">
        <CheckCircle2 size={14} className="text-green-600" />
        <span>
          {filtered.length} {filtered.length === 1 ? 'shop' : 'shops'}
        </span>
        {hasFilters && (
          <>
            <span className="text-black/25">·</span>
            {query && <ActiveFilter label={`“${query}”`} onClear={() => setQuery('')} />}
            {category !== 'All' && <ActiveFilter label={category} onClear={() => setCategory('All')} />}
            {budget !== 'All' && <ActiveFilter label={`${BUDGET_LABEL[budget as Budget]} budget`} onClear={() => setBudget('All')} />}
            {collabClass !== 'All' && <ActiveFilter label={`Class ${collabClass}`} onClear={() => setCollabClass('All')} />}
            {activeTag && <ActiveFilter label={`#${activeTag}`} onClear={() => setActiveTag(null)} />}
            <button onClick={clearAll} className="ml-1 text-xs text-black/45 underline hover:text-black/70">
              Clear all
            </button>
          </>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="py-20 text-center text-black/40">No shops match those filters.</p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <RetailerCard
              key={r.id}
              r={r}
              category={category}
              budget={budget}
              collabClass={collabClass}
              activeTag={activeTag}
              onCategory={toggleCategory}
              onBudget={toggleBudget}
              onClass={toggleClass}
              onTag={toggleTag}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default RetailPage
