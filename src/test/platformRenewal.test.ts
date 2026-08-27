import { describe, it, expect } from 'vitest';
import { computeNextRenewal } from '../../services/platforms/renewal';

// Fixed "now" so the rolls are deterministic. 2026-08-27 (UTC), a non-leap year.
const NOW = new Date('2026-08-27T12:00:00.000Z');

describe('computeNextRenewal', () => {
  describe('null / unparseable anchor', () => {
    it('returns null for a null anchor', () => {
      expect(computeNextRenewal(null, 'monthly', NOW)).toBeNull();
    });
    it('returns null for an empty-string anchor', () => {
      expect(computeNextRenewal('', 'annual', NOW)).toBeNull();
    });
    it('returns null for an unparseable anchor', () => {
      expect(computeNextRenewal('not-a-date', 'monthly', NOW)).toBeNull();
    });
  });

  describe("static ('once' / null / undefined) — anchor unchanged, may be past", () => {
    it("returns the anchor unchanged for 'once'", () => {
      expect(computeNextRenewal('2026-08-22', 'once', NOW)).toBe('2026-08-22');
    });
    it('returns the anchor unchanged for null cadence', () => {
      expect(computeNextRenewal('2020-01-15', null, NOW)).toBe('2020-01-15');
    });
    it('returns the anchor unchanged for undefined cadence', () => {
      expect(computeNextRenewal('2030-12-31', undefined, NOW)).toBe('2030-12-31');
    });
  });

  describe('monthly', () => {
    it('rolls a past anchor forward to the next occurrence', () => {
      // Anchor day 22, already passed this month (today is the 27th) → next month.
      expect(computeNextRenewal('2026-08-22', 'monthly', NOW)).toBe('2026-09-22');
    });
    it('keeps a future anchor unchanged', () => {
      expect(computeNextRenewal('2026-09-15', 'monthly', NOW)).toBe('2026-09-15');
    });
    it('keeps an anchor that falls later this month', () => {
      // Day 30 > today's 27 → still upcoming in August.
      expect(computeNextRenewal('2026-05-30', 'monthly', NOW)).toBe('2026-08-30');
    });
    it('clamps a day-31 anchor to the target month length (Jan 31 → Feb 28)', () => {
      const feb = new Date('2026-02-10T00:00:00.000Z'); // 2026 is non-leap
      expect(computeNextRenewal('2026-01-31', 'monthly', feb)).toBe('2026-02-28');
    });
    it('clamps a day-31 anchor to Feb 29 in a leap year', () => {
      const feb = new Date('2028-02-10T00:00:00.000Z'); // 2028 is leap
      expect(computeNextRenewal('2028-01-31', 'monthly', feb)).toBe('2028-02-29');
    });
  });

  describe('annual', () => {
    it('rolls a past anniversary forward to the next year', () => {
      // Mar 10 already passed in 2026 → 2027 anniversary.
      expect(computeNextRenewal('2025-03-10', 'annual', NOW)).toBe('2027-03-10');
    });
    it('keeps a future anniversary this year unchanged', () => {
      expect(computeNextRenewal('2026-11-21', 'annual', NOW)).toBe('2026-11-21');
    });
    it('rolls forward when the anchor year matches but the day already passed', () => {
      // Jan 5 anniversary — passed in 2026 → 2027.
      expect(computeNextRenewal('2026-01-05', 'annual', NOW)).toBe('2027-01-05');
    });
    it('clamps a Feb-29 anniversary to Feb-28 in a non-leap year', () => {
      const early = new Date('2026-01-01T00:00:00.000Z'); // 2026 non-leap
      expect(computeNextRenewal('2024-02-29', 'annual', early)).toBe('2026-02-28');
    });
    it('keeps Feb-29 in a leap year', () => {
      const early = new Date('2028-01-01T00:00:00.000Z'); // 2028 leap
      expect(computeNextRenewal('2024-02-29', 'annual', early)).toBe('2028-02-29');
    });
  });

  it('always returns YYYY-MM-DD zero-padded', () => {
    expect(computeNextRenewal('2026-01-05', 'monthly', new Date('2026-01-01T00:00:00Z'))).toBe('2026-01-05');
  });
});
