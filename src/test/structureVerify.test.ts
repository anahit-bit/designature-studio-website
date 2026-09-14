import { describe, it, expect } from 'vitest';
import { compareStructures, PROPORTION_TOLERANCE } from '../../services/aiVision/structureVerify';
import type { RoomStructure } from '../../services/aiVision/spatialAnalysis';

// The verifier is now shared by both engines, so a regression here would let
// an invented toilet or a lit ceiling cove ship from GPT Image AND Gemini.

const base: RoomStructure = {
  cameraView: 'angled showing two walls',
  visibleWalls: ['back', 'left', 'ceiling', 'floor'],
  outOfFrameWalls: ['right'],
  windows: [{ wall: 'back', box: [0.3, 0.2, 0.6, 0.7], shape: 'rectangular' }],
  doors: [],
  fixedFeatures: [],
  plumbing: [],
  ceiling: { flat: true, features: [], cornice: false },
  summary: 'One window on the back wall.',
} as unknown as RoomStructure;

const clone = (patch: Partial<RoomStructure>): RoomStructure =>
  ({ ...structuredClone(base), ...patch }) as RoomStructure;

describe('compareStructures', () => {
  it('passes an output that matches the source', () => {
    expect(compareStructures(base, clone({}))).toBeNull();
  });

  it('does not block on an unmeasurable output — analysis noise must not cost a retry', () => {
    expect(compareStructures(base, null)).toBeNull();
  });

  it('flags an invented plumbed fixture first (RD27)', () => {
    const out = clone({
      plumbing: [{ fixture: 'toilet', wall: 'left', box: [0.1, 0.5, 0.2, 0.9] }] as any,
      doors: [{ wall: 'left', box: [0, 0, 0.1, 1] }] as any, // also an invented door — plumbing must win
    });
    const v = compareStructures(base, out);
    expect(v?.violation).toBe('plumbing');
    expect(v?.note).toMatch(/PLUMBING CORRECTION/);
    expect(v?.note).toMatch(/added a toilet/);
    // The note must not undo the redesign — that is what flattened the tub bathroom.
    expect(v?.note).toMatch(/Keep everything else from the previous attempt/);
    expect(v?.note).not.toMatch(/bare wall/i);
  });

  it('passes the tub-only bathroom the analyser double-counts (shower head + valve, curtain rod as towel rail)', () => {
    const src = clone({
      plumbing: [
        { fixture: 'shower', wall: 'back', box: [0.5, 0.1, 0.7, 0.4] },
        { fixture: 'bath', wall: 'back', box: [0.2, 0.6, 0.9, 0.95] },
        { fixture: 'soil_stack', wall: 'back', box: [0.85, 0.8, 0.9, 0.9] },
      ] as any,
    });
    const out = clone({
      plumbing: [
        { fixture: 'shower', wall: 'back', box: [0.5, 0.1, 0.7, 0.4] },
        { fixture: 'shower', wall: 'back', box: [0.5, 0.5, 0.6, 0.6] },
        { fixture: 'bath', wall: 'back', box: [0.2, 0.6, 0.9, 0.95] },
        { fixture: 'bath', wall: 'back', box: [0.2, 0.6, 0.9, 0.95] },
        { fixture: 'towel_rail', wall: 'back', box: [0.1, 0.05, 0.9, 0.08] },
        { fixture: 'soil_stack', wall: 'back', box: [0.85, 0.8, 0.9, 0.9] },
      ] as any,
    });
    expect(compareStructures(src, out)).toBeNull();
  });

  it('flags a rebuilt ceiling (RD5)', () => {
    const out = clone({ ceiling: { flat: false, features: ['cove'], cornice: false } as any });
    const v = compareStructures(base, out);
    expect(v?.violation).toBe('ceiling');
    expect(v?.note).toMatch(/ONE FLAT PLANE/);
  });

  it('flags an invented opening (RD25) and states the real counts', () => {
    const out = clone({
      windows: [...base.windows, { wall: 'left', box: [0.1, 0.2, 0.2, 0.6], shape: 'rectangular' }] as any,
    });
    const v = compareStructures(base, out);
    expect(v?.violation).toBe('openings');
    expect(v?.note).toMatch(/exactly 1 window and 0 doorways/);
  });

  it('flags a widened room when the window shrinks past tolerance', () => {
    const narrow = clone({ windows: [{ wall: 'back', box: [0.42, 0.2, 0.48, 0.7], shape: 'rectangular' }] as any });
    const v = compareStructures(base, narrow);
    expect(v?.violation).toBe('proportion');
    expect(v?.note).toMatch(/Do NOT widen the room/);
  });

  it('tolerates small proportion drift — the analysis itself is noisy', () => {
    const w = base.windows[0].box;
    const width = w[2] - w[0];
    const shrink = PROPORTION_TOLERANCE * 0.5 * 1; // half the tolerance
    const slightlyNarrow = clone({
      windows: [{ wall: 'back', box: [w[0], w[1], w[0] + width - shrink, w[3]], shape: 'rectangular' }] as any,
    });
    expect(compareStructures(base, slightlyNarrow)).toBeNull();
  });
});
