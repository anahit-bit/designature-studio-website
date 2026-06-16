import React from 'react';

export interface ValueStripItem {
  /** Oxide kicker, e.g. "1 · Swipe". */
  kicker: string;
  /** One line of black/65 copy. */
  body: string;
}

/**
 * Locked 3-col value strip (oxide kickers + one line each). Per the lock this
 * lives ONLY on a Landing/logged-out one-pager — never repeated inside setup.
 */
const ValueStrip: React.FC<{ items: ValueStripItem[] }> = ({ items }) => (
  <div className="grid grid-cols-1 sm:grid-cols-3 border-b border-black/[0.08] text-center">
    {items.map((item, i) => (
      <div key={item.kicker} className={`px-8 py-7 ${i < items.length - 1 ? 'border-r border-black/[0.08]' : ''}`}>
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] kicker mb-1.5">{item.kicker}</p>
        <p className="text-[14px] text-black/65 leading-relaxed">{item.body}</p>
      </div>
    ))}
  </div>
);

export default ValueStrip;
