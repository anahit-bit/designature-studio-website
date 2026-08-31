import React, { useState } from 'react';
import { Check, Diamond, Loader2 } from 'lucide-react';
import { accountApi, type DesignerReview } from '../../lib/accountApi';

/**
 * ─── AI-038 · Designer Check ─────────────────────────────────────────────
 * Ask a designer to look at the thing you just made.
 *
 * v1 is WRITTEN NOTES, not a call (owner decision 2026-08-30). So there is no
 * calendar here, no slot picker, and deliberately no turnaround promise — the
 * studio cannot control when a person is free, and a missed time costs more
 * trust than never having named one.
 *
 * It attaches to ONE saved artifact. That is what makes the note worth
 * anything: the designer is looking at your actual room, not a description of
 * it. Which is also why the work has to be saved before a check can be asked
 * for — and why the button says so rather than failing.
 */

const VERDICT: Record<
  NonNullable<DesignerReview['verdict']>,
  { label: string; className: string }
> = {
  go: { label: 'Good to go', className: 'text-[#15803D] border-[#15803D]/35 bg-[#15803D]/[0.07]' },
  fix: { label: 'Change this first', className: 'text-[#9E5E41] border-[#9E5E41]/35 bg-[#9E5E41]/[0.07]' },
  wont_work: { label: "This won't work", className: 'text-[#9E5E41] border-[#9E5E41]/55 bg-[#9E5E41]/[0.12]' },
};

const DesignerCheck: React.FC<{
  /** The saved item to review. Null until the visitor has saved their work. */
  itemId: string | null;
  /** Roster id of the card the artifact came from. */
  tool: string;
  /** Roster id of the card they are heading to — the join this check sits on. */
  nextTool?: string | null;
  scenario?: string | null;
  /** Shown when there is nothing saved yet, so the ask is explainable. */
  onNeedsSave?: () => void;
  /** An existing review for this item, if the caller already knows of one. */
  initial?: DesignerReview | null;
}> = ({ itemId, tool, nextTool, scenario, onNeedsSave, initial = null }) => {
  const [review, setReview] = useState<DesignerReview | null>(initial);
  const [open, setOpen] = useState(false);
  const [ask, setAsk] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!itemId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await accountApi.requestReview({
        itemId,
        tool,
        nextTool: nextTool ?? null,
        scenario: scenario ?? null,
        ask: ask.trim() || null,
      });
      setReview(r.review);
      setOpen(false);
    } catch (e: any) {
      setError(e?.message || 'Could not request that check. Try again in a moment.');
    } finally {
      setBusy(false);
    }
  };

  // ── Answered: the note is the whole point, so it leads ──
  if (review?.status === 'answered' && review.verdict) {
    const v = VERDICT[review.verdict];
    return (
      <div className={`border px-5 py-4 ${v.className}`}>
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4" aria-hidden="true" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{v.label}</span>
        </div>
        <p className="text-[14px] text-black/80 leading-relaxed mt-2.5 whitespace-pre-wrap">
          {review.note}
        </p>
        <p className="text-[10px] uppercase tracking-[0.14em] text-black/40 mt-3">
          Reviewed by a Designature designer
        </p>
      </div>
    );
  }

  // ── Waiting. No promised time — see the header comment ──
  if (review) {
    return (
      <div className="border border-black/12 bg-[#FAFAFA] px-5 py-4 flex items-center gap-3">
        <Diamond className="w-3.5 h-3.5 text-[#9E5E41] shrink-0" aria-hidden="true" />
        <div>
          <p className="text-[13.5px] text-black/80 leading-snug">
            <strong className="font-semibold text-black">A designer has this.</strong> The notes
            will show up here when they&rsquo;re done.
          </p>
          <p className="text-[11.5px] text-black/50 leading-snug mt-1">
            Keep going — nothing here is waiting on it.
          </p>
        </div>
      </div>
    );
  }

  // ── Nothing saved yet: say so, rather than offering a button that fails ──
  if (!itemId) {
    return (
      <div className="border border-dashed border-black/15 px-5 py-4">
        <p className="text-[13.5px] text-black/60 leading-snug">
          <strong className="font-semibold text-black/80">Want a designer to look at this?</strong>{' '}
          Save it first — a review is written against the saved version.
        </p>
        {onNeedsSave && (
          <button
            type="button"
            onClick={onNeedsSave}
            className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#0047AB] mt-2.5 hover:underline underline-offset-4"
          >
            Save it now
          </button>
        )}
      </div>
    );
  }

  // ── The ask ──
  return (
    <div className="border border-black/12 px-5 py-4">
      {!open ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13.5px] text-black/75 leading-snug">
            <strong className="font-semibold text-black">Want a designer to look at this?</strong>{' '}
            You&rsquo;ll get written notes back.
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="shrink-0 inline-flex items-center gap-2 border border-[#9E5E41] text-[#9E5E41] px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] hover:bg-[#9E5E41]/[0.06] transition-colors"
          >
            <Diamond className="w-3.5 h-3.5" aria-hidden="true" /> Ask for a check
          </button>
        </div>
      ) : (
        <div>
          <label
            htmlFor="designer-check-ask"
            className="block text-[10px] font-bold uppercase tracking-[0.2em] text-black/45"
          >
            Anything you want them to look at?
          </label>
          <textarea
            id="designer-check-ask"
            value={ask}
            onChange={(e) => setAsk(e.target.value.slice(0, 500))}
            rows={3}
            placeholder="Optional — e.g. will this layout work with the door where it is?"
            className="w-full mt-2 border border-black/15 px-3 py-2.5 text-[13.5px] leading-snug focus:outline-none focus:border-[#0047AB]"
          />
          <div className="flex items-center justify-between gap-3 mt-1">
            <span className="text-[10px] text-black/35">{ask.length}/500</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/40 hover:text-black"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={busy}
                className="inline-flex items-center gap-2 bg-[#9E5E41] text-white px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] disabled:opacity-60"
              >
                {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
                {busy ? 'Sending…' : 'Send it'}
              </button>
            </div>
          </div>
          {error && <p className="text-[12px] text-[#9E5E41] mt-2">{error}</p>}
        </div>
      )}
    </div>
  );
};

export default DesignerCheck;
