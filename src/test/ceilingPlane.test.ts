/**
 * RD5 / RD28 — the ceiling plane, measured and counted.
 *
 * RD5 has been written out in full since 2026-07-13 and broken anyway: a lit
 * perimeter cove appeared in ALL SIX graded bathroom generations on 2026-09-07,
 * both before and after the plumbing fix, on rooms whose ceilings are plainly
 * flat. RD22 says a rule that keeps failing after being stated explicitly gets
 * escalated from prompt text to verify-and-retry. These tests cover the
 * measurement and the diff that make that possible.
 */
import { describe, it, expect } from 'vitest';
import {
  renderSpatialConstraints,
  inventedCeiling,
  parseRoomStructure,
  type RoomStructure,
} from '../../services/aiVision/spatialAnalysis';
import { buildGenerationPrompt } from '../../services/aiVision/promptTemplates';

const flatRoom: RoomStructure = {
  cameraView: 'angled showing two walls',
  visibleWalls: ['back', 'left', 'ceiling', 'floor'],
  outOfFrameWalls: [],
  windows: [], doors: [], fixedFeatures: [], plumbing: [],
  ceiling: { flat: true, features: [], cornice: true },
  detectedRoom: 'bathroom',
  summary: 'Flat ceiling with a cornice.',
};

const covedRoom: RoomStructure = {
  ...flatRoom,
  ceiling: { flat: false, features: ['cove'], cornice: false },
};

describe('the ceiling survey states the plane positively', () => {
  it('says a flat ceiling is flat, and that flat is the correct answer', () => {
    const out = renderSpatialConstraints(flatRoom);
    expect(out).toMatch(/CEILING SURVEY/);
    expect(out).toMatch(/ONE FLAT PLANE/);
    expect(out).toMatch(/A plain flat ceiling is the correct result for a plain flat ceiling/i);
    // The specific things that kept appearing.
    expect(out).toMatch(/perimeter cove/i);
    expect(out).toMatch(/downlights sunk into the plane/i);
  });

  it('keeps a cornice, which is a finish rather than relief', () => {
    expect(renderSpatialConstraints(flatRoom)).toMatch(/Keep the cornice/);
    const noCornice = { ...flatRoom, ceiling: { flat: true, features: [], cornice: false } };
    expect(renderSpatialConstraints(noCornice)).toMatch(/with no cornice/);
  });

  it('describes relief that genuinely exists, and forbids adding more', () => {
    const out = renderSpatialConstraints(covedRoom);
    expect(out).toMatch(/already has a recessed perimeter cove/i);
    expect(out).toMatch(/Do not add any further relief/i);
    expect(out).not.toMatch(/ONE FLAT PLANE/);
  });

  it('RD5 now names recessed downlights in the rules block', () => {
    const prompt = buildGenerationPrompt({ styleBrief: 'x', roomType: 'bathroom' });
    expect(prompt).toContain('[RD5]');
    expect(prompt).toMatch(/no downlights sunk INTO the plane/i);
    expect(prompt).toMatch(/that is the correct result, not an unfinished one/i);
  });
});

describe('RD28 · counting invented ceiling relief', () => {
  it('flags the cove that appeared in every graded generation', () => {
    const output = { ...flatRoom, ceiling: { flat: false, features: ['cove' as const], cornice: true } };
    expect(inventedCeiling(flatRoom, output)).toEqual(['cove']);
  });

  it('flags recessed downlights cut into a plain ceiling', () => {
    const output = {
      ...flatRoom,
      ceiling: { flat: false, features: ['cove' as const, 'recessed_downlights' as const], cornice: true },
    };
    expect(inventedCeiling(flatRoom, output).sort()).toEqual(['cove', 'recessed_downlights']);
  });

  it('does not flag relief the room already had', () => {
    expect(inventedCeiling(covedRoom, covedRoom)).toEqual([]);
  });

  it('does not flag a ceiling that was simplified', () => {
    // Removing relief is not this check's axis, exactly as with openings.
    expect(inventedCeiling(covedRoom, flatRoom)).toEqual([]);
  });

  it('is safe when either analysis failed', () => {
    expect(inventedCeiling(null, flatRoom)).toEqual([]);
    expect(inventedCeiling(flatRoom, null)).toEqual([]);
  });
});

describe('parsing the ceiling', () => {
  const parse = (ceiling: unknown) =>
    parseRoomStructure(JSON.stringify({
      visibleWalls: ['back'], windows: [], doors: [], fixedFeatures: [], summary: 's', ceiling,
    }))!.ceiling;

  it('defaults to flat when the field is missing — the safe assumption', () => {
    // Assuming relief the photo may not have would licence the model to build it.
    expect(parse(undefined)).toEqual({ flat: true, features: [], cornice: false });
  });

  it('normalises the words the model actually reaches for', () => {
    expect(parse({ flat: false, features: ['coving', 'tray ceiling', 'spotlights'] }).features.sort())
      .toEqual(['cove', 'dropped_section', 'recessed_downlights']);
  });

  it('drops relief it cannot classify, without claiming the ceiling is flat', () => {
    // Both lies are available here and both are dangerous: calling it flat would
    // licence flattening a real cove, and keeping an unrecognised feature would
    // licence inventing one. So the feature goes and `flat` stays false.
    expect(parse({ flat: false, features: ['artex swirl'] })).toEqual({
      flat: false, features: [], cornice: false,
    });
  });

  it('renders a survey line that says only what is true in that case', () => {
    const odd: RoomStructure = {
      ...flatRoom,
      ceiling: { flat: false, features: [], cornice: false },
    };
    const out = renderSpatialConstraints(odd);
    expect(out).toMatch(/reproduce the ceiling exactly as the photograph shows it/i);
    expect(out).not.toMatch(/already has \./); // the malformed sentence this replaced
    expect(out).not.toMatch(/ONE FLAT PLANE/);
  });

  it('lets the measured list overrule a contradictory flat:true', () => {
    // A model that troubled itself to name a cove has seen one.
    expect(parse({ flat: true, features: ['cove'] })).toMatchObject({ flat: false, features: ['cove'] });
  });

  it('records the cornice separately from relief', () => {
    expect(parse({ flat: true, features: [], cornice: true })).toEqual({
      flat: true, features: [], cornice: true,
    });
  });
});
