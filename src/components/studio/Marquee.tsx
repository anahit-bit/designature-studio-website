import React from 'react';

interface MarqueeProps {
  /** Leading label, e.g. "Styles you'll meet". */
  label: string;
  /** Items to scroll — style names or retailer nodes. */
  items: React.ReactNode[];
}

/**
 * Locked marquee row: a fixed label + an infinite, hover-pausing ticker. Items
 * are duplicated so the 30s `translateX(-50%)` loop is seamless.
 */
const Marquee: React.FC<MarqueeProps> = ({ label, items }) => (
  <div className="px-10 py-6 flex items-center gap-7 border-t border-black/[0.08]">
    <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-black/60 flex-shrink-0">{label}</span>
    <div className="marquee flex-1 overflow-hidden">
      <div className="marquee-track text-[15px] font-bold text-black/60">
        {[...items, ...items].map((item, i) => (
          <span key={i}>{item}</span>
        ))}
      </div>
    </div>
  </div>
);

export default Marquee;
