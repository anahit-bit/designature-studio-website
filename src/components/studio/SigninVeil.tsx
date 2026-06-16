import React from 'react';

interface SigninVeilProps {
  open: boolean;
  onClose: () => void;
  /** Triggers the actual Google sign-in flow. */
  onSignIn: () => void;
  kicker: string;
  title: React.ReactNode;
  /** "You're one step from <reason>." */
  lead: React.ReactNode;
  note?: string;
  googleLabel: string;
  fineprint?: string;
  /** Dismiss copy, e.g. "Keep playing as guest". */
  dismissLabel: string;
}

/**
 * Locked logged-out sign-in veil (A4): exploring/playing is free; only account
 * actions open this. Presentational + fully prop-driven so AI Vision / Shopping
 * can reuse it with their own copy. Visibility is class-driven (`.on`).
 */
const SigninVeil: React.FC<SigninVeilProps> = ({
  open, onClose, onSignIn, kicker, title, lead, note, googleLabel, fineprint, dismissLabel,
}) => (
  <div
    className={`studio-signin-veil${open ? ' on' : ''}`}
    onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    role="dialog"
    aria-modal="true"
    aria-hidden={!open}
  >
    <div className="signin-card px-9 py-9 text-center">
      <p className="text-[10px] font-bold uppercase tracking-[0.3em] kicker mb-3">{kicker}</p>
      <h2 className="font-display text-[34px] leading-[1.05] mb-2">{title}</h2>
      <p className="text-[13px] text-black/65 leading-relaxed mb-1">{lead}</p>
      {note && <p className="text-[12px] text-black/55 leading-relaxed mb-7">{note}</p>}
      <button type="button" className="gbtn mb-3" onClick={onSignIn}>
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
          <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.96v2.34A9 9 0 0 0 9 18z" />
          <path fill="#FBBC05" d="M3.98 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.02-2.34z" />
          <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.94l3.02 2.34C4.68 5.16 6.66 3.58 9 3.58z" />
        </svg>
        {googleLabel}
      </button>
      {fineprint && <p className="text-[11px] text-black/45 leading-relaxed mt-4">{fineprint}</p>}
      <button
        type="button"
        onClick={onClose}
        className="text-[11px] font-bold uppercase tracking-[0.18em] text-black/45 hover:text-black mt-6 transition"
      >
        {dismissLabel}
      </button>
    </div>
  </div>
);

export default SigninVeil;
