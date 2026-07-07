import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Sanity so sitemap / project resolution are hermetic (no network).
const SAMPLE_PROJECT = {
  id: '0022',
  titleEN: 'Feminine Apartment',
  titleAM: 'Feminine Apartment',
  categoryEN: 'Residential' as const,
  categoryAM: 'Բնակելի' as const,
  imageUrl: 'https://res.cloudinary.com/dys2k5muv/image/upload/feminine.jpg',
  descriptionEN: 'A soft, feminine apartment redesign in warm neutral tones.',
  descriptionAM: '',
  area: '82 m²',
  date: '2026-03-01',
  locationEN: 'Yerevan',
  locationAM: 'Երևան',
  gallery: [],
};

const SAMPLE_CATEGORY = {
  title: 'How-to',
  slug: 'how-to',
  description: 'Practical, step-by-step interior design guides.',
  order: 1,
};

const SAMPLE_POST = {
  id: 'post-1',
  title: 'How to Light a Living Room',
  slug: 'light-a-living-room',
  excerpt: 'Layered lighting, the simple way.',
  body: '# Getting started\n\nUse **three** layers of light with a [guide](https://x).\n\n- Ambient\n- Task\n- Accent\n\n[studio]a candid studio aside[/studio]',
  coverImage: 'https://res.cloudinary.com/dys2k5muv/image/upload/cover.jpg',
  category: { title: 'How-to', slug: 'how-to' },
  tags: ['lighting', 'living-room'],
  author: 'Anahit',
  publishedAt: '2026-06-01',
  aiDisclosure: true,
  seo: {
    metaTitle: 'Lighting a Living Room — A Practical Guide',
    metaDescription: 'A practical, layered approach to lighting your living room.',
    faq: [{ question: 'How many light sources?', answer: 'At least three layers.' }],
  },
};

vi.mock('../lib/sanity', () => ({
  fetchProjects: vi.fn(async () => [SAMPLE_PROJECT]),
  fetchPosts: vi.fn(async () => [SAMPLE_POST]),
  fetchPost: vi.fn(async (slug: string) => (slug === SAMPLE_POST.slug ? SAMPLE_POST : null)),
  fetchCategories: vi.fn(async () => [SAMPLE_CATEGORY]),
}));

import {
  ALLOWED_BOTS,
  DISALLOWED_PATHS,
  isCrawler,
  buildRobotsTxt,
} from '../../server/config/bots';
import {
  classifyRoute,
  buildMeta,
  resolveProject,
  clampDescription,
  normalizePath,
} from '../../server/seo/meta';
import { buildJsonLd } from '../../server/seo/jsonld';
import {
  renderSitemapXml,
  STATIC_SITEMAP_ROUTES,
  buildSitemap,
  clearSitemapCache,
} from '../../server/seo/sitemap';
import {
  renderHtmlFromTemplate,
  __setTemplateForTest,
  renderRoute,
} from '../../server/seo/render';

// A minimal shell mirroring the real index.html shape we inject into.
const TEMPLATE = `<!DOCTYPE html>
<html lang="en"><head>
  <meta charset="UTF-8" />
  <title>Designature Studio | Interior Design Yerevan</title>
  <meta name="description" content="old default description" />
  <meta property="og:title" content="old og" />
  <meta property="og:image" content="old-og.jpg" />
  <meta property="twitter:card" content="summary_large_image" />
  <link rel="canonical" href="https://designature.studio/old" />
  <link rel="preload" as="image" href="https://cdn/hero.jpg" fetchpriority="high" />
</head>
<body class="font-body"><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>`;

beforeEach(() => {
  __setTemplateForTest(TEMPLATE);
  clearSitemapCache();
});

describe('bots allowlist', () => {
  it('detects allowed crawlers case-insensitively inside noisy UA strings', () => {
    expect(isCrawler('Mozilla/5.0 (compatible; GPTBot/1.2; +https://openai.com/gptbot)')).toBe(true);
    expect(isCrawler('ClaudeBot/1.0')).toBe(true);
    expect(isCrawler('Mozilla/5.0 Chrome/120 Safari/537')).toBe(false);
    expect(isCrawler(undefined)).toBe(false);
    expect(isCrawler('')).toBe(false);
  });

  it('robots.txt allows every listed bot, disallows private paths, and lists the sitemap', () => {
    const txt = buildRobotsTxt('https://designature.studio/sitemap.xml');
    for (const bot of ALLOWED_BOTS) {
      expect(txt).toContain(`User-agent: ${bot}`);
    }
    for (const path of DISALLOWED_PATHS) {
      expect(txt).toContain(`Disallow: ${path}`);
    }
    expect(txt).toContain('User-agent: *');
    expect(txt).toContain('Sitemap: https://designature.studio/sitemap.xml');
    // Key AI crawlers explicitly present.
    for (const bot of ['GPTBot', 'OAI-SearchBot', 'PerplexityBot', 'ClaudeBot', 'Google-Extended', 'Bingbot', 'Googlebot']) {
      expect(txt).toContain(bot);
    }
  });
});

