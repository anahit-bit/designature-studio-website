import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fitWithin,
  fileToResizedDataUrl,
  MAX_EDGE,
  PASSTHROUGH_BYTES,
  RECODE_BYTES,
} from '../lib/imageResize';

describe('fitWithin', () => {
  it('leaves an image that already fits alone', () => {
    expect(fitWithin(1200, 900, 1600)).toEqual({ width: 1200, height: 900 });
  });

  it('never upscales — a small photo stays small', () => {
    expect(fitWithin(400, 300, 1600)).toEqual({ width: 400, height: 300 });
  });

  it('scales a landscape phone photo by its long edge', () => {
    // 4032x3024 is the standard iPhone still.
    expect(fitWithin(4032, 3024, 1600)).toEqual({ width: 1600, height: 1200 });
  });

  it('scales a portrait photo by its long edge, not its width', () => {
    expect(fitWithin(3024, 4032, 1600)).toEqual({ width: 1200, height: 1600 });
  });

  it('preserves aspect ratio to within a rounded pixel', () => {
    const src = { w: 4032, h: 3024 };
    const out = fitWithin(src.w, src.h, MAX_EDGE);
    expect(Math.abs(out.width / out.height - src.w / src.h)).toBeLessThan(0.01);
  });

  it('keeps a degenerate size from collapsing to zero', () => {
    expect(fitWithin(3000, 1, 1600).height).toBeGreaterThanOrEqual(1);
  });

  it('handles a zero-size image without dividing by zero', () => {
    expect(fitWithin(0, 0, 1600)).toEqual({ width: 0, height: 0 });
  });
});

describe('fileToResizedDataUrl', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  function blobOfSize(bytes: number): Blob {
    // A Blob whose reported size drives the passthrough decision.
    return new Blob([new Uint8Array(bytes)], { type: 'image/jpeg' });
  }

  it('passes a small file straight through without touching the canvas', async () => {
    const decode = vi.fn();
    vi.stubGlobal('createImageBitmap', decode);
    const out = await fileToResizedDataUrl(blobOfSize(1024));
    expect(out.startsWith('data:')).toBe(true);
    // Under the threshold, so it must not have tried to decode or re-encode.
    expect(decode).not.toHaveBeenCalled();
  });

  it('never throws when decoding fails — a slow upload beats no upload', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('nope')));
    vi.stubGlobal('URL', {
      createObjectURL: () => 'blob:x',
      revokeObjectURL: () => {},
    });
    const out = await fileToResizedDataUrl(blobOfSize(PASSTHROUGH_BYTES + 1));
    // Falls back to the original bytes rather than rejecting.
    expect(out.startsWith('data:')).toBe(true);
  });

  it('re-encodes an oversized file even when its dimensions already fit', async () => {
    // The PNG case: 1500px is under MAX_EDGE so no resize is needed, but a 2 MB
    // PNG is still a terrible way to send a photograph. Measured on the owner's
    // own files, this is the difference between 0% and ~92% saved.
    const decode = vi
      .fn()
      .mockResolvedValue({ width: 1500, height: 1000, close: () => {} });
    vi.stubGlobal('createImageBitmap', decode);
    await fileToResizedDataUrl(blobOfSize(RECODE_BYTES + 1));
    expect(decode).toHaveBeenCalled();
  });

  it('leaves a mid-sized file that already fits completely alone', async () => {
    const decode = vi
      .fn()
      .mockResolvedValue({ width: 1500, height: 1000, close: () => {} });
    vi.stubGlobal('createImageBitmap', decode);
    const spy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext');
    await fileToResizedDataUrl(blobOfSize(RECODE_BYTES - 1));
    // Decoded to learn its size, but never re-encoded.
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('falls back to the original when the canvas has no 2d context', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValue({ width: 4000, height: 3000, close: () => {} }),
    );
    const spy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(null as unknown as CanvasRenderingContext2D);
    const out = await fileToResizedDataUrl(blobOfSize(PASSTHROUGH_BYTES + 1));
    expect(out.startsWith('data:')).toBe(true);
    spy.mockRestore();
  });
});
