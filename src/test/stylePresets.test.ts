import { describe, it, expect } from 'vitest';
import {
  STYLE_BRIEFS,
  STYLE_NAME_TO_PRESET,
  ROOM_NAME_TO_TYPE,
  ROOM_TYPE_LABELS,
} from '../../services/aiVision/stylePresets';
import { ROOM_PROGRAM_RULES } from '../../services/aiVision/promptTemplates';
import { VISION_STYLES_FULL, ROOM_TYPES_FULL } from '../components/VisionExperience';

describe('mid_century preset · modern interpretation (not a literal 1950s-60s replica)', () => {
  const brief = STYLE_BRIEFS.mid_century.toLowerCase();

  it.each([
    'egg chair',
    'tulip table',
    'starburst',
    'atomic',
    'sputnik',
    'vinyl',
    'spindle back',
  ])('does not reference the retro cliché "%s"', (banned) => {
    expect(brief).not.toContain(banned);
  });

  it('anchors on warm walnut, tapered proportions, and a contemporary/modern read', () => {
    expect(brief).toContain('walnut');
    expect(brief).toContain('tapered');
    expect(brief).toMatch(/contemporary|modern/);
  });
});

describe('art_deco preset · restrained modern interpretation (not a literal 1920s Gatsby palace)', () => {
  const brief = STYLE_BRIEFS.art_deco.toLowerCase();

  it.each([
    'sunburst',
    'gilt',
    'gilded',
    'gatsby',
    '1920s',
    'high-gloss',
    'ebony',
    'polished brass',
    'palm frond',
    'gold-framed',
    'sputnik',
    'chinoiserie',
  ])('does not reference the period-palace cliché "%s"', (banned) => {
    expect(brief).not.toContain(banned);
  });

  it('anchors on a contemporary/modern read', () => {
    expect(brief).toMatch(/contemporary|modern/);
  });

  it('names at least one restrained Deco-referencing material cue (brushed brass/walnut/fluted)', () => {
    expect(brief).toMatch(/brushed brass|walnut|fluted/);
  });

  it('reads as restrained/considered/quiet, not opulent', () => {
    expect(brief).toMatch(/restrained|considered|quiet/);
  });
});

describe('maximalist preset · contemporary color + pattern (not a Baroque/Victorian palace)', () => {
  const brief = STYLE_BRIEFS.maximalist.toLowerCase();

  it.each([
    'brocade',
    'damask',
    'jacquard',
    'gilded',
    'gilt',
    'button-tufted',
    'canopy bed',
    'four-poster',
    'crystal chandelier',
    'decorative molding',
    'dado',
    'carved wood',
    'louis',
    'chesterfield',
    'tortoiseshell',
    'mother-of-pearl',
    'victorian',
    'baroque',
    'rococo',
  ])('does not reference the period-palace cliché "%s"', (banned) => {
    expect(brief).not.toContain(banned);
  });

  it('anchors on a contemporary/modern read', () => {
    expect(brief).toMatch(/contemporary|modern/);
  });

  it('names at least one contemporary maximalist material (velvet/rattan/lacquered)', () => {
    expect(brief).toMatch(/velvet|rattan|lacquered/);
  });

  it('reads as playful or joyful, not palatial', () => {
    expect(brief).toMatch(/playful|joyful/);
  });
});

