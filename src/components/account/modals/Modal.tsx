/** AC-001 — shared modal shell. Centered card over a dim scrim; click-outside + Esc close. */
import React, { useEffect } from 'react';

export const Modal: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  labelledBy?: string;
}> = ({ open, onClose, title, children }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-6"
      style={{ background: 'rgba(8,9,12,0.6)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-[460px] bg-white border border-black/10 p-8"
      >
        <h3 className="font-display text-[26px] leading-tight text-[#0A0A0A] mb-3">{title}</h3>
        {children}
      </div>
    </div>
  );
};

/** Right-aligned button row used at the foot of every modal. */
export const ModalActions: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex gap-[10px] justify-end mt-2">{children}</div>
);
