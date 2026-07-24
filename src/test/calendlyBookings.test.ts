import { describe, it, expect } from 'vitest';
import {
  classifyKind,
  normalizeBooking,
  sortBookings,
  type ConsultationBooking,
} from '../../services/consultation/calendlyBookings';
import { splitName, contactProperties, BOOKING_LABELS } from '../../services/crm/hubspot';
import {
  parseSignatureHeader,
  verifyCalendlySignature,
  parseWebhookPayload,
} from '../../services/consultation/calendlyWebhook';
import crypto from 'node:crypto';

const CFG = {
  paidEventTypeUri: 'https://api.calendly.com/event_types/PAID',
  freeEventTypeUri: 'https://api.calendly.com/event_types/FREE',
};

describe('classifyKind', () => {
  it('matches paid by event type URI', () => {
    expect(classifyKind(CFG.paidEventTypeUri, 'Whatever', CFG)).toBe('paid');
  });
  it('matches free by event type URI', () => {
    expect(classifyKind(CFG.freeEventTypeUri, 'Whatever', CFG)).toBe('free');
  });
  it('falls back to the name when no URI match ("Paid" → paid)', () => {
    expect(classifyKind('https://api.calendly.com/event_types/OTHER', 'Paid Consultation', CFG)).toBe('paid');
  });
  it('defaults to free when name has no "paid"', () => {
    expect(classifyKind(undefined, 'Quick Conversation', CFG)).toBe('free');
  });
});

describe('normalizeBooking', () => {
  const event = {
    uri: 'https://api.calendly.com/scheduled_events/EV123',
    name: 'Quick Conversation',
    start_time: '2026-07-27T07:00:00.000000Z',
    event_type: CFG.freeEventTypeUri,
    status: 'active',
  };
  const invitee = {
    uri: 'https://api.calendly.com/scheduled_events/EV123/invitees/INV1',
    email: 'Vahan@Example.com',
    name: 'Vahan Grigoryan',
    status: 'active',
    created_at: '2026-07-24T07:22:00.000000Z',
    cancel_url: 'https://calendly.com/cancellations/x',
  };

  it('normalizes a booking with all fields', () => {
    const b = normalizeBooking(event, invitee, CFG, 'webhook')!;
    expect(b.kind).toBe('free');
    expect(b.eventUuid).toBe('EV123');
    expect(b.email).toBe('Vahan@Example.com'); // preserved; HubSpot lowercases on upsert
    expect(b.name).toBe('Vahan Grigoryan');
    expect(b.startTime).toBe('2026-07-27T07:00:00.000000Z');
    expect(b.status).toBe('active');
    expect(b.source).toBe('webhook');
    expect(b.inviteeUri).toContain('INV1');
  });

  it('returns null when the invitee has no email', () => {
    expect(normalizeBooking(event, { ...invitee, email: '' }, CFG)).toBeNull();
  });

  it('maps a canceled invitee to status canceled', () => {
    const b = normalizeBooking(event, { ...invitee, status: 'canceled' }, CFG)!;
    expect(b.status).toBe('canceled');
  });
});

describe('sortBookings', () => {
  it('orders newest-booked first', () => {
    const mk = (uri: string, created: string): ConsultationBooking => ({
      inviteeUri: uri, eventUuid: 'e', kind: 'free', eventName: 'x',
      startTime: created, status: 'active', email: 'a@b.c', name: 'n',
      createdAt: created, source: 'webhook',
    });
    const out = sortBookings([
      mk('a', '2026-07-01T00:00:00Z'),
      mk('b', '2026-07-10T00:00:00Z'),
      mk('c', '2026-07-05T00:00:00Z'),
    ]);
    expect(out.map((b) => b.inviteeUri)).toEqual(['b', 'c', 'a']);
  });
});

describe('hubspot helpers', () => {
  it('splits names', () => {
    expect(splitName('Vahan Grigoryan')).toEqual({ firstname: 'Vahan', lastname: 'Grigoryan' });
    expect(splitName('Cher')).toEqual({ firstname: 'Cher' });
    expect(splitName('  ')).toEqual({});
  });
  it('builds contact properties with the booking tag + lowercased email', () => {
    const p = contactProperties('A@B.Com', 'Vahan Grigoryan', 'paid');
    expect(p.email).toBe('a@b.com');
    expect(p.booking_type).toBe(BOOKING_LABELS.paid);
    expect(p.firstname).toBe('Vahan');
    expect(p.lastname).toBe('Grigoryan');
  });
});

describe('calendly webhook signature', () => {
  const key = 'test-signing-key';
  const body = JSON.stringify({ event: 'invitee.created' });
  function sign(t: number, b: string) {
    return crypto.createHmac('sha256', key).update(`${t}.${b}`).digest('hex');
  }

  it('parses the signature header', () => {
    expect(parseSignatureHeader('t=123,v1=abc')).toEqual({ t: '123', v1: 'abc' });
  });
  it('accepts a fresh valid signature', () => {
    const t = Math.floor(1_800_000_000);
    const header = `t=${t},v1=${sign(t, body)}`;
    expect(verifyCalendlySignature(body, header, key, 300, t * 1000)).toBe(true);
  });
  it('rejects a tampered body', () => {
    const t = Math.floor(1_800_000_000);
    const header = `t=${t},v1=${sign(t, body)}`;
    expect(verifyCalendlySignature(body + 'x', header, key, 300, t * 1000)).toBe(false);
  });
  it('rejects a stale timestamp beyond tolerance', () => {
    const t = 1_800_000_000;
    const header = `t=${t},v1=${sign(t, body)}`;
    expect(verifyCalendlySignature(body, header, key, 300, (t + 10_000) * 1000)).toBe(false);
  });
  it('rejects when no signing key', () => {
    expect(verifyCalendlySignature(body, 't=1,v1=x', '', 300, 1000)).toBe(false);
  });
});

describe('parseWebhookPayload', () => {
  it('extracts event, invitee, scheduled_event', () => {
    const parsed = parseWebhookPayload({
      event: 'invitee.created',
      payload: { email: 'a@b.c', uri: 'inv', scheduled_event: { uri: 'ev', name: 'Paid Consultation' } },
    })!;
    expect(parsed.event).toBe('invitee.created');
    expect(parsed.invitee.email).toBe('a@b.c');
    expect(parsed.scheduledEvent.name).toBe('Paid Consultation');
  });
  it('returns null when scheduled_event is missing', () => {
    expect(parseWebhookPayload({ event: 'invitee.created', payload: { email: 'a@b.c' } })).toBeNull();
  });
});
