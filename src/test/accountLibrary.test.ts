/**
 * AC-002 — Library save→list→delete loop + real-vs-mock routing.
 *
 * The server endpoints (server.ts) can't be imported (the file app.listen()s at
 * boot), so — following the repo's logic-mirroring test style — this covers the
 * importable client contract: the mock provider's loop, and that accountApi hits
 * the REAL endpoints when a session token exists and the MOCK provider otherwise.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { accountApi } from '../lib/accountApi';
import * as mock from '../lib/accountApi.mock';
import { SESSION_KEY } from '../sessionClient';
import { fingerprint, isSaved, markSaved } from '../lib/savedMarks';

function installLocalStorage() {
  const store: Record<string, string> = {};
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = String(v);
      },
      removeItem: (k: string) => {
        delete store[k];
      },
      clear: () => {
        for (const k of Object.keys(store)) delete store[k];
      },
      length: 0,
      key: () => null,
    },
    writable: true,
  });
}

beforeEach(() => {
  installLocalStorage();
  window.localStorage.setItem(mock.MOCK_TIER_KEY, 'design');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('mock Library loop', () => {
  it('save → appears in getLibrary → getLibraryItem finds it → delete removes it', async () => {
    const saved = await mock.saveLibraryItem({
      tool: 'ai_vision',
      title: 'Kitchen — Test Style',
      imageDataUrl: 'data:image/png;base64,AAAA',
    });
    expect(saved.id).toBeTruthy();
    expect(saved.tool).toBe('ai_vision');

    const page = await mock.getLibrary({});
    expect(page.items.some((i) => i.id === saved.id)).toBe(true);

    const one = await mock.getLibraryItem(saved.id);
    expect(one.title).toBe('Kitchen — Test Style');

    await mock.deleteLibraryItem(saved.id);
    const after = await mock.getLibrary({});
    expect(after.items.some((i) => i.id === saved.id)).toBe(false);
  });

  it('saves a shopping list into the free-tier library (session-only) even when the grid is empty', async () => {
    window.localStorage.setItem(mock.MOCK_TIER_KEY, 'free');
    const saved = await mock.saveLibraryItem({
      tool: 'shopping',
      title: 'Shopping list — 4 items',
      metadata: { items: [1, 2, 3, 4] },
    });
    const page = await mock.getLibrary({});
    expect(page.items[0].id).toBe(saved.id);
  });
});

describe('accountApi real-vs-mock routing', () => {
  it('uses the MOCK provider when there is no session token', async () => {
    const spy = vi.spyOn(mock, 'getLibrary');
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as any;

    await accountApi.getLibrary({});
    expect(spy).toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('hits the REAL /api/user/library endpoint when signed in', async () => {
    window.localStorage.setItem(SESSION_KEY, 'fake-token');
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ items: [], total: 0, page: 1 }),
    });
    global.fetch = fetchSpy as any;

    await accountApi.getLibrary({ tool: 'ai_vision', search: 'kitchen' });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toContain('/api/user/library');
    expect(url).toContain('tool=ai_vision');
    expect(url).toContain('q=kitchen');
  });

  it('shareUrl builds an absolute /shared/:id link', () => {
    expect(accountApi.shareUrl('abc-123')).toContain('/shared/abc-123');
  });

  it('getSharedItem hits the PUBLIC /api/share/:id endpoint (no auth needed)', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'x', tool: 'ai_vision', title: 'T', createdAt: '', thumbnailUrl: null }),
    });
    global.fetch = fetchSpy as any;
    await accountApi.getSharedItem('x');
    expect(fetchSpy).toHaveBeenCalledWith('/api/share/x');
  });

  it('POSTs a save to the REAL endpoint with the session header when signed in', async () => {
    window.localStorage.setItem(SESSION_KEY, 'fake-token');
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ id: 'x', tool: 'ai_vision', title: 'T', createdAt: '', thumbnailUrl: null }),
    });
    global.fetch = fetchSpy as any;

    await accountApi.saveLibraryItem({ tool: 'ai_vision', title: 'T', imageDataUrl: 'data:image/png;base64,AA' });

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('/api/user/library');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['x-session-token']).toBe('fake-token');
  });

  it('bulkDeleteLibraryItems POSTs the ids to the bulk endpoint when signed in', async () => {
    window.localStorage.setItem(SESSION_KEY, 'fake-token');
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ deleted: 2 }),
    });
    global.fetch = fetchSpy as any;

    const n = await accountApi.bulkDeleteLibraryItems(['a', 'b']);
    expect(n).toBe(2);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('/api/user/library/bulk-delete');
    expect(JSON.parse(init.body)).toEqual({ ids: ['a', 'b'] });
  });
});

describe('savedMarks (persistent Saved state)', () => {
  it('marks and reads a fingerprint across "sessions"', () => {
    const mark = fingerprint('data:image/png;base64,ABCDEF');
    expect(isSaved(mark)).toBe(false);
    markSaved(mark);
    expect(isSaved(mark)).toBe(true);
    // same input → same fingerprint (survives a page reload)
    expect(isSaved(fingerprint('data:image/png;base64,ABCDEF'))).toBe(true);
  });

  it('different content yields a different fingerprint', () => {
    expect(fingerprint('concept-A')).not.toBe(fingerprint('concept-B'));
  });
});
