/**
 * RD27 — plumbing is evidence-bound. The 2026-09-07 failure, pinned.
 *
 * A bathroom photographed with a vanity, a window, a radiator and a door — and
 * no toilet — came back with a wall-hung toilet and a heated towel rail plumbed
 * into a bare wall. The owner's diagnosis is the rule: a toilet needs a soil
 * pipe, so a photograph with no toilet in it is not evidence that one can exist.
 *
 * The 2026-09-04 rewrite had made the BATHING fixture conditional but left
 * "Include ... a toilet" as an unconditional MUST, and repeated it in the
 * fallback clause — mandated twice. RD24 could not catch it either: its list of
 * things a programme may not authorise was purely architectural.
 */
import { describe, it, expect } from 'vitest';
import {
  buildGenerationPrompt,
  detectProgrammeConflict,
  ROOM_PROGRAM_RULES,
} from '../../services/aiVision/promptTemplates';
import {
  renderSpatialConstraints,
  countPlumbing,
  inventedPlumbing,
  parseRoomStructure,
  type RoomStructure,
} from '../../services/aiVision/spatialAnalysis';

const base: RoomStructure = {
  cameraView: 'angled showing the back and left walls',
  visibleWalls: ['back', 'left', 'right', 'ceiling', 'floor'],
  outOfFrameWalls: [],
  windows: [{ wall: 'back', shape: 'rectangular', box: [0.38, 0.28, 0.62, 0.62] }],
  doors: [{ wall: 'back', box: [0.72, 0.22, 0.86, 0.78] }],
  fixedFeatures: [{ label: 'radiator', box: [0.4, 0.62, 0.62, 0.78] }],
  plumbing: [],
  detectedRoom: 'bathroom',
  summary: 'A bathroom with a vanity along the left wall.',
};

/** "before 1": vanity only — no toilet, no bath, no shower, no stack. */
const noDrainage: RoomStructure = {
  ...base,
  plumbing: [{ fixture: 'basin', box: [0.05, 0.55, 0.30, 0.68] }],
};

/** The extreme case: not one plumbed thing in frame. */
const bareRoom: RoomStructure = { ...base, plumbing: [] };

/** "before 2": wall-hung toilet on a tiled duct, corner bath, basin. */
const fullyPlumbed: RoomStructure = {
  ...base,
  plumbing: [
    { fixture: 'toilet', box: [0.42, 0.62, 0.63, 0.85] },
    { fixture: 'soil_stack', box: [0.38, 0.38, 0.70, 0.66], note: 'tiled duct behind the toilet' },
    { fixture: 'bath', box: [0.0, 0.55, 0.30, 0.80] },
    { fixture: 'basin', box: [0.72, 0.62, 1.0, 0.78] },
  ],
};

describe('the bathroom programme no longer mandates a toilet', () => {
  const bathroom = ROOM_PROGRAM_RULES.bathroom;

  it('does not order a toilet into the room unconditionally', () => {
    // The exact defect: an `Include ... a toilet` with no photo condition on it.
    expect(bathroom).not.toMatch(/Include a vanity with sink\(s\) and mirror, a toilet/i);
    expect(bathroom).not.toMatch(/a vanity, toilet and mirror are a complete answer/i);
  });

  it('defers to the measured survey instead', () => {
    expect(bathroom).toMatch(/PLUMBING SURVEY ABOVE DECIDES WHICH FIXTURES EXIST/i);
    expect(bathroom).toMatch(/photographed without a toilet is rendered without a toilet/i);
    expect(bathroom).toMatch(/do NOT add a heated towel rail unless the photograph already has one/i);
  });

  it('still asks for the things that need no drainage', () => {
    // Guard against over-correcting into a bathroom with nothing in it.
    expect(bathroom).toMatch(/TILED/);
    expect(bathroom).toMatch(/mirror/i);
    expect(bathroom).toMatch(/towel/i);
  });
});

describe('RD24 and RD27 in the prompt', () => {
  const prompt = buildGenerationPrompt({ styleBrief: 'x', roomType: 'bathroom' });

  it('RD24 now counts a new waste pipe as building work', () => {
    expect(prompt).toMatch(/NEW WATER SUPPLY OR WASTE PIPE/i);
  });

  it('RD27 states the rule, in the architecture step', () => {
    expect(prompt).toContain('[RD27]');
    expect(prompt.indexOf('[RD27]')).toBeGreaterThan(prompt.indexOf('STEP 2 — THE ARCHITECTURE IS FIXED'));
    expect(prompt.indexOf('[RD27]')).toBeLessThan(prompt.indexOf('STEP 3 — FURNISH THE EMPTY SHELL'));
    expect(prompt).toMatch(/floor space is not drainage/i);
  });
});

