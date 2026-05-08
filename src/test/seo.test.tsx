import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import SeoHead from '../components/SeoHead';
import LocalBusinessSchema, {
  LOCAL_BUSINESS_GRAPH,
} from '../components/LocalBusinessSchema';
import {
  seoDefaults,
  projectDetailSeo,
  SITE_ORIGIN,
} from '../lib/seo-defaults';

const EXPECTED_ROUTE_KEYS = [
  'home',
  'portfolio',
  'portfolioDetail',
  'services',
  'studio',
  'aiConcepts',
  'aiVision',
  'pricing',
  'faq',
  'deliverables',
] as const;

describe('seoDefaults', () => {
  it('covers every route from the spec', () => {
    for (const key of EXPECTED_ROUTE_KEYS) {
      expect(seoDefaults[key], `seoDefaults.${key} missing`).toBeDefined();
    }
  });

  it('keeps titles ≤60 chars and descriptions ≤160 chars', () => {
    for (const key of EXPECTED_ROUTE_KEYS) {
      const route = seoDefaults[key];
      expect(
        route.title.length,
        `${key} title too long: "${route.title}"`,
      ).toBeLessThanOrEqual(60);
      expect(
        route.description.length,
        `${key} description too long`,
      ).toBeLessThanOrEqual(160);
    }
  });

  it('never puts Yerevan in titles', () => {
    for (const key of EXPECTED_ROUTE_KEYS) {
      expect(
        seoDefaults[key].title.toLowerCase(),
        `${key} title leaks Yerevan`,
      ).not.toContain('yerevan');
    }
  });

  it('keeps location signal off AI-product surfaces', () => {
    const aiRoutes = ['aiConcepts', 'aiVision'] as const;
    for (const key of aiRoutes) {
      const { title, description } = seoDefaults[key];
      expect(title.toLowerCase()).not.toContain('yerevan');
      expect(description.toLowerCase()).not.toContain('yerevan');
      expect(description.toLowerCase()).not.toContain('armenia');
    }
  });
});

describe('projectDetailSeo', () => {
  it('falls back when no title supplied (project not loaded / invalid id)', () => {
    const seo = projectDetailSeo({});
    expect(seo.title).toBe('Portfolio — Designature Studio');
    expect(seo.description).toContain('interior design work');
  });

  it('formats a dynamic title and uses first sentence of description', () => {
    const seo = projectDetailSeo({
      id: '32',
      title: 'Two Story Living Room',
      description:
        'A clean, open-plan living space with high ceilings. The lower volume holds the kitchen.',
    });
    expect(seo.title).toBe(
      'Two Story Living Room — Portfolio — Designature Studio',
    );
    expect(seo.description).toBe(
      'A clean, open-plan living space with high ceilings.',
    );
    expect(seo.path).toBe('/portfolio/32');
    expect(seo.ogType).toBe('article');
  });

  it('falls back description when project description is missing', () => {
    const seo = projectDetailSeo({ id: '5', title: 'Memphis Apartment' });
    expect(seo.description).toBe(
      'Memphis Apartment — an interior project by Designature Studio.',
    );
  });
});

describe('<SeoHead>', () => {
  it('sets document.title to the rendered title', async () => {
    render(
      <SeoHead
        title="AI Vision — Generate Interior Design from a Prompt"
        description="Type what you want, get an interior visualization."
        canonical="/ai-vision"
      />,
    );
    // React 19 hoists <title> into document.head.
    expect(document.title).toBe(
      'AI Vision — Generate Interior Design from a Prompt',
    );
  });

  it('renders a meta description tag with the right content', () => {
    render(
      <SeoHead
        title="Portfolio — Designature Studio"
        description="Selected interior design work — apartments, houses, and commercial spaces."
        canonical="/portfolio"
      />,
    );
    const meta = document.querySelector('meta[name="description"]');
    expect(meta).toBeTruthy();
    expect(meta?.getAttribute('content')).toContain(
      'Selected interior design work',
    );
  });

  it('renders canonical, og, and twitter tags pointing at the canonical origin', () => {
    render(
      <SeoHead
        title="Pricing — Designature Studio"
        description="Three ways to work with the studio."
        canonical="/pricing"
        ogImage="https://example.com/og.jpg"
      />,
    );
    expect(
      document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
    ).toBe(`${SITE_ORIGIN}/pricing`);
    expect(
      document.querySelector('meta[property="og:url"]')?.getAttribute('content'),
    ).toBe(`${SITE_ORIGIN}/pricing`);
    expect(
      document.querySelector('meta[property="og:title"]')?.getAttribute('content'),
    ).toBe('Pricing — Designature Studio');
    expect(
      document.querySelector('meta[property="og:image"]')?.getAttribute('content'),
    ).toBe('https://example.com/og.jpg');
    expect(
      document.querySelector('meta[name="twitter:card"]')?.getAttribute('content'),
    ).toBe('summary_large_image');
  });

  it('updates document.title when re-rendered with a new title', () => {
    const { rerender } = render(
      <SeoHead
        title="Portfolio — Designature Studio"
        description="A"
        canonical="/portfolio"
      />,
    );
    expect(document.title).toBe('Portfolio — Designature Studio');
    rerender(
      <SeoHead
        title="FAQ — Designature Studio"
        description="B"
        canonical="/faq"
      />,
    );
    expect(document.title).toBe('FAQ — Designature Studio');
  });
});

describe('<LocalBusinessSchema>', () => {
  it('renders one application/ld+json script', () => {
    const before = document.querySelectorAll(
      'script[type="application/ld+json"]',
    ).length;
    render(<LocalBusinessSchema />);
    const after = document.querySelectorAll(
      'script[type="application/ld+json"]',
    ).length;
    expect(after).toBe(before + 1);
  });

  it('emits a valid @graph with both Organization and InteriorDesignBusiness', () => {
    expect(LOCAL_BUSINESS_GRAPH['@context']).toBe('https://schema.org');
    const types = LOCAL_BUSINESS_GRAPH['@graph'].map((node) => node['@type']);
    expect(types).toContain('Organization');
    expect(types).toContain('InteriorDesignBusiness');
  });

  it('cross-references the LocalBusiness to the Organization via parentOrganization', () => {
    const business = LOCAL_BUSINESS_GRAPH['@graph'].find(
      (n) => n['@type'] === 'InteriorDesignBusiness',
    ) as { parentOrganization?: { '@id'?: string } } | undefined;
    expect(business?.parentOrganization?.['@id']).toBe(
      'https://www.designature.studio/#organization',
    );
  });

  it('matches the locked schema snapshot', () => {
    expect(JSON.stringify(LOCAL_BUSINESS_GRAPH)).toMatchSnapshot();
  });
});
