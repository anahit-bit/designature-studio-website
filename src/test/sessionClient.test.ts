import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  SESSION_KEY,
  INACTIVITY_LOGOUT_MS,
  isInactivityExpired,
  storeToken,
} from '../sessionClient';

/** Must match `LAST_ACTIVITY_KEY` in sessionClient.ts (not exported). */
const LAST_ACTIVITY_KEY = 'ds_last_activity';

describe('sessionClient — 15-minute inactivity logout', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('defines a 15-minute idle window in milliseconds', () => {
    expect(INACTIVITY_LOGOUT_MS).toBe(15 * 60 * 1000);
  });

  it('isInactivityExpired is false when there is no session token', () => {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    expect(isInactivityExpired()).toBe(false);
  });

  it('isInactivityExpired is false when token exists but last-activity key is missing', () => {
    localStorage.setItem(SESSION_KEY, 'tok');
    expect(isInactivityExpired()).toBe(false);
  });

  it('isInactivityExpired is false when last activity was within 15 minutes', () => {
    const now = new Date('2026-04-02T12:00:00.000Z').getTime();
    vi.setSystemTime(now);
    localStorage.setItem(SESSION_KEY, 'tok');
    localStorage.setItem(LAST_ACTIVITY_KEY, String(now - 10 * 60 * 1000));
    expect(isInactivityExpired()).toBe(false);
  });

  it('isInactivityExpired is true when last activity was exactly 15 minutes ago', () => {
    const now = new Date('2026-04-02T12:00:00.000Z').getTime();
    vi.setSystemTime(now);
    localStorage.setItem(SESSION_KEY, 'tok');
    localStorage.setItem(LAST_ACTIVITY_KEY, String(now - INACTIVITY_LOGOUT_MS));
    expect(isInactivityExpired()).toBe(true);
  });

  it('isInactivityExpired is true when last activity was more than 15 minutes ago', () => {
    const now = new Date('2026-04-02T12:00:00.000Z').getTime();
    vi.setSystemTime(now);
    localStorage.setItem(SESSION_KEY, 'tok');
    localStorage.setItem(LAST_ACTIVITY_KEY, String(now - INACTIVITY_LOGOUT_MS - 60_000));
    expect(isInactivityExpired()).toBe(true);
  });

  it('storeToken writes token and refreshes last-activity time', () => {
    const now = new Date('2026-04-02T12:00:00.000Z').getTime();
    vi.setSystemTime(now);
    storeToken('new-token');
    expect(localStorage.getItem(SESSION_KEY)).toBe('new-token');
    expect(localStorage.getItem(LAST_ACTIVITY_KEY)).toBe(String(now));
    expect(isInactivityExpired()).toBe(false);
  });
});