describe('the plumbing survey reaches the prompt', () => {
  it('names the absence when the room has no drainage at all', () => {
    const out = renderSpatialConstraints(bareRoom);
    expect(out).toMatch(/PLUMBING SURVEY/);
    expect(out).toMatch(/NO plumbed fixture and NO soil stack/i);
    expect(out).toMatch(/Floor space against a wall is not drainage/i);
  });

  it('lists what is there when something is', () => {
    const out = renderSpatialConstraints(fullyPlumbed);
    expect(out).toMatch(/the only drainage in this room is/i);
    expect(out).toMatch(/toilet at/);
    expect(out).toMatch(/boxed soil stack/);
    expect(out).toMatch(/Do NOT add any plumbed fixture beyond this list/i);
  });
});

describe('RD26 · the photo-specific note', () => {
  it('forbids every fixture when there is no drainage evidence', () => {
    const c = detectProgrammeConflict('bathroom', bareRoom);
    expect(c?.code).toBe('bathroom-no-drainage');
    expect(c?.note).toMatch(/no toilet, no bath, no shower/i);
    expect(c?.userTip).toBeTruthy();
  });

  it('forbids only the toilet when a basin exists but no WC does', () => {
    const c = detectProgrammeConflict('bathroom', noDrainage);
    expect(c?.code).toBe('bathroom-keep-fixtures');
    expect(c?.note).toMatch(/NO toilet in frame/i);
    expect(c?.note).toMatch(/basin/);
  });

  it('says nothing when the photograph already has a toilet', () => {
    expect(detectProgrammeConflict('bathroom', fullyPlumbed)).toBeNull();
  });

  it('reaches the built prompt', () => {
    const p = buildGenerationPrompt({ styleBrief: 'x', roomType: 'bathroom', structure: bareRoom });
    expect(p).toMatch(/THIS PHOTOGRAPH IN PARTICULAR/);
    expect(p).toMatch(/no drainage evidence in this room/i);
  });
});

describe('RD25 · post-generation plumbing count', () => {
  it('ignores the soil stack, which the renovation may conceal', () => {
    expect(countPlumbing(fullyPlumbed)).toEqual({ toilet: 1, bath: 1, basin: 1 });
  });

  it('flags a toilet that appeared out of nowhere — the reported failure', () => {
    const output: RoomStructure = {
      ...noDrainage,
      plumbing: [
        { fixture: 'basin', box: [0.05, 0.55, 0.3, 0.68] },
        { fixture: 'toilet', box: [0.8, 0.6, 0.95, 0.85] },
        { fixture: 'towel_rail', box: [0.9, 0.35, 0.97, 0.6] },
      ],
    };
    const added = inventedPlumbing(noDrainage, output);
    expect(added.map((a) => a.fixture).sort()).toEqual(['toilet', 'towel_rail']);
    expect(added.find((a) => a.fixture === 'toilet')).toMatchObject({ from: 0, to: 1 });
  });

  it('does not flag a room that merely restyled what it had', () => {
    expect(inventedPlumbing(fullyPlumbed, fullyPlumbed)).toEqual([]);
  });

  it('does not flag a fixture that was REMOVED — that is a different rule', () => {
    // Deletion is RD27's other half, enforced by the survey line rather than by
    // this count; asserting it here would make the check fire on the wrong axis.
    expect(inventedPlumbing(fullyPlumbed, noDrainage)).toEqual([]);
  });

  it('is safe on a failed analysis', () => {
    expect(inventedPlumbing(null, null)).toEqual([]);
    expect(countPlumbing(undefined)).toEqual({});
  });
});

describe('parsing the survey', () => {
  it('reads fixtures and normalises the synonyms the model reaches for', () => {
    const raw = JSON.stringify({
      visibleWalls: ['back'],
      windows: [], doors: [], fixedFeatures: [],
      plumbing: [
        { fixture: 'WC', box: [0.4, 0.6, 0.6, 0.85] },
        { fixture: 'wash basin', box: [0.7, 0.6, 0.9, 0.75] },
        { fixture: 'bathtub', box: [0, 0.5, 0.3, 0.8] },
        { fixture: 'pipe boxing', box: [0.35, 0.3, 0.65, 0.65] },
      ],
      summary: 's',
    });
    const s = parseRoomStructure(raw)!;
    expect(s.plumbing.map((p) => p.fixture)).toEqual(['toilet', 'basin', 'bath', 'soil_stack']);
  });

  it('drops a fixture it cannot classify rather than guessing', () => {
    // A mis-typed fixture becomes false evidence that drainage exists.
    const raw = JSON.stringify({
      visibleWalls: ['back'], windows: [], doors: [], fixedFeatures: [],
      plumbing: [{ fixture: 'washing machine', box: [0.1, 0.5, 0.3, 0.8] }],
      summary: 's',
    });
    expect(parseRoomStructure(raw)!.plumbing).toEqual([]);
  });

  it('defaults to an empty survey when the field is absent', () => {
    const raw = JSON.stringify({ visibleWalls: ['back'], windows: [], doors: [], fixedFeatures: [], summary: 's' });
    expect(parseRoomStructure(raw)!.plumbing).toEqual([]);
  });
});
