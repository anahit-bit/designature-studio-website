/**
 * GA4 (gtag.js) bootstrap — I-007 Track B + I-022 SPA page_view + A-004/A-005/I-023 custom events.
 *
 * Injects the gtag.js script and initializes GA4 only when
 * VITE_GA4_MEASUREMENT_ID is set. Localhost (no env var) is a no-op so
 * dev sessions don't pollute production analytics.
 *
 * Idempotent: a second initGA() call after the script has been injected
 * is a no-op. trackPageView() / trackEvent() are no-ops when gtag isn't loaded.
 *
 * ── GA4 event registry ──────────────────────────────────────────────────────
 * Every custom event fired from the client. All are client-side only (gtag is
 * browser-only) and env-gated — when VITE_GA4_MEASUREMENT_ID is unset, initGA()
 * never loads gtag.js, so window.gtag is undefined and every helper here no-ops.
 * These run ALONGSIDE the internal /api/track/* activityLog writes (which power
 * /admin) — the two are independent; this file never touches the internal log.
 *
 *   page_view             — SPA route change (trackPageView; I-022). Fired by RouteTracker.
 *   ai_quiz_started       — Style Quiz room 1 appeared.
 *   ai_quiz_completed     — DNA result screen reached. params: { dna_top_style }
 *   ai_vision_started     — AI Vision Generate button became ready.
 *   ai_vision_completed   — AI Vision generation resolved successfully.
 *   ai_shopping_started   — Shopping List items first identified.
 *   ai_shopping_completed — Shopping search resolved. params: { item_count }
 *   ai_audit_started      — Room Audit Analyze button became ready.
 *   ai_audit_completed    — Room Audit returned a result. params: { score }
 *   calendly_open         — "Let's chat" / book-a-call click. params: { source }
 *   signup                — New user created via Google auth. params: { source }
 *   newsletter_signup     — Newsletter subscribe succeeded. params: { source }
 *   quota_burned          — A generate response left the user at 0 remaining. params: { tool }
 *   consultation_cta_clicked — A paid-consultation ENTRY button was clicked (I-025 PR 2).
 *                           params: { placement: 'pricing'|'ai_result'|'services',
 *                                     tool?: 'vision'|'quiz'|'audit'|'shopping' (ai_result only) }
 *   start_project_clicked — A "Start a project" CTA was clicked (→ /studio#contact form).
 *                           params: { from: 'services'|'home_closing'|'ai_result' }
 *   consultation_initiated — "Book & Pay $99" clicked on /consultation. params: { value }
 *   purchase              — Paid consultation confirmed (GA4 standard e-commerce event).
 *                           params: { transaction_id, value, currency, items }
 *   consultation_failed   — /booking/failed reached after a declined/aborted payment.
 *   listing_photos_cta    — A CTA on the /listing-photos paid-search landing page was
 *                           clicked. params: { cta } — hero_primary | how_primary |
 *                           audience_hosts | audience_agents | designer_consultation |
 *                           designer_services | free_chat | closing_primary |
 *                           closing_pricing. Imported into Google Ads as a secondary
 *                           conversion (docs/marketing/google-ads/README.md).
 */

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
  interface ImportMetaEnv {
    readonly VITE_GA4_MEASUREMENT_ID?: string;
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

const GTAG_SRC_PREFIX = 'https://www.googletagmanager.com/gtag/js?id=';

export function initGA(): void {
  const measurementId = import.meta.env.VITE_GA4_MEASUREMENT_ID;
  if (!measurementId) return;

  const expectedSrc = `${GTAG_SRC_PREFIX}${measurementId}`;
  if (document.querySelector(`script[src="${expectedSrc}"]`)) return;

  const script = document.createElement('script');
  script.async = true;
  script.src = expectedSrc;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag(..._args: unknown[]): void {
    // gtag.js expects `arguments` to be pushed (not a real array) so the
    // tag manager can introspect the call signature.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments);
  }
  // Expose globally so trackPageView() and other modules can find it.
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', measurementId);
}

/**
 * I-022 — Fire a GA4 page_view for a SPA route change.
 *
 * gtag.js auto-fires page_view ONCE on initial load (from the `config` call
 * in initGA). Call this on every subsequent route change so GA4 sees the
 * full SPA navigation path, not just the landing URL.
 *
 * No-op when gtag isn't loaded (env-gated dev/localhost, or before gtag.js
 * finishes downloading on slow connections). Never throws.
 */
export function trackPageView(path: string, title: string): void {
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', 'page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: title,
  });
}

/**
 * A-004/A-005/I-023 — Fire a GA4 custom event.
 *
 * No-op when gtag isn't loaded (env-gated dev/localhost). Swallows errors so a
 * failed analytics call never propagates into the user flow. See the event
 * registry at the top of this file for the names + params in use.
 */
export function trackEvent(name: string, params: Record<string, unknown> = {}): void {
  if (typeof window.gtag !== 'function') return;
  try {
    window.gtag('event', name, params);
  } catch (err) {
    console.warn('[analytics] trackEvent failed:', err);
  }
}

export {};
