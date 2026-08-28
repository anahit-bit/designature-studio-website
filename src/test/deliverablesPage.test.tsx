import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import DeliverablesPage from '../components/DeliverablesPage';
import Header from '../components/Header';
import { LanguageProvider } from '../LanguageContext';
import { AuthProvider } from '../AuthContext';
import { COMPARISON_ROWS } from '../components/deliverables/ComparisonTable';
import { DELIVERABLES_FAQ } from '../data/deliverablesFaq';

/**
 * S-014 — /deliverables page.
 *
 * Guards the things that would silently break the page's job: the four phase
 * bands, the AI-vs-studio comparison marks (which carry a hard sync rule — see
 * ComparisonTable.tsx), the five real sample downloads, the 8-question FAQ that
 * feeds the FAQPage schema, and the conversion CTAs.
 */

const CDN = 'https://res.cloudinary.com/dys2k5muv/raw/upload';
/** Cloudinary attachment URL — fl_attachment forces a real download cross-origin. */
const cld = (name: string, version: string, id: string) =>
  `${CDN}/fl_attachment:${name}/${version}/${id}.pdf`;
const URLS = {
  phase12: cld('Designature-Phase-1-2-Brief-and-Concept', 'v1787292947', 'deliverables-phase-1-2'),
  aiConcept: cld('Designature-Phase-3-AI-Concept', 'v1787227891', 'deliverables-phase-3-ai-concept'),
  renders: cld('Designature-Phase-3-Renders', 'v1787227892', 'deliverables-phase-3-renders'),
  technical: cld('Designature-Phase-4-Technical-Documents', 'v1787297994', 'deliverables-phase-4-technical'),
  allInOne: cld('Designature-All-in-One-Sample-Project', 'v1787227894', 'deliverables-all-in-one'),
};

vi.mock('../components/Logo', () => ({
  default: () => <div data-testid="logo">Logo</div>,
}));

const renderPage = (initial = '/deliverables') =>
  render(
    <MemoryRouter initialEntries={[initial]}>
      <LanguageProvider>
        <AuthProvider>
          <Routes>
            <Route
              path="/deliverables"
              element={
                <>
                  <Header />
                  <DeliverablesPage />
                </>
              }
            />
            <Route path="*" element={<Header />} />
          </Routes>
        </AuthProvider>
      </LanguageProvider>
    </MemoryRouter>
  );

let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  const store: Record<string, string> = {};
  Object.defineProperty(window, 'localStorage', {
    writable: true,
    value: {
      getItem: vi.fn((k: string) => store[k] ?? null),
      setItem: vi.fn((k: string, v: string) => { store[k] = String(v); }),
      removeItem: vi.fn((k: string) => { delete store[k]; }),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    },
  });
  global.fetch = vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({}) });
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  errorSpy.mockRestore();
  vi.clearAllMocks();
});

