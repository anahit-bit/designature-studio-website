import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ── Mock googleapis so nothing hits the network ──────────────────────────────
const mocks = vi.hoisted(() => {
  const generateAuthUrl = vi.fn((opts: any) => {
    const scope = Array.isArray(opts.scope) ? opts.scope.join(' ') : opts.scope;
    const p = new URLSearchParams({
      access_type: opts.access_type,
      prompt: opts.prompt,
      scope,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${p.toString()}`;
  });
  const getToken = vi.fn(async (_code: string) => ({
    tokens: { refresh_token: 'refresh-abc', access_token: 'access-xyz' },
  }));
  const setCredentials = vi.fn();
  const eventsInsert = vi.fn();
  const eventsDelete = vi.fn();
  return { generateAuthUrl, getToken, setCredentials, eventsInsert, eventsDelete };
});

vi.mock('googleapis', () => {
  class OAuth2 {
    generateAuthUrl = mocks.generateAuthUrl;
    getToken = mocks.getToken;
    setCredentials = mocks.setCredentials;
  }
  return {
    google: {
      auth: { OAuth2 },
      calendar: () => ({
        events: { insert: mocks.eventsInsert, delete: mocks.eventsDelete },
      }),
    },
  };
});

import {
  buildConsentUrl,
  exchangeCodeForTokens,
  getRedirectUri,
  isCalendarConfigured,
  insertEvent,
  deleteEvent,
  getCalendarId,
  CALENDAR_SCOPES,
} from '../../services/calendar/googleCalendar';

const ENV_KEYS = [
  'APP_URL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_CALENDAR_REFRESH_TOKEN',
  'GOOGLE_CALENDAR_ID',
] as const;
let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = {};
  for (const k of ENV_KEYS) saved[k] = process.env[k];
  process.env.GOOGLE_CLIENT_ID = 'client-id';
  process.env.GOOGLE_CLIENT_SECRET = 'client-secret';
  process.env.GOOGLE_CALENDAR_REFRESH_TOKEN = 'refresh-abc';
  process.env.APP_URL = 'https://www.designature.studio';
  delete process.env.GOOGLE_CALENDAR_ID;
  vi.clearAllMocks();
});
afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe('config helpers', () => {
  it('getRedirectUri is built from APP_URL', () => {
    expect(getRedirectUri()).toBe('https://www.designature.studio/api/admin/google-calendar/callback');
  });
  it('getCalendarId defaults to primary', () => {
    expect(getCalendarId()).toBe('primary');
    process.env.GOOGLE_CALENDAR_ID = 'bookings@designature.studio';
    expect(getCalendarId()).toBe('bookings@designature.studio');
  });
  it('isCalendarConfigured requires client creds + refresh token', () => {
    expect(isCalendarConfigured()).toBe(true);
    delete process.env.GOOGLE_CALENDAR_REFRESH_TOKEN;
    expect(isCalendarConfigured()).toBe(false);
  });
});

describe('OAuth handshake', () => {
  it('consent URL requests offline access, consent prompt, and calendar.events scope', () => {
    const url = buildConsentUrl();
    expect(url).toContain('access_type=offline');
    expect(url).toContain('prompt=consent');
    expect(url).toContain(encodeURIComponent('https://www.googleapis.com/auth/calendar.events'));
    expect(CALENDAR_SCOPES).toContain('https://www.googleapis.com/auth/calendar.events');
  });
  it('exchangeCodeForTokens returns the refresh token', async () => {
    const out = await exchangeCodeForTokens('the-code');
    expect(out.refreshToken).toBe('refresh-abc');
    expect(mocks.getToken).toHaveBeenCalledWith('the-code');
  });
});

describe('insertEvent', () => {
  it('creates a 45-min event with Meet + both attendees + sendUpdates all', async () => {
    mocks.eventsInsert.mockResolvedValue({
      data: {
        id: 'evt_123',
        hangoutLink: 'https://meet.google.com/abc-defg-hij',
        htmlLink: 'https://calendar.google.com/event?eid=evt_123',
      },
    });
    const out = await insertEvent({
      startIso: '2026-07-15T05:00:00.000Z',
      durationMinutes: 45,
      attendeeEmail: 'client@example.com',
      hostEmail: 'anahit@designature.studio',
      requestId: 'order-uuid-1',
    });
    expect(out).toEqual({
      eventId: 'evt_123',
      meetLink: 'https://meet.google.com/abc-defg-hij',
      htmlLink: 'https://calendar.google.com/event?eid=evt_123',
    });
    const arg = mocks.eventsInsert.mock.calls[0][0];
    expect(arg.calendarId).toBe('primary');
    expect(arg.conferenceDataVersion).toBe(1);
    expect(arg.sendUpdates).toBe('all');
    expect(arg.requestBody.start.dateTime).toBe('2026-07-15T05:00:00.000Z');
    expect(arg.requestBody.end.dateTime).toBe('2026-07-15T05:45:00.000Z');
    expect(arg.requestBody.attendees).toEqual([
      { email: 'client@example.com' },
      { email: 'anahit@designature.studio' },
    ]);
    expect(arg.requestBody.conferenceData.createRequest.requestId).toBe('order-uuid-1');
    expect(arg.requestBody.conferenceData.createRequest.conferenceSolutionKey.type).toBe('hangoutsMeet');
  });
  it('falls back to a video entryPoint when hangoutLink is absent', async () => {
    mocks.eventsInsert.mockResolvedValue({
      data: {
        id: 'evt_2',
        conferenceData: { entryPoints: [{ entryPointType: 'video', uri: 'https://meet.google.com/xyz' }] },
      },
    });
    const out = await insertEvent({
      startIso: '2026-07-15T05:00:00.000Z',
      durationMinutes: 45,
      attendeeEmail: 'a@b.com',
      hostEmail: 'h@i.com',
      requestId: 'r2',
    });
    expect(out.meetLink).toBe('https://meet.google.com/xyz');
  });
});

describe('deleteEvent', () => {
  it('calls delete with sendUpdates all', async () => {
    mocks.eventsDelete.mockResolvedValue({});
    await deleteEvent('evt_123');
    expect(mocks.eventsDelete).toHaveBeenCalledWith({
      calendarId: 'primary',
      eventId: 'evt_123',
      sendUpdates: 'all',
    });
  });
  it('swallows a 404/410 (already gone)', async () => {
    mocks.eventsDelete.mockRejectedValue({ code: 410 });
    await expect(deleteEvent('gone')).resolves.toBeUndefined();
  });
  it('rethrows other errors', async () => {
    mocks.eventsDelete.mockRejectedValue({ code: 500, message: 'boom' });
    await expect(deleteEvent('x')).rejects.toMatchObject({ code: 500 });
  });
});
