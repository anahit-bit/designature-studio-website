import React from 'react';
import { SITE_ORIGIN, type OgType } from '../lib/seo-defaults';

interface SeoHeadProps {
  title: string;
  description: string;
  /** Absolute URL or path. If omitted, derived from window.location at render time. */
  canonical?: string;
  ogImage?: string;
  ogType?: OgType;
}

/**
 * Renders per-route head tags. Relies on React 19's native hoisting of
 * <title>, <meta>, and <link> elements rendered inside components — no
 * external head-management library required.
 *
 * Each route mounts <SeoHead> at the top of its render tree. When the user
 * navigates between routes, React removes the previous instance's tags and
 * adds the new ones, so document.title and meta description stay in sync.
 */
const SeoHead: React.FC<SeoHeadProps> = ({
  title,
  description,
  canonical,
  ogImage,
  ogType = 'website',
}) => {
  const url = resolveCanonical(canonical);
  const image = ogImage;

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      {/* Open Graph — Facebook, LinkedIn, WhatsApp, Slack */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      {image && <meta property="og:image" content={image} />}
      <meta property="og:site_name" content="Designature Studio" />
      <meta property="og:locale" content="en_US" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {image && <meta name="twitter:image" content={image} />}
    </>
  );
};

function resolveCanonical(canonical?: string): string {
  if (canonical) {
    if (/^https?:\/\//i.test(canonical)) return canonical;
    const path = canonical.startsWith('/') ? canonical : `/${canonical}`;
    return `${SITE_ORIGIN}${path}`;
  }
  if (typeof window !== 'undefined' && window.location) {
    // In production, prefer the canonical origin so localhost / preview hosts
    // never leak into <link rel="canonical">.
    const { pathname } = window.location;
    return `${SITE_ORIGIN}${pathname}`;
  }
  return SITE_ORIGIN;
}

export default SeoHead;
