/**
 * Redesign My Room, carrying the room's measured size.
 *
 * The measuring itself is exercised in the browser at /measure and unit-tested in
 * tapMeasure.test.ts; what matters here is the seam — that a measured room shows
 * its numbers on the card, and that those numbers travel with the generation
 * instead of being collected and dropped.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AIConceptsPage from '../components/AIConceptsPage';
import { LanguageProvider } from '../LanguageContext';
import { AuthProvider } from '../AuthContext';
import { RetailersProvider } from '../RetailersContext';

vi.mock('../components/Header', () => ({ default: () => <div>Header</div> }));
vi.mock('../components/Footer', () => ({ default: () => <div>Footer</div> }));

// The photo never reaches a canvas in jsdom; the page only needs a data URL.
vi.mock('../lib/imageResize', () => ({
  fileToResizedDataUrl: vi.fn().mockResolvedValue('data:image/jpeg;base64,ROOM'),
}));

// Stand in for the measuring flow: it reports what a real measurement reports.
vi.mock('../components/measure/MeasureRoom', () => ({
  default: ({
    onResult,
    controls,
  }: {
    onResult?: (d: unknown) => void;
    controls?: React.ReactNode;
  }) => (
    <div>
      <button
        onClick={() =>
          onResult?.({
            items: [
              { label: 'Ceiling height', mm: 2800 },
              { label: 'Wall width', mm: 4100 },
            ],
            bandPct: 12,
            ruler: 'television',
          })
        }
      >
        stub-measure
      </button>
      {controls}
    </div>
  ),
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <LanguageProvider>
        <AuthProvider>
          <RetailersProvider>
            <AIConceptsPage />
          </RetailersProvider>
        </AuthProvider>
      </LanguageProvider>
    </MemoryRouter>,
  );

let calls: { url: string; body: Record<string, unknown> }[] = [];

beforeEach(() => {
  vi.clearAllMocks();
  calls = [];
  try {
    window.sessionStorage.clear();
    // The session is restored from a stored token; without one the page never
    // asks who the user is and the working panel stays behind the sign-in.
    window.localStorage.setItem('ds_session_token', 'test-token');
    window.localStorage.setItem('ds_last_activity', String(Date.now()));
  } catch {
    /* not available */
  }
  global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    calls.push({ url: String(url), body });
    if (String(url).includes('/api/auth/me')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            email: 'test@example.com',
            name: 'Test User',
            picture: '',
            generationsLeft: 3,
            shoppingListsLeft: 3,
          }),
      });
    }
    if (String(url).includes('/api/ai-vision/generate')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ conceptUrl: 'data:image/png;base64,OUT', generationsLeft: 2 }),
      });
    }
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
  }) as unknown as typeof fetch;
});

/**
 * Upload a room photo through the LIVE experience, not the legacy sidebar that
 * AIConceptsPage still carries — driving the dead control is how the measure step
 * first came to be wired into a panel nobody sees.
 */
async function uploadRoom() {
  const input = await waitFor(() => {
    const el = document.querySelector('#vision-room-upload') as HTMLInputElement | null;
    if (!el) throw new Error('the live room upload is not rendered');
    return el;
  });
  fireEvent.change(input, {
    target: { files: [new File(['x'], 'room.jpg', { type: 'image/jpeg' })] },
  });
}

describe('Redesign My Room — the room size it was given', () => {
  it('offers measuring only once there is a photo to measure', async () => {
    renderPage();
    await waitFor(() => expect(document.querySelector('#vision-room-upload')).toBeTruthy());
    expect(screen.queryByRole('button', { name: /measure the room/i })).toBeNull();
    await uploadRoom();
    // On the photo beside "Change photo", and again under it: both are real buttons.
    expect((await screen.findAllByRole('button', { name: /measure the room/i })).length).toBe(2);
  }, 20_000);

  it('shows what was measured, in metres, with its error band', async () => {
    renderPage();
    await uploadRoom();
    fireEvent.click((await screen.findAllByRole('button', { name: /measure the room/i }))[0]);
    fireEvent.click(await screen.findByText('stub-measure'));
    fireEvent.click((await screen.findAllByRole('button', { name: /Use these sizes/i }))[0]);

    expect(await screen.findByText('2.80 m')).toBeTruthy();
    expect(screen.getByText('4.10 m')).toBeTruthy();
    expect(screen.getByText('±12%')).toBeTruthy();
    // And it can be taken back off again.
    fireEvent.click(screen.getByRole('button', { name: /remove/i }));
    await waitFor(() => expect(screen.queryByText('2.80 m')).toBeNull());
    expect(screen.getAllByRole('button', { name: /measure the room/i }).length).toBe(2);
  }, 20_000);

  it('sends the measured sizes with the generation', async () => {
    renderPage();
    await uploadRoom();
    fireEvent.click((await screen.findAllByRole('button', { name: /measure the room/i }))[0]);
    fireEvent.click(await screen.findByText('stub-measure'));
    fireEvent.click((await screen.findAllByRole('button', { name: /Use these sizes/i }))[0]);
    await screen.findByText('2.80 m');

    fireEvent.click((await screen.findAllByRole('button', { name: /Japandi/i }))[0]);
    fireEvent.click((await screen.findAllByRole('button', { name: /Generate concept/i }))[0]);

    const gen = await waitFor(() => {
      const c = calls.find((x) => x.url.includes('/api/ai-vision/generate'));
      if (!c) throw new Error('no generation was requested');
      return c;
    });
    expect(gen.body.dimensions).toEqual({
      items: [
        { label: 'Ceiling height', mm: 2800 },
        { label: 'Wall width', mm: 4100 },
      ],
      bandPct: 12,
      ruler: 'television',
    });
  }, 20_000);

  it('generates exactly as before when nobody measured', async () => {
    renderPage();
    await uploadRoom();
    fireEvent.click((await screen.findAllByRole('button', { name: /Japandi/i }))[0]);
    fireEvent.click((await screen.findAllByRole('button', { name: /Generate concept/i }))[0]);

    const gen = await waitFor(() => {
      const c = calls.find((x) => x.url.includes('/api/ai-vision/generate'));
      if (!c) throw new Error('no generation was requested');
      return c;
    });
    expect(gen.body.dimensions).toBeUndefined();
  }, 20_000);
});
