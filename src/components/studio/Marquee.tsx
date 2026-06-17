import React, { useLayoutEffect, useRef, useState } from 'react';

interface MarqueeProps {
  /** Leading label, e.g. "Styles you'll meet". */
  label: string;
  /** Items to scroll — style names or retailer nodes. */
  items: React.ReactNode[];
}

/**
 * Locked marquee row: a fixed label + an infinite, hover-pausing ticker. The track is two
 * identical halves and the CSS loop is `translateX(-50%)` — seamless ONLY while one half is
 * at least as wide as the viewport. Sparse content (a handful of logos on a wide screen) is
 * narrower than that, which used to expose a blank gap before the loop restarted. So we
 * repeat the set `reps` times per half, measured from the live track and re-fit on
 * resize / image-load. (CSS for `.marquee` / `.marquee-track` lives in index.css, scoped to
 * `.studio-frame` — the row must render inside one.)
 */
const Marquee: React.FC<MarqueeProps> = ({ label, items }) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const itemsLenRef = useRef(items.length);
  itemsLenRef.current = items.length;
  const [reps, setReps] = useState(1);

  useLayoutEffect(() => {
    const fit = () => {
      const vp = viewportRef.current?.clientWidth ?? 0;
      const full = trackRef.current?.scrollWidth ?? 0;
      const n = itemsLenRef.current;
      const children = trackRef.current?.children.length ?? 0;
      if (vp <= 0 || full <= 0 || n <= 0 || children <= 0) return;
      const setsRendered = children / n;     // currently 2 × reps (read from the DOM, no stale state)
      const oneSet = full / setsRendered;    // width of a single item-set (incl. its gaps) — reps-invariant
      if (oneSet <= 0) return;
      const needed = Math.min(16, Math.max(1, Math.ceil(vp / oneSet)));
      setReps((r) => (r === needed ? r : needed));
    };
    fit();
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(fit);
      if (viewportRef.current) ro.observe(viewportRef.current);
      if (trackRef.current) ro.observe(trackRef.current);
    }
    return () => ro?.disconnect();
  }, []);

  // One half of the track = the item-set repeated `reps` times; the row duplicates it.
  const half = Array.from({ length: reps }).flatMap(() => items);

  return (
    <div className="px-10 py-6 flex items-center gap-7 border-t border-black/[0.08]">
      <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-black/60 flex-shrink-0">{label}</span>
      <div ref={viewportRef} className="marquee flex-1 overflow-hidden">
        <div ref={trackRef} className="marquee-track text-[15px] font-bold text-black/60">
          {[...half, ...half].map((item, i) => (
            <span key={i}>{item}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Marquee;
