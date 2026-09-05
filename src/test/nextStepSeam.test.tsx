import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EXPLORER_TOOLS, nextToolFor, toolById } from '../components/studio/explorerRoster';
import NextStepBand from '../components/studio/NextStepBand';

/**
 * The seam (AI-032 v2): the handoff at the end of a finished run, driven by the
 * roster's `next` id rather than by parsing the `chain` display copy.
 */
describe('next-step seam', () => {
  it('every `next` points at a card that exists', () => {
    const broken = EXPLORER_TOOLS
      .filter((t) => t.next && !toolById(t.next))
      .map((t) => `${t.id} → ${t.next}`);
    expect(broken).toEqual([]);
  });

  it('never points backwards through the phases, and never at itself', () => {
    EXPLORER_TOOLS.forEach((t) => {
      if (!t.next) return;
      expect(t.next, `${t.id} points at itself`).not.toBe(t.id);
      const next = toolById(t.next)!;
      expect(next.phase, `${t.id} → ${t.next} goes backwards`).toBeGreaterThanOrEqual(t.phase);
    });
  });

  it('agrees with the `chain` copy — the two must not drift', () => {
    // `chain` is what a person reads; `next` is what the button does. If someone
    // edits one and forgets the other, the band sends people somewhere the page
    // did not promise. This is the test that catches that.
    EXPLORER_TOOLS.forEach((t) => {
      const named = /Next:\s*([^·]+)/.exec(t.chain)?.[1].trim();
      if (!named) {
        expect(t.next, `${t.id}: chain names no next step, so it must not carry one`).toBeUndefined();
        return;
      }
      expect(t.next, `${t.id}: chain says "Next: ${named}" but next is unset`).toBeDefined();
      expect(toolById(t.next!)!.name).toBe(named);
    });
  });

  it('resolves the handoff for each live tool', () => {
    expect(nextToolFor('find-style')?.id).toBe('redesign');
    expect(nextToolFor('score-room')?.id).toBe('redesign');
    expect(nextToolFor('redesign')?.id).toBe('shop');
    expect(nextToolFor('shop')?.id).toBe('cost');
  });

  it('returns undefined where a card ends a workflow, and for unknown ids', () => {
    expect(nextToolFor('write-brief')).toBeUndefined();
    expect(nextToolFor('walk-room')).toBeUndefined();
    expect(nextToolFor('cost')).toBeUndefined();
    expect(nextToolFor('not-a-card')).toBeUndefined();
  });

  it('the two seams that matter today land on live tools', () => {
    // Vision → Shopping is the highest-traffic handoff on the site.
    expect(nextToolFor('redesign')?.status).toBe('live');
    expect(nextToolFor('find-style')?.status).toBe('live');
  });

  it('Shop hands off to a card that is NOT built — the band must say so, not offer a button', () => {
    // Documents the honest-degradation path rather than hiding it. When
    // Cost My Project ships this flips to 'live' and the button appears.
    expect(nextToolFor('shop')?.status).not.toBe('live');
  });
});

describe('NextStepBand', () => {
  it('offers the next card as a real control when it is built', () => {
    const onGo = vi.fn();
    render(<NextStepBand toolId="redesign" onGo={onGo} />);

    expect(screen.getByText('Next in your workflow')).toBeTruthy();
    expect(screen.getByText('Shop My Room')).toBeTruthy();
    screen.getByRole('button', { name: /continue/i }).click();
    expect(onGo).toHaveBeenCalledWith('shop');
  });

  it('says so plainly when the next card is not built, rather than offering a dead button', () => {
    const onGo = vi.fn();
    render(<NextStepBand toolId="shop" onGo={onGo} />);

    expect(screen.getByText('Cost My Project')).toBeTruthy();
    expect(screen.getByText('Not built yet')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
    expect(onGo).not.toHaveBeenCalled();
  });

  it('renders nothing at the end of a workflow', () => {
    const { container } = render(<NextStepBand toolId="write-brief" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing for a card id that does not exist', () => {
    const { container } = render(<NextStepBand toolId="not-a-card" />);
    expect(container.firstChild).toBeNull();
  });

  it('shows what the next card hands you, not just its name', () => {
    render(<NextStepBand toolId="find-style" onGo={vi.fn()} />);
    // The band shows the roster's own `get` copy, so it can never drift from
    // what the card actually promises on the rail.
    expect(screen.getByText(/A photorealistic redesign/)).toBeTruthy();
  });
});
