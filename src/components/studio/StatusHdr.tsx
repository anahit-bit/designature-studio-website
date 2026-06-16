import React from 'react';

export type StatusTone = 'ready' | 'working' | 'done';

interface StatusHdrProps {
  /** Left-side label, e.g. "Style Quiz · Ready". Already localized by caller. */
  label: string;
  /** Drives the status-dot colour: ready = cobalt, working = amber pulse, done = green. */
  tone?: StatusTone;
  /** Right-side affordance: a "Sign in" button (logged-out), quota line, or reset/retake control. */
  right?: React.ReactNode;
}

const DOT: Record<StatusTone, string> = {
  ready: 'bg-[#0047AB]',
  working: 'bg-amber-500 animate-pulse',
  done: 'bg-green-500',
};

/**
 * Locked status header: status dot + uppercase label on the left, a flexible
 * affordance on the right (sign-in when logged-out, quota line / reset when
 * logged-in). Padding + border come from the `.statushdr` rule.
 */
const StatusHdr: React.FC<StatusHdrProps> = ({ label, tone = 'ready', right }) => (
  <div className="statushdr">
    <div className="flex items-center gap-2.5">
      <span className={`w-2 h-2 rounded-full ${DOT[tone]}`} />
      <span className="text-[12px] font-bold uppercase tracking-[0.3em] text-black/60">{label}</span>
    </div>
    {right != null && <div className="flex items-center gap-3">{right}</div>}
  </div>
);

export default StatusHdr;
