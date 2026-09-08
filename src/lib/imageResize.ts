/**
 * Client-side image downscaling for uploads.
 *
 * Every AI tool sends its photo to the server as a base64 data URL inside JSON,
 * which inflates the bytes by ~33%. A modern phone photo is 4-8 MB, so a single
 * upload was a 5-11 MB request — and the room photo is sent more than once
 * (structure pre-check, then generation).
 *
 * None of that resolution survives. The staging engine resizes the source to a
 * 1216px long edge before it ever reaches the model, and spatial analysis works
 * at 1024px. Everything above MAX_EDGE is uploaded, parsed, and thrown away.
 *
 * So we shrink before encoding. At 1600px the longest edge still has headroom
 * over every server-side limit, and the payload drops by roughly 10x.
 */

/** Long-edge cap. Above every server-side limit, with room to spare. */
export const MAX_EDGE = 1600;

/** JPEG quality for re-encoded uploads. */
export const QUALITY = 0.85;

/**
 * Files at or under this size are passed through untouched. Re-encoding a small
 * photo costs a little quality and saves nothing worth having.
 */
export const PASSTHROUGH_BYTES = 600 * 1024;

/**
 * Above this, re-encode to JPEG even when the pixel dimensions already fit.
 * A 2 MB PNG screenshot at 1500px needs no resizing but is still a terrible way
 * to send a photograph — it re-encodes to ~200 KB with no visible loss.
 */
export const RECODE_BYTES = 1200 * 1024;

/**
 * Scale (w, h) to fit inside a `max` box, preserving aspect ratio. Never
 * upscales — a 900px photo stays 900px. Pure, so the maths is testable without
 * a canvas.
 */
export function fitWithin(
  width: number,
  height: number,
  max: number = MAX_EDGE
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= max || longest === 0) return { width, height };
  const scale = max / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** Read a File as a data URL, unchanged. The fallback path and the small-file path. */
function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Decode a file to a bitmap with EXIF rotation already applied.
 *
 * Phone photos are commonly stored landscape with an orientation flag, and
 * drawing one to a canvas without honouring that flag silently rotates the
 * room. `createImageBitmap` handles it natively; the <img> fallback gets it
 * right in every current browser, which applies EXIF when decoding.
 */
async function decode(file: Blob): Promise<{
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
}> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close?.(),
      };
    } catch {
      /* fall through to the <img> path */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('image decode failed'));
      el.src = url;
    });
    return {
      source: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    };
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
}

/**
 * Read an image file as a data URL, downscaled to `maxEdge` if it is larger.
 *
 * NEVER throws: on any failure — no canvas, a codec the browser will not decode,
 * a blocked toDataURL — it falls back to the original bytes. A slower upload is
 * always better than an upload that doesn't happen.
 */
export async function fileToResizedDataUrl(
  file: File | Blob,
  maxEdge: number = MAX_EDGE,
  quality: number = QUALITY
): Promise<string> {
  // Small files are already cheap; re-encoding would only cost quality.
  if (file.size > 0 && file.size <= PASSTHROUGH_BYTES) {
    return readAsDataUrl(file);
  }

  let decoded: Awaited<ReturnType<typeof decode>> | null = null;
  try {
    decoded = await decode(file);
    const { width, height } = fitWithin(decoded.width, decoded.height, maxEdge);

    // Within bounds AND reasonably sized — keep the original bytes. An oversized
    // file falls through to re-encoding even at its native size, which is what
    // turns a 2 MB PNG into a ~200 KB JPEG.
    const needsResize = width !== decoded.width || height !== decoded.height;
    if (!needsResize && file.size <= RECODE_BYTES) {
      return await readAsDataUrl(file);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return await readAsDataUrl(file);
    // JPEG has no alpha: paint white first so a transparent PNG does not come
    // through with a black background.
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(decoded.source, 0, 0, width, height);

    const out = canvas.toDataURL('image/jpeg', quality);
    // A canvas tainted or otherwise unhappy yields a stub; don't ship that.
    if (!out || out.length < 64) return await readAsDataUrl(file);
    return out;
  } catch {
    return readAsDataUrl(file);
  } finally {
    decoded?.release();
  }
}