describe('route classification + metadata', () => {
  it('classifies scope routes and private/unknown correctly', () => {
    expect(classifyRoute('/').key).toBe('home');
    expect(classifyRoute('/portfolio').key).toBe('portfolio');
    expect(classifyRoute('/services').key).toBe('services');
    expect(classifyRoute('/faq').key).toBe('faq');
    expect(classifyRoute('/pricing?ref=x#p').key).toBe('pricing');
    const detail = classifyRoute('/portfolio/0022');
    expect(detail.key).toBe('portfolioDetail');
    expect(detail.projectId).toBe('0022');
    expect(classifyRoute('/admin').key).toBe('private');
    expect(classifyRoute('/admin/orders').key).toBe('private');
    expect(classifyRoute('/booking/confirmed').key).toBe('private');
    expect(classifyRoute('/deliverables').key).toBe('private');
    expect(classifyRoute('/something-else').key).toBe('unknown');
  });

  it('normalizePath strips query/hash and trailing slash', () => {
    expect(normalizePath('/services/')).toBe('/services');
    expect(normalizePath('/')).toBe('/');
    expect(normalizePath('/faq?x=1#y')).toBe('/faq');
  });

  it('gives every public route a unique, non-empty title + description', () => {
    const keys = [
      '/', '/portfolio', '/services', '/studio', '/ai-concepts',
      '/ai-vision', '/pricing', '/faq', '/consultation', '/terms',
      '/privacy', '/refund',
    ];
    const titles = new Set<string>();
    const descs = new Set<string>();
    for (const k of keys) {
      const meta = buildMeta(classifyRoute(k));
      expect(meta.title.length).toBeGreaterThan(10);
      expect(meta.description.length).toBeGreaterThan(50);
      expect(meta.noindex).toBe(false);
      expect(meta.canonical.startsWith('https://designature.studio')).toBe(true);
      titles.add(meta.title);
      descs.add(meta.description);
    }
    expect(titles.size).toBe(keys.length);
    expect(descs.size).toBe(keys.length);
  });

  it('marks private + unknown routes noindex', () => {
    expect(buildMeta(classifyRoute('/admin')).noindex).toBe(true);
    expect(buildMeta(classifyRoute('/booking/failed')).noindex).toBe(true);
    expect(buildMeta(classifyRoute('/whatever')).noindex).toBe(true);
  });

  it('resolves portfolio detail meta from the project', () => {
    const info = classifyRoute('/portfolio/0022');
    const meta = buildMeta(info, SAMPLE_PROJECT);
    expect(meta.title).toContain('Feminine Apartment');
    expect(meta.description).toContain('feminine apartment redesign');
    expect(meta.ogImage).toBe(SAMPLE_PROJECT.imageUrl);
    expect(meta.canonical).toBe('https://designature.studio/portfolio/0022');
    expect(meta.noindex).toBe(false);
  });

  it('falls back to a valid indexable record when the project is missing', () => {
    const info = classifyRoute('/portfolio/does-not-exist');
    const meta = buildMeta(info, null);
    expect(meta.title.length).toBeGreaterThan(10);
    expect(meta.noindex).toBe(false);
  });

  it('resolveProject returns the matching project via Sanity', async () => {
    expect((await resolveProject('0022'))?.titleEN).toBe('Feminine Apartment');
    expect(await resolveProject('nope')).toBeNull();
  });

  it('clampDescription trims long text on a word boundary', () => {
    const long = 'word '.repeat(100).trim();
    const out = clampDescription(long, 100);
    expect(out.length).toBeLessThanOrEqual(100);
    expect(out.endsWith('…')).toBe(true);
  });
});

