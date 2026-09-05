import { describe, it, expect } from 'vitest';
import {
  STYLE_BRIEFS,
  STYLE_NAME_TO_PRESET,
  ROOM_NAME_TO_TYPE,
  ROOM_TYPE_LABELS,
} from '../../services/aiVision/stylePresets';
import { ROOM_PROGRAM_RULES, pickAccent, renderAccent } from '../../services/aiVision/promptTemplates';
import { STYLE_PALETTES, PAINT_MODIFIERS, LIVE_ROOM_CHIPS } from '../../services/aiVision/rulebook.generated';
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

  // Updated 2026-09-01. This used to assert /playful|joyful/, which was right when
  // Maximalist was "contemporary joyful" — but that is exactly what made it
  // indistinguishable from Dopamine. The owner split them: Dopamine keeps the
  // bright, joyful, candy vocabulary; Maximalist is depth, pattern and
  // collection. The anti-palace intent of this test is unchanged.
  it('reads as layered and collected, not palatial', () => {
    expect(brief).toMatch(/layered|collected|rich/);
  });

  // The word-bans above passed while the RENDERS came back as a Victorian
  // drawing room — gilt-framed oil portraits, an antique glazed cabinet, stacked
  // Persian rugs. Rulebook RD22 in miniature: banned words do not enforce, only
  // looking at the output does. So the brief now has to SAY contemporary in the
  // two sections that were pulling it period.
  it('keeps the furniture and the art contemporary, not period', () => {
    const furniture = brief.split('3. furniture character:')[1].split('4. lighting:')[0];
    const decor = brief.split('6. decor & styling:')[1].split('7. overall mood:')[0];
    expect(furniture).toMatch(/contemporary|modern|current/);
    expect(decor).toMatch(/contemporary|modern/);
  });

  it('allows at most one genuinely vintage piece, so the room cannot become an antique shop', () => {
    expect(brief).toMatch(/one piece may be genuinely vintage|exactly one/);
  });

  it('does not borrow the candy-bright vocabulary that belongs to Dopamine', () => {
    for (const banned of ['bubblegum', 'candy', 'sunflower yellow', 'marshmallow', 'pastel']) {
      expect(brief, `maximalist should leave "${banned}" to dopamine`).not.toContain(banned);
    }
  });
});

