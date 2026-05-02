/**
 * ResponsiveImage — drop-in <img> wrapper that emits a Cloudinary srcset,
 * proper sizes hint, lazy/eager loading, fetchpriority, and a width/height
 * derived from `aspectRatio` so the browser reserves space immediately
 * (zero CLS).
 *
 * Use this everywhere a display image appears. For locked AI Studio
 * layouts where the JSX must not change, call `cld()` / `cldSrcSet()`
 * on the existing <img> directly instead of swapping it for this.
 */
import React from 'react';
import { cld, cldSrcSet, CldOpts, DEFAULT_WIDTHS } from '../lib/cld';

interface Props {
  /** Cloudinary URL or bare public ID. */
  src: string;
  alt: string;
  /** CSS sizes attribute. e.g. "(min-width:1024px) 33vw, (min-width:768px) 50vw, 100vw". */
  sizes?: string;
  /** "16/9", "4/5", "1/1", "4/3", "3/4", etc. */
  aspectRatio?: string;
  /** Above-fold / LCP candidate? Eager-loads + high fetchpriority. */
  priority?: boolean;
  /** Defaults to 'limit' (preserve aspect, just downscale). */
  crop?: CldOpts['crop'];
  /** Width ladder for srcset. */
  widths?: number[];
  /** Default width attribute. Used for layout reservation, not actual size. */
  baseWidth?: number;
  className?: string;
  style?: React.CSSProperties;
  onLoad?: React.ReactEventHandler<HTMLImageElement>;
  onError?: React.ReactEventHandler<HTMLImageElement>;
  /** Pass-through HTML attributes that some call sites need. */
  draggable?: boolean;
  title?: string;
}

const DEFAULT_BASE_WIDTH = 768;

const ResponsiveImage: React.FC<Props> = ({
  src,
  alt,
  sizes = '100vw',
  aspectRatio,
  priority = false,
  crop = 'limit',
  widths = DEFAULT_WIDTHS,
  baseWidth = DEFAULT_BASE_WIDTH,
  className,
  style,
  onLoad,
  onError,
  draggable,
  title,
}) => {
  if (!src) return null;

  const opts: CldOpts = { crop };
  if (crop === 'fill' && aspectRatio) opts.aspectRatio = aspectRatio;

  const sortedWidths = [...widths].sort((a, b) => a - b);
  const ladderBase =
    sortedWidths.find((w) => w >= baseWidth) ?? sortedWidths[sortedWidths.length - 1];

  const transformedSrc = cld(src, ladderBase, opts);
  const srcSet = cldSrcSet(src, sortedWidths, opts);

  // Width/height attributes give the browser an aspect ratio to reserve
  // before any CSS or image bytes arrive. Numbers are arbitrary — only the
  // ratio matters.
  let widthAttr: number | undefined;
  let heightAttr: number | undefined;
  if (aspectRatio) {
    const [aw, ah] = aspectRatio.split(/[:/]/).map(Number);
    if (aw > 0 && ah > 0) {
      widthAttr = aw * 100;
      heightAttr = ah * 100;
    }
  }

  // Combine an aspect-ratio CSS hint into the inline style so a flex /
  // absolute parent that doesn't reserve space still gets one.
  const mergedStyle: React.CSSProperties = aspectRatio
    ? { aspectRatio: aspectRatio.replace(':', ' / '), ...style }
    : { ...style };

  return (
    <img
      src={transformedSrc}
      srcSet={srcSet || undefined}
      sizes={sizes}
      alt={alt}
      title={title}
      width={widthAttr}
      height={heightAttr}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      draggable={draggable}
      className={className}
      style={mergedStyle}
      onLoad={onLoad}
      onError={onError}
    />
  );
};

export default ResponsiveImage;
