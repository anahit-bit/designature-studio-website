import React from 'react';
import { useLanguage } from '../LanguageContext';
import { trackEvent } from '../lib/analytics';

/**
 * Canonical CTA infrastructure (I-025 follow-on — CTA system cleanup).
 *
 * The site uses a fixed 6-CTA vocabulary; three of them share this module's
 * button tokens + navigation hooks so every surface renders them identically:
 *   · Book a $99 consultation / "Get a $99 review"  → /consultation   (cobalt solid)
 *   · Start a project                               → /studio#contact (navy solid)
 *   · Let's talk (free intro chat)                  → Calendly         (ink ghost)
 *   · See plans / Notify me                         → /pricing         (cobalt outline)
 *
 * Rule: one label → one destination, and the literal "$99" is always in the paid
 * label so it can never be confused with the free "Let's talk". Colours are the
 * locked brand tokens (BRAND.md 2026-07-02): cobalt #0047AB · navy #0B2240 · ink #0A0A0A.
 */

export type ConsultationPlacement = 'pricing' | 'ai_result' | 'services';
export type ConsultationTool = 'vision' | 'quiz' | 'audit' | 'shopping';

/** sessionStorage flag a "Start a project" CTA sets before routing to /studio, so
 *  StudioPage lands the visitor on the contact form (#contact) rather than the hero.
 *  Defined here (not in StudioPage) so StudioPage can import it without a cycle. */
export const STUDIO_SCROLL_KEY = 'ds_studio_scroll';

/** CTA #3 — paid $99 consultation. SOLID cobalt so it's unmistakably a button. */
export const consultationBtnClass =
  'inline-flex items-center justify-center whitespace-nowrap bg-[#0047AB] text-white ' +
  'text-[11px] font-bold uppercase tracking-[0.18em] px-6 py-3.5 hover:bg-[#003d99] transition-colors';

/** CTA #4 — Start a project. SOLID navy (the brand's dark), the strongest tier. */
export const startProjectBtnClass =
  'inline-flex items-center justify-center whitespace-nowrap bg-[#0B2240] text-white ' +
  'text-[11px] font-bold uppercase tracking-[0.18em] px-6 py-3.5 hover:bg-[#0a1d38] transition-colors';

/** CTA #2 — Let's talk (free). Quiet ink ghost, for LIGHT backgrounds. On dark
 *  sections use a white-inverse ghost inline instead. */
export const letsTalkBtnClass =
  'inline-flex items-center justify-center whitespace-nowrap bg-transparent border border-[#0A0A0A]/25 text-[#0A0A0A] ' +
  'text-[11px] font-bold uppercase tracking-[0.18em] px-6 py-3.5 hover:border-[#0A0A0A]/60 transition-colors';

/** CTA #5 — See plans (AI subscription). Cobalt outline. */
export const seePlansBtnClass =
  'inline-flex items-center justify-center whitespace-nowrap bg-transparent border border-[#0047AB] text-[#0047AB] ' +
  'text-[11px] font-bold uppercase tracking-[0.18em] px-5 py-3 hover:bg-[#0047AB]/5 transition-colors';

/** Handler for CTA #3: track the click, then route to /consultation. */
export function useConsultationCta(placement: ConsultationPlacement, tool?: ConsultationTool) {
  const { navigateTo } = useLanguage();
  return () => {
    trackEvent('consultation_cta_clicked', { placement, ...(tool ? { tool } : {}) });
    navigateTo('consultation');
  };
}

/** Handler for CTA #4: track the click, flag the studio deep-link, then route to
 *  /studio — StudioPage consumes the flag and scrolls to the #contact form. */
export function useStartProjectCta(from: string) {
  const { navigateTo } = useLanguage();
  return () => {
    trackEvent('start_project_clicked', { from });
    try { sessionStorage.setItem(STUDIO_SCROLL_KEY, 'contact'); } catch { /* sessionStorage unavailable — lands on studio hero */ }
    navigateTo('studio');
  };
}

/**
 * The one conversion band at the bottom of every AI result (Vision · Quiz · Audit
 * · Shopping). Identical across all four tools. Primary = the contextual paid $99
 * review; secondary = the full-project ladder rung. No free chat, no /pricing.
 */
export const ConsultationReviewBand: React.FC<{ tool: ConsultationTool }> = ({ tool }) => {
  const getReview = useConsultationCta('ai_result', tool);
  const startProject = useStartProjectCta('ai_result');
  return (
    <div className="bg-[#FAFAFA] border-t border-black/8 px-6 md:px-10 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <p className="text-[14px] text-black/80 leading-snug">
        Want an expert's eye on this? <strong className="font-semibold text-black">Get a $99 review.</strong>
      </p>
      <div className="flex flex-col items-start sm:items-end gap-2">
        <button type="button" onClick={getReview} className={consultationBtnClass}>
          Get a $99 review →
        </button>
        <button
          type="button"
          onClick={startProject}
          className="text-[11px] font-semibold text-black/55 hover:text-black underline underline-offset-2 transition-colors"
        >
          or start a full project →
        </button>
      </div>
    </div>
  );
};

/**
 * /services bridge panel — the $99 rung, sitting between "Start a project" (top)
 * and "Let's talk" (quiet) so the page reads as a free → $99 → project ladder.
 */
export const ConsultationServicesBridge: React.FC = () => {
  const onClick = useConsultationCta('services');
  return (
    <section className="bg-white font-body py-16 md:py-24 border-t border-black/5">
      <div className="max-w-[1800px] mx-auto px-8 md:px-16">
        <div className="bg-[#FAFAFA] border border-black/10 border-l-2 border-l-[#0047AB] px-6 py-7 md:px-10 md:py-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-black/55 mb-2">
              Not ready for a full project?
            </p>
            <h3 className="font-display text-2xl md:text-3xl font-bold tracking-architectural leading-tight text-black">
              Start with a $99 consultation
            </h3>
            <p className="text-[13px] md:text-sm text-black/60 leading-relaxed mt-2">
              45 focused minutes — and it credits toward a project later.
            </p>
          </div>
          <button type="button" onClick={onClick} className={`self-start md:self-auto ${consultationBtnClass}`}>
            Book a $99 consultation →
          </button>
        </div>
      </div>
    </section>
  );
};