describe('JSON-LD', () => {
  it('emits Organization + LocalBusiness + WebSite on home', () => {
    const nodes = buildJsonLd(classifyRoute('/'));
    const types = nodes.map((n) => JSON.stringify(n['@type']));
    expect(types.some((t) => t.includes('Organization'))).toBe(true);
    expect(types.some((t) => t.includes('LocalBusiness'))).toBe(true);
    expect(types.some((t) => t.includes('WebSite'))).toBe(true);
    for (const n of nodes) expect(n['@context']).toBe('https://schema.org');
    // hasOfferCatalog present on the LocalBusiness node.
    const lb = nodes.find((n) => JSON.stringify(n['@type']).includes('LocalBusiness'))!;
    expect(lb.hasOfferCatalog).toBeTruthy();
  });

  it('emits a BreadcrumbList on portfolio + detail', () => {
    const p = buildJsonLd(classifyRoute('/portfolio'));
    expect(p[0]['@type']).toBe('BreadcrumbList');
    const d = buildJsonLd(classifyRoute('/portfolio/0022'), SAMPLE_PROJECT);
    expect(d[0]['@type']).toBe('BreadcrumbList');
    const items = (d[0].itemListElement as any[]);
    expect(items[items.length - 1].name).toBe('Feminine Apartment');
  });

  it('emits an FAQPage whose questions match the FAQ source', async () => {
    const { FAQ_SECTIONS } = await import('../data/faqs');
    const expectedCount = FAQ_SECTIONS.reduce((n, s) => n + s.items.length, 0);
    const nodes = buildJsonLd(classifyRoute('/faq'));
    expect(nodes[0]['@type']).toBe('FAQPage');
    expect((nodes[0].mainEntity as any[]).length).toBe(expectedCount);
    expect((nodes[0].mainEntity as any[])[0].name).toBe(FAQ_SECTIONS[0].items[0].q);
  });
});

describe('sitemap', () => {
  it('renders valid XML with escaped, absolute locs', () => {
    const xml = renderSitemapXml([{ path: '/x?a=1&b=2', lastmod: '2026-01-02', priority: 0.5 }]);
    expect(xml.startsWith('<?xml')).toBe(true);
    expect(xml).toContain('<loc>https://designature.studio/x?a=1&amp;b=2</loc>');
    expect(xml).toContain('<lastmod>2026-01-02</lastmod>');
    expect(xml).toContain('<priority>0.5</priority>');
  });

  it('includes every static route + Sanity project slugs', async () => {
    const xml = await buildSitemap(1000);
    for (const r of STATIC_SITEMAP_ROUTES) {
      expect(xml).toContain(`<loc>https://designature.studio${r.path === '/' ? '/' : r.path}</loc>`);
    }
    expect(xml).toContain('<loc>https://designature.studio/portfolio/0022</loc>');
  });
});

describe('HTML injection', () => {
  it('injects one unique title, canonical, OG/Twitter + JSON-LD; preserves preload; strips old tags', () => {
    const html = renderHtmlFromTemplate(TEMPLATE, classifyRoute('/'));
    // exactly one title, and it's the resolved one
    expect((html.match(/<title>/g) || []).length).toBe(1);
    expect(html).toContain('<title>Designature Studio — Interior Design in Yerevan');
    expect(html).not.toContain('old default description');
    expect(html).not.toContain('old og');
    // canonical + og:url
    expect(html).toContain('<link rel="canonical" href="https://designature.studio/"');
    expect(html).toContain('property="og:url" content="https://designature.studio/"');
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    // preload preserved
    expect(html).toContain('rel="preload"');
    // JSON-LD present
    expect(html).toContain('application/ld+json');
    expect(html).toContain('"@type":"WebSite"');
    // prerender text inside root
    expect(html).toContain('data-seo-prerender');
    expect(html).toContain("We'll bring it to life.");
  });

  it('adds noindex on private routes and no prerender', () => {
    const html = renderHtmlFromTemplate(TEMPLATE, classifyRoute('/admin'));
    expect(html).toContain('name="robots" content="noindex,nofollow"');
    expect(html).not.toContain('data-seo-prerender');
  });

  it('renders FAQ prerender + FAQPage schema through renderRoute', async () => {
    const html = await renderRoute('/faq');
    expect(html).toContain('"@type":"FAQPage"');
    expect(html).toContain('Frequently Asked Questions');
    expect(html).toContain('What is the AI Studio');
  });

  it('escapes injected attribute values (no unescaped quotes break out)', () => {
    const html = renderHtmlFromTemplate(TEMPLATE, classifyRoute('/portfolio/0022'), {
      ...SAMPLE_PROJECT,
      titleEN: 'A "Quoted" & <Angled> Title',
      descriptionEN: 'Desc with "quotes" & <tags>.',
    });
    expect(html).toContain('&quot;Quoted&quot;');
    expect(html).not.toContain('content="A "Quoted"');
  });
});

