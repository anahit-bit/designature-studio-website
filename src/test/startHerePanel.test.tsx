import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import StartHerePanel from '../components/studio/StartHerePanel';
import {
  EMPTY_ROUTER_STATE,
  ENTRIES_SHOWN_FIRST,
  QUESTIONS,
  SCENARIOS,
  buildPreview,
  type QuestionId,
  type RouterState,
} from '../data/studioRouter';

/**
 * The panel is controlled — AIConceptsPage owns the state so the rail can read
 * the same workflow. This harness is that owner, so the tests exercise the real
 * transitions rather than a private copy of them.
 */
function Harness({
  onOpenTool = vi.fn(),
  onBookCall = vi.fn(),
  initial = EMPTY_ROUTER_STATE,
}: {
  onOpenTool?: (id: string) => void;
  onBookCall?: () => void;
  initial?: RouterState;
}) {
  const [state, setState] = React.useState<RouterState>(initial);
  return (
    <StartHerePanel
      state={state}
      onPick={(id) => {
        const sc = SCENARIOS.find((s) => s.id === id)!;
        setState({ pickedId: id, answers: { ...sc.prefill } });
      }}
      onAnswer={(q: QuestionId, v: string) =>
        setState((p) => ({ ...p, answers: { ...p.answers, [q]: v } }))}
      onReset={() => setState(EMPTY_ROUTER_STATE)}
      onOpenTool={onOpenTool}
      onBookCall={onBookCall}
    />
  );
}

const pick = (label: string | RegExp) =>
  fireEvent.click(screen.getByRole('button', { name: label }));

describe('buildPreview', () => {
  it('shows nothing until the three selecting questions are answered', () => {
    expect(buildPreview({})).toBeNull();
    expect(buildPreview({ relationship: 'live' })).toBeNull();
    expect(buildPreview({ relationship: 'live', state: 'lived-in' })).toBeNull();
  });

  it('shows the full route before Q4, then Q4 shortens it', () => {
    const partial = buildPreview({ relationship: 'live', state: 'lived-in', scope: 'wet-room' })!;
    const trimmed = buildPreview({
      relationship: 'live', state: 'lived-in', scope: 'wet-room', outcome: 'picture',
    })!;
    expect(partial.scenario?.id).toBe('wet');
    expect(trimmed.steps.length).toBeLessThan(partial.steps.length);
    expect(partial.steps.map((s) => s.tool.id)).toContain('shop');
    expect(trimmed.steps.map((s) => s.tool.id)).not.toContain('shop');
  });
});

// ── Recognising yourself ──────────────────────────────────────────────────

describe('picking an identity', () => {
  it('opens on the identities, naming audiences the questions never mention', () => {
    render(<Harness />);
    expect(screen.getByText('Which of these is you?')).toBeTruthy();
    expect(screen.getByText('I host on Airbnb')).toBeTruthy();
    expect(screen.getByText('I stage properties to sell')).toBeTruthy();
  });

  it('holds some back rather than trading nineteen choices for eleven', () => {
    render(<Harness />);
    expect(screen.queryByText('Just dreaming for now')).toBeNull();
    pick(/more →/);
    expect(screen.getByText('Just dreaming for now')).toBeTruthy();
  });

  it('a stager reaches their route in one click, and is never sent shopping', () => {
    render(<Harness />);
    pick(/I stage properties to sell/);

    expect(screen.getByText("I'm staging it to sell")).toBeTruthy();
    expect(screen.getByText('Redesign My Room')).toBeTruthy();
    expect(screen.queryByText('Shop My Room')).toBeNull();
  });

  it('only asks what is left after an identity is picked', () => {
    render(<Harness />);
    pick(/I host on Airbnb/);

    expect(screen.getByText('Question 1 of 1')).toBeTruthy();
    expect(screen.getByText(QUESTIONS[3].prompt)).toBeTruthy();
    expect(screen.queryByText(QUESTIONS[0].prompt)).toBeNull();
  });

  it('a picked identity survives a later answer that would re-derive it', () => {
    render(<Harness />);
    pick(/I host on Airbnb/);
    pick('Tell me what it will cost');

    // Inferring from these same answers would land on the landlord's refresh.
    expect(screen.getByText('I let it on Airbnb')).toBeTruthy();
    expect(screen.queryByText('A refresh that must pay for itself')).toBeNull();
  });

  it('start over goes back to the identities', () => {
    render(<Harness />);
    pick(/I just got the keys/);
    pick('Start over');
    expect(screen.getByText('Which of these is you?')).toBeTruthy();
  });
});

// ── Deriving it from the questions ────────────────────────────────────────

