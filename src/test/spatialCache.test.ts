import { describe, it, expect, beforeEach } from 'vitest';
import { getOrAnalyzeStructure, _resetSpatialCacheForTests } from '../../services/aiVision/spatialCache';
import type { RoomStructure } from '../../services/aiVision/spatialAnalysis';

// The app measures a photo on upload, on room-type change and on generate. On
// 2026-09-15 those three landed inside six seconds, each ran its own analysis,
// and the generate route used a reading that had invented a basin. One photo
// must mean one analysis, whatever the request timing.

const photo = { data: 'AAAA', mimeType: 'image/jpeg' };
const structure = { summary: 'one' } as unknown as RoomStructure;

const deferred = () => {
  let resolve!: (v: RoomStructure | null) => void;
  const promise = new Promise<RoomStructure | null>((r) => (resolve = r));
  return { promise, resolve };
};

describe('getOrAnalyzeStructure', () => {
  beforeEach(() => _resetSpatialCacheForTests());

  it('runs the analyser once for concurrent requests on the same photo, and bills once', async () => {
    let calls = 0;
    const d = deferred();
    const analyzer = async () => { calls++; return d.promise; };
    const p1 = getOrAnalyzeStructure(photo, analyzer);
    const p2 = getOrAnalyzeStructure(photo, analyzer);
    const p3 = getOrAnalyzeStructure(photo, analyzer);
    d.resolve(structure);
    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);
    expect(calls).toBe(1);
    expect([r1.fresh, r2.fresh, r3.fresh].filter(Boolean)).toHaveLength(1);
    expect(r1.structure).toBe(structure);
    expect(r2.structure).toBe(structure);
    expect(r3.structure).toBe(structure);
  });

  it('serves the cache afterwards without calling the analyser', async () => {
    let calls = 0;
    const analyzer = async () => { calls++; return structure; };
    await getOrAnalyzeStructure(photo, analyzer);
    const again = await getOrAnalyzeStructure(photo, analyzer);
    expect(calls).toBe(1);
    expect(again.fresh).toBe(false);
    expect(again.structure).toBe(structure);
  });

  it('does not cache a failed analysis, so the next request may try again', async () => {
    let calls = 0;
    const analyzer = async () => { calls++; return calls === 1 ? null : structure; };
    expect((await getOrAnalyzeStructure(photo, analyzer)).structure).toBeNull();
    expect((await getOrAnalyzeStructure(photo, analyzer)).structure).toBe(structure);
    expect(calls).toBe(2);
  });

  it('keys by photo bytes — a different photo gets its own analysis', async () => {
    let calls = 0;
    const analyzer = async () => { calls++; return structure; };
    await getOrAnalyzeStructure(photo, analyzer);
    await getOrAnalyzeStructure({ data: 'BBBB', mimeType: 'image/jpeg' }, analyzer);
    expect(calls).toBe(2);
  });

  it('clears the in-flight slot when the analyser throws', async () => {
    let calls = 0;
    const analyzer = async () => { calls++; if (calls === 1) throw new Error('boom'); return structure; };
    await expect(getOrAnalyzeStructure(photo, analyzer)).rejects.toThrow('boom');
    expect((await getOrAnalyzeStructure(photo, analyzer)).structure).toBe(structure);
  });
});