describe('journal (Phase 2) routes', () => {
  it('classifies journal index, article, and category routes', () => {
    expect(classifyRoute('/journal').key).toBe('journalIndex');
    const article = classifyRoute('/journal/light-a-living-room');
    expect(article.key).toBe('journalDetail');
    expect(article.slug).toBe('light-a-living-room');
    const cat = classifyRoute('/journal/category/how-to');
    expect(cat.key).toBe('journalCategory');
    expect(cat.slug).toBe('how-to');
    // category route must not be misread as an article slug of "category"
    expect(classifyRoute('/journal/category/how-to').key).not.toBe('journalDetail');
  });

  it('gives the journal index a unique indexable meta record', () => {
    const meta = buildMeta(classifyRoute('/journal'));
    expect(meta.title).toContain('Journal');
    expect(meta.description.length).toBeGreaterThan(50);
    expect(meta.noindex).toBe(false);
    expect(meta.canonical).toBe('https://designature.studio/journal');
  });

  it('resolves article meta from the post (prefers seo.metaTitle/Description + coverImage)', () => {
    const info = classifyRoute('/journal/light-a-living-room');
    const meta = buildMeta(info, null, { post: SAMPLE_POST as any });
    expect(meta.title).toBe('Lighting a Living Room — A Practical Guide');
    expect(meta.description).toContain('layered approach');
    expect(meta.ogImage).toBe(SAMPLE_POST.coverImage);
    expect(meta.canonical).toBe('https://designature.studio/journal/light-a-living-room');
    expect(meta.noindex).toBe(false);
  });

  it('marks an unknown article slug noindex (no soft-404)', () => {
    const meta = buildMeta(classifyRoute('/journal/does-not-exist'), null, { post: null });
    expect(meta.noindex).toBe(true);
  });

  it('resolves category meta from the category', () => {
    const meta = buildMeta(classifyRoute('/journal/category/how-to'), null, {
      category: SAMPLE_CATEGORY as any,
    });
    expect(meta.title).toContain('How-to');
    expect(meta.description).toContain('step-by-step');
    expect(meta.noindex).toBe(false);
  });

  it('emits BlogPosting + BreadcrumbList + FAQPage for an article', () => {
    const nodes = buildJsonLd(classifyRoute('/journal/light-a-living-room'), null, {
      post: SAMPLE_POST as any,
    });
    const types = nodes.map((n) => n['@type']);
    expect(types).toContain('BlogPosting');
    expect(types).toContain('BreadcrumbList');
    expect(types).toContain('FAQPage');
    for (const n of nodes) expect(n['@context']).toBe('https://schema.org');
    const article = nodes.find((n) => n['@type'] === 'BlogPosting')!;
    expect(article.headline).toBe('How to Light a Living Room');
    expect(article.datePublished).toBe('2026-06-01');
    // breadcrumb ends at the post, and includes the category crumb
    const crumb = nodes.find((n) => n['@type'] === 'BreadcrumbList')!;
    const items = crumb.itemListElement as any[];
    expect(items[items.length - 1].name).toBe('How to Light a Living Room');
    expect(items.some((i) => i.name === 'How-to')).toBe(true);
  });

  it('emits CollectionPage + BreadcrumbList for a category', () => {
    const nodes = buildJsonLd(classifyRoute('/journal/category/how-to'), null, {
      category: SAMPLE_CATEGORY as any,
      categoryPosts: [SAMPLE_POST as any],
    });
    const types = nodes.map((n) => n['@type']);
    expect(types).toContain('CollectionPage');
    expect(types).toContain('BreadcrumbList');
    const coll = nodes.find((n) => n['@type'] === 'CollectionPage')!;
    expect((coll.mainEntity as any).itemListElement[0].name).toBe('How to Light a Living Room');
  });

  it('includes journal post + category slugs in the sitemap', async () => {
    const xml = await buildSitemap(2000);
    expect(xml).toContain('<loc>https://designature.studio/journal</loc>');
    expect(xml).toContain('<loc>https://designature.studio/journal/light-a-living-room</loc>');
    expect(xml).toContain('<loc>https://designature.studio/journal/category/how-to</loc>');
  });

  it('prerenders article title + body text + FAQ through renderRoute', async () => {
    const html = await renderRoute('/journal/light-a-living-room');
    expect(html).toContain('"@type":"BlogPosting"');
    expect(html).toContain('data-seo-prerender');
    expect(html).toContain('How to Light a Living Room');
    // markdown reduced to plain text (no leading "# ")
    expect(html).toContain('Getting started');
    expect(html).toContain('Use three layers of light');
    // FAQ surfaced
    expect(html).toContain('How many light sources?');
    // [studio] note markers stripped from the crawler prerender (inner text kept)
    expect(html).toContain('a candid studio aside');
    expect(html).not.toContain('[studio]');
    // resolved title from seo.metaTitle
    expect(html).toContain('<title>Lighting a Living Room');
  });

  it('prerenders category title + description + post titles through renderRoute', async () => {
    const html = await renderRoute('/journal/category/how-to');
    expect(html).toContain('"@type":"CollectionPage"');
    expect(html).toContain('data-seo-prerender');
    expect(html).toContain('Practical, step-by-step');
    expect(html).toContain('How to Light a Living Room');
  });
});
