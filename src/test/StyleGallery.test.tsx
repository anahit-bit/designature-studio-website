import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StyleGallery } from '../components/JournalArticlePage';

const ITEMS = [
  { image: 'https://res.cloudinary.com/dys2k5muv/image/upload/journal/post-02/coastal.png', label: 'Coastal' },
  { image: 'https://res.cloudinary.com/dys2k5muv/image/upload/journal/post-02/boho.png', label: 'Boho' },
  { image: 'https://res.cloudinary.com/dys2k5muv/image/upload/journal/post-02/japandi.png', label: 'Japandi' },
];

describe('StyleGallery', () => {
  it('renders one tile per item with its label', () => {
    render(<StyleGallery items={ITEMS} />);
    for (const it of ITEMS) {
      expect(screen.getByText(it.label)).toBeTruthy();
    }
    // One <img> per style tile.
    expect(screen.getAllByRole('img')).toHaveLength(ITEMS.length);
  });

  it('lazy-loads each tile image through the Cloudinary helper', () => {
    render(<StyleGallery items={ITEMS} />);
    const imgs = screen.getAllByRole('img') as HTMLImageElement[];
    for (const img of imgs) {
      expect(img.getAttribute('loading')).toBe('lazy');
      expect(img.getAttribute('src')).toContain('res.cloudinary.com');
      expect(img.getAttribute('srcset')).toBeTruthy();
    }
  });

  it('renders an optional caption under the grid', () => {
    render(<StyleGallery items={ITEMS} caption="Six ways, one photo" />);
    expect(screen.getByText('Six ways, one photo')).toBeTruthy();
  });

  it('renders nothing when items are empty or undefined', () => {
    const { container: c1 } = render(<StyleGallery items={[]} />);
    expect(c1.firstChild).toBeNull();
    const { container: c2 } = render(<StyleGallery />);
    expect(c2.firstChild).toBeNull();
  });
});
