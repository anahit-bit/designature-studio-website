import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

/**
 * ─── AI-032 v2 · the scroll nudge ────────────────────────────────────────
 * Someone who has been scrolling the rail for a while is, by that act, telling
 * us they have not found their card. This offers the guided route once — quietly,
 * from the corner, without covering anything.
 *
 * The rules that keep it from being an ad:
 *  · It waits for BOTH real scrolling and real time. Either alone is a false
 *    positive — a fast scroll is browsing, a long dwell is reading.
 *  · It fires once per session and never returns after it is dismissed.
 *  · It never appears for someone who already has a workflow, or who already
 *    opened the survey. They are not confused; they are working.
 *  · It never appears mid-generation.
 *  · No overlay, no scrim, no focus steal. Escape closes it.
 */

const DISMISS_KEY = 'ds_studio_nudge_dismissed';
const ROUTER_KEY = 'ds_studio_router_v2';

/** Scroll far enough to have passed several cards… */
export const NUDGE_SCROLL_PX = 1400;
/** …and stayed long enough that it is not a flick to the footer. */
export const NUDGE_DWELL_MS = 20_000;

/** Has this visitor already engaged with the router this session? */
export function alreadyRouted(): boolean {
  try {
    if (sessionStorage.getItem(DISMISS_KEY)) return true;
    const raw = sessionStorage.getItem(ROUTER_KEY);
    if (!raw) return false;
    return Object.keys(JSON.parse(raw) as Record<string, unknown>).length > 0;
  } catch {
    return false; // storage blocked — showing it once is the safer failure
  }
}

const StudioNudge: React.FC<{
  /** Open the Start-here panel. */
  onOpen: () => void;
  /** Suppress while a generation is running — never interrupt work. */
  busy?: boolean;
}> = ({ onOpen, busy }) => {
  const [show, setShow] = useState(false);
  const scrolled = useRef(false);
  const dwelled = useRef(false);

  useEffect(() => {
    if (alreadyRouted()) return;

    const maybeShow = () => {
      if (scrolled.current && dwelled.current) setShow(true);
    };
    const onScroll = () => {
      if (window.scrollY >= NUDGE_SCROLL_PX) {
        scrolled.current = true;
        maybeShow();
      }
    };
    const timer = window.setTimeout(() => {
      dwelled.current = true;
      maybeShow();
    }, NUDGE_DWELL_MS);

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const dismiss = () => {
    setShow(false);
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* fine — it just may reappear */ }
  };

  useEffect(() => {
    if (!show) return;
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss(); };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [show]);

  if (!show || busy) return null;

  return (
    <div
      role="complementary"
      aria-label="Find your workflow"
      className="fixed z-40 bottom-5 left-5 right-5 sm:right-auto sm:max-w-[352px] bg-white border border-black/12 shadow-[0_24px_60px_rgba(0,0,0,0.28)] p-5 motion-safe:animate-[ds-nudge_.3s_ease-out]"
    >
      <style>{`
        @keyframes ds-nudge {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute top-3 right-3 text-black/35 hover:text-black transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9E5E41]">
        Nineteen cards is a lot
      </p>
      <p className="font-display text-[23px] leading-[1.15] text-black mt-1.5">
        Want us to pick your four?
      </p>
      <p className="text-[13px] text-black/60 leading-relaxed mt-2">
        Four questions, about a minute — and you get a workflow in the right order instead of a
        menu.
      </p>

      <div className="flex items-center gap-4 mt-4">
        <button
          type="button"
          onClick={() => { dismiss(); onOpen(); }}
          className="bg-[#0047AB] text-white px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.18em] rounded-md hover:bg-[#003d99] transition-colors"
        >
          Find my workflow
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/40 hover:text-black"
        >
          I'm fine
        </button>
      </div>
    </div>
  );
};

export default StudioNudge;
