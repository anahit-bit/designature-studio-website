import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AccountPage from '../components/account/AccountPage';
import { LanguageProvider } from '../LanguageContext';
import { AuthProvider } from '../AuthContext';
import { MOCK_TIER_KEY, MOCK_PLAN_STATE_KEY } from '../lib/accountApi.mock';

// AC-001 runs mock-first (VITE_USE_MOCK_ACCOUNT defaults true), so no real network
// is needed. We still stub the browser bits jsdom doesn't implement.

function renderAccount(path = '/account', tier: 'free' | 'design' | 'studio' = 'design') {
  window.localStorage.setItem(MOCK_TIER_KEY, tier);
  window.localStorage.setItem(MOCK_PLAN_STATE_KEY, 'active');
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LanguageProvider>
        <AuthProvider>
          <Routes>
            <Route path="/account" element={<AccountPage />} />
          </Routes>
        </AuthProvider>
      </LanguageProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  const store: Record<string, string> = {};
  const localStorageMock = {
    getItem: vi.fn((k: string) => store[k] ?? null),
    setItem: vi.fn((k: string, v: string) => {
      store[k] = String(v);
    }),
    removeItem: vi.fn((k: string) => {
      delete store[k];
    }),
    clear: vi.fn(() => {
      for (const k of Object.keys(store)) delete store[k];
    }),
    length: 0,
    key: vi.fn(),
  };
  Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });
  global.fetch = vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({}) });
  window.scrollTo = vi.fn();
  window.open = vi.fn();
});

describe('AC-001 — Account dashboard', () => {
  // ── (a) all five tabs render ──
  it('renders the Overview tab by default', async () => {
    renderAccount('/account', 'design');
    expect(await screen.findByRole('heading', { level: 1, name: /Welcome back/i })).toBeInTheDocument();
  });

  it('renders the Library tab via ?tab=library', async () => {
    renderAccount('/account?tab=library', 'design');
    expect(await screen.findByRole('heading', { level: 1, name: /^Library$/i })).toBeInTheDocument();
    // populated grid (design tier)
    expect(await screen.findByText(/Kitchen — Mid-Century Coastal/i)).toBeInTheDocument();
  });

  it('renders the Bookings tab via ?tab=bookings', async () => {
    renderAccount('/account?tab=bookings', 'design');
    expect(await screen.findByRole('heading', { level: 1, name: /^Bookings$/i })).toBeInTheDocument();
    expect((await screen.findAllByText(/\$99 Consultation/i)).length).toBeGreaterThan(0);
  });

  it('renders the Billing tab via ?tab=billing', async () => {
    renderAccount('/account?tab=billing', 'design');
    expect(await screen.findByRole('heading', { level: 1, name: /^Billing$/i })).toBeInTheDocument();
    expect(await screen.findByText(/Billing history/i)).toBeInTheDocument();
  });

  it('renders the Settings tab via ?tab=settings', async () => {
    renderAccount('/account?tab=settings', 'design');
    expect(await screen.findByRole('heading', { level: 1, name: /^Settings$/i })).toBeInTheDocument();
    expect(await screen.findByText(/Danger zone/i)).toBeInTheDocument();
  });

  // ── (b) tier switching shows/hides the right sections ──
  it('Free tier: Library shows the upsell empty state (no saved grid)', async () => {
    renderAccount('/account?tab=library', 'free');
    expect(await screen.findByText(/Your library is empty\./i)).toBeInTheDocument();
    expect(screen.queryByText(/Kitchen — Mid-Century Coastal/i)).not.toBeInTheDocument();
  });

  it('Free tier: Billing hides the payment-method section', async () => {
    renderAccount('/account?tab=billing', 'free');
    expect(await screen.findByText(/No transactions yet\./i)).toBeInTheDocument();
    // The payment-method section (its "Update card" control) must not render for Free.
    expect(screen.queryByRole('button', { name: /Update card/i })).not.toBeInTheDocument();
  });

  it('Free tier: Overview shows an upgrade CTA', async () => {
    renderAccount('/account', 'free');
    expect(await screen.findByRole('button', { name: /Upgrade to Design/i })).toBeInTheDocument();
  });

  it('Studio tier: Overview shows the 4th Style Quiz usage card', async () => {
    renderAccount('/account', 'studio');
    await screen.findByRole('heading', { level: 1, name: /Welcome back/i });
    expect(await screen.findByText(/Style Quiz/i)).toBeInTheDocument();
  });

  it('Studio tier: Library shows the Project Folders strip', async () => {
    renderAccount('/account?tab=library', 'studio');
    expect(await screen.findByText(/\+ New project/i)).toBeInTheDocument();
    expect(await screen.findByText(/Vardanyan Apartment/i)).toBeInTheDocument();
  });

  it('Design tier: Overview shows "Manage plan", not an upgrade CTA', async () => {
    renderAccount('/account', 'design');
    expect(await screen.findByRole('button', { name: /Manage plan/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Upgrade to Design/i })).not.toBeInTheDocument();
  });

  // ── (c) modals open + close ──
  it('opens and closes the Delete-account modal', async () => {
    renderAccount('/account?tab=settings', 'design');
    fireEvent.click(await screen.findByRole('button', { name: /Delete my account/i }));

    const dialog = await screen.findByRole('dialog', { name: /Delete your account/i });
    expect(dialog).toBeInTheDocument();
    // Final delete button is disabled until the two gates are satisfied.
    expect(within(dialog).getByRole('button', { name: /Delete my account/i })).toBeDisabled();

    fireEvent.click(within(dialog).getByRole('button', { name: /Keep account/i }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: /Delete your account/i })).not.toBeInTheDocument()
    );
  });

  it('Delete-account modal enables the final button only after checkbox + matching email', async () => {
    renderAccount('/account?tab=settings', 'design');
    fireEvent.click(await screen.findByRole('button', { name: /Delete my account/i }));
    const dialog = await screen.findByRole('dialog', { name: /Delete your account/i });

    fireEvent.click(within(dialog).getByRole('checkbox'));
    fireEvent.change(within(dialog).getByLabelText(/Confirm your email/i), {
      target: { value: 'anahit@designature.studio' },
    });
    expect(within(dialog).getByRole('button', { name: /Delete my account/i })).toBeEnabled();
  });

  it('opens and closes the Cancel-plan modal from Billing', async () => {
    renderAccount('/account?tab=billing', 'design');
    fireEvent.click(await screen.findByRole('button', { name: /Cancel subscription/i }));

    const dialog = await screen.findByRole('dialog', { name: /Cancel your plan\?/i });
    expect(dialog).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: /Keep my plan/i }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: /Cancel your plan\?/i })).not.toBeInTheDocument()
    );
  });

  it('Cancel-booking modal shows the full-refund branch for a >24h slot', async () => {
    renderAccount('/account?tab=bookings', 'design');
    // The upcoming mock booking is 5 days out → refund-eligible.
    const cancelButtons = await screen.findAllByRole('button', { name: /^Cancel$/i });
    fireEvent.click(cancelButtons[0]);
    const dialog = await screen.findByRole('dialog', { name: /Cancel this consultation\?/i });
    expect(within(dialog).getByText(/full refund/i)).toBeInTheDocument();
  });
});
