import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DesignerCheck from '../components/studio/DesignerCheck';
import { accountApi, type DesignerReview } from '../lib/accountApi';

const REVIEW = (over: Partial<DesignerReview> = {}): DesignerReview => ({
  id: 'r1',
  itemId: 'i1',
  tool: 'redesign',
  nextTool: 'shop',
  scenario: null,
  ask: null,
  status: 'requested',
  verdict: null,
  note: null,
  createdAt: '2026-08-30T10:00:00Z',
  answeredAt: null,
  ...over,
});

describe('DesignerCheck', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('will not offer a check before the work is saved — it explains instead', () => {
    const onNeedsSave = vi.fn();
    render(<DesignerCheck itemId={null} tool="redesign" onNeedsSave={onNeedsSave} />);

    expect(screen.getByText(/Save it first/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Ask for a check/ })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Save it now' }));
    expect(onNeedsSave).toHaveBeenCalled();
  });

  it('sends the ask against the saved item and the join it sits on', async () => {
    const spy = vi
      .spyOn(accountApi, 'requestReview')
      .mockResolvedValue({ review: REVIEW() });

    render(<DesignerCheck itemId="i1" tool="redesign" nextTool="shop" scenario="wet" />);
    fireEvent.click(screen.getByRole('button', { name: /Ask for a check/ }));

    fireEvent.change(screen.getByLabelText(/Anything you want them to look at\?/), {
      target: { value: 'Will this layout work with the door where it is?' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send it' }));

    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(spy).toHaveBeenCalledWith({
      itemId: 'i1',
      tool: 'redesign',
      nextTool: 'shop',
      scenario: 'wet',
      ask: 'Will this layout work with the door where it is?',
    });
  });

  it('caps the ask — it is context for a person, not a brief', () => {
    render(<DesignerCheck itemId="i1" tool="redesign" />);
    fireEvent.click(screen.getByRole('button', { name: /Ask for a check/ }));

    const box = screen.getByLabelText(/Anything you want them to look at\?/) as HTMLTextAreaElement;
    fireEvent.change(box, { target: { value: 'x'.repeat(900) } });
    expect(box.value.length).toBe(500);
  });

  it('promises no turnaround while it is waiting, and does not block', () => {
    render(<DesignerCheck itemId="i1" tool="redesign" initial={REVIEW()} />);

    expect(screen.getByText(/A designer has this/)).toBeTruthy();
    expect(screen.getByText(/Keep going/)).toBeTruthy();
    // The studio cannot control when a person is free; a missed promise costs
    // more trust than never naming one.
    expect(document.body.textContent).not.toMatch(/24 ?h|hours|by tomorrow/i);
    // And it must not promise an email until something actually sends one.
    expect(document.body.textContent).not.toMatch(/email/i);
  });

  it('leads with the note once it is answered — the note is the deliverable', () => {
    render(
      <DesignerCheck
        itemId="i1"
        tool="redesign"
        initial={REVIEW({
          status: 'answered',
          verdict: 'fix',
          note: 'Sofa blocks the radiator. Move it 40cm left and lose the side table.',
          answeredAt: '2026-08-30T18:00:00Z',
        })}
      />,
    );

    expect(screen.getByText('Change this first')).toBeTruthy();
    expect(screen.getByText(/Sofa blocks the radiator/)).toBeTruthy();
  });

  it('renders each of the three verdicts, and only those', () => {
    (['go', 'fix', 'wont_work'] as const).forEach((verdict) => {
      const { unmount } = render(
        <DesignerCheck
          itemId="i1"
          tool="redesign"
          initial={REVIEW({ status: 'answered', verdict, note: 'A note that is long enough.' })}
        />,
      );
      expect(screen.getByText(/Good to go|Change this first|This won't work/)).toBeTruthy();
      unmount();
    });
  });

  it('surfaces a failure instead of pretending it sent', async () => {
    vi.spyOn(accountApi, 'requestReview').mockRejectedValue(
      new Error('A designer is already looking at this one.'),
    );

    render(<DesignerCheck itemId="i1" tool="redesign" />);
    fireEvent.click(screen.getByRole('button', { name: /Ask for a check/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Send it' }));

    await waitFor(() =>
      expect(screen.getByText('A designer is already looking at this one.')).toBeTruthy(),
    );
  });
});

describe('DesignerCheck — closing the loop', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('picks up a review answered elsewhere, so the note has somewhere to arrive', async () => {
    // The designer answers in the admin queue, in another tab. Without this the
    // customer would never see the note anywhere.
    vi.spyOn(accountApi, 'listReviews').mockResolvedValue({
      reviews: [
        REVIEW({
          itemId: 'i1',
          status: 'answered',
          verdict: 'go',
          note: 'Layout works. The rug is too small — go one size up.',
        }),
      ],
    });

    render(<DesignerCheck itemId="i1" tool="redesign" />);

    await waitFor(() => expect(screen.getByText('Good to go')).toBeTruthy());
    expect(screen.getByText(/The rug is too small/)).toBeTruthy();
  });

  it('ignores reviews belonging to a different artifact', async () => {
    vi.spyOn(accountApi, 'listReviews').mockResolvedValue({
      reviews: [REVIEW({ itemId: 'someone-elses-item', status: 'answered', verdict: 'go', note: 'x'.repeat(20) })],
    });

    render(<DesignerCheck itemId="i1" tool="redesign" />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Ask for a check/ })).toBeTruthy(),
    );
    expect(screen.queryByText('Good to go')).toBeNull();
  });

  it('re-checks when the tab regains focus — leave, answer, come back', async () => {
    const spy = vi.spyOn(accountApi, 'listReviews').mockResolvedValue({ reviews: [] });
    render(<DesignerCheck itemId="i1" tool="redesign" />);
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));

    spy.mockResolvedValue({
      reviews: [REVIEW({ itemId: 'i1', status: 'answered', verdict: 'fix', note: 'Move the sofa off the radiator.' })],
    });
    fireEvent.focus(window);

    await waitFor(() => expect(screen.getByText('Change this first')).toBeTruthy());
  });

  it('keeps showing what it has if the sync fails', async () => {
    vi.spyOn(accountApi, 'listReviews').mockRejectedValue(new Error('offline'));
    render(<DesignerCheck itemId="i1" tool="redesign" initial={REVIEW()} />);

    await waitFor(() => expect(screen.getByText(/A designer has this/)).toBeTruthy());
  });
});
