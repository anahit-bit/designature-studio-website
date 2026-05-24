import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const GTAG_SELECTOR = 'script[src^="https://www.googletagmanager.com/gtag/js"]';

function resetAnalyticsState(): void {
  document.head.querySelectorAll(GTAG_SELECTOR).forEach((el) => el.remove());
  delete (window as unknown as { dataLayer?: unknown[] }).dataLayer;
}

describe('analytics · initGA (I-007 Track B)', () => {
  beforeEach(() => {
    resetAnalyticsState();
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetAnalyticsState();
  });

  it('is a no-op when VITE_GA4_MEASUREMENT_ID is unset', async () => {
    vi.stubEnv('VITE_GA4_MEASUREMENT_ID', '');
    const { initGA } = await import('../lib/analytics');

    initGA();

    expect(document.head.querySelector(GTAG_SELECTOR)).toBeNull();
    expect((window as unknown as { dataLayer?: unknown[] }).dataLayer).toBeUndefined();
  });

  it('injects the gtag.js script and seeds dataLayer when the env var is set', async () => {
    vi.stubEnv('VITE_GA4_MEASUREMENT_ID', 'G-TESTID123');
    const { initGA } = await import('../lib/analytics');

    initGA();

    const script = document.head.querySelector<HTMLScriptElement>(GTAG_SELECTOR);
    expect(script).not.toBeNull();
    expect(script?.src).toBe('https://www.googletagmanager.com/gtag/js?id=G-TESTID123');
    expect(script?.async).toBe(true);

    const dataLayer = (window as unknown as { dataLayer?: unknown[] }).dataLayer;
    expect(Array.isArray(dataLayer)).toBe(true);
    expect(dataLayer!.length).toBe(2); // gtag('js', Date) + gtag('config', ID)
  });

  it('is idempotent — calling initGA twice injects only one script', async () => {
    vi.stubEnv('VITE_GA4_MEASUREMENT_ID', 'G-TESTID123');
    const { initGA } = await import('../lib/analytics');

    initGA();
    initGA();

    expect(document.head.querySelectorAll(GTAG_SELECTOR).length).toBe(1);
  });
});
