import { describe, it, expect, afterEach } from 'vitest';
import {
  pickOpenAISize,
  buildOpenAIPrompt,
  isOpenAIImageAvailable,
  openAIImageModel,
} from '../../services/aiVision/openaiImage';

// The output size is the one thing that decides whether the customer's room
// comes back in its own proportions or gets cropped/letterboxed into a preset.

const rules = (size: string) => {
  const [w, h] = size.split('x').map(Number);
  expect(w % 16).toBe(0);
  expect(h % 16).toBe(0);
  const aspect = w / h;
  expect(aspect).toBeGreaterThanOrEqual(1 / 3);
  expect(aspect).toBeLessThanOrEqual(3);
  expect(w * h).toBeGreaterThanOrEqual(655_360);
  expect(w * h).toBeLessThanOrEqual(8_294_400);
  return { w, h, aspect };
};

describe('pickOpenAISize · custom size follows the source aspect', () => {
  it('landscape 3:2 keeps the long edge at 1536 and the same proportion', () => {
    const { w, h, aspect } = rules(pickOpenAISize(1.5));
    expect(w).toBe(1536);
    expect(h).toBe(1024);
    expect(Math.abs(aspect - 1.5)).toBeLessThan(0.02);
  });

  it('portrait phone shot (9:16) comes back portrait, not rotated or cropped', () => {
    const { w, h, aspect } = rules(pickOpenAISize(9 / 16));
    expect(h).toBe(1536);
    expect(w).toBeLessThan(h);
    expect(Math.abs(aspect - 9 / 16)).toBeLessThan(0.02);
  });

  it('square stays square', () => {
    const { w, h } = rules(pickOpenAISize(1));
    expect(w).toBe(h);
  });

  it('every ratio in the API window satisfies the documented constraints', () => {
    for (let a = 0.3; a <= 3.4; a += 0.07) rules(pickOpenAISize(a));
  });

  it('nonsense aspects fall back to square instead of throwing', () => {
    expect(pickOpenAISize(NaN)).toBe(pickOpenAISize(1));
    expect(pickOpenAISize(0)).toBe(pickOpenAISize(1));
    expect(pickOpenAISize(-2)).toBe(pickOpenAISize(1));
  });

  it('preset mode snaps to the three fixed sizes (the retry path)', () => {
    expect(pickOpenAISize(1.78, true)).toBe('1536x1024');
    expect(pickOpenAISize(0.56, true)).toBe('1024x1536');
    expect(pickOpenAISize(1.0, true)).toBe('1024x1024');
  });
});

describe('buildOpenAIPrompt · prompt shape is switchable per run', () => {
  const saved = process.env.OPENAI_IMAGE_PROMPT;
  afterEach(() => {
    if (saved === undefined) delete process.env.OPENAI_IMAGE_PROMPT;
    else process.env.OPENAI_IMAGE_PROMPT = saved;
  });

  const input = {
    roomPhoto: { data: 'x', mimeType: 'image/jpeg' },
    styleBrief: '1. COLOR PALETTE: warm oak, linen white, clay. 2. MATERIALS: oak, boucle.',
    roomType: 'bedroom' as const,
    spatialConstraints: 'SPATIAL CONSTRAINTS: window at x:30%–60%',
  };

  it('defaults to the FULL production prompt with the coordinate constraints — the owner-chosen shape', () => {
    delete process.env.OPENAI_IMAGE_PROMPT;
    const p = buildOpenAIPrompt(input);
    expect(p).toContain('SPATIAL CONSTRAINTS');
    expect(p.split(/\s+/).length).toBeGreaterThan(200);
  });

  it('OPENAI_IMAGE_PROMPT=short (or promptMode) sends the ~110-word edit instruction', () => {
    process.env.OPENAI_IMAGE_PROMPT = 'short';
    const p = buildOpenAIPrompt(input);
    expect(p).toMatch(/Furnish this exact room/);
    expect(p).not.toContain('SPATIAL CONSTRAINTS');
    expect(p.split(/\s+/).length).toBeLessThan(200);
    delete process.env.OPENAI_IMAGE_PROMPT;
    expect(buildOpenAIPrompt({ ...input, promptMode: 'short' })).toMatch(/Furnish this exact room/);
  });
});

describe('availability + model knobs', () => {
  const savedKey = process.env.OPENAI_API_KEY;
  const savedModel = process.env.OPENAI_IMAGE_MODEL;
  afterEach(() => {
    if (savedKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = savedKey;
    if (savedModel === undefined) delete process.env.OPENAI_IMAGE_MODEL;
    else process.env.OPENAI_IMAGE_MODEL = savedModel;
  });

  it('is unavailable on a missing or blank key', () => {
    delete process.env.OPENAI_API_KEY;
    expect(isOpenAIImageAvailable()).toBe(false);
    process.env.OPENAI_API_KEY = '   ';
    expect(isOpenAIImageAvailable()).toBe(false);
    process.env.OPENAI_API_KEY = 'sk-test';
    expect(isOpenAIImageAvailable()).toBe(true);
  });

  it('defaults to the precision-editing model and honours the override', () => {
    delete process.env.OPENAI_IMAGE_MODEL;
    expect(openAIImageModel()).toBe('gpt-image-2.5-sunburst');
    process.env.OPENAI_IMAGE_MODEL = 'gpt-image-2.5-flare';
    expect(openAIImageModel()).toBe('gpt-image-2.5-flare');
  });
});
