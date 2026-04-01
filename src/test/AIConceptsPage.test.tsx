import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AIConceptsPage from '../components/AIConceptsPage';
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
            generationsLeft: 3
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
    
    const loveButton = await screen.findByText(/Love it/i);
    
    // Initial step is 0
    expect(await screen.findByText(/Room 1 of 24/i)).toBeInTheDocument();
    
    fireEvent.click(loveButton);
    
    // Should progress to Room 2 of 24
    expect(await screen.findByText(/Room 2 of 24/i)).toBeInTheDocument();
  });

  it('completes the quiz and shows results after 24 votes', async () => {
    renderWithProvider(<AIConceptsPage />);
    const loveButton = await screen.findByText(/Love it/i);
    
    // Vote 24 times
    for (let i = 0; i < 24; i++) {
      fireEvent.click(loveButton);
    }
    
    // Check for results screen
    // Based on translations: 'ai.quiz.designDNA' is "Your design DNA"
    expect(await screen.findByText(/^Your design DNA$/i)).toBeInTheDocument();
    
    // Should show at least one style with percentage
    expect((await screen.findAllByText(/%/))[0]).toBeInTheDocument();
  });

  it('switches to vision tool when clicking Apply Style', async () => {
    renderWithProvider(<AIConceptsPage />);
    const loveButton = await screen.findByText(/Love it/i);
    
    for (let i = 0; i < 24; i++) {
      fireEvent.click(loveButton);
    }
    
    // 'ai.quiz.applyStyle' is "Apply {style} style to AI Vision"
    // We don't know the style, so we use a regex
    const applyButton = await screen.findByText(/Apply .* style to AI Vision/i);
    fireEvent.click(applyButton);
    
    // Should now show AI Vision tool
    expect((await screen.findAllByText(/AI Vision/i))[0]).toBeInTheDocument();
    // And the quiz should be gone or hidden
    expect(screen.queryByText(/Room 1 of 24/i)).not.toBeInTheDocument();
  });
});
