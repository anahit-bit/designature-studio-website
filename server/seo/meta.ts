/**
 * Server-side route → metadata resolver.
 *
 * Maps every in-scope route to a UNIQUE, human-quality <title> + meta
 * description + canonical + Open Graph / Twitter fields. Private/transactional
 * routes resolve to a noindex record. /portfolio/:id resolves its title,
 * description, and OG image from the matching Sanity project.
 *
 * Add a new route: extend `classifyRoute()` + `STATIC_META`. The titles/descs
 * below intentionally have NO generic fallback for known routes — each is written
 * by hand. See SEO-NOTES.md.
 */
import type { ProjectData } from "../../src/constants";
import { fetchProjects } from "../../src/lib/sanity.js";
import { SITE_URL, DEFAULT_OG_IMAGE, absUrl } from "./config.js";

export interface RouteMeta {
  title: string;
  description: string;
  canonical: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  /** When true, emit <meta name="robots" content="noindex,nofollow">. */
  noindex: boolean;
}

/** Logical route identity, used by both meta + JSON-LD builders. */
export type RouteKey =
  | "home"
  | "portfolio"
  | "portfolioDetail"
  | "services"
  | "studio"
  | "aiConcepts"
  | "aiVision"
  | "pricing"
  | "faq"
  | "consultation"
  | "terms"
  | "privacy"
  | "refund"
  | "private"
  | "unknown";

export interface RouteInfo {
  key: RouteKey;
  /** Present only for portfolioDetail — the Sanity project id from the URL. */
  projectId?: string;
}

/** Normalize a pathname: strip query/hash, collapse trailing slash (except root). */
export function normalizePath(pathname: string): string {
  let p = pathname.split("?")[0].split("#")[0];
  if (p.length > 1 && p.endsWith("/")) p = p.replace(/\/+$/, "");
  return p || "/";
}

/** URL-path prefixes that must never be indexed (private / transactional). */
const PRIVATE_PREFIXES = ["/admin", "/booking", "/deliverables"];

export function classifyRoute(pathname: string): RouteInfo {
  const p = normalizePath(pathname);

  if (PRIVATE_PREFIXES.some((pre) => p === pre || p.startsWith(pre + "/"))) {
    return { key: "private" };
  }

  const detail = p.match(/^\/portfolio\/([^/]+)$/);
  if (detail) return { key: "portfolioDetail", projectId: decodeURIComponent(detail[1]) };

  switch (p) {
    case "/":
      return { key: "home" };
    case "/portfolio":
      return { key: "portfolio" };
    case "/services":
      return { key: "services" };
    case "/studio":
      return { key: "studio" };
    case "/ai-concepts":
      return { key: "aiConcepts" };
    case "/ai-vision":
      return { key: "aiVision" };
    case "/pricing":
      return { key: "pricing" };
    case "/faq":
      return { key: "faq" };
    case "/consultation":
      return { key: "consultation" };
    case "/terms":
      return { key: "terms" };
    case "/privacy":
      return { key: "privacy" };
    case "/refund":
      return { key: "refund" };
    default:
      return { key: "unknown" };
  }
}

const SUFFIX = " | Designature Studio";

/** Hand-written metadata for every public, static route. */
const STATIC_META: Record<
  Exclude<RouteKey, "portfolioDetail" | "private" | "unknown">,
  Omit<RouteMeta, "canonical" | "noindex"> & { path: string }
