import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the Sanity client so the REAL src/lib/sanity.ts runs against a fake
// network. `vi.hoisted` makes the mock fn available inside the hoisted factory.
const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));
vi.mock('@sanity/client', () => ({
  createClient: () => ({ fetch: fetchMock }),
}));

// Fresh module (fresh caches) + fake clock per test, so TTL windows don't leak.
let sanity: typeof import('../lib/sanity');
beforeEach(async () => {
  fetchMock.mockReset();
  vi.resetModules();
  sanity = await import('../lib/sanity'); // fresh module = fresh caches
  vi.useFakeTimers();
  vi.setSystemTime(0);
});
afterEach(() => {
  vi.useRealTimers();
});

const post = (title: string, slug: string) => ({ id: slug, title, slug, tags: [] });

describe('journal fetchers — short TTL cache', () => {
  it('dedupes concurrent calls into one request', async () => {
    fetchMock.mockResolvedValue([post('A', 'a')]);
    const [r1, r2] = await Promise.all([sanity.fetchPosts(), sanity.fetchPosts()]);
    expect(fetchMock).toHaveBeenCalledTimes(1); // shared in-flight promise
    expect(r1).toEqual(r2);
  });

  it('serves the cached value within the TTL window (no refetch)', async () => {
    fetchMock.mockResolvedValue([post('A', 'a')]);
    await sanity.fetchPosts();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Still inside the window (right up to the boundary) → cached, no new call.
    vi.advanceTimersByTime(sanity.JOURNAL_CACHE_TTL_MS);
    await sanity.fetchPosts();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('refetches once the TTL elapses so newly published content appears', async () => {
    fetchMock.mockResolvedValueOnce([post('Old', 'a')]);
    const first = await sanity.fetchPosts();
    expect(first[0].title).toBe('Old');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // A post is published; move just past the TTL.
    vi.advanceTimersByTime(sanity.JOURNAL_CACHE_TTL_MS + 1);
    fetchMock.mockResolvedValueOnce([post('New', 'b')]);
    const second = await sanity.fetchPosts();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(second[0].title).toBe('New');
  });

  it('fetchCategories honours the same TTL', async () => {
    fetchMock.mockResolvedValue([{ title: 'How-to', slug: 'how-to', order: 1 }]);
    await sanity.fetchCategories();
    await sanity.fetchCategories();
    expect(fetchMock).toHaveBeenCalledTimes(1); // cached within window
    vi.advanceTimersByTime(sanity.JOURNAL_CACHE_TTL_MS + 1);
    await sanity.fetchCategories();
    expect(fetchMock).toHaveBeenCalledTimes(2); // refetched after TTL
  });

  it('fetchPost caches per slug and refetches after the TTL', async () => {
    fetchMock.mockResolvedValue(post('Hello', 'hello'));
    await sanity.fetchPost('hello');
    await sanity.fetchPost('hello');
    expect(fetchMock).toHaveBeenCalledTimes(1); // same slug, within window

    await sanity.fetchPost('other'); // different slug → its own fetch
    expect(fetchMock).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(sanity.JOURNAL_CACHE_TTL_MS + 1);
    await sanity.fetchPost('hello');
    expect(fetchMock).toHaveBeenCalledTimes(3); // stale → refetch
  });

  it('leaves fetchProjects cache-forever (unchanged by the journal TTL)', async () => {
    fetchMock.mockResolvedValue([]);
    await sanity.fetchProjects();
    vi.advanceTimersByTime(sanity.JOURNAL_CACHE_TTL_MS * 100);
    await sanity.fetchProjects();
    expect(fetchMock).toHaveBeenCalledTimes(1); // never expires
  });
});
