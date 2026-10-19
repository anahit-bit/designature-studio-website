import { describe, it, expect } from 'vitest';
import { matchLegacyRedirect, legacyRedirects, trailingSlashRedirect } from '../../server/redirects';

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

describe('retired routes', () => {
  // /ai-vision was a standalone marketing page superseded by the AI Studio,
  // which carries the live tool. It sat in the sitemap at priority 0.8 and was
  // linked from every journal article, so it must REDIRECT rather than 404 --
  // bookmarks and already-indexed results have to land somewhere that works.
  it('/ai-vision permanently redirects to /ai-concepts', () => {
    expect(matchLegacyRedirect('/ai-vision')).toEqual({ status: 301, target: '/ai-concepts' });
  });

  it('tolerates a trailing slash and casing, like every other rule', () => {
    expect(matchLegacyRedirect('/ai-vision/')).toEqual({ status: 301, target: '/ai-concepts' });
    expect(matchLegacyRedirect('/AI-Vision')).toEqual({ status: 301, target: '/ai-concepts' });
  });
});

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
    // old WP portfolio archives
    ['/portfolio-category/residential', '/portfolio'],
    ['/portfolio-category/commercial', '/portfolio'],
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

describe('legacy redirect map — pages with a true modern equivalent (2026-10-19 GSC audit)', () => {
  const cases: Array<[string, string]> = [
    ['/hy', '/'],
    ['/about-us', '/studio'],
    ['/contacts', '/studio'],
    ['/faqs', '/faq'],
    ['/privacy-policy', '/privacy'],
    ['/projects', '/portfolio'],
    ['/portfolio/coffee-cafe-design', '/portfolio'],
    ['/portfolio/nyc-apartment-design', '/portfolio'],
    ['/portfolio/small-apartment-design', '/portfolio'],
    ['/portfolio/traditional-home', '/portfolio'],
    ['/portfolio/industrial-loft-office', '/portfolio'],
    ['/portfolio/mountain-ski-house', '/portfolio'],
  ];
  for (const [from, to] of cases) {
    it(`${from} → ${to} (301)`, () => {
      expect(matchLegacyRedirect(from)).toEqual({ status: 301, target: to });
    });
  }
});

describe('legacy redirect map — retired Armenian locale (/hy)', () => {
  // The root has a true equivalent (the English home page); every CHILD is 410.
  // Redirecting all of them to "/" reads as a soft-404 to Google.
  it('/hy and /hy/ redirect to the home page', () => {
    expect(matchLegacyRedirect('/hy')).toEqual({ status: 301, target: '/' });
    expect(matchLegacyRedirect('/hy/')).toEqual({ status: 301, target: '/' });
  });

  for (const child of [
    '/hy/contacts',
    '/hy/kitchen-planning',
    '/hy/portfolio/traditional-home',
    '/hy/how-to-measure-room/',
    '/HY/About-Us',
  ]) {
    it(`${child} is 410 Gone`, () => {
      expect(matchLegacyRedirect(child)).toEqual({ status: 410 });
    });
  }

  it('does not catch look-alike live paths', () => {
    expect(matchLegacyRedirect('/hype')).toBeNull();
    expect(matchLegacyRedirect('/hyper/loop')).toBeNull();
  });
});

describe('legacy redirect map — 410 for retired WP pages with no equivalent', () => {
  for (const gone of [
    '/kitchen-planning',
    '/atriums-in-homes',
    '/accessory-dwelling-unit',
    '/thoughtful-floor-planning',
    '/mountian-house',
    '/wp-includes/js/mediaelement/',
    '/wp-json/wp/v2/posts',
    '/portfolio-category/residential/feed/',
    '/blog/feed',
  ]) {
    it(`${gone} is 410 Gone`, () => {
      expect(matchLegacyRedirect(gone)).toEqual({ status: 410 });
    });
  }
});

describe('legacy redirect middleware — WP site search', () => {
  function run(path: string, query: Record<string, unknown>) {
    let status: number | null = null;
    let nextCalled = false;
    const req = { path, query } as any;
    const res = {
      status(c: number) { status = c; return this; },
      type() { return this; },
      send() {},
      redirect() {},
    } as any;
    legacyRedirects(req, res, () => { nextCalled = true; });
    return { status, nextCalled };
  }

  it('/?s=… is 410 (the old WP SearchAction template)', () => {
    expect(run('/', { s: '{search_term_string}' })).toEqual({ status: 410, nextCalled: false });
    expect(run('/', { s: 'sofa' })).toEqual({ status: 410, nextCalled: false });
  });

  it('plain / and other queries pass through', () => {
    expect(run('/', {})).toEqual({ status: null, nextCalled: true });
    expect(run('/', { utm_source: 'x' })).toEqual({ status: null, nextCalled: true });
    expect(run('/journal', { s: 'x' })).toEqual({ status: null, nextCalled: true });
  });
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

describe('trailingSlashRedirect middleware', () => {
  function run(path: string, url?: string) {
    let redirectedTo: string | null = null;
    let redirectStatus: number | null = null;
    let nextCalled = false;
    const req = { path, url: url ?? path } as any;
    const res = {
      redirect(status: number, target: string) { redirectStatus = status; redirectedTo = target; },
    } as any;
    trailingSlashRedirect(req, res, () => { nextCalled = true; });
    return { redirectedTo, redirectStatus, nextCalled };
  }

  it('301s a trailing slash to the bare path', () => {
    const r = run('/portfolio/');
    expect(r.redirectStatus).toBe(301);
    expect(r.redirectedTo).toBe('/portfolio');
    expect(r.nextCalled).toBe(false);
  });

  it('preserves the query string', () => {
    const r = run('/journal/', '/journal/?page=2');
    expect(r.redirectedTo).toBe('/journal?page=2');
  });

  it('leaves the root path and bare paths alone', () => {
    expect(run('/').nextCalled).toBe(true);
    expect(run('/portfolio').nextCalled).toBe(true);
  });

  it('never rewrites /api/* routes', () => {
    const r = run('/api/admin/usage/');
    expect(r.nextCalled).toBe(true);
    expect(r.redirectStatus).toBeNull();
  });
});
