import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  parseAvailableTimes,
  buildAvailabilityWindows,
  fetchCalendlyAvailableSlots,
  isCalendlyConfigured,
  getConsultationConfig,
  clearCalendlyCache,
} from '../../services/consultation/calendly';

// A REAL Calendly event_type_available_times response captured from Anahit's
// "Paid Consultation" event type (2026-07-06 → 07-13 window). On-the-hour, UTC,
// hourly stride, Sun/Wed absent — exactly what the picker must mirror.
const REAL_FIXTURE = {
  collection: [
    { status: 'available', invitees_remaining: 1, start_time: '2026-07-06T11:00:00Z', scheduling_url: 'x' },
    { status: 'available', invitees_remaining: 1, start_time: '2026-07-06T14:00:00Z', scheduling_url: 'x' },
    { status: 'available', invitees_remaining: 1, start_time: '2026-07-07T07:00:00Z', scheduling_url: 'x' },
    { status: 'available', invitees_remaining: 1, start_time: '2026-07-07T09:00:00Z', scheduling_url: 'x' },
    { status: 'available', invitees_remaining: 1, start_time: '2026-07-07T15:00:00Z', scheduling_url: 'x' },
    { status: 'available', invitees_remaining: 1, start_time: '2026-07-09T07:00:00Z', scheduling_url: 'x' },
    { status: 'available', invitees_remaining: 1, start_time: '2026-07-09T09:00:00Z', scheduling_url: 'x' },
    { status: 'available', invitees_remaining: 1, start_time: '2026-07-09T15:00:00Z', scheduling_url: 'x' },
  ],
};

describe('parseAvailableTimes', () => {
  it('normalises the real fixture to sorted ms-precision UTC ISO', () => {
    const slots = parseAvailableTimes([REAL_FIXTURE]);
    expect(slots).toEqual([
      '2026-07-06T11:00:00.000Z',
      '2026-07-06T14:00:00.000Z',
      '2026-07-07T07:00:00.000Z',
      '2026-07-07T09:00:00.000Z',
      '2026-07-07T15:00:00.000Z',
      '2026-07-09T07:00:00.000Z',
      '2026-07-09T09:00:00.000Z',
      '2026-07-09T15:00:00.000Z',
    ]);
    // every slot is on the hour (Calendly stride)
    expect(slots.every((s) => s.endsWith(':00:00.000Z'))).toBe(true);
  });
  it('merges + de-dupes across multiple window payloads', () => {
    const a = { collection: [{ status: 'available', start_time: '2026-07-06T11:00:00Z' }] };
    const b = { collection: [{ status: 'available', start_time: '2026-07-06T11:00:00.000000Z' }, { status: 'available', start_time: '2026-07-13T08:00:00Z' }] };
    expect(parseAvailableTimes([a, b])).toEqual(['2026-07-06T11:00:00.000Z', '2026-07-13T08:00:00.000Z']);
  });
  it('drops non-available + malformed entries', () => {
    const p = {
      collection: [
        { status: 'unavailable', start_time: '2026-07-06T11:00:00Z' },
        { status: 'available', start_time: 'not-a-date' },
        { status: 'available' },
        { status: 'available', start_time: '2026-07-06T14:00:00Z' },
      ],
    };
    expect(parseAvailableTimes([p])).toEqual(['2026-07-06T14:00:00.000Z']);
  });
  it('tolerates empty / missing collections', () => {
    expect(parseAvailableTimes([null, {}, { collection: [] }])).toEqual([]);
  });
});

describe('buildAvailabilityWindows', () => {
  it('splits 30 days into <=7-day windows starting just after now', () => {
    const now = new Date('2026-07-06T00:00:00.000Z');
    const w = buildAvailabilityWindows(now, 30);
    expect(w.length).toBe(5); // 7+7+7+7+2
    // first window starts ~2min after now (never in the past for Calendly)
    expect(Date.parse(w[0][0])).toBeGreaterThan(now.getTime());
    // each window spans at most 7 days
    for (const [s, e] of w) {
      expect(Date.parse(e) - Date.parse(s)).toBeLessThanOrEqual(7 * 24 * 3600_000 + 1000);
    }
    // windows are contiguous and cover ~30 days
    expect(Date.parse(w[w.length - 1][1]) - now.getTime()).toBeCloseTo(30 * 24 * 3600_000, -5);
  });
});

