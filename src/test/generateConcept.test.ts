import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// The engine router decides which model sees a customer's photo, and the wrong
// branch is invisible in the response — a Gemini fallback returns an image just
// like a staging success does. These tests pin the routing so a silent
// regression to the weaker engine can't ship.

const stagingMock = vi.fn();
const geminiMock = vi.fn();
const availableMock = vi.fn();

vi.mock('../../services/aiVision/virtualStaging.js', () => ({
  generateConceptImageStaging: (...a: unknown[]) => stagingMock(...a),
  isStagingAvailable: () => availableMock(),
}));
vi.mock('../../services/aiVision/imageGeneration.js', () => ({
  generateConceptImage: (...a: unknown[]) => geminiMock(...a),
}));

const { generateConcept } = await import('../../services/aiVision/generateConcept');

const INPUT = {
  roomPhoto: { data: 'x', mimeType: 'image/jpeg' },
  styleBrief: 'brief',
} as any;

describe('generateConcept · engine routing', () => {
  const originalEnv = process.env.AI_VISION_ENGINE;

  beforeEach(() => {
    stagingMock.mockReset().mockResolvedValue('data:image/png;base64,STAGED');
    geminiMock.mockReset().mockResolvedValue('data:image/png;base64,GEMINI');
    availableMock.mockReset().mockReturnValue(true);
    delete process.env.AI_VISION_ENGINE;
  });
  afterEach(() => {
    if (originalEnv === undefined) delete process.env.AI_VISION_ENGINE;
    else process.env.AI_VISION_ENGINE = originalEnv;
  });

  it('defaults to staging — it does roughly half the architectural damage on real rooms', async () => {
    const r = await generateConcept(INPUT);
    expect(r.engine).toBe('staging');
    expect(r.url).toContain('STAGED');
    expect(geminiMock).not.toHaveBeenCalled();
  });

  it('AI_VISION_ENGINE=gemini forces the old engine — the production escape hatch', async () => {
    process.env.AI_VISION_ENGINE = 'gemini';
    const r = await generateConcept(INPUT);
    expect(r.engine).toBe('gemini');
    expect(stagingMock).not.toHaveBeenCalled();
  });

  it('falls back to Gemini when FAL_KEY is missing, rather than failing the request', async () => {
    availableMock.mockReturnValue(false);
    const r = await generateConcept(INPUT);
    expect(r.engine).toBe('gemini');
    expect(stagingMock).not.toHaveBeenCalled();
  });

  it('falls back to Gemini when staging throws', async () => {
    stagingMock.mockRejectedValue(new Error('fal exploded'));
    const r = await generateConcept(INPUT);
    expect(r.engine).toBe('gemini');
    expect(geminiMock).toHaveBeenCalledOnce();
  });

  it('reports the engine that actually ran, so cost is attributed correctly', async () => {
    // server.ts bills fal vs gemini off this field; a wrong value mis-bills silently.
    stagingMock.mockRejectedValue(new Error('down'));
    expect((await generateConcept(INPUT)).engine).toBe('gemini');
    stagingMock.mockReset().mockResolvedValue('data:image/png;base64,STAGED');
    expect((await generateConcept(INPUT)).engine).toBe('staging');
  });
});
