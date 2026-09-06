import { describe, it, expect } from 'vitest';
import {
  parseRoomStructure,
  renderSpatialConstraints,
  spatialMetrics,
  isSingleWallShot,
  type RoomStructure,
} from '../../services/aiVision/spatialAnalysis';

const mkStructure = (visibleWalls: any[]): RoomStructure => ({
  cameraView: 'x', visibleWalls, outOfFrameWalls: [], windows: [], doors: [], fixedFeatures: [], detectedRoom: null, summary: '',
});
import { buildGenerationPrompt } from '../../services/aiVision/promptTemplates';

describe('parseRoomStructure · AI-029 spatial grounding', () => {
  it('parses a well-formed structured JSON response', () => {
    const raw = JSON.stringify({
      cameraView: 'head-on facing the back wall',
      visibleWalls: ['back', 'floor'],
      outOfFrameWalls: ['left', 'right'],
      windows: [
        { wall: 'back', shape: 'arched', box: [0.34, 0.18, 0.58, 0.72], note: 'centered' },
      ],
      doors: [],
      fixedFeatures: [{ label: 'radiator', box: [0.36, 0.72, 0.56, 0.82] }],
      summary: 'Only the back wall is visible; do not add side walls.',
    });
    const s = parseRoomStructure(raw);
    expect(s).not.toBeNull();
    expect(s!.visibleWalls).toEqual(['back', 'floor']);
    expect(s!.outOfFrameWalls).toEqual(['left', 'right']);
    expect(s!.windows).toHaveLength(1);
    expect(s!.windows[0].shape).toBe('arched');
    expect(s!.fixedFeatures[0].label).toBe('radiator');
  });

  it('tolerates markdown ```json fences and surrounding prose', () => {
    const raw =
      'Here is the analysis:\n```json\n{"visibleWalls":["back"],"outOfFrameWalls":["left","right"],"windows":[],"doors":[],"fixedFeatures":[],"summary":"one wall"}\n```';
    const s = parseRoomStructure(raw);
    expect(s).not.toBeNull();
    expect(s!.visibleWalls).toEqual(['back']);
  });

  it('drops invalid surfaces and out-of-range boxes are clamped', () => {
    const raw = JSON.stringify({
      visibleWalls: ['back', 'ne-wall', 'floor'], // ne-wall invalid → dropped
      outOfFrameWalls: [],
      windows: [{ wall: 'back', shape: 'rectangular', box: [-0.2, 0.1, 1.4, 0.9] }],
      doors: [],
      fixedFeatures: [], detectedRoom: null,
      summary: 's',
    });
    const s = parseRoomStructure(raw);
    expect(s!.visibleWalls).toEqual(['back', 'floor']);
    expect(s!.windows[0].box).toEqual([0, 0.1, 1, 0.9]); // clamped to 0..1
  });

  it('drops windows with malformed boxes rather than crashing', () => {
    const raw = JSON.stringify({
      visibleWalls: ['back'],
      windows: [
        { wall: 'back', shape: 'rectangular', box: [0.1, 0.2] }, // too short → dropped
        { wall: 'back', shape: 'rectangular', box: [0.1, 0.2, 0.3, 0.4] },
      ],
      doors: [],
      fixedFeatures: [], detectedRoom: null,
      summary: 's',
    });
    const s = parseRoomStructure(raw);
    expect(s!.windows).toHaveLength(1);
  });

  it('returns null for non-JSON / empty / signal-less input', () => {
    expect(parseRoomStructure('')).toBeNull();
    expect(parseRoomStructure('the model refused to answer')).toBeNull();
    // Valid JSON but no usable spatial signal → treated as a miss.
    expect(
      parseRoomStructure(
        JSON.stringify({ visibleWalls: [], windows: [], doors: [], fixedFeatures: [], detectedRoom: null, summary: '' })
      )
    ).toBeNull();
  });
});

describe('renderSpatialConstraints · AI-029 positive constraints', () => {
  const bedroom: RoomStructure = {
    cameraView: 'head-on facing the back wall',
    visibleWalls: ['back', 'floor'],
    outOfFrameWalls: ['left', 'right'],
    windows: [{ wall: 'back', shape: 'arched', box: [0.34, 0.18, 0.58, 0.72] }],
    doors: [],
    fixedFeatures: [{ label: 'radiator', box: [0.36, 0.72, 0.56, 0.82] }],
    detectedRoom: 'bedroom',
    summary: 'Only the back wall is visible; do not add side walls.',
  };

  it('returns "" for a null structure (clean fallback)', () => {
    expect(renderSpatialConstraints(null)).toBe('');
  });

  it('emits the out-of-frame walls as an explicit do-NOT-invent instruction', () => {
    const out = renderSpatialConstraints(bedroom);
    expect(out).toContain('OUT OF FRAME');
    expect(out).toContain('left wall');
    expect(out).toContain('right wall');
    expect(out.toLowerCase()).toContain('do not enclose the room');
  });

  it('renders window position as a percentage box on the correct wall', () => {
    const out = renderSpatialConstraints(bedroom);
    expect(out).toContain('arched window on the back wall');
    expect(out).toContain('x:34%–58%'); // 0.34..0.58
    expect(out).toContain('y:18%–72%');
  });

  it('includes the preservation summary', () => {
    expect(renderSpatialConstraints(bedroom)).toContain('do not add side walls');
  });
});

