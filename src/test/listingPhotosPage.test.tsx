import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ListingPhotosPage from '../components/ListingPhotosPage';
import { LanguageProvider } from '../LanguageContext';
import { AuthProvider } from '../AuthContext';
import { LISTING_PHOTOS_FAQ } from '../data/listingPhotosFaq';
import { buildJsonLd } from '../../server/seo/jsonld';
import { classifyRoute, buildMeta } from '../../server/seo/meta';
import { VISION_STYLES_FULL } from '../components/VisionExperience';

/**
 * M-001 — /listing-photos, the US paid-search landing page.
 *
 * These guard the three things whose silent loss would cost real ad money or
 * real trust, not the page's styling:
 *   1. The ad-group deep-link anchors (#hosts / #agents). ads.csv points final
 *      URLs at them; if an id is renamed the ads land mid-page with no message
 *      match and Quality Score follows.
 *   2. The virtually-staged disclosure. It is a compliance element, not copy.
 *   3. FAQ ↔ FAQPage schema parity — the rendered accordion and the structured
 *      data must come from the one source in src/data/listingPhotosFaq.ts.
 */

vi.mock('../components/Logo', () => ({
  default: () => <div data-testid="logo">Logo</div>,
}));

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/listing-photos']}>
      <LanguageProvider>
        <AuthProvider>
          <Routes>
            <Route path="/listing-photos" element={<ListingPhotosPage />} />
            <Route path="*" element={<div data-testid="elsewhere" />} />
          </Routes>
        </AuthProvider>
      </LanguageProvider>
    </MemoryRouter>
  );

beforeEach(() => {
  vi.restoreAllMocks();
  window.scrollTo = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

describe('/listing-photos page', () => {
  it('leads with the campaign promise', () => {
    renderPage();
    expect(
      screen.getByRole('heading', { level: 1, name: /the photos are/i })
    ).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /restyle my room free/i }).length).toBeGreaterThan(0);
  });

  it('keeps the #hosts and #agents ad-group anchors', () => {
    const { container } = renderPage();
    // Referenced by docs/marketing/google-ads/ads.csv final URLs.
    expect(container.querySelector('#hosts')).not.toBeNull();
    expect(container.querySelector('#agents')).not.toBeNull();
  });

  it('carries the virtually-staged disclosure and the affiliate disclosure', () => {
    renderPage();
    // Appears twice on purpose: the dark disclosure band and the agent bullet.
    expect(screen.getAllByText(/virtually staged/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/earn us a small commission/i).length).toBeGreaterThan(0);
  });

  it('makes no unsubstantiated performance claim', () => {
    const { container } = renderPage();
    const text = container.textContent ?? '';
    // Guards copy rule 1 in ListingPhotosPage.tsx: no invented percentages, no
    // promises about bookings/price. Google Ads + FTC substantiation both apply.
    expect(text).not.toMatch(/\d+\s?%/);
    expect(text).not.toMatch(/\b(guarantee|guaranteed)\b/i);
    expect(text).not.toMatch(/\b(more bookings|book \d|sell faster|sells faster)\b/i);
  });

  it('renders every FAQ question and opens an answer on click', () => {
    renderPage();
    for (const item of LISTING_PHOTOS_FAQ) {
      expect(screen.getByRole('button', { name: item.q })).toBeInTheDocument();
    }
    const second = screen.getByRole('button', { name: LISTING_PHOTOS_FAQ[1].q });
    fireEvent.click(second);
    expect(second).toHaveAttribute('aria-expanded', 'true');
  });
});

describe('/listing-photos SEO layer', () => {
  it('classifies and describes the route', () => {
    const info = classifyRoute('/listing-photos');
    expect(info.key).toBe('listingPhotos');
    const meta = buildMeta(info);
    expect(meta.noindex).toBe(false);
    expect(meta.canonical).toBe('https://www.designature.studio/listing-photos');
  });

  it('emits Service + FAQPage + BreadcrumbList, with the FAQ matching the page', () => {
    const nodes = buildJsonLd(classifyRoute('/listing-photos'));
    const types = nodes.map((n) => String(n['@type']));
    expect(types).toContain('Service');
    expect(types).toContain('FAQPage');
    expect(types).toContain('BreadcrumbList');

    const service = nodes.find((n) => n['@type'] === 'Service') as Record<string, any>;
    // The page targets the US while the studio's LocalBusiness node is Yerevan —
    // this is the node that keeps those two from reading as a contradiction.
    expect(service.areaServed).toEqual({ '@type': 'Country', name: 'United States' });

    const faq = nodes.find((n) => n['@type'] === 'FAQPage') as Record<string, any>;
    const questions = (faq.mainEntity as Array<{ name: string; acceptedAnswer: { text: string } }>);
    expect(questions.map((q) => q.name)).toEqual(LISTING_PHOTOS_FAQ.map((f) => f.q));
    expect(questions.map((q) => q.acceptedAnswer.text)).toEqual(
      LISTING_PHOTOS_FAQ.map((f) => f.a)
    );
  });
});

describe('/listing-photos ad copy stays true', () => {
  const DIR = join(process.cwd(), 'docs', 'marketing', 'google-ads');
  const csv = readdirSync(DIR)
    .filter((f) => f.endsWith('.csv'))
    .map((f) => readFileSync(join(DIR, f), 'utf8'))
    .join('\n');

  it('quotes the real number of selectable styles', () => {
    // The page derives this from VISION_STYLES_FULL; the CSVs cannot, so this is
    // the guard. If the style list changes, the ads are now making a false claim
    // and must be edited before the next upload.
    const claims = [...csv.matchAll(/(\d+) interior styles/gi)].map((m) => Number(m[1]));
    expect(claims.length).toBeGreaterThan(0);
    for (const n of claims) expect(n).toBe(VISION_STYLES_FULL.length);
  });

  it('keeps the free-tier claim at the real quota', () => {
    // /pricing offers 3 concepts + 3 shopping lists on the free tier.
    expect(csv).toMatch(/3 [Ff]ree [Cc]oncepts/);
    expect(csv).not.toMatch(/unlimited free/i);
  });

  it('never puts the Airbnb trademark in ad text', () => {
    // Bidding on it as a keyword is fine; ad text is what draws a complaint.
    // 02-keywords.csv is allowed to contain it, so check the ad/asset files only.
    const adFiles = readdirSync(DIR).filter((f) => f.endsWith('.csv') && !f.includes('keywords'));
    for (const f of adFiles) {
      expect(readFileSync(join(DIR, f), 'utf8')).not.toMatch(/airbnb/i);
    }
  });
});
