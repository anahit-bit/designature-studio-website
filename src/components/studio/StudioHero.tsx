import React from 'react';

interface StudioHeroProps {
  /** Background media — an `.hero-media > img`, an `.hero-mosaic` grid, etc. Fills the band. */
  media: React.ReactNode;
  /** `true` renders the default `.hero-scrim`; a node renders a custom scrim; falsy renders none. */
  scrim?: React.ReactNode | boolean;
  /** Wrap children in the centered `.hero-overlay` (the glass-card landing pattern). */
  overlay?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

/**
 * Locked 74vh cinematic hero band (`.hero`). Caller supplies the media node and,
 * optionally, a scrim and overlay content. Used by the logged-out mosaic hero,
 * the logged-in landing hero, the reading (working) state, and the DNA result.
 */
export const StudioHero: React.FC<StudioHeroProps> = ({ media, scrim, overlay, className = '', style, children }) => (
  <div className={`hero ${className}`} style={style}>
    {media}
    {scrim === true ? <div className="hero-scrim" /> : scrim || null}
    {overlay ? <div className="hero-overlay">{children}</div> : children}
  </div>
);

/** Frosted glass card used inside heroes (kicker → headline → rule → subcopy → CTA). */
export const Glass: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => (
  <div className={`glass ${className}`}>{children}</div>
);

export default StudioHero;
