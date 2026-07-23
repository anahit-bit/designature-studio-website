import { describe, it, expect } from 'vitest';
import { STYLE_BRIEFS } from '../../services/aiVision/stylePresets';

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