> = {
  home: {
    path: "/",
    title: "Designature Studio — Interior Design in Yerevan & AI Design Tools",
    description:
      "Designature Studio is a Yerevan interior design and architecture studio. Explore designer-led residential and commercial projects, and free AI tools — Style Quiz, AI Vision room redesign, and Shopping List.",
    ogTitle: "Designature Studio — Interior Design & AI Design Tools",
    ogDescription:
      "A Yerevan interior design studio pairing designer-led projects with AI tools that help you explore your style and visualize your space.",
    ogImage: DEFAULT_OG_IMAGE,
  },
  portfolio: {
    path: "/portfolio",
    title: "Portfolio — Interior Design Projects" + SUFFIX,
    description:
      "Browse Designature Studio's portfolio of residential and commercial interior design projects — apartments, houses, offices, and retail spaces designed in Yerevan and beyond.",
    ogTitle: "Portfolio — Interior Design Projects" + SUFFIX,
    ogDescription:
      "Residential and commercial interior design projects by Designature Studio.",
    ogImage: DEFAULT_OG_IMAGE,
  },
  services: {
    path: "/services",
    title: "Design Services — Residential, Commercial & Renovation" + SUFFIX,
    description:
      "Full-service interior design from Designature Studio: residential, commercial, and renovation projects. Tailored architectural and interior solutions from concept to installation.",
    ogTitle: "Design Services" + SUFFIX,
    ogDescription:
      "Tailored residential, commercial, and renovation interior design — concept to installation.",
    ogImage: DEFAULT_OG_IMAGE,
  },
  studio: {
    path: "/studio",
    title: "The Studio — About Designature Studio" + SUFFIX,
    description:
      "Founded in 2021, Designature Studio is a collective of architects and interior designers in Yerevan dedicated to the art of living well. Meet the studio behind the work.",
    ogTitle: "The Studio — About Designature Studio",
    ogDescription:
      "A Yerevan collective of architects and interior designers, founded in 2021 and dedicated to the art of living well.",
    ogImage: DEFAULT_OG_IMAGE,
  },
  aiConcepts: {
    path: "/ai-concepts",
    title: "AI Design Studio — Free Interior Design Tools" + SUFFIX,
    description:
      "Designature Studio's AI Studio: Style Quiz, AI Vision room redesign, and Shopping List. Discover your style and visualize your space with AI — free to start, no credit card required.",
    ogTitle: "AI Design Studio — Free Interior Design Tools",
    ogDescription:
      "Style Quiz, AI Vision, and Shopping List — explore your style and visualize your space with AI.",
    ogImage: DEFAULT_OG_IMAGE,
  },
  aiVision: {
    path: "/ai-vision",
    title: "AI Vision — Photorealistic Room Redesign" + SUFFIX,
    description:
      "Upload a photo of your room and let AI Vision generate a photorealistic redesign in the style you choose. See your space transformed before you commit — free to try.",
    ogTitle: "AI Vision — See Your Room Transformed",
    ogDescription:
      "Upload a room photo and get a photorealistic AI redesign in your chosen interior style.",
    ogImage: DEFAULT_OG_IMAGE,
  },
  pricing: {
    path: "/pricing",
    title: "Pricing — AI Studio Plans & Design Services" + SUFFIX,
    description:
      "Simple pricing for Designature Studio's AI tools and design services. Start free with 3 AI Vision concepts and 3 shopping lists; Design ($19/mo) and Studio ($49/mo) plans coming soon.",
    ogTitle: "Pricing — Designature Studio",
    ogDescription:
      "Start free with the AI Studio; Design and Studio subscription plans coming soon.",
    ogImage: DEFAULT_OG_IMAGE,
  },
  faq: {
    path: "/faq",
    title: "FAQ — AI Studio & Design Services" + SUFFIX,
    description:
      "Answers to common questions about Designature Studio's AI tools — AI Vision, Shopping List, Style Quiz — plus data privacy, pricing, and working with our interior design studio.",
    ogTitle: "Frequently Asked Questions" + SUFFIX,
    ogDescription:
      "Common questions about the AI Studio, data privacy, pricing, and our design services.",
    ogImage: DEFAULT_OG_IMAGE,
  },
  consultation: {
    path: "/consultation",
    title: "Book a Consultation" + SUFFIX,
    description:
      "Book a one-on-one consultation with Designature Studio to discuss your space, goals, and design direction with a professional interior designer.",
    ogTitle: "Book a Consultation" + SUFFIX,
    ogDescription:
      "A one-on-one consultation with a Designature Studio interior designer.",
    ogImage: DEFAULT_OG_IMAGE,
  },
  terms: {
    path: "/terms",
    title: "Terms of Service" + SUFFIX,
    description:
      "The terms governing use of Designature Studio's website, AI design tools, and services.",
    ogTitle: "Terms of Service" + SUFFIX,
    ogDescription: "Terms governing use of the Designature Studio website and tools.",
    ogImage: DEFAULT_OG_IMAGE,
  },
  privacy: {
    path: "/privacy",
    title: "Privacy Policy" + SUFFIX,
    description:
      "How Designature Studio collects, uses, and protects your data across our website and AI design tools.",
    ogTitle: "Privacy Policy" + SUFFIX,
    ogDescription: "How Designature Studio handles and protects your data.",
    ogImage: DEFAULT_OG_IMAGE,
  },
  refund: {
    path: "/refund",
    title: "Refund Policy" + SUFFIX,
    description:
      "Designature Studio's refund policy for consultations and subscription plans.",
    ogTitle: "Refund Policy" + SUFFIX,
    ogDescription: "Designature Studio's refund policy for paid consultations and plans.",
    ogImage: DEFAULT_OG_IMAGE,
  },
};

