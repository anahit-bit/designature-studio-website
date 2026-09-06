import { describe, it, expect } from 'vitest';
import {
  MAX_DUNNING_ATTEMPTS,
  shouldExpireAfterFailure,
  addInterval,
  isRenewalDue,
} from '../../services/subscriptions/billing';

describe('dunning — expire only after MAX_DUNNING_ATTEMPTS failures', () => {
  it('MAX_DUNNING_ATTEMPTS is 3', () => {
    expect(MAX_DUNNING_ATTEMPTS).toBe(3);
  });

  it('does not expire before the max (retries as past_due)', () => {
    expect(shouldExpireAfterFailure(1)).toBe(false);
    expect(shouldExpireAfterFailure(2)).toBe(false);
  });

  it('expires at/after the max', () => {
    expect(shouldExpireAfterFailure(3)).toBe(true);
    expect(shouldExpireAfterFailure(4)).toBe(true);
  });

  it('respects a custom max', () => {
    expect(shouldExpireAfterFailure(2, 2)).toBe(true);
    expect(shouldExpireAfterFailure(1, 2)).toBe(false);
  });
});

describe('addInterval — one period forward (UTC)', () => {
  it('monthly adds a calendar month', () => {
    expect(addInterval('2026-01-15T00:00:00.000Z', 'monthly')).toBe('2026-02-15T00:00:00.000Z');
  });
  it('annual adds a year', () => {
    expect(addInterval('2026-03-01T12:00:00.000Z', 'annual')).toBe('2027-03-01T12:00:00.000Z');
  });
  it('monthly rolls over the year end', () => {
    expect(addInterval('2026-12-10T00:00:00.000Z', 'monthly')).toBe('2027-01-10T00:00:00.000Z');
  });
});

describe('isRenewalDue', () => {
  it('is due once the period end is at/before now', () => {
    expect(isRenewalDue('2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')).toBe(true);
    expect(isRenewalDue('2025-12-31T00:00:00.000Z', '2026-01-01T00:00:00.000Z')).toBe(true);
  });
  it('is not due while the period end is in the future', () => {
    expect(isRenewalDue('2026-02-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')).toBe(false);
  });
});
