/**
 * GA4 (gtag.js) bootstrap — I-007 Track B + I-022 SPA page_view.
 *
 * Injects the gtag.js script and initializes GA4 only when
 * VITE_GA4_MEASUREMENT_ID is set. Localhost (no env var) is a no-op so
 * dev sessions don't pollute production analytics.
 *
 * Idempotent: a second initGA() call after the script has been injected
 * is a no-op. trackPageView() is a no-op when gtag isn't loaded.
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

export {};
