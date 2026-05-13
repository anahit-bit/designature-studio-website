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
  /**
   * Cloudinary quality. String presets ('eco' | 'good' | 'best') map to
   * `q_auto:<preset>`; a number 1-100 maps to a fixed `q_<n>` value.
   * Use the number form when you want maximum control / minimum compression
   * (e.g. quality: 100 for a hero photo at large display size).
   */
  quality?: 'eco' | 'good' | 'best' | number;
  /** Required when crop='fill'. e.g. '4:5' or '4/5'. */
  aspectRatio?: string;
  /**
   * Run Cloudinary's AI upscaler on the source before resizing. For small
   * source images (AI-generated renders are often ~900px wide) this recovers
   * detail that would otherwise be lost when stretching into a larger frame.
   * Costs more credits per delivery but file size stays reasonable because
   * the upscale runs as a separate transform chain before the c_fill resize.
   */
  enhance?: boolean;
  /**
   * Mild sharpening applied at the end of the chain (0-2000). Useful for
   * thumbnails and any image where source quality is the bottleneck.
   */
  sharpen?: number;
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
  // Numeric quality → fixed q_<n>; string preset → q_auto:<preset>.
  const qToken = typeof quality === 'number' ? `q_${quality}` : `q_auto:${quality}`;
  const tx: string[] = [`f_auto`, qToken];

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

  if (opts.sharpen) tx.push(`e_sharpen:${opts.sharpen}`);

  // e_upscale runs as its own chain step BEFORE the main resize transforms.
  // Chained as a separate segment via '/', not joined with commas, so Cloudinary
  // applies AI upscale to the source first and then downsamples to the target.
  const transforms = (opts.enhance ? 'e_upscale/' : '') + tx.join(',');

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
