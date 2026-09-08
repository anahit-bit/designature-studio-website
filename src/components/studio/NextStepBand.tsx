import React from 'react';
import { ArrowRight } from 'lucide-react';
import { nextToolFor } from './explorerRoster';

/**
 * ─── The seam (AI-032 v2) ────────────────────────────────────────────────
 * The handoff at the end of a finished run.
 *
 * Every card in the roster already knew what comes next — it was sitting in
 * `chain` as a grey sentence on the tool's *intro* screen, where it is least
 * useful and nobody reads it. This moves that knowledge to the moment it is
 * actionable (the run just finished) and turns it into a control.
 *
 * Before this, every completed run was a dead end: you finished, and went back
 * to a grid of nineteen cards to re-decide from scratch.
 *
 * Deliberately generic — the same next step for everyone. The AI-032 router
 * upgrades it later to *your* next step; this needs no survey, no persistence
 * and no model call, so it can ship on its own.
 *
 * Honesty rule: when the next card is not built yet we say so plainly rather
 * than offering a button that goes nowhere.
 */
const NextStepBand: React.FC<{
  /** Roster id of the tool whose result is on screen. */
  toolId: string;
  /** Select another card. Routes through the page's guard, which asks before
   *  discarding an unsaved result — never navigate around it. */
  onGo?: (id: string) => void;
}> = ({ toolId, onGo }) => {
  const next = nextToolFor(toolId);
  if (!next) return null;

  const ready = next.status === 'live';

  return (
    <div className="bg-white border-t border-black/8 px-6 md:px-10 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-black/40">
          Next in your workflow
        </p>
        <p className="text-[15px] text-black/85 leading-snug mt-1.5">
          <strong className="font-semibold text-black">{next.name}</strong>
          <span className="text-black/60"> — {next.get}</span>
        </p>
      </div>

      {ready && onGo ? (
        <button
          type="button"
          onClick={() => onGo(next.id)}
          className="shrink-0 inline-flex items-center gap-2.5 bg-[#0047AB] text-white px-6 py-3 text-[11px] font-bold uppercase tracking-[0.18em] rounded-md hover:bg-[#003d99] transition-colors"
        >
          Continue <ArrowRight className="w-[15px] h-[15px]" />
        </button>
      ) : (
        <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45 border border-black/15 border-dashed px-4 py-2.5 rounded-md">
          Not built yet
        </span>
      )}
    </div>
  );
};

export default NextStepBand;