describe('S-014 /deliverables page', () => {
  it('renders the route with no console errors', () => {
    renderPage();
    expect(
      screen.getByRole('heading', { name: 'A design package built to build from.', level: 1 })
    ).toBeInTheDocument();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('shows the hero eyebrow, subheader and both hero CTAs', () => {
    renderPage();
    expect(screen.getByText('What you actually receive')).toBeInTheDocument();
    expect(
      screen.getByText(/Every Designature project ships as a complete four-phase deliverable/)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'See the sample project →' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start yours' })).toBeInTheDocument();
  });

  // Owner decision: /deliverables is NOT a top-level nav destination. It is a
  // landing page reached from the home page's "See what you'll receive →" CTA,
  // so the header must not grow a Deliverables tab.
  it('does NOT add a Deliverables tab to the header nav', () => {
    renderPage();
    const nav = screen.getAllByRole('navigation')[0];
    const hrefs = within(nav).getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(hrefs).not.toContain('/deliverables');
    expect(within(nav).queryByRole('link', { name: 'Deliverables' })).not.toBeInTheDocument();
    // and the nav it replaced is untouched
    expect(hrefs.indexOf('/journal')).toBe(hrefs.indexOf('/services') + 1);
  });

  it('renders the at-a-glance strip', () => {
    renderPage();
    for (const label of ['Phases', 'Sheets per project', 'Room · plans + renders', 'PDF a builder can quote']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('renders all four phase detail sections, in order', () => {
    renderPage();
    const sections = screen.getAllByTestId('phase-section');
    expect(sections).toHaveLength(4);

    const EXPECTED: Array<[string, string]> = [
      ['Phase 1 & 2 · Discovery + Direction', 'Before a single line is drawn.'],
      ['Phase 3 · AI Concept', 'AI-assisted previews with fixed colour language.'],
      ['Phase 3 · Photoreal Renders', "See it before it's built."],
      ['Phase 4 · Technical Documents', 'A drawing set your contractor can build from.'],
    ];
    EXPECTED.forEach(([eyebrow, heading], i) => {
      const s = within(sections[i]);
      // The eyebrow also appears as the cover chip on some bands — allow both.
      expect(s.getAllByText(eyebrow).length).toBeGreaterThan(0);
      expect(s.getByRole('heading', { name: heading })).toBeInTheDocument();
    });
  });

  it("keeps Phase 4's user-facing framing (no project-specific room list)", () => {
    renderPage();
    const phase4 = within(screen.getAllByTestId('phase-section')[3]);
    expect(phase4.getByText('What your technical set will contain')).toBeInTheDocument();
    expect(phase4.getByText('Dimensioned floor plans')).toBeInTheDocument();
    expect(phase4.getByText('Heating floor layout')).toBeInTheDocument();
    expect(phase4.getAllByRole('listitem')).toHaveLength(13);
  });

  it('renders a real cover thumbnail for each phase', () => {
    renderPage();
    const covers = screen
      .getAllByTestId('phase-section')
      .map((s) => s.querySelector('img'));
    expect(covers.every(Boolean)).toBe(true);
    expect(covers).toHaveLength(4);
    for (const img of covers) {
      // Cloudinary-delivered, and contained (not cropped) — the pages are landscape.
      expect(img!.getAttribute('src')).toMatch(
        /res\.cloudinary\.com\/dys2k5muv\/image\/upload\/.*deliverables-cover-[a-z0-9-]+\.jpg$/
      );
      expect(img!.getAttribute('srcset')).toBeTruthy();
      // Pre-cropped to 4:5, so they fill the frame rather than letterbox.
      expect(img!.className).toContain('object-cover');
      // Alt text is fact-dense per the GEO copy rule, not a generic label.
      expect(img!.getAttribute('alt')!.length).toBeGreaterThan(60);
      expect(img!.getAttribute('alt')).toMatch(/Designature Studio/);
    }
  });

  // ── Comparison table — source of truth, see feedback_deliverables_ai_vs_studio_sync.md
  it('renders exactly 9 comparison rows with the correct AI/Studio marks', () => {
    renderPage();
    const rows = screen.getAllByTestId('deliverables-comparison-row');
    expect(rows).toHaveLength(9);

    const EXPECTED: Array<[string, boolean, boolean]> = [
      ['Style direction · moodboards', true, true],
      ['Room concept previews (AI)', true, true],
      ['Shopping list · furniture sourcing', true, true],
      ['Written client brief · reviewed & signed', false, true],
      ['Photoreal 3D renders · every room', false, true],
      ['Dimensioned floor plans', false, true],
      ['Electrical · plumbing · heating drawings', false, true],
      ['Elevations · tiling · floor patterns', false, true],
      ['Contractor-ready drawing set', false, true],
    ];

    EXPECTED.forEach(([label, ai, studio], i) => {
      const row = rows[i];
      expect(within(row).getByText(label)).toBeInTheDocument();
      expect(within(row).getByTestId('cmp-ai').textContent).toBe(ai ? '✓' : '—');
      expect(within(row).getByTestId('cmp-studio').textContent).toBe(studio ? '✓' : '—');
    });

    // The exported array is what future AI-XXX sessions edit — keep it aligned.
    expect(COMPARISON_ROWS.map((r) => [r.label, r.ai, r.studio])).toEqual(EXPECTED);
  });

  it('renders the comparison CTA pair', () => {
    renderPage();
    expect(screen.getByRole('button', { name: 'Try the AI Studio free →' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start a studio project' })).toBeInTheDocument();
  });

  // ── Downloads ────────────────────────────────────────────────────────────
  it('points every phase download at its sample PDF', () => {
    renderPage();
    const phaseLinks = screen.getAllByTestId('phase-download');
    expect(phaseLinks).toHaveLength(4);
    expect(phaseLinks.map((a) => a.getAttribute('href'))).toEqual([
      URLS.phase12, URLS.aiConcept, URLS.renders, URLS.technical,
    ]);
    for (const a of phaseLinks) {
      // Cloudinary `raw` delivery — a plain downloadable PDF, not the image pipeline.
      expect(a.getAttribute('href')).toMatch(
        /^https:\/\/res\.cloudinary\.com\/dys2k5muv\/raw\/upload\/fl_attachment:[\w-]+\/v\d+\/deliverables-[a-z0-9-]+\.pdf$/
      );
      expect(a).toHaveAttribute('download');
    }
  });

  it('renders the downloads grid: 4 phase cards + the All-in-One master row', () => {
    renderPage();
    const hrefs = screen.getAllByTestId('download-link').map((a) => a.getAttribute('href'));
    // 4 cards + master card + the navy section's master button
    expect(hrefs).toEqual([
      URLS.allInOne, URLS.phase12, URLS.aiConcept, URLS.renders, URLS.technical, URLS.allInOne,
    ]);
    expect(screen.getByText('All-in-One Sample')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '↓ Download the sample (10 MB)' })).toHaveAttribute(
      'href',
      URLS.allInOne
    );
  });

  it('labels every download with its real file size', () => {
    renderPage();
    // Sizes are the actual uploaded bytes — a wrong label misleads the visitor.
    for (const label of ['PDF · 7 MB', 'PDF · 1.5 MB', 'PDF · 4 MB', 'PDF · 10 MB']) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    expect(screen.queryByText('PDF · 13 MB')).not.toBeInTheDocument();
    expect(screen.queryByText('PDF · 12 MB')).not.toBeInTheDocument();
  });

  // ── FAQ ──────────────────────────────────────────────────────────────────
  it('renders 8 FAQ <details>, first one open', () => {
    const { container } = renderPage();
    const items = screen.getAllByTestId('deliverables-faq-item');
    expect(items).toHaveLength(8);
    expect(items).toHaveLength(DELIVERABLES_FAQ.length);
    expect(container.querySelectorAll('details')).toHaveLength(8);
    expect((items[0] as HTMLDetailsElement).open).toBe(true);
    for (const el of items.slice(1)) {
      expect((el as HTMLDetailsElement).open).toBe(false);
    }
    expect(
      screen.getByText('What does an interior design package actually include?')
    ).toBeInTheDocument();
    expect(screen.getByText('How long does a full project take?')).toBeInTheDocument();
  });

  it('renders the in-copy Pricing / start-a-project links in the cost answer', () => {
    renderPage();
    expect(screen.getByRole('button', { name: 'Pricing' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'start a project' })).toBeInTheDocument();
  });

  // ── CTAs ─────────────────────────────────────────────────────────────────
  it('wires the AI Vision deep-link CTA', () => {
    renderPage();
    expect(screen.getByRole('button', { name: 'Try AI Vision free →' })).toBeInTheDocument();
  });

  it('opens the live free Calendly link from "Book a free chat"', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderPage();
    screen.getByRole('button', { name: 'Book a free chat →' }).click();
    expect(openSpy).toHaveBeenCalledWith(
      'https://calendly.com/hello-designature/quick-conversation',
      '_blank',
      'noopener,noreferrer'
    );
    openSpy.mockRestore();
  });

  it('renders the $99 consultation CTA', () => {
    renderPage();
    expect(screen.getByRole('button', { name: 'Book a $99 consultation' })).toBeInTheDocument();
  });
});
