/**
 * Cloudinary URL helper.
 *
 * Most images on the site are stored on Cloudinary and referenced as full
 * URLs scattered across components and Sanity content. This helper takes
 * either a full Cloudinary URL or a bare public ID and rebuilds it with
 * the transformations we want — `f_auto` (AVIF/WebP negotiation),
 * `q_auto` (intelligent quality), and a target width.
 *
 * Any pre-existing transform segment between `/upload/` and the version /
 * public id is stripped, so calling cld() on an already-transformed URL
 * is safe and produces a single canonical transform.
 *
 * Non-Cloudinary URLs (Unsplash placeholders, Google favicons, base64
 * data URLs, blob URLs) pass through unchanged.
 */

export const CLOUD_NAME = 'dys2k5muv';
const BASE = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload`;

export interface CldOpts {
  /**
   * 'limit' (default) — preserve aspect ratio, just cap width.
   * 'fill'  — server-side crop to the requested ratio (needs aspectRatio).
   */
  crop?: 'limit' | 'fill';
  /** Cloudinary q_auto preset. */
  quality?: 'eco' | 'good' | 'best';
  /** Required when crop='fill'. e.g. '4:5' or '4/5'. */
  aspectRatio?: string;
}

/** Default responsive width ladder. */
export const DEFAULT_WIDTHS = [390, 768, 1024, 1440, 1920];
/** Smaller ladder for grid cards (3-up at 1440 = 480px slot, 2x DPR). */
export const CARD_WIDTHS = [320, 480, 640, 960];
/** Tiny ladder for thumbnails (chips, before/after strip). */
export const THUMB_WIDTHS = [240, 360, 480];

/**
 * Build a single Cloudinary delivery URL.
 * Pass-through for non-Cloudinary inputs.
 */
export function cld(srcOrId: string, width: number, opts: CldOpts = {}): string {
  if (!srcOrId) return srcOrId;
  if (srcOrId.startsWith('data:') || srcOrId.startsWith('blob:')) return srcOrId;

  const isHttp = /^https?:/i.test(srcOrId);
  const isCloudinary = srcOrId.includes('res.cloudinary.com');
  if (isHttp && !isCloudinary) return srcOrId;

  // Cloudinary serves SVG raw; transforms can rasterize it. Skip.
  if (/\.svg(\?|$)/i.test(srcOrId)) return srcOrId;

  const quality = opts.quality ?? 'good';
  const crop = opts.crop ?? 'limit';
  const tx: string[] = [`f_auto`, `q_auto:${quality}`];

  if (crop === 'fill') {
    tx.push('c_fill', 'g_auto', `w_${width}`);
    if (opts.aspectRatio) {
      const [aw, ah] = opts.aspectRatio.split(/[:/]/).map(Number);
      if (aw > 0 && ah > 0) {
        tx.push(`h_${Math.round((width * ah) / aw)}`);
      }
    }
  } else {
    tx.push('c_limit', `w_${width}`);
  }

  const transforms = tx.join(',');

  if (isCloudinary) {
    const m = srcOrId.match(/^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)$/i);
    if (!m) return srcOrId;
    const after = m[2];
    const segments = after.split('/');

    // Skip any leading transform segments. A transform segment is one that
    // contains a comma or matches Cloudinary's `<letter>_<value>` pattern,
    // EXCEPT for version segments like `v1234567`.
    let idx = 0;
    while (idx < segments.length - 1) {
      const seg = segments[idx];
      if (/^v\d+$/.test(seg)) break;
      const looksLikeTransform = seg.includes(',') || /^[a-z]_[^/]+$/i.test(seg);
      if (!looksLikeTransform) break;
      idx++;
    }
    const rest = segments.slice(idx).join('/');
    return `${m[1]}${transforms}/${rest}`;
  }

  // Bare public ID
  return `${BASE}/${transforms}/${srcOrId.replace(/^\/+/, '')}`;
}

/** Build a srcset string at the given widths. */
export function cldSrcSet(srcOrId: string, widths: number[] = DEFAULT_WIDTHS, opts: CldOpts = {}): string {
  if (!srcOrId) return '';
  if (srcOrId.startsWith('data:') || srcOrId.startsWith('blob:')) return '';
  if (/^https?:/i.test(srcOrId) && !srcOrId.includes('res.cloudinary.com')) return '';
  if (/\.svg(\?|$)/i.test(srcOrId)) return '';
  return widths.map((w) => `${cld(srcOrId, w, opts)} ${w}w`).join(', ');
}

/** Convenience used by index.html-side preload links and tests. */
export function cldImagesrcset(srcOrId: string, widths: number[] = DEFAULT_WIDTHS, opts: CldOpts = {}): string {
  return cldSrcSet(srcOrId, widths, opts);
}
