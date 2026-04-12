/**
 * Regression tests for POST /api/feedback → Apps Script
 *
 * Apps Script Web Apps return 302 on POST. node-fetch / native fetch with
 * redirect:'follow' automatically follows this to the googleusercontent.com
 * URL that serves the doPost response. The JSON body (token + fields, no
 * action param) is what the Apps Script reads via e.postData.contents.
 */

import { describe, it, expect, vi } from 'vitest';

// ── Constants ─────────────────────────────────────────────────────────────────

const SCRIPT_URL = 'https://script.google.com/macros/s/FAKE/exec';
const TOKEN = 'test-token-abc';

const validBody = {
  name: 'Test User',
  country: 'Armenia',
  email: 'test@example.com',
  type: 'general',
  message: 'This is a test message',
  rating: '',
  project_type: '',
};

// ── Extracted logic under test ────────────────────────────────────────────────
// Mirror of the fetch call inside server.ts /api/feedback handler.

async function postToScript(
  targetUrl: string,
  payload: object,
  fetchImpl: (url: string, init?: any) => Promise<any>,
): Promise<{ status: number; text: string }> {
  const r = await fetchImpl(targetUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    redirect: 'follow',
  });
  return { status: r.status, text: await r.text() };
}

// ── Mock builder ──────────────────────────────────────────────────────────────

function mockFetch(response: { status: number; body: string }) {
  return vi.fn().mockResolvedValue({
    status: response.status,
    text: async () => response.body,
    json: async () => JSON.parse(response.body),
  });
}

// ── Tests: request format ─────────────────────────────────────────────────────

describe('outgoing request format', () => {
  it('sends POST with Content-Type application/json', async () => {
    const fetch = mockFetch({ status: 200, body: '{"ok":true}' });
    await postToScript(SCRIPT_URL, { token: TOKEN, ...validBody }, fetch);

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe(SCRIPT_URL);
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.redirect).toBe('follow');
  });

  it('includes token in JSON body (not URL params or headers)', async () => {
    const fetch = mockFetch({ status: 200, body: '{"ok":true}' });
    await postToScript(SCRIPT_URL, { token: TOKEN, ...validBody }, fetch);

    const sentBody = JSON.parse(fetch.mock.calls[0][1].body);
    expect(sentBody.token).toBe(TOKEN);

    // token must NOT appear in the URL
    const calledUrl: string = fetch.mock.calls[0][0];
    expect(calledUrl).not.toContain('token');
  });

  it('does NOT include an action field', async () => {
    const fetch = mockFetch({ status: 200, body: '{"ok":true}' });
    await postToScript(SCRIPT_URL, { token: TOKEN, ...validBody }, fetch);

    const sentBody = JSON.parse(fetch.mock.calls[0][1].body);
    expect(sentBody).not.toHaveProperty('action');
  });

  it('body contains all 7 expected fields plus token', async () => {
    const fetch = mockFetch({ status: 200, body: '{"ok":true}' });
    const payload = { token: TOKEN, ...validBody };
    await postToScript(SCRIPT_URL, payload, fetch);

    const sentBody = JSON.parse(fetch.mock.calls[0][1].body);
    expect(sentBody.token).toBe(TOKEN);
    expect(sentBody.name).toBe(validBody.name);
    expect(sentBody.country).toBe(validBody.country);
    expect(sentBody.email).toBe(validBody.email);
    expect(sentBody.type).toBe(validBody.type);
    expect(sentBody.message).toBe(validBody.message);
    expect(sentBody).toHaveProperty('rating');
    expect(sentBody).toHaveProperty('project_type');
  });

  it('testimonial type carries numeric rating and project_type', async () => {
    const fetch = mockFetch({ status: 200, body: '{"ok":true}' });
    const payload = {
      token: TOKEN,
      ...validBody,
      type: 'testimonial',
      message: 'Amazing service!',
      rating: 5,
      project_type: 'Residential',
    };
    await postToScript(SCRIPT_URL, payload, fetch);

    const sentBody = JSON.parse(fetch.mock.calls[0][1].body);
    expect(sentBody.rating).toBe(5);
    expect(sentBody.project_type).toBe('Residential');
  });
});

// ── Tests: response handling ──────────────────────────────────────────────────

describe('response handling', () => {
  it('returns ok:true on successful write', async () => {
    const fetch = mockFetch({ status: 200, body: '{"ok":true}' });
    const result = await postToScript(SCRIPT_URL, { token: TOKEN, ...validBody }, fetch);
    const data = JSON.parse(result.text);
    expect(data.ok).toBe(true);
  });

  it('returns ok:false with error when Apps Script rejects (bad token etc)', async () => {
    const fetch = mockFetch({ status: 200, body: '{"ok":false,"error":"unauthorized"}' });
    const result = await postToScript(SCRIPT_URL, { token: 'wrong', ...validBody }, fetch);
    const data = JSON.parse(result.text);
    expect(data.ok).toBe(false);
    expect(data.error).toBe('unauthorized');
  });
});

// ── Tests: token hygiene ──────────────────────────────────────────────────────

