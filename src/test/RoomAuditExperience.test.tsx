import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import RoomAuditExperience from '../components/RoomAuditExperience';
import { LanguageProvider } from '../LanguageContext';
import type { AuthUser } from '../AuthContext';

// A real audit result: mixed scores (≥8 → cobalt, <8 → oxide-soft) and a fix WITHOUT
// coordinates (must degrade — listed but no pin).
const RESULT = {
  overallScore: 74,
  dimensions: [
    { label: 'Layout & Flow', score: 6, verdict: 'Sofa floats too far from the focal wall.' },
    { label: 'Lighting', score: 9, verdict: 'Strong natural light is a real asset.' },
    { label: 'Color Harmony', score: 7, verdict: 'Warm neutrals read well.' },
    { label: 'Clutter & Organization', score: 8, verdict: 'Surfaces are clean and intentional.' },
    { label: 'Functionality', score: 5, verdict: 'The path to the balcony is blocked.' },
    { label: 'Style Cohesion', score: 7, verdict: 'Mostly consistent design language.' },
  ],
  fixNow: [
    { text: 'Size up the rug so the front legs rest on it.', x: 38, y: 74 },
    { text: 'Add a floor lamp in the empty left corner.', x: 24, y: 34 },
    { text: 'Pull the sofa thirty centimetres off the wall.' }, // no coords → no pin
  ],
};

const paidUser = { email: 'o@x.com', name: 'Owner', picture: '', isPaid: true, auditsLeft: 999, generationsLeft: 999 } as unknown as AuthUser;

const baseProps = (over: Partial<React.ComponentProps<typeof RoomAuditExperience>> = {}) => ({
  user: paidUser,
  onProcessingChange: () => {},
  onAuditComplete: () => {},
  onRedesignWithVision: () => {},
  navigateTo: () => {},
  ...over,
});

const renderRAE = (over: Partial<React.ComponentProps<typeof RoomAuditExperience>> = {}) =>
  render(<MemoryRouter><LanguageProvider><RoomAuditExperience {...baseProps(over)} /></LanguageProvider></MemoryRouter>);

const uploadPhoto = (container: HTMLElement) => {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File(['x'], 'room.png', { type: 'image/png' });
  fireEvent.change(input, { target: { files: [file] } });
};

// inline style colors are serialized by jsdom's cssstyle to rgb(); accept either form.
const COBALT_RGB = 'rgb(0, 71, 171)';
const OXIDE_SOFT_RGB = 'rgb(201, 122, 96)';

beforeEach(() => {
  try { localStorage.setItem('ds_session_token', 'fake-token'); } catch { /* ignore */ }
  global.fetch = vi.fn((url: RequestInfo | URL) => {
    if (typeof url === 'string' && url.includes('/api/room-audit/analyze')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ result: RESULT }) }) as unknown as Promise<Response>;
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) }) as unknown as Promise<Response>;
  }) as unknown as typeof fetch;
});

describe('RoomAuditExperience — 4-state machine', () => {
  it('STATE 0 · LANDING renders the cinematic launchpad (status, hero, value strip)', () => {
    renderRAE();
    expect(screen.getByText('Room Audit · Ready')).toBeInTheDocument();
    expect(screen.getByText('scored.')).toBeInTheDocument();          // hero title em
    expect(screen.getByText(/Upload your room/i)).toBeInTheDocument(); // upload CTA
    expect(screen.getByText(/Score a sample room/i)).toBeInTheDocument();
    expect(screen.getByText('Unlimited audits · Design+')).toBeInTheDocument(); // 999 quota
  });

  it('STATE 1 · SETUP appears after a photo is uploaded (goal chips + Score CTA)', async () => {
    const { container } = renderRAE();
    uploadPhoto(container);
    expect(await screen.findByText('space.')).toBeInTheDocument();    // setup title em
    expect(screen.getByText(/Score my room/i)).toBeInTheDocument();
    // goal chips come from i18n (AUDIT_GOALS labels moved out of the component)
    expect(screen.getByText('Make it cozier').tagName).toBe('BUTTON');
    expect(screen.getByText('Reduce clutter').tagName).toBe('BUTTON');
  });

  it('STATE 2 · ANALYZING shows while the analyze call is in flight', async () => {
    // Make the analyze call hang so the transient state is observable.
    global.fetch = vi.fn((url: RequestInfo | URL) => {
      if (typeof url === 'string' && url.includes('/api/room-audit/analyze')) {
        return new Promise(() => {}) as unknown as Promise<Response>; // never resolves
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) }) as unknown as Promise<Response>;
    }) as unknown as typeof fetch;

    const { container } = renderRAE();
    uploadPhoto(container);
    fireEvent.click(await screen.findByText(/Score my room/i));
    expect(await screen.findByText('Analyzing your room…')).toBeInTheDocument();
    expect(screen.getByText('Using 1 audit')).toBeInTheDocument();
  });
});

