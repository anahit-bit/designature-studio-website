import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AIConceptsPage from '../components/AIConceptsPage';
import SessionInactivityGuard from '../components/SessionInactivityGuard';
import { LanguageProvider } from '../LanguageContext';

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
    <LanguageProvider>
      <SessionInactivityGuard />
      {ui}
    </LanguageProvider>
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

  const voteMany = async (count: number) => {
    for (let i = 0; i < count; i++) {
      const loveButton = await screen.findByRole('button', { name: /Love it/i });
      await waitFor(() => expect(loveButton).not.toBeDisabled(), { timeout: 3000 });
      fireEvent.click(loveButton);
      if (i < count - 1) {
        await screen.findByText(new RegExp(`Room ${i + 2} of 24`, 'i'));
      }
    }
  };

  it('renders the quiz initial state', async () => {
    renderWithProvider(<AIConceptsPage />);
    // By default activeTool is 'quiz'
    // Use findAllByText and pick the first one as it might be in multiple places (e.g. title and tab)
    expect((await screen.findAllByText(/Style Quiz/i))[0]).toBeInTheDocument();
    expect(await screen.findByText(/Love it/i)).toBeInTheDocument();
    expect(await screen.findByText(/Skip/i)).toBeInTheDocument();
    expect(await screen.findByText(/Not my style/i)).toBeInTheDocument();
  });

  it('renders a quiz image from Cloudinary API when available', async () => {
    renderWithProvider(<AIConceptsPage />);

    // Wait for the first quiz image to render and have a non-empty src.
    // There are many images on the page (icons/logos), so we target the quiz hero image by looking
    // for the large quiz container's <img> which uses object-cover class.
    const imgs = await screen.findAllByRole('img');
    await waitFor(() => {
      const quizImg = imgs.find((i) => (i as HTMLImageElement).className.includes('object-cover')) as HTMLImageElement | undefined;
      expect(quizImg).toBeTruthy();
      expect(quizImg!.getAttribute('src')).toMatch(/^https:\/\/example\.com\/mock-/);
    });
  });

  it('progresses through the quiz when voting', async () => {
    renderWithProvider(<AIConceptsPage />);

    // Initial step is 0
    expect(await screen.findByText(/Room 1 of 24/i)).toBeInTheDocument();

    await voteMany(1);

    // Should progress to Room 2 of 24
    expect(await screen.findByText(/Room 2 of 24/i)).toBeInTheDocument();
  });

  it('completes the quiz and shows results after 24 votes', async () => {
    renderWithProvider(<AIConceptsPage />);

    await voteMany(24);

    // Check for results screen
    // Based on translations: 'ai.quiz.designDNA' is "Your design DNA"
    expect(await screen.findByText(/^Your design DNA$/i)).toBeInTheDocument();

    // Should show at least one style with percentage
    expect((await screen.findAllByText(/%/))[0]).toBeInTheDocument();
  }, 30_000);

  it('switches to vision tool when clicking Apply Style', async () => {
    renderWithProvider(<AIConceptsPage />);

    await voteMany(24);

    // 'ai.quiz.applyStyle' is "Apply {style} style to AI Vision"
    // We don't know the style, so we use a regex
    const applyButton = await screen.findByText(/Apply .* style to AI Vision/i);
    fireEvent.click(applyButton);

    // Should now show AI Vision tool
    expect((await screen.findAllByText(/AI Vision/i))[0]).toBeInTheDocument();
    // And the quiz should be gone or hidden
    expect(screen.queryByText(/Room 1 of 24/i)).not.toBeInTheDocument();
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