// The two styles were near-duplicates: both briefs said joyful, saturated,
// contemporary and curved, and a visitor could not tell their rooms apart.
describe('maximalist and dopamine are actually different styles', () => {
  it('share no palette colour', () => {
    const hex = (k: string) => new Set(STYLE_PALETTES[k].map((c) => c.hex));
    const max = hex('maximalist');
    const overlap = [...hex('dopamine')].filter((h) => max.has(h));
    expect(overlap, `identical hexes in both palettes: ${overlap.join(', ')}`).toHaveLength(0);
  });

  it('dopamine keeps the bright register, maximalist keeps the deep one', () => {
    expect(STYLE_BRIEFS.dopamine.toLowerCase()).toMatch(/bright|joyful/);
    expect(STYLE_BRIEFS.maximalist.toLowerCase()).toMatch(/deep|jewel/);
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

  // The room picker is the workbook's "Live in UI?" column, not a hand-kept
  // array. RD19 put outdoor out of scope on 2026-08-29 and the Outdoor chip
  // stayed live until 2026-09-05 — the rulebook and the product disagreed about
  // what the tool does for five weeks, because nothing tied them together.
  // Which rooms are offered is the workbook's call; the ORDER they appear in is
  // the UI's (Living + Dining reads best beside Living and Dining, not at the
  // end where its row happens to sit). So this compares the sets, not the lists.
  it('the room picker offers exactly the rooms the workbook marks live', () => {
    expect([...ROOM_TYPES_FULL].sort()).toEqual([...LIVE_ROOM_CHIPS].sort());
  });

  it('a retired room keeps its programme, so old requests still resolve', () => {
    // Retiring a chip must not orphan the room type: a saved concept, or an API
    // caller passing "Outdoor", has to reach the outdoor programme rather than
    // silently falling through to living_room.
    const live = new Set(ROOM_TYPES_FULL.map((l) => ROOM_NAME_TO_TYPE[l]));
    const retired = Object.keys(ROOM_PROGRAM_RULES).filter((k) => !live.has(k as never));
    for (const key of retired) {
      expect(ROOM_PROGRAM_RULES[key]?.trim(), `retired room "${key}" lost its programme`).toBeTruthy();
      expect(ROOM_TYPE_LABELS[key as never], `retired room "${key}" lost its label`).toBeTruthy();
      const reachable = Object.entries(ROOM_NAME_TO_TYPE).some(([, v]) => v === key);
      expect(reachable, `retired room "${key}" is unreachable even by name`).toBe(true);
    }
    expect(retired, 'outdoor should be the only retired room').toEqual(['outdoor']);
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

// ─────────────────────────────────────────────────────────────────────────────
// Palettes — one accent per generation is what stops fifteen styles producing
// fifteen versions of the same room.
// ─────────────────────────────────────────────────────────────────────────────
describe('style palettes · one accent per generation', () => {
  it('every style has a palette with at least three accents', () => {
    for (const label of VISION_STYLES_FULL) {
      const preset = STYLE_NAME_TO_PRESET[label];
      const palette = STYLE_PALETTES[preset];
      expect(palette, `no palette for "${preset}"`).toBeTruthy();
      const accents = palette.filter((c) => c.role === 'accent');
      expect(accents.length, `"${preset}" has ${accents.length} accents — generations would repeat`)
        .toBeGreaterThanOrEqual(3);
    }
  });

  it('every colour is a real #RRGGBB hex', () => {
    for (const palette of Object.values(STYLE_PALETTES)) {
      for (const c of palette) expect(c.hex).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it('walks the accent pool as the variation seed increases, instead of repeating', () => {
    const accents = STYLE_PALETTES.japandi.filter((c) => c.role === 'accent');
    const picked = accents.map((_, i) => pickAccent('japandi', i)?.name);
    expect(new Set(picked).size).toBe(accents.length);
  });

  it('is deterministic for a given seed', () => {
    expect(pickAccent('coastal', 2)?.hex).toBe(pickAccent('coastal', 2)?.hex);
  });

  it('returns null when there is no preset — reference photos carry their own colour', () => {
    expect(pickAccent(undefined, 0)).toBeNull();
  });

  it('renders an accent block that names the colour and protects the rest of the brief', () => {
    const block = renderAccent(pickAccent('bohemian', 0));
    expect(block).toContain('ACCENT COLOUR FOR THIS CONCEPT');
    expect(block).toMatch(/#[0-9A-F]{6}/);
    expect(block).toContain('Keep every other instruction in the style brief intact');
  });
});

describe('2026 paint modifier · overrides the accent, never the style', () => {
  it('exposes the three Colours of the Year', () => {
    expect(PAINT_MODIFIERS.map((p) => p.id).sort())
      .toEqual(['cloud_dancer', 'silhouette', 'universal_khaki']);
  });

  it('outranks the style palette when chosen', () => {
    const withPaint = pickAccent('bohemian', 0, 'silhouette');
    expect(withPaint?.name).toBe('Silhouette');
    expect(withPaint?.brand).toContain('Benjamin Moore');
  });

  it('applies even with reference photos, where there is no preset at all', () => {
    const accent = pickAccent(undefined, undefined, 'cloud_dancer');
    expect(accent?.name).toBe('Cloud Dancer');
  });

  it('falls back to the style palette when the id is unknown', () => {
    const accent = pickAccent('coastal', 0, 'not_a_real_colour');
    expect(accent?.name).toBe(STYLE_PALETTES.coastal.filter((c) => c.role === 'accent')[0].name);
  });

  it('carries its own instruction into the prompt', () => {
    expect(renderAccent(pickAccent('modern', 0, 'cloud_dancer'))).toContain('DOMINANT wall colour');
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