describe('answering the questions', () => {
  it('assembles the path once the third answer lands', () => {
    render(<Harness />);
    pick(/None of these/);
    pick('I live here');
    pick("Lived-in, but it doesn't work");
    pick('The kitchen or a bathroom');

    expect(screen.getByText('Kitchen or bathroom')).toBeTruthy();
    expect(screen.getByText('Plumb My Room')).toBeTruthy();
    expect(screen.getByText('This is the one you came for.')).toBeTruthy();
  });

  it('opens the first step through the caller, never by itself', () => {
    const onOpenTool = vi.fn();
    render(<Harness onOpenTool={onOpenTool} />);
    pick(/None of these/);
    pick("I'm moving in");
    pick('Empty — I just got it');
    pick('The whole place');
    pick('A list I can buy from');

    pick(/Start with Find My Style/);
    expect(onOpenTool).toHaveBeenCalledWith('find-style');
  });

  it('routes mid-renovation to the conversation instead of a funnel', () => {
    const onBookCall = vi.fn();
    render(<Harness onBookCall={onBookCall} />);
    pick(/None of these/);
    pick('I live here');
    pick('Mid-renovation — walls are still moving');
    pick('The whole place');
    pick('Something a builder can work from');

    expect(screen.getByText('Talk to us first.')).toBeTruthy();
    pick(/Book a free 15 minutes/);
    expect(onBookCall).toHaveBeenCalled();
  });

  it('starts from the first step it can actually run, and says why', () => {
    const onOpenTool = vi.fn();
    render(<Harness onOpenTool={onOpenTool} />);
    pick(/None of these/);
    pick('I live here');
    pick("Lived-in, but it doesn't work");
    pick('The kitchen or a bathroom');
    pick('A list I can buy from');

    pick(/Start with Redesign My Room/);
    expect(onOpenTool).toHaveBeenCalledWith('redesign');
    expect(screen.getByText(/is the first one we can run today/)).toBeTruthy();
  });

  it('offers the conversation when no step on the route is built yet', () => {
    const onBookCall = vi.fn();
    render(<Harness onBookCall={onBookCall} />);
    pick(/None of these/);
    pick("It's a business space");
    pick('Mid-renovation — walls are still moving');
    pick('The whole place');
    pick('A layout that actually fits');

    pick(/None of this is built yet/);
    expect(onBookCall).toHaveBeenCalled();
  });

  it('marks unbuilt steps rather than offering to open them', () => {
    render(<Harness />);
    pick(/None of these/);
    pick('I live here');
    pick("Lived-in, but it doesn't work");
    pick('The kitchen or a bathroom');
    pick('A list I can buy from');
    expect(screen.getAllByText('Not built yet').length).toBeGreaterThan(0);
  });

  it('resumes a half-finished workflow handed in from the page', () => {
    render(<Harness initial={{ answers: { relationship: 'letting', state: 'lived-in', scope: 'one-room' } }} />);
    expect(screen.getByText('I let it on Airbnb')).toBeTruthy();
    expect(screen.getByText(QUESTIONS[3].prompt)).toBeTruthy();
  });

  it('shows a check on every join — loud where it matters, quiet elsewhere', () => {
    render(<Harness />);
    pick(/None of these/);
    pick('I live here');
    pick("Lived-in, but it doesn't work");
    pick('Just one room');
    pick('A list I can buy from');

    const loud = screen.getAllByText(/Want a designer to look before you go on\?/);
    const quiet = screen.getAllByText('Designer check available');
    const steps = screen.getAllByText(/^(Score My Room|Plan My Room|Redesign My Room|Shop My Room)$/);
    expect(loud.length + quiet.length).toBe(steps.length - 1);
  });
});

// ── The grid has to stay even, or it leaves a dangling tile ───────────────

describe('the identity grid fits its two columns', () => {
  const tiles = () =>
    screen.getByTestId('identity-grid').querySelectorAll(':scope > button').length;

  it('is even collapsed — five identities plus the way out', () => {
    render(<Harness />);
    expect(ENTRIES_SHOWN_FIRST).toBe(5);
    expect(tiles() % 2).toBe(0);
    expect(tiles()).toBe(ENTRIES_SHOWN_FIRST + 1);
  });

  it('is even expanded — every identity plus the way out', () => {
    render(<Harness />);
    pick(/more →/);
    expect(tiles() % 2).toBe(0);
    expect(tiles()).toBe(SCENARIOS.length + 1);
  });

  it('the way out leads to the questions', () => {
    render(<Harness />);
    expect(screen.queryByText(QUESTIONS[0].prompt)).toBeNull();
    pick(/None of these/);
    expect(screen.getByText(QUESTIONS[0].prompt)).toBeTruthy();
    expect(screen.queryByText('Which of these is you?')).toBeNull();
  });
});
