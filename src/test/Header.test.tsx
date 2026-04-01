import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Header from '../components/Header';
import { LanguageProvider } from '../LanguageContext';

// Mock Logo component to avoid potential issues with SVG/assets in tests
vi.mock('../components/Logo', () => ({
  default: () => <div data-testid="logo">Logo</div>,
}));

const renderWithProvider = (ui: React.ReactElement) => {
  return render(
    <LanguageProvider>
      {ui}
    </LanguageProvider>
  );
};

describe('Header Component', () => {
  it('renders the logo', () => {
    renderWithProvider(<Header />);
    // Logo is rendered in both desktop and mobile views
    expect(screen.getAllByTestId('logo')[0]).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    renderWithProvider(<Header />);
    // Nav links are rendered in both desktop and mobile views
    expect(screen.getAllByText(/Studio/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Portfolio/i)[0]).toBeInTheDocument();
  });

  it('toggles language when language switcher is clicked', () => {
    renderWithProvider(<Header />);
    // Language switcher is rendered in both desktop and mobile views
    const switcher = screen.getAllByRole('button', { name: /AM/i })[0];
    expect(switcher).toBeInTheDocument();
    
    fireEvent.click(switcher);
    
    // After clicking, it should show 'EN' (to switch back) 
    // and the nav text should change to Armenian if translated
    expect(screen.getAllByText(/Ստուդիա/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/EN/i)[0]).toBeInTheDocument();
  });

  it('opens mobile menu on menu button click', () => {
    renderWithProvider(<Header />);
    
    const menuButton = screen.getByTestId('mobile-menu-button');
    fireEvent.click(menuButton);
    
    // Check if mobile menu links are visible
    // They are rendered with text-3xl md:text-5xl ...
    // Let's find them by text
    const links = screen.getAllByText(/Studio/i);
    // One in desktop nav, one in mobile nav
    expect(links.length).toBeGreaterThan(1);
  });
});
