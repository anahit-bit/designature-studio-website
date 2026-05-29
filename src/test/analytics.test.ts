import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const GTAG_SELECTOR = 'script[src^="https://www.googletagmanager.com/gtag/js"]';

function resetAnalyticsState(): void {
  document.head.querySelectorAll(GTAG_SELECTOR).forEach((el) => el.remove());
  const w = window as unknown as { dataLayer?: unknown[]; gtag?: unknown };
  delete w.dataLayer;
  delete w.gtag;
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
    expect((window as unknown as { gtag?: unknown }).gtag).toBeUndefined();
  });

  it('injects the gtag.js script, seeds dataLayer, and exposes window.gtag when the env var is set', async () => {
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

    // I-022 — initGA now exposes window.gtag so trackPageView (and future
    // custom-event helpers) can find it.
    expect(typeof (window as unknown as { gtag?: unknown }).gtag).toBe('function');
  });

  it('is idempotent — calling initGA twice injects only one script', async () => {
    vi.stubEnv('VITE_GA4_MEASUREMENT_ID', 'G-TESTID123');
    const { initGA } = await import('../lib/analytics');

    initGA();
    initGA();

    expect(document.head.querySelectorAll(GTAG_SELECTOR).length).toBe(1);
  });
});

describe('analytics · trackPageView (I-022)', () => {
  beforeEach(() => {
    resetAnalyticsState();
    vi.resetModules();
  });

  afterEach(() => {
    resetAnalyticsState();
  });

  it('is a no-op when window.gtag is unavailable (env-gated dev/localhost)', async () => {
    const { trackPageView } = await import('../lib/analytics');

    expect(() => trackPageView('/some/path', 'Some Title')).not.toThrow();
    // No window.gtag → nothing to assert on; the contract is "no throw, no side effect".
  });

  it('calls window.gtag with the GA4 page_view shape when gtag is available', async () => {
    const gtagSpy = vi.fn();
    (window as unknown as { gtag: typeof gtagSpy }).gtag = gtagSpy;

    const { trackPageView } = await import('../lib/analytics');
    trackPageView('/portfolio?ref=home', 'Portfolio · Designature Studio');

    expect(gtagSpy).toHaveBeenCalledTimes(1);
    expect(gtagSpy).toHaveBeenCalledWith('event', 'page_view', {
      page_path: '/portfolio?ref=home',
      page_location: window.location.href,
      page_title: 'Portfolio · Designature Studio',
    });
  });
});

describe('analytics · trackEvent (A-004/A-005/I-023)', () => {
  beforeEach(() => {
    resetAnalyticsState();
    vi.resetModules();
  });

  afterEach(() => {
    resetAnalyticsState();
    vi.restoreAllMocks();
  });

  it('is a no-op and does not throw when window.gtag is unavailable', async () => {
    const { trackEvent } = await import('../lib/analytics');

    expect(() => trackEvent('calendly_open', { source: 'header' })).not.toThrow();
  });

  it('calls window.gtag once with (name, params) when gtag is available', async () => {
    const gtagSpy = vi.fn();
    (window as unknown as { gtag: typeof gtagSpy }).gtag = gtagSpy;

    const { trackEvent } = await import('../lib/analytics');
    trackEvent('ai_quiz_completed', { dna_top_style: 'Japandi' });

    expect(gtagSpy).toHaveBeenCalledTimes(1);
    expect(gtagSpy).toHaveBeenCalledWith('event', 'ai_quiz_completed', { dna_top_style: 'Japandi' });
  });

  it('defaults params to an empty object when none are passed', async () => {
    const gtagSpy = vi.fn();
    (window as unknown as { gtag: typeof gtagSpy }).gtag = gtagSpy;

    const { trackEvent } = await import('../lib/analytics');
    trackEvent('ai_vision_started');

    expect(gtagSpy).toHaveBeenCalledWith('event', 'ai_vision_started', {});
  });

  it('warns but does not propagate when gtag throws', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    (window as unknown as { gtag: () => void }).gtag = () => {
      throw new Error('gtag boom');
    };

    const { trackEvent } = await import('../lib/analytics');

    expect(() => trackEvent('signup', { source: 'header' })).not.toThrow();
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});
