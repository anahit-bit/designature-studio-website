import React, { useState } from 'react';

interface BeforeAfterProps {
  beforeSrc: string;
  afterSrc: string;
  beforeAlt?: string;
  afterAlt?: string;
  /** Optional corner labels. */
  beforeLabel?: string;
  afterLabel?: string;
  /** Initial reveal position 0–100 (default 50). */
  initial?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Locked before/after slider (`.ba`) — ported from the AI Vision logged-in
 * mockup for later reuse. A transparent full-cover range input drives the reveal;
 * the "before" layer is clipped from the left and a cobalt handle marks the seam.
 */
const BeforeAfter: React.FC<BeforeAfterProps> = ({
  beforeSrc, afterSrc, beforeAlt = 'Before', afterAlt = 'After',
  beforeLabel, afterLabel, initial = 50, className = '', style,
}) => {
  const [pos, setPos] = useState(Math.min(100, Math.max(0, initial)));

  return (
    <div className={`ba ${className}`} style={style}>
      <img className="ba-after" src={afterSrc} alt={afterAlt} draggable={false} />
      <img
        className="ba-before"
        src={beforeSrc}
        alt={beforeAlt}
        draggable={false}
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      />
      <div className="ba-divider" style={{ left: `${pos}%` }} />
      <div className="ba-handle" style={{ left: `${pos}%` }} aria-hidden="true">⇆</div>
      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-label="Reveal before and after"
      />
      {beforeLabel && (
        <span className="badge-dark absolute bottom-3 left-3 z-[6] text-[9px] font-bold uppercase tracking-[0.18em] px-2.5 py-1">
          {beforeLabel}
        </span>
      )}
      {afterLabel && (
        <span className="badge-cobalt absolute bottom-3 right-3 z-[6] text-[9px] font-bold uppercase tracking-[0.18em] px-2.5 py-1">
          {afterLabel}
        </span>
      )}
    </div>
  );
};

export default BeforeAfter;
