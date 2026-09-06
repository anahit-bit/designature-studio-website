/**
 * The 2026-09-04 failure, pinned.
 *
 * A Hallway + Trend 2026 concept cut an archway with a staircase into a sealed
 * dead-end wall and kept the original bed frame standing in the foreground. The
 * prompt had ordered both:
 *
 *   - the hallway programme said the space "MUST READ AS LEADING SOMEWHERE ...
 *     a staircase", and the model obeyed that over RD3/RD7's prohibitions;
 *   - RD8 (clear the room) sat inside a block headed CRITICAL ARCHITECTURAL
 *     CONSTRAINTS, among thirteen rules that all say "keep this exactly".
 *
 * These tests assert the shape of the fix rather than the wording of any one
 * sentence, so the owner can keep editing the workbook without breaking them.
 */
import { describe, it, expect } from 'vitest';
import {
  buildGenerationPrompt,
  detectProgrammeConflict,
  renderProgrammeNote,
  ROOM_PROGRAM_RULES,
} from '../../services/aiVision/promptTemplates';
import {
  spatialMetrics,
  countOpenings,
  renderSpatialConstraints,
  type RoomStructure,
} from '../../services/aiVision/spatialAnalysis';
import { ROOM_TYPE_LABELS, ROOM_TYPE_TO_CHIP, type RoomType } from '../../services/aiVision/stylePresets';
import { ROOM_TYPES_FULL } from '../components/VisionExperience';

const BRIEF = '1. COLOR PALETTE: warm neutrals.';

/** The room in the owner's photo: one wall, no window, no door, a bed frame. */
const deadEndAlcove: RoomStructure = {
  cameraView: 'head-on facing the back wall',
  visibleWalls: ['back', 'floor'],
  outOfFrameWalls: ['left', 'right'],
  windows: [],
  doors: [],
  fixedFeatures: [],
  detectedRoom: 'bedroom',
  summary: 'A small alcove; only the back wall is visible.',
};

const hallwayWithDoor: RoomStructure = {
  ...deadEndAlcove,
  doors: [{ wall: 'back', box: [0.4, 0.2, 0.6, 0.9] }],
  detectedRoom: 'hallway',
};

