import React, { useMemo, useState } from 'react';
import { EXPLORER_TOOLS, PHASES, type ExplorerTool } from './explorerRoster';

interface ExplorerRailProps {
  /** Currently-selected tool slug. */
  selectedId: string;
  /** Called with a tool slug when a card is clicked. */
  onSelect: (id: string) => void;
  /** Slugs of LIVE tools the user has actually run this session (→ "✓ Used" marker). */
  usedIds?: Set<string>;
}

// ── Filters ────────────────────────────────────────────────────────────────
type Filter = 'all' | 'live' | 'free' | 'design' | 'studio';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'live', label: 'Live' },
  { id: 'free', label: 'Free' },
  { id: 'design', label: 'Design' },
  { id: 'studio', label: 'Studio' },
];

const MATCH: Record<Filter, (t: ExplorerTool) => boolean> = {
  all: () => true,
  live: (t) => t.status === 'live',
  free: (t) => t.lvl === 'free',
  design: (t) => t.lvl === 'design',
  studio: (t) => t.lvl === 'studio',
};

const COUNT_LABEL: Record<Filter, string> = {
  all: 'tools',
  live: 'live now',
  free: 'on the Free tier',
  design: 'in the Design package',
  studio: 'in the Studio package',
};

// ── Live card — photographic, action-forward (things you can use today) ─────
function LiveCard({
  tool,
  active,
  used,
  onSelect,
}: {
  tool: ExplorerTool;
  active: boolean;
  used: boolean;
  onSelect: (id: string) => void;
}) {
  const featured = !!tool.featured;
  return (
    <button
      type="button"
      onClick={() => onSelect(tool.id)}
      aria-current={active ? 'true' : undefined}
      className={`block w-[calc(100%-28px)] mx-[14px] mb-2.5 text-left rounded-[11px] p-3 border transition-all duration-150 hover:-translate-y-0.5 ${
        active
          ? // SELECTED — the single cobalt meaning
            'border-[#5b8def] bg-[#0047AB]/[0.14] shadow-[0_0_0_1px_#5b8def_inset]'
          : featured
          ? // FEATURED (not selected) — distinguished by elevation + ribbon, NOT blue
            'border-white/20 bg-white/[0.06] shadow-[0_8px_24px_-16px_rgba(0,0,0,0.9)] hover:border-[#5b8def]/50 hover:bg-[#0047AB]/[0.08]'
          : 'border-white/[0.14] bg-white/[0.055] hover:border-[#5b8def]/60 hover:bg-[#0047AB]/[0.10]'
      }`}
    >
      {featured && (
        <span className="inline-block text-[8.5px] font-bold uppercase tracking-[0.2em] text-white/70 bg-white/10 border border-white/15 rounded-full px-2.5 py-[3px] mb-2.5">
          Most popular
        </span>
      )}
      <div className="flex items-center gap-3">
        <span
          className="rounded-[9px] flex-shrink-0 bg-cover bg-center"
          style={{
            width: featured ? 60 : 54,
            height: featured ? 60 : 54,
            backgroundImage: tool.photo ? `url('${tool.photo}')` : tool.vis,
          }}
        />
        <div className="min-w-0">
          <div className={`font-display ${featured ? 'text-[22px]' : 'text-[20px]'} leading-[1.05] text-white`}>
            {tool.name}
          </div>
          <div className="text-[11px] text-white/55 leading-[1.4] mt-0.5 line-clamp-2">{tool.tagline}</div>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-white/[0.09]">
        <span className="w-[7px] h-[7px] rounded-full bg-[#5b8def] shadow-[0_0_0_3px_rgba(91,141,239,0.18)]" />
        <span className="text-[10px] font-semibold text-white/75">Live · {tool.tier}</span>
        {used && (
          <span
            title="You've used this tool this session"
            className="flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#5fca80]"
          >
            ✓ Used
          </span>
        )}
        <span className="ml-auto text-[10px] font-bold uppercase tracking-[0.16em] text-[#5b8def]">Open →</span>
      </div>
    </button>
  );
}

