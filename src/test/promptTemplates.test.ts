import { describe, it, expect } from 'vitest';
import {
  buildGenerationPrompt,
  buildStagingPrompt,
  ROOM_PROGRAM_RULES,
} from '../../services/aiVision/promptTemplates';

// Neutral brief with no furniture nouns, so section-scoped assertions about
// "no sofa" can only be tripped by the ROOM PROGRAM block itself.
const BRIEF = 'TEST STYLE BRIEF: neutral placeholder, no furniture words here.';

// Isolate just the ROOM PROGRAM block from a generation prompt. It sits
// between the "ROOM PROGRAM" label and the CRITICAL ARCHITECTURAL CONSTRAINTS
// section, so the trailing TARGET STYLE brief can't leak into the assertions.
function genProgramSection(prompt: string): string {
  const start = prompt.indexOf('ROOM PROGRAM');
  const end = prompt.indexOf('CRITICAL ARCHITECTURAL CONSTRAINTS');
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return prompt.slice(start, end);
}

// The staging prompt places the block just before the architecture-preservation
// sentence (the style brief precedes it here), so slice up to that marker.
function stagingProgramSection(prompt: string): string {
  const start = prompt.indexOf('ROOM PROGRAM');
  const end = prompt.indexOf("Preserve the room's existing architecture");
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return prompt.slice(start, end);
}

describe('buildGenerationPrompt · ROOM PROGRAM enforcement', () => {
  it('dining_room injects the dining program: dining table anchor, no living-room furniture', () => {
    const prompt = buildGenerationPrompt({ styleBrief: BRIEF, roomType: 'dining_room' });
    const section = genProgramSection(prompt);
    expect(section).toContain(ROOM_PROGRAM_RULES.dining_room);
    expect(section.toLowerCase()).toContain('dining table');
    expect(section.toLowerCase()).not.toContain('sofa');
    expect(section.toLowerCase()).not.toContain('coffee table');
  });

  it('bedroom injects a bed-centred program', () => {
    const prompt = buildGenerationPrompt({ styleBrief: BRIEF, roomType: 'bedroom' });
    const section = genProgramSection(prompt);
    expect(section).toContain(ROOM_PROGRAM_RULES.bedroom);
    expect(section.toLowerCase()).toContain('bed');
  });

  it('places the ROOM PROGRAM immediately before the architectural constraints, marked as authoritative', () => {
    const prompt = buildGenerationPrompt({ styleBrief: BRIEF, roomType: 'kitchen' });
    expect(prompt.indexOf('ROOM PROGRAM')).toBeLessThan(
      prompt.indexOf('CRITICAL ARCHITECTURAL CONSTRAINTS'),
    );
    expect(prompt).toContain('overrides any furniture examples');
  });

  it('falls back to the living_room program when roomType is omitted', () => {
    const prompt = buildGenerationPrompt({ styleBrief: BRIEF });
    const section = genProgramSection(prompt);
    expect(prompt).toContain('LIVING ROOM'); // label sentence still renders
    expect(section).toContain(ROOM_PROGRAM_RULES.living_room);
  });
});

describe('buildStagingPrompt · ROOM PROGRAM enforcement', () => {
  it('applies the same dining program block', () => {
    const prompt = buildStagingPrompt({ styleBrief: BRIEF, roomType: 'dining_room' });
    const section = stagingProgramSection(prompt);
    expect(section).toContain(ROOM_PROGRAM_RULES.dining_room);
    expect(section.toLowerCase()).toContain('dining table');
    expect(section.toLowerCase()).not.toContain('sofa');
    expect(section.toLowerCase()).not.toContain('coffee table');
  });

  it('falls back to the living_room program when roomType is omitted', () => {
    const prompt = buildStagingPrompt({ styleBrief: BRIEF });
    const section = stagingProgramSection(prompt);
    expect(section).toContain(ROOM_PROGRAM_RULES.living_room);
  });
});
