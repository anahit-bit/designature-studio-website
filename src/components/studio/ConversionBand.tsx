import React from 'react';

interface ConversionBandProps {
  /** White/70 uppercase kicker. */
  kicker: string;
  /** Serif `.hl` headline; pass an <em> for the italic payoff. */
  headline: React.ReactNode;
  /** Right-side action(s) — typically a white button (+ optional outline button). */
  actions: React.ReactNode;
}

/**
 * Locked conversion band: full black bar that closes every landing/results
 * surface. Oxide-less. White/70 kicker + serif headline left, white button right.
 */
const ConversionBand: React.FC<ConversionBandProps> = ({ kicker, headline, actions }) => (
  <div className="bg-black text-white px-10 py-7 flex flex-col md:flex-row items-center justify-between gap-5">
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/70 mb-1">{kicker}</p>
      <h3 className="hl text-3xl">{headline}</h3>
    </div>
    <div className="flex flex-col sm:flex-row gap-3">{actions}</div>
  </div>
);

export default ConversionBand;
