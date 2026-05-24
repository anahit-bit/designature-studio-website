/**
 * GA4 (gtag.js) bootstrap — I-007 Track B.
 *
 * Injects the gtag.js script and initializes GA4 only when
 * VITE_GA4_MEASUREMENT_ID is set. Localhost (no env var) is a no-op so
 * dev sessions don't pollute production analytics.
 *
 * Idempotent: a second call after the script has been injected is a no-op.
 */

declare global {
  interface Window {
    dataLayer: unknown[];
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
  gtag('js', new Date());
  gtag('config', measurementId);
}

export {};
