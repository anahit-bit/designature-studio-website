import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import StudioNudge, { NUDGE_DWELL_MS, NUDGE_SCROLL_PX, alreadyRouted } from '../components/studio/StudioNudge';

/** Scroll far enough to count, and fire the listener. */
function scrollPast() {
  Object.defineProperty(window, 'scrollY', { value: NUDGE_SCROLL_PX + 10, writable: true });
  fireEvent.scroll(window);
}
function dwell() {
  act(() => { vi.advanceTimersByTime(NUDGE_DWELL_MS + 100); });
}
const nudge = () => screen.queryByRole('complementary', { name: 'Find your workflow' });

describe('StudioNudge', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true });
  });
  afterEach(() => vi.useRealTimers());

  it('needs BOTH depth and dwell — a fast scroll to the footer is browsing, not confusion', () => {
    render(<StudioNudge onOpen={vi.fn()} />);
    scrollPast();
    expect(nudge()).toBeNull();
  });

  it('needs BOTH — a long dwell without scrolling is reading, not confusion', () => {
    render(<StudioNudge onOpen={vi.fn()} />);
    dwell();
    expect(nudge()).toBeNull();
  });

  it('appears once both are true, in either order', () => {
    render(<StudioNudge onOpen={vi.fn()} />);
    dwell();
    scrollPast();
    expect(nudge()).toBeTruthy();
    expect(screen.getByText('Want us to pick your four?')).toBeTruthy();
  });

  it('opens the survey and closes itself', () => {
    const onOpen = vi.fn();
    render(<StudioNudge onOpen={onOpen} />);
    scrollPast();
    dwell();

    fireEvent.click(screen.getByRole('button', { name: 'Find my workflow' }));
    expect(onOpen).toHaveBeenCalled();
    expect(nudge()).toBeNull();
  });

  it('stays gone for the rest of the session once dismissed', () => {
    const { unmount } = render(<StudioNudge onOpen={vi.fn()} />);
    scrollPast();
    dwell();
    fireEvent.click(screen.getByRole('button', { name: "I'm fine" }));
    expect(nudge()).toBeNull();
    unmount();

    render(<StudioNudge onOpen={vi.fn()} />);
    scrollPast();
    dwell();
    expect(nudge()).toBeNull();
  });

  it('escape dismisses it', () => {
    render(<StudioNudge onOpen={vi.fn()} />);
    scrollPast();
    dwell();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(nudge()).toBeNull();
  });

  it('never interrupts a running generation', () => {
    render(<StudioNudge onOpen={vi.fn()} busy />);
    scrollPast();
    dwell();
    expect(nudge()).toBeNull();
  });

  it('never appears for someone who already engaged with the router', () => {
    sessionStorage.setItem('ds_studio_router_v2', JSON.stringify({ relationship: 'live' }));
    render(<StudioNudge onOpen={vi.fn()} />);
    scrollPast();
    dwell();
    expect(nudge()).toBeNull();
  });

  it('an empty saved survey does not count as engagement', () => {
    sessionStorage.setItem('ds_studio_router_v2', JSON.stringify({}));
    expect(alreadyRouted()).toBe(false);
  });

  it('treats blocked storage as "not yet routed" rather than throwing', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(alreadyRouted()).toBe(false);
    spy.mockRestore();
  });
});