describe('dopamine preset · joyful, saturated, curved (Dopamine Décor)', () => {
  it('has a non-empty brief', () => {
    expect(STYLE_BRIEFS.dopamine).toBeTruthy();
    expect(STYLE_BRIEFS.dopamine.trim().length).toBeGreaterThan(0);
  });

  it('maps the "Dopamine" display label to the "dopamine" preset', () => {
    expect(STYLE_NAME_TO_PRESET['Dopamine']).toBe('dopamine');
  });

  const brief = STYLE_BRIEFS.dopamine.toLowerCase();

  it('reads as joyful and playful/curved/rounded', () => {
    expect(brief).toContain('joyful');
    expect(brief).toMatch(/curved|rounded|playful/);
  });

  it('names the saturated palette (Sunflower/Bubblegum/Coral)', () => {
    expect(STYLE_BRIEFS.dopamine).toMatch(/Sunflower|Bubblegum|Coral/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Wiring guards. A chip with no mapping does not throw — it silently generates
// with no style, or with the wrong room. These are the only tests that catch it.
// ─────────────────────────────────────────────────────────────────────────────
describe('chip lists are fully wired to presets', () => {
  it('every VISION_STYLES_FULL chip maps to a preset that has a brief', () => {
    for (const label of VISION_STYLES_FULL) {
      const preset = STYLE_NAME_TO_PRESET[label];
      expect(preset, `style chip "${label}" has no STYLE_NAME_TO_PRESET entry`).toBeTruthy();
      expect(STYLE_BRIEFS[preset]?.trim(), `preset "${preset}" has an empty brief`).toBeTruthy();
    }
  });

  it('every ROOM_TYPES_FULL chip maps to a room type with a label and a program', () => {
    for (const label of ROOM_TYPES_FULL) {
      const key = ROOM_NAME_TO_TYPE[label];
      expect(key, `room chip "${label}" has no ROOM_NAME_TO_TYPE entry`).toBeTruthy();
      expect(ROOM_TYPE_LABELS[key], `room type "${key}" has no display label`).toBeTruthy();
      expect(ROOM_PROGRAM_RULES[key]?.trim(), `room type "${key}" has no program rule`).toBeTruthy();
    }
  });

  it('every style brief is reachable from a chip — no orphans', () => {
    const reachable = new Set(VISION_STYLES_FULL.map((l) => STYLE_NAME_TO_PRESET[l]));
    for (const preset of Object.keys(STYLE_BRIEFS)) {
      expect(reachable.has(preset as never), `preset "${preset}" has a brief but no chip`).toBe(true);
    }
  });

  it('every room program is reachable from a chip — no orphans', () => {
    const reachable = new Set(ROOM_TYPES_FULL.map((l) => ROOM_NAME_TO_TYPE[l]));
    for (const key of Object.keys(ROOM_PROGRAM_RULES)) {
      expect(reachable.has(key as never), `room type "${key}" has a program but no chip`).toBe(true);
    }
  });
});

describe('trend_2026 preset · the "I do not know my style" answer', () => {
  const brief = STYLE_BRIEFS.trend_2026.toLowerCase();

  it('maps the "Trend 2026" display label', () => {
    expect(STYLE_NAME_TO_PRESET['Trend 2026']).toBe('trend_2026');
  });

  it('is a warm-neutral direction, explicitly not grey', () => {
    expect(brief).toContain('warm');
    expect(brief).toContain('greys are deliberately absent');
  });

  it('names the 2026 material vocabulary (fluted/slatted millwork, boucle, unlacquered brass)', () => {
    expect(brief).toMatch(/fluted|slatted/);
    expect(brief).toContain('boucle');
    expect(brief).toContain('unlacquered brass');
  });

  it('respects RD16 — cladding is applied flat to the existing wall, never carved in', () => {
    expect(brief).toContain('applied flat to the existing surface');
  });
});

describe('living_dining program · one room, two zones, no new architecture', () => {
  const program = ROOM_PROGRAM_RULES.living_dining.toLowerCase();

  it('maps the "Living + Dining" chip', () => {
    expect(ROOM_NAME_TO_TYPE['Living + Dining']).toBe('living_dining');
    expect(ROOM_TYPE_LABELS.living_dining).toBe('OPEN-PLAN LIVING + DINING ROOM');
  });

  it('demands both zones', () => {
    expect(program).toContain('sofa');
    expect(program).toContain('dining table');
  });

  it('forbids every architectural zoning device (RD3 / RD6)', () => {
    for (const banned of ['partition', 'screen', 'level change', 'step']) {
      expect(program).toContain(banned);
    }
    expect(program).toContain('never');
  });

  it('keeps the two zones one room, not two', () => {
    expect(program).toContain('single space');
    expect(program).toContain('one material and colour vocabulary');
  });
});
