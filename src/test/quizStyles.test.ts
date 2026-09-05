import { describe, it, expect } from 'vitest';
import { QUIZ_IMAGE_WEIGHTS, TIER_POINTS, weightsForUrl, type QuizStyle } from '../data/quizImageWeights';
import { QUIZ_ROOMS_FALLBACK, QUIZ_EXCLUDED_STYLES } from '../components/StyleQuizScreen';
import { VISION_STYLES_FULL } from '../components/VisionExperience';
import { STYLE_NAME_TO_PRESET } from '../../services/aiVision/stylePresets';

// The quiz used to carry 9 styles while AI Vision carried 15, so six styles
// could never be a quiz verdict and Biophilic — the second most searched style
// we offer — was unreachable. These tests keep the two lists welded together.
describe('quiz styles cover every AI Vision style', () => {
  const quizStyles = new Set(Object.values(QUIZ_IMAGE_WEIGHTS).map((w) => w.primary));

  it('every AI Vision chip is reachable as a quiz verdict, except documented exclusions', () => {
    const excluded = new Set<string>(QUIZ_EXCLUDED_STYLES);
    for (const style of VISION_STYLES_FULL) {
      if (excluded.has(style)) continue;
      expect(quizStyles.has(style as QuizStyle), `"${style}" has no quiz images, so the quiz can never return it`).toBe(true);
    }
  });

  // An exclusion must be a deliberate decision, not a style someone forgot to
  // wire up — so it still has to be a real AI Vision style.
  it('every excluded style is a real AI Vision style', () => {
    for (const style of QUIZ_EXCLUDED_STYLES) {
      expect(VISION_STYLES_FULL as readonly string[], `"${style}" is excluded from a list it was never on`).toContain(style);
    }
  });

  it('every quiz style maps to a real AI Vision preset', () => {
    for (const style of quizStyles) {
      expect(STYLE_NAME_TO_PRESET[style], `quiz can return "${style}" but AI Vision cannot generate it`).toBeTruthy();
    }
  });

  it('every style a quiz image points at is a style the quiz knows', () => {
    for (const [key, w] of Object.entries(QUIZ_IMAGE_WEIGHTS)) {
      for (const s of [w.primary, ...w.strong, ...w.hint]) {
        expect(quizStyles.has(s), `"${key}" references "${s}", which no image claims as primary`).toBe(true);
      }
    }
  });

  it('no image lists its own primary style again as strong or hint', () => {
    for (const [key, w] of Object.entries(QUIZ_IMAGE_WEIGHTS)) {
      expect([...w.strong, ...w.hint], `"${key}" double-counts ${w.primary}`).not.toContain(w.primary);
    }
  });

  it('every style has enough images to appear in an 18-room quiz', () => {
    const counts = new Map<string, number>();
    for (const w of Object.values(QUIZ_IMAGE_WEIGHTS)) counts.set(w.primary, (counts.get(w.primary) ?? 0) + 1);
    for (const [style, n] of counts) expect(n, `"${style}" has only ${n} images`).toBeGreaterThanOrEqual(5);
  });

  it('every non-excluded style has a fallback pair for the pre-fetch render', () => {
    const excluded = new Set<string>(QUIZ_EXCLUDED_STYLES);
    for (const style of VISION_STYLES_FULL) {
      if (excluded.has(style)) continue;
      expect(QUIZ_ROOMS_FALLBACK[style]?.length, `"${style}" has no fallback rooms`).toBeGreaterThanOrEqual(1);
    }
  });
});

// The bug this suite exists to prevent coming back: the caller matched only
// /Quiz\/[^?]+/, but the original corpus delivers from the account ROOT, so its
// URLs contain no "Quiz/" at all. Every one of the 136 hand-authored entries
// silently missed and the quiz scored primary-only by folder of origin.
describe('weightsForUrl · both Cloudinary URL shapes resolve', () => {
  it('resolves a folder-scoped URL (the styles added in 2026)', () => {
    const w = weightsForUrl('https://res.cloudinary.com/dys2k5muv/image/upload/v1788120637/Quiz/Biophilic/kids-room.png');
    expect(w?.primary).toBe('Biophilic');
  });

  it('resolves a ROOT public_id URL — the original corpus, which used to score nothing', () => {
    const key = Object.keys(QUIZ_IMAGE_WEIGHTS).find((k) => k.startsWith('Quiz/Art-Deco/'))!;
    const file = key.split('/').pop()!;
    const w = weightsForUrl(`https://res.cloudinary.com/dys2k5muv/image/upload/v1774950187/${file}`);
    expect(w, 'a root-delivered legacy image still resolves to no weights').toBeTruthy();
    expect(w!.primary).toBe('Art Deco');
  });

  it('ignores a query string', () => {
    const w = weightsForUrl('https://res.cloudinary.com/x/image/upload/v1/Quiz/Biophilic/bedroom.png?foo=1');
    expect(w?.primary).toBe('Biophilic');
  });

  it('returns undefined for an unknown image rather than throwing', () => {
    expect(weightsForUrl('https://res.cloudinary.com/x/image/upload/v1/not-a-quiz-image.jpg')).toBeUndefined();
  });

  it('awards more than primary-only points, which is the whole point of the table', () => {
    const w = weightsForUrl('https://res.cloudinary.com/dys2k5muv/image/upload/v1788120637/Quiz/Biophilic/kids-room.png')!;
    const total = TIER_POINTS.primary + w.strong.length * TIER_POINTS.strong + w.hint.length * TIER_POINTS.hint;
    expect(total).toBeGreaterThan(TIER_POINTS.primary);
  });
});
