import React from 'react';
import { LogOut } from 'lucide-react';
import type { AuthUser } from '../../AuthContext';
import {
  PHASES,
  PLAN_NAME,
  PRICE,
  type ExplorerTool,
  type ToolLevel,
} from './explorerRoster';

const statusWord = (s: ExplorerTool['status']) =>
  s === 'live' ? 'Live now' : s === 'later' ? 'On the roadmap' : 'Coming soon';

/**
 * Light-themed panel header shown above every selected tool (live or not). Replaces
 * the old cobalt "active tool" stripe AND absorbs the auth area from the removed
 * page hero: the logged-out Google button (#google-signin-btn — the render effect in
 * AIConceptsPage targets this id) or the logged-in account chip + quota.
 */
export const ExplorerPanelHeader: React.FC<{
  tool: ExplorerTool;
  user: AuthUser | null;
  authLoading: boolean;
  onLogout: () => void;
  unlimitedLabel: string;
  remainingLabel: string;
  unlockAllLabel: string;
  noCardLabel: string;
}> = ({ tool, user, authLoading, onLogout, unlimitedLabel, remainingLabel, unlockAllLabel, noCardLabel }) => {
  const phase = PHASES[tool.phase];
  const paid = tool.lvl !== 'free';
  const statusColor =
    tool.status === 'live' ? 'text-[#0047AB]' : 'text-[#9E5E41]';

  return (
    <div className="border-b border-black/10 bg-white px-6 md:px-10 py-5 flex items-start justify-between gap-6 flex-wrap">
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-black/45 mb-2">
          Phase {phase.num} · {phase.name} ·{' '}
          <span className={statusColor}>{statusWord(tool.status)}</span>
        </div>
        <div className="flex items-baseline gap-3.5 flex-wrap">
          <h2 className="font-display text-[34px] md:text-[40px] leading-none text-black">
            {tool.name}
          </h2>
          <span
            className={`text-[10px] font-bold uppercase tracking-[0.2em] ${
              paid ? 'text-[#9E5E41]' : 'text-black/55'
            }`}
          >
            {tool.tier}
          </span>
        </div>
        <p className="text-[13px] text-black/60 leading-[1.55] max-w-[46rem] mt-2.5">
          {tool.tagline}
        </p>
      </div>

      <div className="w-full md:w-auto md:min-w-[240px] flex-shrink-0">
        {authLoading ? (
          <div className="h-[42px]" />
        ) : user ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 p-2.5 bg-black/[0.03] border border-black/10 rounded-md">
              {user.picture && (
                <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-bold text-black truncate">{user.name}</div>
                <div className="text-[11px] text-black/55 truncate">{user.email}</div>
              </div>
              <button type="button" onClick={onLogout} aria-label="Sign out">
                <LogOut className="w-3.5 h-3.5 text-black/50 hover:text-black transition-colors" />
              </button>
            </div>
            <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-black/70">
              {user.generationsLeft >= 999
                ? unlimitedLabel
                : `${user.generationsLeft} ${remainingLabel}`}
            </div>
          </div>
        ) : (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-black/70 mb-2">
              {unlockAllLabel}
            </p>
            <div id="google-signin-btn" className="w-full min-h-[42px]" />
            <p className="text-[10px] uppercase tracking-[0.18em] text-black/50 mt-2">
              {noCardLabel}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Coming-Soon panel for the 12 not-yet-built tools. Tier-aware copy per the confirmed
 * mockup. No blurred teaser (owner-locked decision #3). Subscriptions aren't shipped
 * yet, so paid tools point to /pricing via `onSeePlans` rather than a checkout.
 */
export const ComingSoonPanel: React.FC<{
  tool: ExplorerTool;
  user: AuthUser | null;
  onSeePlans: () => void;
}> = ({ tool, user, onSeePlans }) => {
  const paid = tool.lvl !== 'free';
  const hasAccess = !!user?.isPaid; // no subscription tiers yet → isPaid is the only "paid" signal
  const plan = paid ? PLAN_NAME[tool.lvl as Exclude<ToolLevel, 'free'>] : null;
  const price = paid ? PRICE[tool.lvl as Exclude<ToolLevel, 'free'>] : null;

  let tierLine: React.ReactNode;
  if (!paid) {
    tierLine = <>Will be free to try.</>;
  } else if (hasAccess) {
    tierLine = <>Included in your {plan} plan — you’ll get it automatically at launch.</>;
  } else {
    tierLine = (
      <>
        Included in <b className="text-[#9E5E41]">{plan}</b> ({price}) — the day it ships,
        it’s yours.
      </>
    );
  }

  return (
    <div className="flex-1 px-6 md:px-10 py-10">
      <div className="max-w-[42rem] mx-auto text-center border border-black/10 rounded-xl bg-[#FAFAFA] px-8 md:px-10 py-12">
        <span className="inline-block text-[10px] font-bold uppercase tracking-[0.3em] text-[#9E5E41] border border-[#9E5E41]/40 rounded-full px-3.5 py-1.5 mb-5">
          {statusWord(tool.status)}
        </span>
        <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-black/[0.04] flex items-center justify-center text-3xl text-black/25">
          ✦
        </div>

        <div className="border border-black/10 rounded-lg overflow-hidden text-left max-w-[26rem] mx-auto mb-5">
          <div className="grid grid-cols-[56px_1fr]">
            <span className="text-[8px] font-bold uppercase tracking-[0.14em] px-2.5 py-2 leading-[1.3] bg-black/[0.04] text-black/55">
              Give
            </span>
            <span className="text-[11px] leading-[1.4] px-3 py-2 text-black/75">{tool.give}</span>
          </div>
          <div className="grid grid-cols-[56px_1fr] border-t border-black/10">
            <span className="text-[8px] font-bold uppercase tracking-[0.14em] px-2.5 py-2 leading-[1.3] bg-[#0047AB]/10 text-[#0047AB]">
              Get
            </span>
            <span className="text-[11px] leading-[1.4] px-3 py-2 text-black/75">{tool.get}</span>
          </div>
        </div>

        <p className="text-[12px] text-black/60 leading-[1.6]">{tierLine}</p>

        {paid && !hasAccess && (
          <button
            type="button"
            onClick={onSeePlans}
            className="inline-flex items-center gap-2.5 bg-[#0047AB] text-white px-6 py-3 text-[11px] font-bold uppercase tracking-[0.18em] rounded-md mt-6 hover:bg-[#003d99] transition-colors"
          >
            See {plan} plans →
          </button>
        )}

        <p className="text-[10px] uppercase tracking-[0.14em] text-black/40 mt-6">
          New tools land in the Journal &amp; newsletter first.
        </p>

        {tool.chain && (
          <p className="text-[12px] text-black/45 mt-5">{tool.chain}</p>
        )}
      </div>
    </div>
  );
};
