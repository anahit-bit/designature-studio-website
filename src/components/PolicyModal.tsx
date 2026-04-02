import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

export type PolicyKind = 'terms' | 'privacy';

const POLICY_SRC: Record<PolicyKind, string> = {
  terms: '/policies/terms-and-conditions.html?embed=1',
  privacy: '/policies/privacy-policy.html?embed=1',
};

type PolicyModalProps = {
  open: PolicyKind | null;
  onClose: () => void;
};

/**
 * In-app legal copy: loads static HTML from /public/policies in a scrollable iframe.
 * Replace those files (or switch to MD/React content later) without changing routing.
 */
const PolicyModal: React.FC<PolicyModalProps> = ({ open, onClose }) => {
  const { t } = useLanguage();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const title = open === 'terms' ? t('footer.terms') : t('footer.privacy');
  const src = POLICY_SRC[open];

  return (
    <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4 md:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/85 backdrop-blur-sm"
        onClick={onClose}
        aria-label={t('footer.close')}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="policy-modal-title"
        className="relative flex w-full max-w-3xl flex-col overflow-hidden rounded-sm border border-white/15 bg-white shadow-2xl max-h-[min(90vh,900px)]"
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-black/10 px-5 py-4 md:px-6">
          <h2 id="policy-modal-title" className="font-display text-base font-bold uppercase tracking-[0.2em] text-black md:text-lg">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-sm p-2 text-black/50 transition-colors hover:bg-black/5 hover:text-black"
            aria-label={t('footer.close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <iframe
          title={title}
          src={src}
          className="min-h-[50vh] w-full flex-1 border-0 bg-white"
        />
      </div>
    </div>
  );
};

export default PolicyModal;