describe('isSingleWallShot · AI-029 Phase 1.5 warning', () => {
  it('flags a head-on shot showing only the back wall', () => {
    expect(isSingleWallShot(mkStructure(['back', 'ceiling', 'floor']))).toBe(true);
  });
  it('does NOT flag when a side wall is visible', () => {
    expect(isSingleWallShot(mkStructure(['back', 'left', 'floor']))).toBe(false);
    expect(isSingleWallShot(mkStructure(['back', 'right', 'ceiling', 'floor']))).toBe(false);
  });
  it('does NOT flag when the back wall is not identified (ambiguous)', () => {
    expect(isSingleWallShot(mkStructure(['left', 'floor']))).toBe(false);
  });
  it('is conservative on missing/empty data', () => {
    expect(isSingleWallShot(null)).toBe(false);
    expect(isSingleWallShot(mkStructure([]))).toBe(false);
    expect(isSingleWallShot({ ...mkStructure([]), visibleWalls: undefined as any })).toBe(false);
  });
});

describe('spatialMetrics · AI-029 Phase 2 framing metrics', () => {
  it('derives width/height/margin fractions from the primary window', () => {
    const s: RoomStructure = {
      cameraView: 'head-on', visibleWalls: ['back'], outOfFrameWalls: ['left', 'right'],
      windows: [{ wall: 'back', shape: 'rectangular', box: [0.22, 0.25, 0.78, 0.6] }],
      doors: [], fixedFeatures: [], detectedRoom: null, summary: '',
    };
    const m = spatialMetrics(s)!;
    expect(m.windowWidthFrac).toBeCloseTo(0.56, 5);
    expect(m.windowHeightFrac).toBeCloseTo(0.35, 5);
    expect(m.leftMarginFrac).toBeCloseTo(0.22, 5);
    expect(m.rightMarginFrac).toBeCloseTo(0.22, 5);
  });

  it('picks the largest window when several are present', () => {
    const s: RoomStructure = {
      cameraView: 'angled', visibleWalls: ['back', 'right'], outOfFrameWalls: [],
      windows: [
        { wall: 'right', shape: 'rectangular', box: [0.9, 0.4, 0.95, 0.5] }, // tiny
        { wall: 'back', shape: 'rectangular', box: [0.3, 0.2, 0.7, 0.6] }, // largest
      ],
      doors: [], fixedFeatures: [], detectedRoom: null, summary: '',
    };
    expect(spatialMetrics(s)!.windowWidthFrac).toBeCloseTo(0.4, 5);
  });

  it('returns null when there is no window', () => {
    expect(spatialMetrics({ cameraView: 'x', visibleWalls: ['back'], outOfFrameWalls: [], windows: [], doors: [], fixedFeatures: [], detectedRoom: null, summary: '' })).toBeNull();
    expect(spatialMetrics(null)).toBeNull();
  });

  it('renderSpatialConstraints emits a FRAMING & SCALE anti-widening line', () => {
    const s: RoomStructure = {
      cameraView: 'head-on', visibleWalls: ['back'], outOfFrameWalls: ['left', 'right'],
      windows: [{ wall: 'back', shape: 'rectangular', box: [0.22, 0.25, 0.78, 0.6] }],
      doors: [], fixedFeatures: [], detectedRoom: null, summary: '',
    };
    const out = renderSpatialConstraints(s);
    expect(out).toContain('FRAMING & SCALE');
    expect(out).toContain('56% of the image width');
    expect(out.toLowerCase()).toContain('do not widen the room');
  });
});

describe('buildGenerationPrompt · AI-029 injection', () => {
  it('injects the spatial constraints block when provided', () => {
    const constraints = 'MEASURED ARCHITECTURE OF THIS EXACT ROOM — keep the window at x:30%–60%.';
    const prompt = buildGenerationPrompt({ styleBrief: 'warm minimal', spatialConstraints: constraints });
    expect(prompt).toContain(constraints);
    // The measured room comes first, ahead of every generic rule: it is the
    // only part of the prompt that describes THIS photograph.
    expect(prompt.indexOf(constraints)).toBeLessThan(prompt.indexOf('STEP 1 — CLEAR THE ROOM'));
  });

  it('omits the block cleanly when no constraints are supplied', () => {
    const prompt = buildGenerationPrompt({ styleBrief: 'warm minimal' });
    expect(prompt).toContain('STEP 2 — THE ARCHITECTURE IS FIXED');
    expect(prompt).not.toContain('MEASURED ARCHITECTURE');
  });

  it('treats an empty/whitespace constraints string as absent', () => {
    const prompt = buildGenerationPrompt({ styleBrief: 'warm minimal', spatialConstraints: '   ' });
    expect(prompt).not.toContain('MEASURED ARCHITECTURE');
  });
});
