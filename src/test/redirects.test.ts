import { describe, it, expect } from 'vitest';
import { matchLegacyRedirect, legacyRedirects } from '../../server/redirects';

/** Minimal Express req/res stub for exercising the middleware. */
function runMiddleware(path: string) {
  let redirectedTo: string | null = null;
  let redirectStatus: number | null = null;
  let sentStatus: number | null = null;
  let sentBody: string | null = null;
  let nextCalled = false;

  const req = { path } as any;
  const res = {
    redirect(status: number, target: string) {
      redirectStatus = status;
      redirectedTo = target;
    },
    status(code: number) {
      sentStatus = code;
      return this;
    },
    type() {
      return this;
    },
    send(body: string) {
      sentBody = body;
    },
  } as any;
  const next = () => {
    nextCalled = true;
  };

  legacyRedirects(req, res, next);
  return { redirectedTo, redirectStatus, sentStatus, sentBody, nextCalled };
}

describe('legacy redirect map — 301 exact rules', () => {
  const cases: Array<[string, string]> = [
    ['/free-consultation', '/consultation'],
    ['/contact-us-arm', '/studio'],
    ['/portfolio/family-fun-center', '/portfolio'],
    ['/portfolio/wine-cellar-home', '/portfolio'],
    ['/portfolio/roundhill-contemporary-house', '/portfolio'],
    ['/alternative-home-designs-atriums', '/journal'],
    ['/interior-photography', '/journal'],
  ];
  for (const [from, to] of cases) {
    it(`${from} → ${to} (301)`, () => {
      expect(matchLegacyRedirect(from)).toEqual({ status: 301, target: to });
    });
  }
});

describe('legacy redirect map — 301 prefix (wildcard) rules', () => {
  const cases: Array<[string, string]> = [
    // /hy Armenian locale — base + children all collapse to home
    ['/hy', '/'],
    ['/hy/contacts', '/'],
    ['/hy/kitchen-planning', '/'],
    ['/hy/portfolio/traditional-home', '/'],
    // old WP blog
    ['/blog', '/journal'],
    ['/blog/page/1', '/journal'],
    ['/blog/page/2', '/journal'],
    // old WP category archives
    ['/category', '/journal'],
    ['/category/useful-information', '/journal'],
    ['/category/interior-design', '/journal'],
  ];
  for (const [from, to] of cases) {
    it(`${from} → ${to} (301)`, () => {
      expect(matchLegacyRedirect(from)).toEqual({ status: 301, target: to });
    });
  }
});

describe('legacy redirect map — 410 Gone rules', () => {
  it('returns 410 for old wp-content assets', () => {
    expect(matchLegacyRedirect('/wp-content/uploads/2023/04/3D-Walkthrough.mp4')).toEqual({
      status: 410,
    });
    expect(matchLegacyRedirect('/wp-content')).toEqual({ status: 410 });
  });
});

describe('legacy redirect map — normalization', () => {
  it('tolerates a trailing slash', () => {
    expect(matchLegacyRedirect('/blog/')).toEqual({ status: 301, target: '/journal' });
    expect(matchLegacyRedirect('/free-consultation/')).toEqual({
      status: 301,
      target: '/consultation',
    });
  });

  it('is case-insensitive', () => {
    expect(matchLegacyRedirect('/BLOG')).toEqual({ status: 301, target: '/journal' });
    expect(matchLegacyRedirect('/Category/Interior-Design')).toEqual({
      status: 301,
      target: '/journal',
    });
  });

  it('keeps the root path untouched (no trailing-slash strip to empty)', () => {
    expect(matchLegacyRedirect('/')).toBeNull();
  });
});

describe('legacy redirect map — live routes pass through untouched', () => {
  const liveRoutes = [
    '/',
    '/portfolio',
    '/portfolio/0022',
    '/services',
    '/studio',
    '/ai-concepts',
    '/ai-vision',
    '/pricing',
    '/faq',
    '/journal',
    '/journal/category/how-to',
    '/journal/light-a-living-room',
    '/consultation',
    '/terms',
    '/privacy',
    '/refund',
    '/admin',
  ];
  for (const route of liveRoutes) {
    it(`${route} is not redirected`, () => {
      expect(matchLegacyRedirect(route)).toBeNull();
    });
  }

  it('does not clobber a real numeric portfolio detail route', () => {
    // Only the three explicit old WP slugs redirect; numeric IDs fall through.
    expect(matchLegacyRedirect('/portfolio/0031')).toBeNull();
  });
});

describe('legacyRedirects middleware', () => {
  it('issues a 301 to the target for a matched legacy path', () => {
    const r = runMiddleware('/blog/page/2');
    expect(r.redirectStatus).toBe(301);
    expect(r.redirectedTo).toBe('/journal');
    expect(r.nextCalled).toBe(false);
  });

  it('sends 410 Gone for wp-content assets', () => {
    const r = runMiddleware('/wp-content/uploads/2023/04/3D-Walkthrough.mp4');
    expect(r.sentStatus).toBe(410);
    expect(r.sentBody).toBe('Gone');
    expect(r.nextCalled).toBe(false);
  });

  it('calls next() for an unmatched (live) route', () => {
    const r = runMiddleware('/portfolio');
    expect(r.nextCalled).toBe(true);
    expect(r.redirectStatus).toBeNull();
    expect(r.sentStatus).toBeNull();
  });
});