// ── Coming card — quiet, explanatory (give/get is the pitch) ────────────────
function SoonCard({
  tool,
  active,
  onSelect,
}: {
  tool: ExplorerTool;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  const paid = tool.lvl !== 'free';
  const chip = tool.status === 'later' ? 'Later' : 'Soon';
  return (
    <button
      type="button"
      onClick={() => onSelect(tool.id)}
      aria-current={active ? 'true' : undefined}
      className={`block w-[calc(100%-28px)] mx-[14px] mb-2.5 text-left rounded-[11px] p-3.5 border transition-all duration-150 hover:-translate-y-0.5 ${
        active
          ? 'opacity-100 border-[#C97A60] shadow-[0_0_0_1px_rgba(201,122,96,0.5)_inset] bg-white/[0.02]'
          : 'opacity-90 border-white/[0.07] bg-white/[0.018] hover:opacity-100 hover:border-white/20'
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className="w-[40px] h-[40px] rounded-lg flex-shrink-0 bg-cover relative"
          style={{ backgroundImage: tool.vis }}
        >
          <span
            aria-hidden
            className="absolute inset-0 rounded-lg"
            style={{ background: 'repeating-linear-gradient(135deg,transparent 0 6px,rgba(0,0,0,0.35) 6px 7px)' }}
          />
        </span>
        <div className="min-w-0">
          <div className="font-display text-[18px] leading-[1.05] text-white/70">{tool.name}</div>
        </div>
      </div>
      <p className="text-[11px] text-white/[0.42] leading-[1.4] mt-2">{tool.tagline}</p>
      <div className="border border-white/[0.09] rounded-md overflow-hidden mt-2.5">
        <div className="grid grid-cols-[46px_1fr]">
          <span className="text-[8px] font-bold uppercase tracking-[0.14em] px-[7px] py-1.5 bg-white/[0.04] text-white/50">
            Give
          </span>
          <span className="text-[10.5px] leading-[1.35] px-2.5 py-1.5 text-white/70">{tool.give}</span>
        </div>
        <div className="grid grid-cols-[46px_1fr] border-t border-white/[0.09]">
          <span className="text-[8px] font-bold uppercase tracking-[0.14em] px-[7px] py-1.5 bg-[#8E3F2D]/[0.18] text-[#C97A60]">
            Get
          </span>
          <span className="text-[10.5px] leading-[1.35] px-2.5 py-1.5 text-white/70">{tool.get}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2.5">
        <span className={`text-[9px] font-bold uppercase tracking-[0.16em] ${paid ? 'text-[#C97A60]' : 'text-white/50'}`}>
          {tool.tier}
        </span>
        <span className="ml-auto text-[8px] font-bold uppercase tracking-[0.16em] px-2 py-[3px] rounded-[3px] bg-[#8E3F2D]/[0.28] text-[#C97A60]">
          {chip}
        </span>
      </div>
    </button>
  );
}

/**
 * AI-021 EXPLORER left rail — a filterable, status-driven card list grouped by the
 * 5 phases (+ Anytime). Dark-themed per the confirmed direction. Live tools read as
 * usable (photo + "Open →"); coming tools stay quiet and carry give/get as the pitch;
 * one featured card is the single accent. Filters default to Live so the page opens
 * on just the 4 usable tools. Presentational only — emits onSelect(id).
 */
const ExplorerRail: React.FC<ExplorerRailProps> = ({ selectedId, onSelect, usedIds }) => {
  const [filter, setFilter] = useState<Filter>('live');

  const groups = useMemo(() => {
    const fn = MATCH[filter];
    let total = 0;
    const rows = PHASES.map((phase, pi) => {
      const items = EXPLORER_TOOLS.filter((t) => t.phase === pi && fn(t));
      total += items.length;
      return { phase, items };
    }).filter((g) => g.items.length > 0);
    return { rows, total };
  }, [filter]);

  return (
    <aside className="w-full lg:w-[430px] lg:flex-shrink-0 bg-[#0d0d0d] border-b lg:border-b-0 lg:border-r border-white/[0.08] pt-6 pb-12 lg:sticky lg:top-24 lg:self-start lg:h-[calc(100vh-6rem)] lg:overflow-y-auto">
      <div className="px-[22px] pb-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.34em] text-[#C97A60] mb-2">AI Design Studio</p>
        <h2 className="font-display text-[28px] leading-none text-white">The whole journey.</h2>
      </div>

      {/* Filter bar — defaults to Live */}
      <div className="flex flex-wrap gap-[7px] px-[22px] pt-4 pb-1.5">
        {FILTERS.map((f) => {
          const on = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              aria-pressed={on}
              className={`text-[10px] font-bold uppercase tracking-[0.13em] rounded-full px-[13px] py-1.5 border transition-colors ${
                on
                  ? 'bg-[#0047AB] border-[#0047AB] text-white'
                  : 'border-white/[0.16] text-white/60 hover:border-white/35 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>
      <p className="px-6 pb-2 text-[11px] text-white/40">
        Showing {groups.total} {COUNT_LABEL[filter]}
      </p>

      {groups.rows.map(({ phase, items }, idx) => {
        const liveN = items.filter((t) => t.status === 'live').length;
        return (
          <div key={phase.name}>
            <div
              className={`flex items-center gap-3 px-[22px] pt-5 pb-3 ${
                idx === 0 ? '' : 'border-t border-white/[0.07] mt-1.5'
              }`}
            >
              <span className="text-[12px] text-white/40 leading-none">▾</span>
              <span className="font-display text-[21px] font-semibold text-[#C97A60] leading-none">{phase.num}</span>
              <span className="font-display text-[23px] font-semibold text-white leading-none">{phase.name}</span>
              {liveN > 0 ? (
                <span className="ml-auto text-[9px] font-bold uppercase tracking-[0.14em] text-[#5b8def]">
                  {liveN} live
                </span>
              ) : (
                <span className="ml-auto text-[11px] font-semibold text-white/45 bg-white/[0.06] rounded-full px-2.5 py-0.5">
                  {items.length}
                </span>
              )}
            </div>
            {items.map((tool) =>
              tool.status === 'live' ? (
                <LiveCard
                  key={tool.id}
                  tool={tool}
                  active={tool.id === selectedId}
                  used={!!usedIds?.has(tool.id)}
                  onSelect={onSelect}
                />
              ) : (
                <SoonCard key={tool.id} tool={tool} active={tool.id === selectedId} onSelect={onSelect} />
              ),
            )}
          </div>
        );
      })}
    </aside>
  );
};

export default ExplorerRail;
