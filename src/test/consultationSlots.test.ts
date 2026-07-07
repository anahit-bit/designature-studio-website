import { describe, it, expect } from 'vitest';
import {
  filterAvailable,
  tzOffsetMs,
  gmtLabelForTz,
  formatGmtOffset,
} from '../../services/consultation/slots';

// A small hourly candidate grid (what Calendly returns) to filter against.
const CANDIDATES = [
  '2026-07-15T05:00:00.000Z',
  '2026-07-15T06:00:00.000Z',
  '2026-07-15T07:00:00.000Z',
  '2026-07-15T08:00:00.000Z',
];

describe('filterAvailable — overlap-aware subtraction', () => {
  it('removes candidates overlapping a busy interval', () => {
    const busy = [{ start: '2026-07-15T05:15:00Z', end: '2026-07-15T05:20:00Z' }];
    const avail = filterAvailable(CANDIDATES, busy, [], 45);
    expect(avail).not.toContain('2026-07-15T05:00:00.000Z'); // 05:00–05:45 overlaps
    expect(avail).toContain('2026-07-15T06:00:00.000Z');
  });

  it('a held 05:00 slot removes overlapping candidates (45-min duration)', () => {
    // 05:00–05:45 held; a 05:30 candidate would overlap. Our grid is hourly, so
    // the next candidate 06:00 is clear.
    const withHalf = [...CANDIDATES, '2026-07-15T05:30:00.000Z'].sort();
    const avail = filterAvailable(withHalf, [], ['2026-07-15T05:00:00.000Z'], 45);
    expect(avail).not.toContain('2026-07-15T05:00:00.000Z');
    expect(avail).not.toContain('2026-07-15T05:30:00.000Z');
    expect(avail).toContain('2026-07-15T06:00:00.000Z');
  });

  it('leaves everything when nothing is busy/held', () => {
    expect(filterAvailable(CANDIDATES, [], [], 45)).toEqual(CANDIDATES);
  });

  it('returns sorted output', () => {
    const shuffled = [...CANDIDATES].reverse();
    const avail = filterAvailable(shuffled, [], [], 45);
    expect(avail).toEqual([...avail].sort((a, b) => Date.parse(a) - Date.parse(b)));
  });
});

describe('timezone GMT labels', () => {
  it('tzOffsetMs is +4h for Yerevan (no DST)', () => {
    expect(tzOffsetMs('Asia/Yerevan', new Date('2026-07-15T00:00:00Z'))).toBe(4 * 3600_000);
    expect(tzOffsetMs('Asia/Yerevan', new Date('2026-01-15T00:00:00Z'))).toBe(4 * 3600_000);
  });
  it('gmtLabelForTz renders a city-free GMT label', () => {
    expect(gmtLabelForTz('Asia/Yerevan', new Date('2026-07-15T00:00:00Z'))).toBe('GMT+4');
    expect(gmtLabelForTz('UTC', new Date('2026-07-15T00:00:00Z'))).toBe('GMT+0');
  });
  it('formatGmtOffset handles negative + half-hour offsets', () => {
    expect(formatGmtOffset(-300)).toBe('GMT-5'); // New York (EST)
    expect(formatGmtOffset(330)).toBe('GMT+5:30'); // India
    expect(formatGmtOffset(0)).toBe('GMT+0');
  });
});
