/**
 * SEO / GEO business + site constants — the single place server-side SEO reads
 * canonical URLs and NAP (name / address / phone) facts from.
 *
 * SOURCE OF TRUTH for the data below (verified against the live site):
 *   - email + phones + socials: src/components/Footer.tsx
 *   - founding year + positioning: src/LanguageContext.tsx ('studio.heroSub')
 *   - OG image: index.html
 *
 * ⚠ OWNER TO CONFIRM (left intentionally omitted rather than invented — see
 *   SEO-NOTES.md): street address, geo coordinates, and opening hours. Schema is
 *   valid without them; add them here when confirmed for a richer LocalBusiness.
 */

/** Canonical origin = www — the public host. The apex (designature.studio)
 *  301-redirects to www, so emitting www here makes every canonical / OG /
 *  JSON-LD / sitemap URL match the redirect destination. One consistent signal
 *  to Google (previously we emitted apex, which contradicted the redirect). */
export const SITE_URL = "https://www.designature.studio";

/** Absolute-URL helper. Ensures a single leading slash and no double origin. */
export function absUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const p = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${SITE_URL}${p}`;
}

export const BUSINESS = {
  name: "Designature Studio",
  legalName: "Designature Studio",
  description:
    "Designature Studio is an interior design and architecture studio in Yerevan, Armenia, pairing designer-led residential and commercial projects with AI-powered design tools.",
  url: SITE_URL,
  logo: absUrl("/favicon.svg"),
  image:
    "https://res.cloudinary.com/dys2k5muv/image/upload/v1772532381/1_h9ofqr.jpg",
  email: "hello@designature.studio",
  /** Primary contact number (Armenian WhatsApp Business line from the footer). */
  telephone: "+37477901991",
  foundingDate: "2021",
  priceRange: "$$",
  address: {
    addressLocality: "Yerevan",
    addressCountry: "AM",
  },
  /** Studio works with clients in Armenia and remotely worldwide. */
  areaServed: ["Yerevan", "Armenia", "Worldwide"],
  sameAs: [
    "https://www.instagram.com/designature_interior/",
    "https://www.facebook.com/Designature.Design.Studio",
  ],
} as const;

/** Default social-share image used when a route has no more specific one. */
export const DEFAULT_OG_IMAGE = BUSINESS.image;

/** Core services surfaced as an OfferCatalog on the homepage LocalBusiness. */
export const CORE_SERVICES = [
  {
    name: "Residential Interior Design",
    description:
      "Full-service interior design for apartments and houses — concept, planning, and execution.",
  },
  {
    name: "Commercial Interior Design",
    description:
      "Interior design for offices, retail, and hospitality spaces that balance brand and function.",
  },
  {
    name: "Renovation & Remodeling",
    description:
      "End-to-end renovation guidance, from spatial planning to finishes and installation.",
  },
  {
    name: "AI Design Studio",
    description:
      "AI-powered tools — Style Quiz, AI Vision room redesign, and Shopping List — to explore and plan your space.",
  },
] as const;
