import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ShoppingExperience from '../components/ShoppingExperience';
import { LanguageProvider } from '../LanguageContext';
import type { AuthUser } from '../AuthContext';

const THUMB = 'https://res.cloudinary.com/dys2k5muv/image/upload/shopping-living-1.webp';
// #11: search returns ONE best match per item; extra options are fetched on demand.
const RESULTS = [
  {
    item: { category: 'Sofa', description: 'primary seating', search_query: 'mid-century sofa' },
    products: [{ title: 'Sofa A', price: '$1,200', link: 'https://a.example.com', source: 'West Elm', thumbnail: THUMB }],
  },
  {
    item: { category: 'Lamp', description: 'lighting', search_query: 'table lamp' },
    products: [{ title: 'Lamp A', price: '$200', link: 'https://c.example.com', source: 'CB2', thumbnail: THUMB }],
  },
];

const baseProps = (user: AuthUser, over: Partial<any> = {}) => ({
  user,
  shoppingResults: RESULTS,
  shoppingTeaser: [],
  shoppingTotalIdentified: RESULTS.length,
  shoppingItems: [],
  shoppingLoading: false,
  shoppingError: null,
  shoppingDone: true,
  shoppingOffline: null,
  standaloneShoppingImage: null,
  searchSourceImage: 'data:image/png;base64,AAAA',
  searchSourceIsStandalone: false,
  selectedConceptUrl: null,
  shoppingCountry: 'us',
  setShoppingCountry: () => {},
  onStartOver: () => {},
  onEditSearch: () => {},
  fetchAlternate: async () => null,
  processShoppingFile: () => {},
  handleShopDrop: () => {},
  runSearch: () => {},
  handleDownloadShoppingPDF: () => {},
  navigateTo: () => {},
  ...over,
});

const paidUser = { email: 'o@x.com', name: 'Owner', picture: '', isPaid: true, shoppingListsLeft: 999, generationsLeft: 999 } as unknown as AuthUser;
const freeUser = { email: 'f@x.com', name: 'Free', picture: '', isPaid: false, shoppingListsLeft: 3, generationsLeft: 3 } as unknown as AuthUser;

const renderSE = (user: AuthUser, over: Partial<any> = {}) =>
  render(<MemoryRouter><LanguageProvider><ShoppingExperience {...baseProps(user, over)} /></LanguageProvider></MemoryRouter>);