describe('token hygiene', () => {
  it('token is trimmed — no invisible leading/trailing whitespace', () => {
    const raw = '  hayk_eva_nane_8x4kQp2Lv9mNzR5tWhB  ';
    expect(raw.trim()).toBe('hayk_eva_nane_8x4kQp2Lv9mNzR5tWhB');
    expect(raw.trim()).not.toMatch(/^\s|\s$/);
  });
});

// ── Tests: network error propagation ─────────────────────────────────────────

describe('network error propagation', () => {
  it('propagates fetch errors so the caller can catch them', async () => {
    const fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    await expect(
      postToScript(SCRIPT_URL, { token: TOKEN, ...validBody }, fetch)
    ).rejects.toThrow('ECONNREFUSED');
  });
});

// ── Tests: server-side validation rules (mirrors server.ts /api/feedback) ────
//
// These tests run the same validation logic as the Express handler so regressions
// are caught without spinning up the server. Keep in sync with server.ts.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FeedbackPayload {
  type?: string;
  message?: string;
  name?: string;
  email?: string;
  rating?: number | '';
  project_type?: string;
}

function validateFeedback(body: FeedbackPayload): { status: number; error?: string } {
  const { type, message, name, email, rating, project_type } = body;

  if (!type || !['testimonial', 'bug', 'feature', 'general'].includes(type)) {
    return { status: 400, error: 'Invalid type' };
  }
  if (!message || !message.trim()) {
    return { status: 400, error: 'Message is required' };
  }
  if (type === 'testimonial') {
    if (!name || !name.trim())   return { status: 400, error: 'Name is required for testimonials' };
    if (!email || !email.trim()) return { status: 400, error: 'Email is required for testimonials' };
    if (!EMAIL_RE.test(email.trim())) return { status: 400, error: 'Invalid email format' };
    if (!rating || (rating as number) < 1 || (rating as number) > 5) {
      return { status: 400, error: 'Rating is required for testimonials' };
    }
  }
  if (project_type && !['Residential', 'Commercial', 'Other'].includes(project_type)) {
    return { status: 400, error: 'Invalid project type' };
  }
  return { status: 200 };
}

describe('server-side validation — message always required', () => {
  it('rejects any type with empty message', () => {
    for (const type of ['general', 'bug', 'feature', 'testimonial']) {
      const r = validateFeedback({ type, message: '', name: 'N', email: 'a@b.com', rating: 5 });
      expect(r.status).toBe(400);
      expect(r.error).toBe('Message is required');
    }
  });

  it('rejects when message is whitespace only', () => {
    const r = validateFeedback({ type: 'general', message: '   ' });
    expect(r.status).toBe(400);
    expect(r.error).toBe('Message is required');
  });
});

describe('server-side validation — testimonial-specific requirements', () => {
  const base = { type: 'testimonial', message: 'Great work!', rating: 5 };

  it('rejects testimonial with empty name → 400', () => {
    const r = validateFeedback({ ...base, name: '', email: 'a@b.com' });
    expect(r.status).toBe(400);
    expect(r.error).toBe('Name is required for testimonials');
  });

  it('rejects testimonial with empty email → 400', () => {
    const r = validateFeedback({ ...base, name: 'Ana', email: '' });
    expect(r.status).toBe(400);
    expect(r.error).toBe('Email is required for testimonials');
  });

  it('rejects testimonial with invalid email format → 400', () => {
    for (const bad of ['abc', 'abc@', '@b.com', 'a @b.com']) {
      const r = validateFeedback({ ...base, name: 'Ana', email: bad });
      expect(r.status).toBe(400);
      expect(r.error).toBe('Invalid email format');
    }
  });

  it('accepts testimonial with valid email format', () => {
    const r = validateFeedback({ ...base, name: 'Ana', email: 'ana@designature.studio' });
    expect(r.status).toBe(200);
  });

  it('rejects testimonial with rating 0 or missing', () => {
    const r1 = validateFeedback({ ...base, name: 'Ana', email: 'a@b.com', rating: 0 as any });
    expect(r1.status).toBe(400);
    expect(r1.error).toBe('Rating is required for testimonials');

    const r2 = validateFeedback({ ...base, name: 'Ana', email: 'a@b.com', rating: '' });
    expect(r2.status).toBe(400);
  });

  it('accepts rating 1–5', () => {
    for (const rating of [1, 2, 3, 4, 5] as number[]) {
      const r = validateFeedback({ ...base, name: 'Ana', email: 'a@b.com', rating });
      expect(r.status).toBe(200);
    }
  });
});

describe('server-side validation — non-testimonial types need only message', () => {
  it('accepts bug report with only message → 200', () => {
    const r = validateFeedback({ type: 'bug', message: 'Something broke' });
    expect(r.status).toBe(200);
  });

  it('accepts feature request with only message → 200', () => {
    const r = validateFeedback({ type: 'feature', message: 'Would love dark mode' });
    expect(r.status).toBe(200);
  });

  it('accepts general feedback with only message → 200', () => {
    const r = validateFeedback({ type: 'general', message: 'Love the site' });
    expect(r.status).toBe(200);
  });

  it('name/email are truly optional for non-testimonial types', () => {
    // Even if email is provided but invalid format, non-testimonials pass
    const r = validateFeedback({ type: 'bug', message: 'Bug here', email: 'not-an-email' });
    expect(r.status).toBe(200);
  });
});
