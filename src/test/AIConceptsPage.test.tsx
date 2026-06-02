import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AIConceptsPage from '../components/AIConceptsPage';
import SessionInactivityGuard from '../components/SessionInactivityGuard';
import { LanguageProvider } from '../LanguageContext';
import { AuthProvider } from '../AuthContext';
import { RetailersProvider } from '../RetailersContext';

// Mock GoogleGenAI
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      generateContent: vi.fn(),
    },
  })),
}));

// Mock Header and Footer to simplify
vi.mock('../components/Header', () => ({
  default: () => <div data-testid="header">Header</div>,
}));
vi.mock('../components/Footer', () => ({
  default: () => <div data-testid="footer">Footer</div>,
}));

const renderWithProvider = (ui: React.ReactElement) => {
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <AuthProvider>
          <RetailersProvider>
            <SessionInactivityGuard />
            {ui}
          </RetailersProvider>
        </AuthProvider>
      </LanguageProvider>
    </MemoryRouter>
  );
};

describe('AIConceptsPage - Style Quiz', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock fetch for auth/me and other endpoints
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url === '/api/auth/me') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            email: 'test@example.com',
            name: 'Test User',
            picture: '',
            generationsLeft: 3,
            shoppingListsLeft: 3,
          }),
        });
      }
      // Folder is URL-encoded in the component (e.g. Quiz%2FRustic)
      if (typeof url === 'string' && url.startsWith('/api/images?folder=')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { public_id: 'mock-1', secure_url: 'https://example.com/mock-1.jpg' },
            { public_id: 'mock-2', secure_url: 'https://example.com/mock-2.jpg' },
          ]),
        });
      }
      if (url === '/api/auth/logout') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ok: true }),
        });
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({}),
      });
    });

    // Mock localStorage to have a token
    const localStorageMock = (() => {
      let store: Record<string, string> = { 'ds_session_token': 'fake-token' };
      return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => { store[key] = value.toString(); }),
        removeItem: vi.fn((key: string) => { delete store[key]; }),
        clear: vi.fn(() => { store = {}; }),
        length: 0,
        key: vi.fn(),
      };
    })();
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });
  });

  // Quiz length is 18 as of the current build
  const QUIZ_LENGTH = 18;

  const voteMany = async (count: number) => {
    for (let i = 0; i < count; i++) {
      const loveButton = await screen.findByRole('button', { name: /Love it/i });
      await waitFor(() => expect(loveButton).not.toBeDisabled(), { timeout: 3000 });
      fireEvent.click(loveButton);
      if (i < count - 1) {
        await screen.findByText(new RegExp(`Room ${i + 2} of ${QUIZ_LENGTH}`, 'i'));
      }
    }
  };

  it('renders the quiz initial state', async () => {
    renderWithProvider(<AIConceptsPage />);
    expect((await screen.findAllByText(/Style Quiz/i))[0]).toBeInTheDocument();
    expect(await screen.findByText(/Love it/i)).toBeInTheDocument();
    expect(await screen.findByText(/Skip/i)).toBeInTheDocument();
    expect(await screen.findByText(/Not my style/i)).toBeInTheDocument();
  });

  it('shows correct quiz length (18 rooms)', async () => {
    renderWithProvider(<AIConceptsPage />);
    expect(await screen.findByText(new RegExp(`Room 1 of ${QUIZ_LENGTH}`, 'i'))).toBeInTheDocument();
  });

  it('renders a quiz image from Cloudinary API when available', async () => {
    renderWithProvider(<AIConceptsPage />);
    await waitFor(() => {
      const imgs = screen.getAllByRole('img');
      // Voting image is rendered with object-contain (Direction B: full room visible).
      const quizImg = imgs.find((i) => (i as HTMLImageElement).className.includes('object-contain')) as HTMLImageElement | undefined;
      expect(quizImg).toBeTruthy();
      expect(quizImg!.getAttribute('src')).toMatch(/^https:\/\/example\.com\/mock-/);
    });
  });

  it('progresses through the quiz when voting', async () => {
    renderWithProvider(<AIConceptsPage />);
    expect(await screen.findByText(new RegExp(`Room 1 of ${QUIZ_LENGTH}`, 'i'))).toBeInTheDocument();
    await voteMany(1);
    expect(await screen.findByText(new RegExp(`Room 2 of ${QUIZ_LENGTH}`, 'i'))).toBeInTheDocument();
  });

  it('shows back button after first vote', async () => {
    renderWithProvider(<AIConceptsPage />);
    // Back button hidden on room 1
    expect(screen.queryByText(/Previous room/i)).not.toBeInTheDocument();
    await voteMany(1);
    // Back button appears on room 2
    expect(await screen.findByText(/Previous room/i)).toBeInTheDocument();
  });

  it('early-end link hidden before room 5, visible at room 5+', async () => {
    renderWithProvider(<AIConceptsPage />);
    // Not visible before 4 votes (quizStep 0-3 < 4)
    await voteMany(3);
    expect(screen.queryByText(/Have enough/i)).not.toBeInTheDocument();
    // Appears at step 4 (room 5)
    await voteMany(1);
    expect(await screen.findByText(/Have enough/i)).toBeInTheDocument();
  }, 30_000);

  it('early-end produces result page immediately', async () => {
    renderWithProvider(<AIConceptsPage />);
    await voteMany(5); // reach room 6 (quizStep 5 >= 4)
    const earlyEnd = await screen.findByText(/Have enough/i);
    fireEvent.click(earlyEnd);
    expect((await screen.findAllByText(/Your design DNA/i))[0]).toBeInTheDocument();
    expect(await screen.findByText(/Apply.*style.*AI Vision/i)).toBeInTheDocument();
  }, 30_000);

  it('completes the quiz and shows results after 18 votes', async () => {
    renderWithProvider(<AIConceptsPage />);
    await voteMany(QUIZ_LENGTH);
    expect(await screen.findByText(/^Your design DNA$/i)).toBeInTheDocument();
    expect(await screen.findByText(/Apply.*style.*AI Vision/i)).toBeInTheDocument();
  }, 30_000);

  it('result page shows style breakdown with percentages', async () => {
    renderWithProvider(<AIConceptsPage />);
    await voteMany(QUIZ_LENGTH);
    expect(await screen.findByText(/Your style breakdown/i)).toBeInTheDocument();
    // At least one percentage value should be visible
    expect((await screen.findAllByText(/\d+%/))[0]).toBeInTheDocument();
  }, 30_000);

  it('switches to vision tool when clicking Apply Style', async () => {
    renderWithProvider(<AIConceptsPage />);
    await voteMany(QUIZ_LENGTH);
    const applyButton = await screen.findByText(/Apply .* style to AI Vision/i);
    fireEvent.click(applyButton);
    expect((await screen.findAllByText(/AI Vision/i))[0]).toBeInTheDocument();
    expect(screen.queryByText(new RegExp(`Room 1 of ${QUIZ_LENGTH}`, 'i'))).not.toBeInTheDocument();
  }, 30_000);

  it(
    'logs out after 15 minutes of inactivity',
    async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      renderWithProvider(<AIConceptsPage />);
      expect(await screen.findByText(/test@example.com/i)).toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(15 * 60 * 1000 + 5000);
      });

      await waitFor(
        () => {
          expect(global.fetch).toHaveBeenCalledWith(
            '/api/auth/logout',
            expect.objectContaining({ method: 'POST', headers: expect.any(Object) })
          );
        },
        { timeout: 10_000 }
      );
      await waitFor(() => {
        expect(screen.queryByText(/test@example.com/i)).not.toBeInTheDocument();
      });

      vi.useRealTimers();
    },
    15_000
  );
});
