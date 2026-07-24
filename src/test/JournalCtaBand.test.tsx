import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { CtaBand } from '../components/JournalArticlePage';

function renderBand(props: { heading?: string; label?: string; href?: string }) {
  return render(
    <MemoryRouter>
      <CtaBand {...props} />
    </MemoryRouter>,
  );
}

describe('CtaBand (per-post article CTA)', () => {
  it('renders the post-supplied heading, label, and href on the primary button', () => {
    renderBand({
      heading: 'Turn your design into a shopping list',
      label: 'Try the Shopping List',
      href: '/ai-concepts#shopping',
    });
    expect(screen.getByRole('heading', { name: 'Turn your design into a shopping list' })).toBeTruthy();
    const primary = screen.getByRole('link', { name: /Try the Shopping List/ });
    expect(primary.getAttribute('href')).toBe('/ai-concepts#shopping');
  });

  it('falls back to the AI-Vision defaults when the post overrides are absent', () => {
    renderBand({});
    expect(screen.getByRole('heading', { name: 'See your space, reimagined' })).toBeTruthy();
    const primary = screen.getByRole('link', { name: /Try AI Vision free/ });
    expect(primary.getAttribute('href')).toBe('/ai-concepts');
  });

  it('always keeps a fixed black "Book a consultation" secondary → /consultation', () => {
    renderBand({ heading: 'Anything', label: 'Anything', href: '/somewhere' });
    const secondary = screen.getByRole('link', { name: /Book a consultation/ });
    expect(secondary.getAttribute('href')).toBe('/consultation');
  });
});