describe('the room programme cannot authorise architecture', () => {
  it('no programme demands a through-view, opening or staircase outright', () => {
    // The exact defect: a MUST that only architecture can satisfy. Every
    // programme may still *mention* openings — to say keep them, or not to make
    // them — so this checks the imperative, not the vocabulary.
    for (const [room, text] of Object.entries(ROOM_PROGRAM_RULES)) {
      expect(
        /MUST READ AS LEADING SOMEWHERE/i.test(text),
        `${room} orders the model to open the room up`,
      ).toBe(false);
    }
  });

  it('the hallway programme makes the through-view conditional on the photo', () => {
    const hallway = ROOM_PROGRAM_RULES.hallway;
    expect(hallway).toMatch(/THE THROUGH-VIEW IS THE PHOTOGRAPH'S TO GIVE/i);
    expect(hallway).toMatch(/ENDS at the wall/i);
    expect(hallway).toMatch(/dead end is the correct result/i);
  });

  it('RD24 tells the model the photograph outranks the programme', () => {
    const prompt = buildGenerationPrompt({ styleBrief: BRIEF, roomType: 'hallway' });
    expect(prompt).toContain('[RD24]');
    // And it lands with the programme, not stranded in a distant block.
    const rd24 = prompt.indexOf('[RD24]');
    const programme = prompt.indexOf(ROOM_PROGRAM_RULES.hallway.slice(0, 60));
    expect(Math.abs(rd24 - programme)).toBeLessThan(2500);
  });
});

describe('RD26 · the programme is issued against the measured photograph', () => {
  it('names the absence when a hallway photo has no opening in it', () => {
    const conflict = detectProgrammeConflict('hallway', deadEndAlcove);
    expect(conflict?.code).toBe('hallway-dead-end');
    expect(conflict?.note).toMatch(/no doorway/i);
    expect(conflict?.userTip).toBeTruthy(); // the upload screen says so too
  });

  it('drops the dead-end note once the photo actually shows an opening', () => {
    // Still a head-on shot, so the generic single-wall note stands — but the
    // hallway-specific "there is no doorway" claim would now be a lie.
    expect(detectProgrammeConflict('hallway', hallwayWithDoor)?.code).toBe('single-wall-room');
  });

  it('stays silent on a photo that shows the whole room', () => {
    const openPlan: RoomStructure = {
      ...hallwayWithDoor,
      visibleWalls: ['back', 'left', 'right', 'floor'],
      outOfFrameWalls: [],
    };
    expect(detectProgrammeConflict('hallway', openPlan)).toBeNull();
  });

  it('flags the bedroom case where the only wall in frame is glazed', () => {
    const glazed: RoomStructure = {
      ...deadEndAlcove,
      windows: [{ wall: 'back', shape: 'rectangular', box: [0.3, 0.2, 0.7, 0.6] }],
    };
    expect(detectProgrammeConflict('bedroom', glazed)?.code).toBe('bed-wall-glazed');
    expect(detectProgrammeConflict('kids_room', glazed)?.code).toBe('bed-wall-glazed');
  });

  it('drops the island from a single-wall kitchen', () => {
    expect(detectProgrammeConflict('kitchen', deadEndAlcove)?.code).toBe('single-wall-kitchen');
  });

  it('is inert without a structure, so generation is never blocked on it', () => {
    expect(detectProgrammeConflict('hallway', null)).toBeNull();
    expect(renderProgrammeNote('hallway', undefined)).toBe('');
  });

  it('reaches the prompt when a structure is supplied', () => {
    const withPhoto = buildGenerationPrompt({
      styleBrief: BRIEF, roomType: 'hallway', structure: deadEndAlcove,
    });
    expect(withPhoto).toMatch(/THIS PHOTOGRAPH IN PARTICULAR/);
    expect(withPhoto).toMatch(/no doorway/i);

    const without = buildGenerationPrompt({ styleBrief: BRIEF, roomType: 'hallway' });
    expect(without).not.toMatch(/THIS PHOTOGRAPH IN PARTICULAR/);
  });
});

describe('clearing the room is its own step, not a constraint', () => {
  const prompt = buildGenerationPrompt({ styleBrief: BRIEF, roomType: 'hallway' });

  it('states the four steps in order', () => {
    const steps = ['STEP 1 — CLEAR THE ROOM', 'STEP 2 — THE ARCHITECTURE IS FIXED',
                   'STEP 3 — FURNISH THE EMPTY SHELL', 'STEP 4 — FINISHES AND LIGHTING'];
    const positions = steps.map((s) => prompt.indexOf(s));
    expect(positions.every((p) => p >= 0), `missing: ${steps.filter((s, i) => positions[i] < 0)}`).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it('puts RD8 in the clearing step, ahead of the preservation rules', () => {
    // The whole bug in one assertion: "empty the room" must not be filed under
    // a heading that reads as "keep everything".
    expect(prompt.indexOf('[RD8]')).toBeGreaterThan(prompt.indexOf('STEP 1 — CLEAR THE ROOM'));
    expect(prompt.indexOf('[RD8]')).toBeLessThan(prompt.indexOf('STEP 2 — THE ARCHITECTURE IS FIXED'));
    expect(prompt.indexOf('[RD1]')).toBeGreaterThan(prompt.indexOf('STEP 2 — THE ARCHITECTURE IS FIXED'));
  });

  it('closes by demanding both promises, not just the architectural one', () => {
    const tail = prompt.slice(-900);
    expect(tail).toMatch(/NONE of the original furniture/i);
    expect(tail).toMatch(/same number of doors/i);
  });
});

describe('RD25 · a windowless room is still measured', () => {
  it('used to lose every geometric guard, and no longer does', () => {
    // spatialMetrics returned null without a window, which switched off both the
    // FRAMING & SCALE line and the whole verify-and-retry in imageGeneration.
    const m = spatialMetrics(hallwayWithDoor);
    expect(m).not.toBeNull();
    expect(m?.anchor).toBe('door');
  });

  it('still prefers a window when there is one', () => {
    const both: RoomStructure = {
      ...hallwayWithDoor,
      windows: [{ wall: 'back', shape: 'rectangular', box: [0.1, 0.2, 0.5, 0.7] }],
    };
    expect(spatialMetrics(both)?.anchor).toBe('window');
  });

  it('returns null only when the room has neither', () => {
    expect(spatialMetrics(deadEndAlcove)).toBeNull();
  });

  it('counts openings for the post-generation check', () => {
    expect(countOpenings(deadEndAlcove)).toEqual({ windows: 0, doors: 0, total: 0 });
    expect(countOpenings(hallwayWithDoor)).toEqual({ windows: 0, doors: 1, total: 1 });
    expect(countOpenings(null)).toEqual({ windows: 0, doors: 0, total: 0 });
  });

  it('tells the model the count, including when it is zero', () => {
    const closed = renderSpatialConstraints(deadEndAlcove);
    expect(closed).toMatch(/OPENING COUNT/);
    expect(closed).toMatch(/exactly 0 windows and 0 doorways/);
    expect(closed).toMatch(/solid and unbroken/i);

    expect(renderSpatialConstraints(hallwayWithDoor)).toMatch(/exactly 0 windows and 1 doorway\b/);
  });
});

describe('room detection replaces the silent living-room fallback', () => {
  it('every room type has a chip label, live or retired', () => {
    // Every type needs a readable name even when it is no longer offered: the
    // server reports the DETECTED room back to the UI, and a retired room (RD19
    // put outdoor out of scope) must still come back as a word, not a key.
    for (const room of Object.keys(ROOM_TYPE_LABELS) as RoomType[]) {
      expect(ROOM_TYPE_TO_CHIP[room], `${room} has no chip label`).toBeTruthy();
    }
    const live = (ROOM_TYPES_FULL as readonly string[]);
    for (const chip of live) {
      expect(Object.values(ROOM_TYPE_TO_CHIP), `live chip ${chip} maps to no room type`).toContain(chip);
    }
  });
});
