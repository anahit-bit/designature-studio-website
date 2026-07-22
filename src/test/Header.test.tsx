import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Header from '../components/Header';
import { LanguageProvider } from '../LanguageContext';
import { AuthProvider } from '../AuthContext';

// Mock Logo component to avoid potential issues with SVG/assets in tests
vi.mock('../components/Logo', () => ({
  default: () => <div data-testid="logo">Logo</div>,
}));

const renderWithProvider = (ui: React.ReactElement) => {
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <AuthProvider>
          {ui}
        </AuthProvider>
      </LanguageProvider>
    </MemoryRouter>
  );
};

beforeEach(() => {
  // No stored token → AuthProvider stays in logged-out state, no /api/auth/me probe.
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => { store[key] = String(value); }),
      removeItem: vi.fn((key: string) => { delete store[key]; }),
      clear: vi.fn(() => { store = {}; }),
      length: 0,
      key: vi.fn(),
    };
  })();
  Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });
  global.fetch = vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({}) });
});

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

  // Language switcher is currently hidden (UI commented out) — re-enable this test when switcher is restored.
  it.skip('toggles language when language switcher is clicked', () => {
    renderWithProvider(<Header />);
    const switcher = screen.getAllByRole('button', { name: /AM/i })[0];
    expect(switcher).toBeInTheDocument();
    fireEvent.click(switcher);
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

  // S-003: secondary "Try AI free" CTA — logged-out + logged-in states (RT-014)
  it('shows the secondary "Try AI free" CTA when logged out', () => {
    renderWithProvider(<Header />);
    expect(screen.getAllByText(/Try AI free/i).length).toBeGreaterThan(0);
    // Account chip / "Go to Studio" should NOT appear when logged out
    expect(screen.queryByText(/Go to Studio/i)).not.toBeInTheDocument();
    // AC-001 — "My studio" must NEVER appear for logged-out visitors
    expect(screen.queryByText(/My studio/i)).not.toBeInTheDocument();
  });

  it('keeps the primary "Let\'s chat" CTA visible alongside the secondary CTA', () => {
    renderWithProvider(<Header />);
    // Primary CTA copy uses btn.bookCall = "Let's Talk"
    expect(screen.getAllByText(/Let's Talk/i).length).toBeGreaterThan(0);
  });

  it('shows account chip + "Go to Studio" + Sign out when logged in', async () => {
    // Seed a session token + mock /api/auth/me to return a user
    const localStorageMock = (() => {
      let store: Record<string, string> = { ds_session_token: 'fake-token' };
      return {
        getItem: vi.fn((key: string) => store[key] ?? null),
        setItem: vi.fn((key: string, value: string) => { store[key] = String(value); }),
        removeItem: vi.fn((key: string) => { delete store[key]; }),
        clear: vi.fn(() => { store = {}; }),
        length: 0,
        key: vi.fn(),
      };
    })();
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/auth/me') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            email: 'qa@example.com',
            name: 'QA User',
            picture: '',
            generationsLeft: 3,
            shoppingListsLeft: 3,
          }),
        });
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
    });

    renderWithProvider(<Header />);

    // Wait for AuthProvider to finish probing /api/auth/me
    await waitFor(() => {
      expect(screen.getAllByText(/Go to Studio/i).length).toBeGreaterThan(0);
    });

    // "Try AI free" should NOT appear when logged in
    expect(screen.queryByText(/Try AI free/i)).not.toBeInTheDocument();

    // AC-001 — dashboard is PAID-ONLY: a signed-in FREE user must NOT see "My studio"
    expect(screen.queryByText(/My studio/i)).not.toBeInTheDocument();

    // Account chip button has aria-label = user name; clicking opens dropdown with Sign out
    const chipButtons = screen.getAllByRole('button', { name: 'QA User' });
    fireEvent.click(chipButtons[0]);
    expect(screen.getAllByText(/Sign out/i).length).toBeGreaterThan(0);
  });

  it('shows "My studio" only for a signed-in PAID user', async () => {
    const localStorageMock = (() => {
      let store: Record<string, string> = { ds_session_token: 'fake-token' };
      return {
        getItem: vi.fn((key: string) => store[key] ?? null),
        setItem: vi.fn((key: string, value: string) => { store[key] = String(value); }),
        removeItem: vi.fn((key: string) => { delete store[key]; }),
        clear: vi.fn(() => { store = {}; }),
        length: 0,
        key: vi.fn(),
      };
    })();
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/auth/me') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            email: 'paid@example.com',
            name: 'Paid User',
            picture: '',
            generationsLeft: 999,
            shoppingListsLeft: 999,
            isPaid: true,
          }),
        });
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
    });

    renderWithProvider(<Header />);

    await waitFor(() => {
      expect(screen.getAllByText(/My studio/i).length).toBeGreaterThan(0);
    });
  });
});
