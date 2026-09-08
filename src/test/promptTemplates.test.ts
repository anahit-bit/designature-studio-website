import { describe, it, expect } from 'vitest';
import {
  buildGenerationPrompt,
  buildStagingPrompt,
  ROOM_PROGRAM_RULES,
} from '../../services/aiVision/promptTemplates';

// Neutral brief with no furniture nouns, so section-scoped assertions about
// "no sofa" can only be tripped by the ROOM PROGRAM block itself.
const BRIEF = 'TEST STYLE BRIEF: neutral placeholder, no furniture words here.';

// Isolate just the room programme from a generation prompt. Since 2026-09-04
// the prompt is written as four ordered steps, and the programme is step 3 —
// deliberately AFTER the architecture is declared fixed, so it reads as "what
// goes into this shell" rather than as an instruction that outranks it.
// Step 3 as a whole is too wide a slice: the generic placement rules under it
// say "sofa back" and "bed", which would trip the negative assertions below no
// matter what the programme says. So take just the programme paragraph — from
// the end of RD24 (which introduces it) to the next rule bullet.
function genProgramSection(prompt: string): string {
  const rd24 = prompt.indexOf('[RD24]');
  expect(rd24).toBeGreaterThanOrEqual(0);
  const start = prompt.indexOf('\n', rd24);
  const end = prompt.indexOf('\n- [RD', start);
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

  // Regression: the bed-as-centrepiece program used to fight the window on a
  // head-on shot — the model seated the headboard on the window wall and
  // relocated/replaced the window. The program now carries a window-preserving
  // bed-placement rule that must reach the generation prompt.
  it('bedroom program preserves the window and offsets the bed to a side wall', () => {
    const prompt = buildGenerationPrompt({ styleBrief: BRIEF, roomType: 'bedroom' });
    const section = genProgramSection(prompt).toLowerCase();
    expect(section).toContain('bed placement');
    expect(section).toContain('side wall');
    // The headboard must never cover a window, and art must not hang over one.
    expect(section).toContain('never cover it with the headboard');
    expect(section).toContain('do not hang art over a window');
    // The old wording that anchored the bed on the (window) wall is gone.
    expect(section).not.toContain('art above the headboard');
  });

  it('kids_room program carries the same window-preserving bed rule', () => {
    const prompt = buildGenerationPrompt({ styleBrief: BRIEF, roomType: 'kids_room' });
    const section = genProgramSection(prompt).toLowerCase();
    expect(section).toContain('bed placement');
    expect(section).toContain('side wall');
    expect(section).toContain('never cover it with the headboard');
  });

  it('places the room programme AFTER the architecture, subordinated to it by RD24', () => {
    // This assertion is the 2026-09-04 fix. The programme used to sit above the
    // constraints introduced as an override, and on a Hallway it duly overrode
    // them — the model cut an archway into a dead-end wall to satisfy it.
    const prompt = buildGenerationPrompt({ styleBrief: BRIEF, roomType: 'kitchen' });
    expect(prompt.indexOf('STEP 2 — THE ARCHITECTURE IS FIXED')).toBeLessThan(
      prompt.indexOf('STEP 3 — FURNISH THE EMPTY SHELL'),
    );
    // RD24 must introduce the programme, not trail it: it says "the programme
    // that follows", and rendering it afterwards made that sentence a lie.
    const rd24 = prompt.indexOf('[RD24]');
    expect(rd24).toBeGreaterThan(0);
    expect(rd24).toBeLessThan(prompt.indexOf(ROOM_PROGRAM_RULES.kitchen.slice(0, 40)));
    expect(prompt).toContain('It can never authorise building work');
  });

  it('falls back to the living_room program when roomType is omitted', () => {
    const prompt = buildGenerationPrompt({ styleBrief: BRIEF });
    const section = genProgramSection(prompt);
    expect(prompt).toContain('LIVING ROOM'); // label sentence still renders
    expect(section).toContain(ROOM_PROGRAM_RULES.living_room);
  });
});

describe('buildStagingPrompt · room type and length', () => {
  // The staging engine EDITS the uploaded photo, and prompt length is what pulls
  // it off that photo. Measured over 16 real rooms (pack 1), varying only this
  // prompt's length: 500w+ scored 0/16 preserved with outputs unrelated to the
  // source; 260w scored 6/16; 131w (the shipped prompt, accent included) scored
  // 8/16. The full ~90-word ROOM PROGRAM block cannot be afforded here, so the
  // room type is fixed by the opening sentence instead.
  it('names the room type and excludes wrong-room furniture', () => {
    const prompt = buildStagingPrompt({ styleBrief: BRIEF, roomType: 'dining_room' });
    expect(prompt.toLowerCase()).toContain('dining room');
    expect(prompt.toLowerCase()).not.toContain('sofa');
    expect(prompt.toLowerCase()).not.toContain('coffee table');
  });

  it('falls back to a living room when roomType is omitted', () => {
    expect(buildStagingPrompt({ styleBrief: BRIEF }).toLowerCase()).toContain('living room');
  });

  it('stays short — this is the regression that scored 0/16', () => {
    const prompt = buildStagingPrompt({ styleBrief: BRIEF, roomType: 'dining_room' });
    expect(prompt).not.toContain(ROOM_PROGRAM_RULES.dining_room);
    expect(prompt.split(/\s+/).length).toBeLessThan(180);
  });

  it('still carries the palette accent, compressed to one line', () => {
    const accent = { name: 'Muted Sage', hex: '#9CA88D', role: 'accent' } as any;
    const prompt = buildStagingPrompt({ styleBrief: BRIEF, roomType: 'bedroom', accent });
    expect(prompt).toContain('Muted Sage');
    expect(prompt).toContain('#9CA88D');
    // The full renderAccent() block is ~90 words and would blow the budget.
    expect(prompt).not.toContain('ACCENT COLOUR FOR THIS CONCEPT');
  });
});