describe('config gating', () => {
  const KEYS = ['CALENDLY_ACCESS_TOKEN', 'CALENDLY_PAID_CONSULT_EVENT_TYPE_URI', 'CONSULTATION_DURATION_MINUTES', 'CONSULTATION_TIMEZONE'] as const;
  let saved: Record<string, string | undefined>;
  beforeEach(() => {
    saved = {};
    for (const k of KEYS) saved[k] = process.env[k];
  });
  afterEach(() => {
    for (const k of KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it('isCalendlyConfigured needs both token + event type uri', () => {
    process.env.CALENDLY_ACCESS_TOKEN = 'tok';
    delete process.env.CALENDLY_PAID_CONSULT_EVENT_TYPE_URI;
    expect(isCalendlyConfigured()).toBe(false);
    process.env.CALENDLY_PAID_CONSULT_EVENT_TYPE_URI = 'https://api.calendly.com/event_types/abc';
    expect(isCalendlyConfigured()).toBe(true);
  });
  it('getConsultationConfig applies defaults', () => {
    delete process.env.CONSULTATION_DURATION_MINUTES;
    delete process.env.CONSULTATION_TIMEZONE;
    const cfg = getConsultationConfig();
    expect(cfg.durationMinutes).toBe(45);
    expect(cfg.timeZone).toBe('Asia/Yerevan');
  });
});

describe('fetchCalendlyAvailableSlots (mocked fetch)', () => {
  const KEYS = ['CALENDLY_ACCESS_TOKEN', 'CALENDLY_PAID_CONSULT_EVENT_TYPE_URI'] as const;
  let saved: Record<string, string | undefined>;
  beforeEach(() => {
    saved = {};
    for (const k of KEYS) saved[k] = process.env[k];
    process.env.CALENDLY_ACCESS_TOKEN = 'tok';
    process.env.CALENDLY_PAID_CONSULT_EVENT_TYPE_URI = 'https://api.calendly.com/event_types/0233a8a5';
    clearCalendlyCache();
  });
  afterEach(() => {
    for (const k of KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
    vi.restoreAllMocks();
    clearCalendlyCache();
  });

  it('chunks the horizon, sends the bearer token, merges windows, caches 60s', async () => {
    const spy = vi.spyOn(globalThis, 'fetch' as any).mockImplementation(async (url: any, init: any) => {
      expect(String(init.headers.Authorization)).toBe('Bearer tok');
      expect(String(url)).toContain('event_type=');
      return new Response(JSON.stringify(REAL_FIXTURE), { status: 200 });
    });
    const now = new Date('2026-07-06T00:00:00.000Z');
    const slots = await fetchCalendlyAvailableSlots(now, 30);
    expect(spy).toHaveBeenCalledTimes(5); // 5 windows
    expect(slots).toContain('2026-07-07T07:00:00.000Z');
    // second call within 60s → cache hit, no new fetches
    spy.mockClear();
    const again = await fetchCalendlyAvailableSlots(new Date(now.getTime() + 30_000), 30);
    expect(spy).not.toHaveBeenCalled();
    expect(again).toEqual(slots);
  });

  it('throws when every window fails', async () => {
    vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue(new Response('nope', { status: 500 }));
    await expect(fetchCalendlyAvailableSlots(new Date('2026-07-06T00:00:00Z'), 30)).rejects.toThrow(/every window/i);
  });

  it('throws when not configured', async () => {
    delete process.env.CALENDLY_ACCESS_TOKEN;
    clearCalendlyCache();
    await expect(fetchCalendlyAvailableSlots(new Date(), 30)).rejects.toThrow(/not configured/i);
  });
});
