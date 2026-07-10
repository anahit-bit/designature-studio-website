/**
 * CollapsibleSection — foldable dashboard section for /admin (2026-07-10).
 *
 * Click the header to open/close. State persists in localStorage per `storageKey`
 * so the dashboard opens the way the owner left it. `defaultOpen` is the first-run
 * state (before any preference is saved).
 */
import React, { useState } from 'react';

interface Props {
  title: string;
  sub?: React.ReactNode;
  storageKey: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const STORAGE_PREFIX = 'admin.sec.';

function readInitial(storageKey: string, defaultOpen: boolean): boolean {
  try {
    const v = localStorage.getItem(STORAGE_PREFIX + storageKey);
    if (v === 'open') return true;
    if (v === 'closed') return false;
  } catch { /* ignore */ }
  return defaultOpen;
}

const CollapsibleSection: React.FC<Props> = ({ title, sub, storageKey, defaultOpen = true, children }) => {
  const [open, setOpen] = useState<boolean>(() => readInitial(storageKey, defaultOpen));

  function toggle() {
    setOpen((prev) => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_PREFIX + storageKey, next ? 'open' : 'closed'); } catch { /* ignore */ }
      return next;
    });
  }

  return (
    <section className="border-b border-[#DAD2C3]">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-6 px-8 py-[18px] text-left hover:bg-[#FAFAFA]"
      >
        <span className="flex items-center gap-3">
          <span
            className="text-neutral-500 text-[12px] w-3 inline-block transition-transform"
            style={{ transform: open ? 'none' : 'rotate(-90deg)' }}
          >
            ▾
          </span>
          <span className="font-serif text-[21px] font-medium text-black">{title}</span>
        </span>
        {sub && <span className="text-[10px] tracking-[0.2em] uppercase text-neutral-500 font-semibold">{sub}</span>}
      </button>
      {open && <div className="px-8 pb-7 pt-1">{children}</div>}
    </section>
  );
};

export default CollapsibleSection;
