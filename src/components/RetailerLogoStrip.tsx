/**
 * RetailerLogoStrip — visible upfront on the shopping list page so users
 * know which shops we'll source from before they search.
 *
 * Two visual variants:
 *   - "banner" (logged-in shopping page): full informational header with
 *     scope copy, logos, and an upgrade-plan upsell link
 *   - "trust"  (logged-out sign-in gate): compact horizontal logo row
 *     framed as social proof
 *
 * Both render the same FREE_TIER_RETAILERS list — the difference is framing.
 */
import React from 'react';
import { FREE_TIER_RETAILERS, getLogoUrl } from '../data/retailers';

interface Props {
  variant: 'banner' | 'trust';
  /** Banner-only: fires when user clicks the upsell link. Usually navigates to /pricing. */
  onUpgradeClick?: () => void;
}

const Logos: React.FC<{ alignment?: 'start' | 'center' }> = ({ alignment = 'start' }) => (
  <div className={`flex items-center gap-3 flex-wrap ${alignment === 'center' ? 'justify-center' : ''}`}>
    {FREE_TIER_RETAILERS.map(r => (
      <img
        key={r.domain}
        src={getLogoUrl(r.domain)}
        alt={r.name}
        title={r.name}
        loading="lazy"
        className="w-8 h-8 object-contain"
      />
    ))}
  </div>
);

const RetailerLogoStrip: React.FC<Props> = ({ variant, onUpgradeClick }) => {
  if (variant === 'trust') {
    // Compact strip for the sign-in gate. Centered, single line of copy.
    return (
      <div className="w-full pt-6 mt-2 border-t border-black/8">
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-black/65 mb-3 text-center">
          Sourced from designer-favorite US retailers
        </p>
        <Logos alignment="center" />
      </div>
    );
  }

  // banner: full informational header for the logged-in pre-search view.
  return (
    <div className="px-8 py-6 border-b border-black/8 bg-neutral-50/60">
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="max-w-md">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-black/65 mb-1.5">
            Free shopping list
          </p>
          <p className="text-sm md:text-[15px] font-bold text-black leading-snug">
            We'll find <span className="text-[#0047AB]">4–6 curated items</span> across furniture, rugs, lighting, wall art &amp; decor.
          </p>
          <p className="text-[12px] text-black/70 mt-2">
            Sourced from these designer-favorite US retailers:
          </p>
        </div>
        <Logos />
      </div>

      {onUpgradeClick && (
        <p className="text-[12px] text-black/70 mt-4">
          Want our full curated network across regions?{' '}
          <button
            type="button"
            onClick={onUpgradeClick}
            className="underline text-[#0047AB] hover:text-[#003d99] font-semibold"
          >
            Upgrade to a paid plan →
          </button>
        </p>
      )}
    </div>
  );
};

export default RetailerLogoStrip;
