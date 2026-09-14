import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// The engine router decides which model sees a customer's photo, and the wrong
// branch is invisible in the response — a Gemini fallback returns an image just
// like a GPT Image success does. These tests pin the routing so a silent
// regression to the fallback engine can't ship, and so cost lands in the right
// bucket (server.ts bills openai vs gemini off the returned `engine`).

const openaiMock = vi.fn();
const openaiAvailableMock = vi.fn();
const geminiMock = vi.fn();

vi.mock('../../services/aiVision/openaiImage.js', () => ({
  generateConceptImageOpenAI: (...a: unknown[]) => openaiMock(...a),
  isOpenAIImageAvailable: () => openaiAvailableMock(),
}));
vi.mock('../../services/aiVision/imageGeneration.js', () => ({
  generateConceptImage: (...a: unknown[]) => geminiMock(...a),
}));

const { generateConcept } = await import('../../services/aiVision/generateConcept');

const INPUT = {
  roomPhoto: { data: 'x', mimeType: 'image/jpeg' },
  styleBrief: 'brief',
  spatialConstraints: 'SPATIAL',
  sourceStructure: { summary: 's' },
  accent: { name: 'Brushed Brass', hex: '#B08D57', role: 'accent' },
} as any;

describe('generateConcept · engine routing', () => {
  const originalEnv = process.env.AI_VISION_ENGINE;

  beforeEach(() => {
    openaiMock.mockReset().mockResolvedValue('data:image/png;base64,OPENAI');
    openaiAvailableMock.mockReset().mockReturnValue(true);
    geminiMock.mockReset().mockResolvedValue('data:image/png;base64,GEMINI');
    delete process.env.AI_VISION_ENGINE;
  });
  afterEach(() => {
    if (originalEnv === undefined) delete process.env.AI_VISION_ENGINE;
    else process.env.AI_VISION_ENGINE = originalEnv;
  });

  it('defaults to GPT Image — the owner-reviewed winner of the ten-room comparison', async () => {
    const r = await generateConcept(INPUT);
    expect(r.engine).toBe('openai');
    expect(r.url).toContain('OPENAI');
    expect(geminiMock).not.toHaveBeenCalled();
  });

  it('hands GPT Image the full production inputs — constraints, structure and accent', async () => {
    await generateConcept(INPUT);
    const arg = openaiMock.mock.calls[0][0];
    expect(arg.spatialConstraints).toBe('SPATIAL');
    expect(arg.sourceStructure).toEqual({ summary: 's' });
    expect(arg.accent.name).toBe('Brushed Brass');
  });

  it('AI_VISION_ENGINE=gemini forces the fallback engine — the production escape hatch', async () => {
    process.env.AI_VISION_ENGINE = 'gemini';
    const r = await generateConcept(INPUT);
    expect(r.engine).toBe('gemini');
    expect(openaiMock).not.toHaveBeenCalled();
  });

  it('falls back to Gemini when OPENAI_API_KEY is missing, rather than failing the request', async () => {
    openaiAvailableMock.mockReturnValue(false);
    const r = await generateConcept(INPUT);
    expect(r.engine).toBe('gemini');
    expect(openaiMock).not.toHaveBeenCalled();
  });

  it('falls back to Gemini when GPT Image throws', async () => {
    openaiMock.mockRejectedValue(new Error('openai exploded'));
    const r = await generateConcept(INPUT);
    expect(r.engine).toBe('gemini');
    expect(geminiMock).toHaveBeenCalledOnce();
  });

  it('reports the engine that actually ran, so cost is attributed correctly', async () => {
    openaiMock.mockRejectedValue(new Error('down'));
    expect((await generateConcept(INPUT)).engine).toBe('gemini');
    openaiMock.mockReset().mockResolvedValue('data:image/png;base64,OPENAI');
    expect((await generateConcept(INPUT)).engine).toBe('openai');
  });

  it('no engine value other than openai/gemini can come back — fal staging is gone', async () => {
    process.env.AI_VISION_ENGINE = 'staging';
    const r = await generateConcept(INPUT);
    expect(['openai', 'gemini']).toContain(r.engine);
    expect(r.engine).toBe('openai');
  });
});