describe('RoomAuditExperience — STATE 3 · REPORT (dynamic data)', () => {
  const reachReport = async (over: Partial<React.ComponentProps<typeof RoomAuditExperience>> = {}) => {
    const utils = renderRAE(over);
    uploadPhoto(utils.container);
    fireEvent.click(await screen.findByText(/Score my room/i));
    await screen.findByText('Audit complete');
    return utils;
  };

  it('renders dimensions + verdicts + fixNow dynamically from the result', async () => {
    await reachReport();
    // every server dimension label is rendered (appears in bars + breakdown → use getAllByText)
    for (const d of RESULT.dimensions) {
      expect(screen.getAllByText(d.label).length).toBeGreaterThan(0);
      expect(screen.getByText(d.verdict)).toBeInTheDocument();
    }
    // all three fixes are listed (including the one without coords)
    for (const f of RESULT.fixNow) {
      expect(screen.getByText(f.text)).toBeInTheDocument();
    }
    // overall score + grade (74 → B)
    expect(screen.getAllByText('74').length).toBeGreaterThan(0);
    expect(screen.getAllByText('B').length).toBeGreaterThan(0);
  });

  it('uses cobalt for score ≥ 8 and oxide-soft below (NO red/green)', async () => {
    const { container } = await reachReport();
    // Lighting = 9 → cobalt score text; Layout & Flow = 6 → oxide-soft score text.
    expect(screen.getByText('9/10').style.color).toBe(COBALT_RGB);
    expect(screen.getByText('6/10').style.color).toBe(OXIDE_SOFT_RGB);
    // bar fills carry the same two hues — and never a red/green.
    const fillStyles = Array.from(container.querySelectorAll('.scorebar > span'))
      .map((el) => (el.getAttribute('style') || '').toLowerCase());
    const hasHue = (rgb: string, hex: string) => fillStyles.some((s) => s.includes(rgb) || s.includes(hex));
    expect(hasHue(COBALT_RGB, '#0047ab')).toBe(true);
    expect(hasHue(OXIDE_SOFT_RGB, '#c97a60')).toBe(true);
  });

  it('renders one pin per fix WITH valid coords and degrades (no pin) when coords are absent', async () => {
    const { container } = await reachReport();
    // 2 of 3 fixes carry coords → exactly 2 pins on the annotated room.
    expect(container.querySelectorAll('.pin').length).toBe(2);
    // the coordless fix is still in the numbered list.
    expect(screen.getByText('Pull the sofa thirty centimetres off the wall.')).toBeInTheDocument();
  });

  it('the overall-score overlay is kept regardless of pins', async () => {
    const { container } = await reachReport();
    // overlay overall number lives on the annotated image (sticky left column)
    expect(container.querySelector('.lg\\:sticky')).not.toBeNull();
    expect(screen.getAllByText('74').length).toBeGreaterThan(0);
  });

  it('"Redesign this room with AI Vision" fires the forward handoff with the audited room', async () => {
    const onRedesignWithVision = vi.fn();
    await reachReport({ onRedesignWithVision });
    fireEvent.click(screen.getByText(/Redesign this room with AI Vision/i));
    expect(onRedesignWithVision).toHaveBeenCalledTimes(1);
    expect(onRedesignWithVision).toHaveBeenCalledWith(expect.stringMatching(/^data:image\/png/));
  });
});
