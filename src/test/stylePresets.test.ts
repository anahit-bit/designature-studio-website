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
