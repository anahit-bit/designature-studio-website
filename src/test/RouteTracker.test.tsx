import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter, Link } from 'react-router-dom';
import RouteTracker from '../components/RouteTracker';

/**
 * RouteTracker integration tests (I-022).
 *
 * Uses a real window.gtag stub instead of mocking trackPageView — closer
 * to production behavior: we want to verify the full chain
 * (location change → useEffect → trackPageView → window.gtag call).
 */

function installGtagSpy() {
  const spy = vi.fn();
  (window as unknown as { gtag: typeof spy }).gtag = spy;
  return spy;
}

describe('RouteTracker (I-022 — SPA page_view on route change)', () => {
  beforeEach(() => {
    delete (window as unknown as { gtag?: unknown }).gtag;
    document.title = 'Test Page';
  });

  afterEach(() => {
    cleanup();
    delete (window as unknown as { gtag?: unknown }).gtag;
  });

  it('does NOT fire gtag on the initial mount (gtag.js auto-fires page_view itself)', () => {
    const gtag = installGtagSpy();

    render(
      <MemoryRouter initialEntries={['/landing']}>
        <RouteTracker />
      </MemoryRouter>,
    );

    expect(gtag).not.toHaveBeenCalled();
  });

  it('fires a page_view event when the route changes', () => {
    const gtag = installGtagSpy();

    const { getByText } = render(
      <MemoryRouter initialEntries={['/landing']}>
        <RouteTracker />
        <Link to="/portfolio">Go to Portfolio</Link>
      </MemoryRouter>,
    );

    expect(gtag).not.toHaveBeenCalled(); // baseline

    fireEvent.click(getByText('Go to Portfolio'));

    expect(gtag).toHaveBeenCalledTimes(1);
    expect(gtag).toHaveBeenCalledWith('event', 'page_view', {
      page_path: '/portfolio',
      page_location: window.location.href,
      page_title: 'Test Page',
    });
  });

  it('fires once per navigation, including query-string changes', () => {
    const gtag = installGtagSpy();

    const { getByText } = render(
      <MemoryRouter initialEntries={['/']}>
        <RouteTracker />
        <Link to="/pricing">Pricing</Link>
        <Link to="/pricing?ref=home">Pricing w/ ref</Link>
      </MemoryRouter>,
    );

    fireEvent.click(getByText('Pricing'));
    fireEvent.click(getByText('Pricing w/ ref'));

    expect(gtag).toHaveBeenCalledTimes(2);
    expect(gtag).toHaveBeenNthCalledWith(
      1,
      'event',
      'page_view',
      expect.objectContaining({ page_path: '/pricing' }),
    );
    expect(gtag).toHaveBeenNthCalledWith(
      2,
      'event',
      'page_view',
      expect.objectContaining({ page_path: '/pricing?ref=home' }),
    );
  });

  it('does not throw when gtag is undefined (dev/localhost gated state)', () => {
    // no installGtagSpy here — window.gtag stays undefined

    const { getByText } = render(
      <MemoryRouter initialEntries={['/']}>
        <RouteTracker />
        <Link to="/portfolio">Go</Link>
      </MemoryRouter>,
    );

    expect(() => fireEvent.click(getByText('Go'))).not.toThrow();
  });
});
