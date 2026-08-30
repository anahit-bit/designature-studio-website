import React, { useEffect, useMemo, useState } from 'react';
import { EXPLORER_TOOLS, PHASES, type ExplorerTool } from './explorerRoster';
import type { RouterResult } from '../../data/studioRouter';

interface ExplorerRailProps {
  /** Currently-selected tool slug. */
  selectedId: string;
  /** Called with a tool slug when a card is clicked. */
  onSelect: (id: string) => void;
  /** Slugs of LIVE tools the user has actually run this session (→ "✓ Used" marker). */
  usedIds?: Set<string>;
  /** Open the AI-032 "Start here" survey. Pinned above the catalogue. */
  onStartHere?: () => void;
  /** True while the survey panel is the thing on screen. */
  startHereOn?: boolean;
  /** The visitor's workflow, once they have one. The rail leads with it. */
  workflow?: RouterResult | null;
  onOpenStep?: (id: string) => void;
  onChangeWorkflow?: () => void;
  onClearWorkflow?: () => void;
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
const ExplorerRail: React.FC<ExplorerRailProps> = ({
  selectedId, onSelect, usedIds, onStartHere, startHereOn,
  workflow, onOpenStep, onChangeWorkflow, onClearWorkflow,
}) => {
  // With a workflow in hand the catalogue stops being the point — it collapses
  // to one line. It never disappears: a workflow is an offer, not a cage.
  //
  // It has to follow the workflow as it ARRIVES, not just as it was at mount —
  // the workflow is usually built after the rail is already on screen. Once the
  // visitor toggles it themselves, their choice wins and we stop steering.
  const [catalogueOpen, setCatalogueOpen] = useState(!workflow);
  const [catalogueTouched, setCatalogueTouched] = useState(false);
  useEffect(() => {
    if (!catalogueTouched) setCatalogueOpen(!workflow);
  }, [workflow, catalogueTouched]);
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

      {/* Pinned above the catalogue, and never filtered away: the answer to
          "which of these nineteen is mine?" has to sit above the nineteen. */}
      {onStartHere && (
        <button
          type="button"
          onClick={onStartHere}
          aria-current={startHereOn ? 'true' : undefined}
          className={`block w-[calc(100%-28px)] mx-[14px] mt-4 text-left rounded-[11px] p-3.5 border transition-all duration-150 hover:-translate-y-0.5 ${
            startHereOn
              ? 'bg-[#0047AB]/20 border-[#0047AB]'
              : 'bg-[#C97A60]/10 border-dashed border-[#C97A60]/55 hover:border-[#C97A60]'
          }`}
        >
          <span className="block text-[9.5px] font-bold uppercase tracking-[0.2em] text-[#C97A60]">
            Start here
          </span>
          <span className="block font-display text-[21px] leading-[1.12] text-white mt-1">
            Don&rsquo;t know where to start?
          </span>
          <span className="block text-[11.5px] text-white/55 leading-[1.45] mt-1.5">
            Four questions, about a minute. You get your own short path — in the right order.
          </span>
        </button>
      )}


      {/* ── The visitor's own workflow, once they have one ── */}
      {workflow && workflow.steps.length > 0 && (
        <div className="mx-[14px] mt-4 rounded-[12px] border border-[#0047AB]/50 bg-[#0047AB]/10 p-[15px_14px]">
          <div className="flex items-baseline justify-between gap-2.5">
            <span className="text-[9.5px] font-bold uppercase tracking-[0.2em] text-[#5b8def]">
              Your workflow
            </span>
            <span className="text-[9.5px] text-white/40">{workflow.steps.length} steps</span>
          </div>
          <h3 className="font-display text-[22px] font-semibold text-white leading-[1.1] mt-1">
            {workflow.scenario?.name}
          </h3>

          <ol className="mt-3">
            {workflow.steps.map((s) => {
              const current = s.tool.id === selectedId;
              const openable = s.tool.status === 'live';
              return (
                <li key={s.tool.id} className="border-b border-white/[0.08] last:border-b-0">
                  <button
                    type="button"
                    disabled={!openable}
                    onClick={() => openable && onOpenStep?.(s.tool.id)}
                    aria-current={current ? 'true' : undefined}
                    className={`w-full grid grid-cols-[19px_minmax(0,1fr)_auto] gap-2.5 items-center py-2 text-left ${
                      openable ? 'cursor-pointer' : 'cursor-default'
                    }`}
                  >
                    <span
                      className={`text-[10.5px] ${
                        current ? 'text-[#5b8def]' : s.isBlocker ? 'text-[#C97A60]' : 'text-white/40'
                      }`}
                    >
                      {current ? '\u25B6' : String(s.step).padStart(2, '0')}
                    </span>
                    <span
                      className={`text-[12.5px] font-semibold leading-tight truncate ${
                        current ? 'text-white' : openable ? 'text-white/75' : 'text-white/35'
                      }`}
                    >
                      {s.tool.name}
                    </span>
                    <span className="text-[8.5px] font-bold uppercase tracking-[0.1em] text-white/40">
                      {current ? 'Here' : openable ? 'Open' : 'Soon'}
                    </span>
                  </button>
                  {s.check && (
                    <span className="flex items-center gap-2 pb-1.5 pl-[29px] text-[10px] text-white/35">
                      <span className={s.check.level === 'high' ? 'text-[#C97A60]' : 'text-white/25'}>
                        &#9670;
                      </span>
                      {s.check.level === 'high' ? 'Designer check \u2014 worth it here' : 'Designer check'}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>

          <div className="flex gap-3 items-center mt-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onChangeWorkflow}
              className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-white/50 hover:text-white"
            >
              Change my workflow
            </button>
            <button
              type="button"
              onClick={onClearWorkflow}
              className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-white/50 hover:text-white"
            >
              Start over
            </button>
          </div>
        </div>
      )}

      {workflow && (
        <button
          type="button"
          onClick={() => { setCatalogueTouched(true); setCatalogueOpen((v) => !v); }}
          aria-expanded={catalogueOpen}
          className="flex items-center gap-2.5 w-[calc(100%-28px)] mx-[14px] mt-3.5 rounded-[10px] border border-white/[0.14] px-[13px] py-3 text-left text-[12.5px] font-semibold text-white/65 hover:text-white hover:border-white/30"
        >
          {catalogueOpen ? '\u25BE' : '\u25B8'} All {EXPLORER_TOOLS.length} tools
          <span className="ml-auto text-[10px] text-white/40">
            {catalogueOpen ? 'Hide' : 'Browse'}
          </span>
        </button>
      )}

      {catalogueOpen && (<>
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
      </>)}
    </aside>
  );
};

export default ExplorerRail;