/** Truncate a plain-text description to a sensible meta length on a word break. */
export function clampDescription(text: string, max = 300): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 60 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
}

/** Fetch a single project by URL id, tolerant of Sanity being unreachable. */
export async function resolveProject(id: string): Promise<ProjectData | null> {
  try {
    const projects = await fetchProjects();
    return projects.find((p) => p.id === id) ?? null;
  } catch (err) {
    console.warn("[seo] resolveProject: Sanity fetch failed:", (err as Error)?.message);
    return null;
  }
}

/**
 * Resolve full metadata for a pathname. For portfolioDetail, pass the already
 * resolved project (or null) to avoid a duplicate Sanity fetch.
 */
export function buildMeta(info: RouteInfo, project?: ProjectData | null): RouteMeta {
  if (info.key === "portfolioDetail") {
    const canonical = absUrl(
      `/portfolio/${encodeURIComponent(info.projectId ?? "")}`
    );
    if (project) {
      const title = `${project.titleEN} — ${project.categoryEN} Interior Design${SUFFIX}`;
      const description = clampDescription(
        project.descriptionEN ||
          `${project.titleEN}, a ${project.categoryEN.toLowerCase()} interior design project by Designature Studio${
            project.locationEN ? ` in ${project.locationEN}` : ""
          }.`
      );
      return {
        title,
        description,
        canonical,
        ogTitle: `${project.titleEN} — Designature Studio`,
        ogDescription: description,
        ogImage: project.imageUrl || DEFAULT_OG_IMAGE,
        noindex: false,
      };
    }
    // Project not found / Sanity down — still return a valid, indexable record.
    return {
      title: "Project — Interior Design" + SUFFIX,
      description:
        "An interior design project by Designature Studio. Explore our residential and commercial portfolio.",
      canonical,
      ogTitle: "Interior Design Project" + SUFFIX,
      ogDescription: "An interior design project by Designature Studio.",
      ogImage: DEFAULT_OG_IMAGE,
      noindex: false,
    };
  }

  if (info.key === "private" || info.key === "unknown") {
    return {
      title: "Designature Studio",
      description: BUSINESS_DESCRIPTION,
      canonical: SITE_URL + "/",
      ogTitle: "Designature Studio",
      ogDescription: BUSINESS_DESCRIPTION,
      ogImage: DEFAULT_OG_IMAGE,
      noindex: true,
    };
  }

  const m = STATIC_META[info.key];
  return {
    title: m.title,
    description: clampDescription(m.description),
    canonical: absUrl(m.path),
    ogTitle: m.ogTitle,
    ogDescription: m.ogDescription,
    ogImage: m.ogImage,
    noindex: false,
  };
}

const BUSINESS_DESCRIPTION =
  "Designature Studio — interior design in Yerevan and AI-powered design tools.";
