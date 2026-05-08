/**
 * Single source of truth for per-route SEO metadata.
 *
 * Titles ≤60 chars, descriptions ≤160 chars. Yerevan never appears in titles —
 * only in descriptions on studio-service routes. AI-product routes carry zero
 * location signal. See WEBSITE-PLAN-S007-SEO-spec.md for the full rationale.
 *
 * Used by:
 *   - <SeoHead> on each route
 *   - scripts/build-sitemap.ts (route paths)
 *   - server-side meta injection (Phase 2 / S-019)
 */

export const SITE_ORIGIN = 'https://www.designature.studio';
export const DEFAULT_OG_IMAGE =
  'https://res.cloudinary.com/dys2k5muv/image/upload/v1772532381/1_h9ofqr.jpg';

export type OgType = 'website' | 'article';

export interface RouteSeo {
  /** URL path without origin, leading slash. Used for canonical + sitemap. */
  path: string;
  title: string;
  description: string;
  ogImage?: string;
  ogType?: OgType;
}

export const seoDefaults = {
  home: {
    path: '/',
    title: 'Designature Studio — Interior Design, with AI Built In',
    description:
      'Designer-led interior design with six deliverables per project, plus a suite of AI tools the studio uses — open for you to try.',
    ogImage: DEFAULT_OG_IMAGE,
    ogType: 'website',
  },
  portfolio: {
    path: '/portfolio',
    title: 'Portfolio — Designature Studio',
    description:
      'Selected interior design work — apartments, houses, and commercial spaces. Based in Yerevan, projects worldwide.',
    ogImage: DEFAULT_OG_IMAGE,
    ogType: 'website',
  },
  /** Used as the base for /portfolio/:id when project data is not yet resolved. */
  portfolioDetail: {
    path: '/portfolio',
    title: 'Portfolio — Designature Studio',
    description:
      'Selected interior design work — apartments, houses, and commercial spaces. Based in Yerevan, projects worldwide.',
    ogImage: DEFAULT_OG_IMAGE,
    ogType: 'article',
  },
  services: {
    path: '/services',
    title: 'Services — Designature Studio',
    description:
      'Full-service interior design — concept, technical drawings, 3D renders, shopping list, install guides, walkthroughs. Six deliverables per project.',
    ogImage: DEFAULT_OG_IMAGE,
    ogType: 'website',
  },
  studio: {
    path: '/studio',
    title: 'The Studio — Designature Studio',
    description:
      'The team and philosophy behind Designature Studio — editorial, designer-led, AI-augmented. Founded by Anahit Ghasabyan in Yerevan.',
    ogImage: DEFAULT_OG_IMAGE,
    ogType: 'website',
  },
  aiConcepts: {
    path: '/ai-concepts',
    title: 'AI Tools for Interior Design — Designature Studio',
    description:
      'Six AI tools built for our own studio and opened for you — vision, room audit, style quiz, color, multimodal search, shopping list.',
    ogImage: DEFAULT_OG_IMAGE,
    ogType: 'website',
  },
  aiVision: {
    path: '/ai-vision',
    title: 'AI Vision — Generate Interior Design from a Prompt',
    description:
      'Type what you want, get an interior visualization. Built by Designature Studio for designers and homeowners.',
    ogImage: DEFAULT_OG_IMAGE,
    ogType: 'website',
  },
  pricing: {
    path: '/pricing',
    title: 'Pricing — Designature Studio',
    description:
      'Three ways to work with the studio — start with the AI tools, scale to a full studio engagement.',
    ogImage: DEFAULT_OG_IMAGE,
    ogType: 'website',
  },
  faq: {
    path: '/faq',
    title: 'FAQ — Designature Studio',
    description:
      'Common questions about the studio, the AI tools, pricing, process, and timelines.',
    ogImage: DEFAULT_OG_IMAGE,
    ogType: 'website',
  },
  deliverables: {
    path: '/deliverables',
    title: 'Deliverables — Designature Studio',
    description:
      'The six things you receive at the end of every project — yours to keep, share, or hand to your contractor.',
    ogImage: DEFAULT_OG_IMAGE,
    ogType: 'website',
  },
} as const satisfies Record<string, RouteSeo>;

export type SeoRouteKey = keyof typeof seoDefaults;

/**
 * Build the dynamic title + description for a /portfolio/:id page.
 *
 * Falls back to the static portfolio meta when the project can't be resolved
 * (invalid id, projects not loaded yet) — see edge-case notes in spec §7.
 */
export function projectDetailSeo(args: {
  title?: string;
  description?: string;
  imageUrl?: string;
  id?: string;
}): RouteSeo {
  const fallback = seoDefaults.portfolioDetail;
  if (!args.title) return fallback;

  const firstSentence = (args.description ?? '').split(/(?<=[.!?])\s/)[0];
  const desc =
    firstSentence ||
    `${args.title} — an interior project by Designature Studio.`;

  return {
    path: args.id ? `/portfolio/${args.id}` : fallback.path,
    title: `${args.title} — Portfolio — Designature Studio`,
    description: desc,
    ogImage: args.imageUrl || fallback.ogImage,
    ogType: 'article',
  };
}