describe('ShoppingExperience — paid controls are functional, not static', () => {
  it('FREE tier renders studio-frame.as-free (paid blocks greyed + locked)', () => {
    const { container } = renderSE(freeUser);
    expect((container.querySelector('.studio-frame') as HTMLElement).className).toMatch(/\bas-free\b/);
    expect(container.querySelector('.lockchip')).not.toBeNull();
  });

  it('PAID tier is NOT as-free; results group-by controls are real <button>s', () => {
    const { container } = renderSE(paidUser);
    expect((container.querySelector('.studio-frame') as HTMLElement).className).not.toMatch(/\bas-free\b/);
    expect(screen.getByText('List order').tagName).toBe('BUTTON');
    expect(screen.getByText('Budget tier').tagName).toBe('BUTTON');
    expect(screen.getByText('Room zone').tagName).toBe('BUTTON');
  });

  it('ENTRY Find chips render from the taxonomy (multi-select) + All; Budget is a real <button>', () => {
    // entry view: a source image but no results yet
    renderSE(paidUser, { shoppingDone: false, shoppingResults: [], standaloneShoppingImage: 'data:image/png;base64,AAAA' });
    expect(screen.getByText('All').tagName).toBe('BUTTON');             // Find "All"
    expect(screen.getByText('Seating').tagName).toBe('BUTTON');         // taxonomy chip
    expect(screen.getByText('Lighting').tagName).toBe('BUTTON');        // taxonomy chip
    expect(screen.getByText('Art & decor').tagName).toBe('BUTTON');     // taxonomy chip
    // Budget LEVEL section (replaces the old per-item chips); "What do these mean?" is a real button.
    expect(screen.getByText('Budget level')).toBeInTheDocument();
    expect(screen.getByText('What do these mean?').tagName).toBe('BUTTON');
    // The redundant "Categories to include" row is dropped.
    expect(screen.queryByText('Categories to include')).not.toBeInTheDocument();
  });

  it('Budget level: bands collapsed by default → expand reveals them; whole-room cap auto-sets Any + shows the note', () => {
    renderSE(paidUser, { shoppingDone: false, shoppingResults: [], standaloneShoppingImage: 'data:image/png;base64,AAAA' });
    // Collapsed: the per-category band caption is not in the DOM yet.
    expect(screen.queryByText(/Bands per category come from/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('What do these mean?'));
    expect(screen.getByText(/Bands per category come from/i)).toBeInTheDocument();
    // Whole-room cap → the "Level set to Any" note appears.
    expect(screen.queryByText(/we pick across all price levels/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Cap the whole-room budget'));
    expect(screen.getByText(/we pick across all price levels/i)).toBeInTheDocument();
  });

  it('#11: ONE best by default; "Find another option" fetches a single alt on demand (excl. shown source); "Set as best" promotes it', async () => {
    const fetchAlternate = vi.fn().mockResolvedValue({ title: 'ALT SOFA', price: '$500', link: 'https://wayfair.example.com/x', source: 'Wayfair', thumbnail: THUMB });
    render(<MemoryRouter><LanguageProvider><ShoppingExperience {...baseProps(paidUser, {
      shoppingResults: [{ item: { category: 'Sofa', search_query: 'mid-century sofa' }, products: [{ title: 'Sofa A', price: '$1,200', link: 'https://a.example.com', source: 'West Elm', thumbnail: THUMB }] }],
      shoppingTotalIdentified: 1,
      fetchAlternate,
    })} /></LanguageProvider></MemoryRouter>);
    // Default: one best match — no alt card / no "Set as best" yet.
    expect(screen.queryByText('Set as best')).not.toBeInTheDocument();
    expect(screen.getByText(/Find another option/i)).toBeInTheDocument();
    // On demand: one extra search for THIS item, excluding the shown retailer.
    fireEvent.click(screen.getByText(/Find another option/i));
    expect(fetchAlternate).toHaveBeenNthCalledWith(1, expect.objectContaining({ category: 'Sofa' }), ['West Elm']);
    expect(await screen.findByText('ALT SOFA')).toBeInTheDocument();
    expect(screen.getByText(/Set as best/i)).toBeInTheDocument();
    // Promote it → candidates now include both sources; a re-fetch excludes both.
    fireEvent.click(screen.getByText(/Set as best/i));
    fireEvent.click(screen.getByText(/Find another option/i));
    expect(fetchAlternate).toHaveBeenLastCalledWith(expect.anything(), expect.arrayContaining(['West Elm', 'Wayfair']));
  });

  it('FREE results show the named teaser + upgrade CTA + free inputs-summary count', () => {
    renderSE(freeUser, {
      shoppingTeaser: [{ category: 'Rug', label: 'area rug' }, { category: 'Curtains', label: 'window' }],
      shoppingTotalIdentified: 4,
    });
    expect(screen.getByText('We also spotted in your room')).toBeInTheDocument();
    // teaser items named (no products)
    expect(screen.getByText('Rug')).toBeInTheDocument();
    expect(screen.getByText('Curtains')).toBeInTheDocument();
    // single upgrade CTA for the 2 teaser items
    expect(screen.getByText(/Upgrade to shop these 2 more/i)).toBeInTheDocument();
    // free inputs summary count line
    expect(screen.getByText(/Found 4 items · showing 2 \(free\)/i)).toBeInTheDocument();
  });

  it('PAID results show no teaser block + a plain "M items" summary', () => {
    renderSE(paidUser, { shoppingTeaser: [], shoppingTotalIdentified: 2 });
    expect(screen.queryByText('We also spotted in your room')).not.toBeInTheDocument();
    expect(screen.getByText('2 items')).toBeInTheDocument();
    // Edit search is available in results
    expect(screen.getByText(/Edit search/i).tagName).toBe('BUTTON');
  });

  it('real "View at {retailer}" links open in a new tab (rel=noopener)', () => {
    renderSE(paidUser);
    const link = screen.getByText(/View at West Elm/i).closest('a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('https://a.example.com');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toMatch(/noopener/);
  });
});

describe('ShoppingExperience · locked marquee band (§2 — Landing + Entry only)', () => {
  it('renders the retailer marquee on the Landing state', () => {
    const { container } = renderSE(paidUser, { shoppingDone: false, shoppingResults: [], standaloneShoppingImage: null, searchSourceImage: null, selectedConceptUrl: null });
    expect(container.querySelector('.marquee-track')).not.toBeNull();
    expect(screen.getByText('Searched across')).toBeInTheDocument();
    expect(screen.getAllByAltText('West Elm').length).toBeGreaterThan(0); // self-hosted retailer logos
  });

  it('renders the retailer marquee on the Entry state', () => {
    const { container } = renderSE(paidUser, { shoppingDone: false, shoppingResults: [], standaloneShoppingImage: 'data:image/png;base64,AAAA' });
    expect(container.querySelector('.marquee-track')).not.toBeNull();
    expect(screen.getByText('Searched across')).toBeInTheDocument();
  });

  it('does NOT render the marquee on the Results state', () => {
    const { container } = renderSE(paidUser); // baseProps → results view
    expect(container.querySelector('.marquee-track')).toBeNull();
  });
});
