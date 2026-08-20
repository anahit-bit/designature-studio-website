/**
 * JSON-LD (schema.org) builders, injected per route as
 * <script type="application/ld+json">.
 *
 *   /                → Organization + LocalBusiness (with hasOfferCatalog) + WebSite
 *   /portfolio       → BreadcrumbList
 *   /portfolio/:id   → BreadcrumbList (Home › Portfolio › Project)
 *   /faq             → FAQPage (generated from src/data/faqs.ts — same source the
 *                      rendered page uses, so schema always matches the content)
 *   /deliverables    → FAQPage + BreadcrumbList (FAQ from src/data/deliverablesFaq.ts,
 *                      same source the rendered accordion uses)
 *
 * Builders return plain objects; render.ts serializes them safely.
 */
import type { ProjectData } from "../../src/constants";
import type { BlogPost, Category } from "../../src/types";
import { BUSINESS, SITE_URL, absUrl, CORE_SERVICES } from "./config.js";
import { FAQ_SECTIONS } from "../../src/data/faqs.js";
import { DELIVERABLES_FAQ } from "../../src/data/deliverablesFaq.js";
import type { RouteInfo, JournalData } from "./meta.js";

type JsonLd = Record<string, unknown>;

const ORG_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

function organizationNode(): JsonLd {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: BUSINESS.name,
    legalName: BUSINESS.legalName,
    url: BUSINESS.url,
    logo: BUSINESS.logo,
    image: BUSINESS.image,
    email: BUSINESS.email,
    telephone: BUSINESS.telephone,
    foundingDate: BUSINESS.foundingDate,
    sameAs: [...BUSINESS.sameAs],
  };
}

function localBusinessNode(): JsonLd {
  return {
    "@type": ["LocalBusiness", "HomeAndConstructionBusiness"],
    "@id": `${SITE_URL}/#localbusiness`,
    name: BUSINESS.name,
    description: BUSINESS.description,
    url: BUSINESS.url,
    logo: BUSINESS.logo,
    image: BUSINESS.image,
    email: BUSINESS.email,
    telephone: BUSINESS.telephone,
    priceRange: BUSINESS.priceRange,
    foundingDate: BUSINESS.foundingDate,
    address: {
      "@type": "PostalAddress",
      addressLocality: BUSINESS.address.addressLocality,
      addressCountry: BUSINESS.address.addressCountry,
    },
    areaServed: [...BUSINESS.areaServed],
    sameAs: [...BUSINESS.sameAs],
    parentOrganization: { "@id": ORG_ID },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Interior Design Services",
      itemListElement: CORE_SERVICES.map((svc) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: svc.name,
          description: svc.description,
          provider: { "@id": ORG_ID },
        },
      })),
    },
  };
}

function webSiteNode(): JsonLd {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: BUSINESS.name,
    url: BUSINESS.url,
    publisher: { "@id": ORG_ID },
  };
}

interface Crumb {
  name: string;
  url: string;
}

function breadcrumbNode(crumbs: Crumb[]): JsonLd {
  return {
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: c.url,
    })),
  };
}

function faqPageNode(): JsonLd {
  const mainEntity = FAQ_SECTIONS.flatMap((section) =>
    section.items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    }))
  );
  return {
    "@type": "FAQPage",
    "@id": `${absUrl("/faq")}#faqpage`,
    mainEntity,
  };
}

/**
 * S-014 — FAQPage for /deliverables, built from the same 8 Q&As the page
 * renders (src/data/deliverablesFaq.ts). Answers are emitted as plain text;
 * the in-copy links exist only in the rendered accordion.
 */
function deliverablesFaqNode(): JsonLd {
  return {
    "@type": "FAQPage",
    "@id": `${absUrl("/deliverables")}#faqpage`,
    mainEntity: DELIVERABLES_FAQ.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

// ── Journal (Phase 2) ────────────────────────────────────────────────────────

/** FAQPage built from a post's authored `seo.faq[]` (only when present). */
function postFaqNode(post: BlogPost, canonical: string): JsonLd | null {
  const faq = post.seo?.faq ?? [];
  if (!faq.length) return null;
  return {
    "@type": "FAQPage",
    "@id": `${canonical}#faqpage`,
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

/** BlogPosting/Article node for a single post. */
function blogPostingNode(post: BlogPost, canonical: string): JsonLd {
  const node: JsonLd = {
    "@type": "BlogPosting",
    "@id": `${canonical}#article`,
    headline: post.title,
    url: canonical,
    mainEntityOfPage: canonical,
    image: post.coverImage || BUSINESS.image,
    author: post.author
      ? { "@type": "Person", name: post.author }
      : { "@id": ORG_ID, "@type": "Organization", name: BUSINESS.name },
    publisher: { "@id": ORG_ID },
    isPartOf: { "@id": WEBSITE_ID },
  };
  if (post.excerpt) node.description = post.excerpt;
  if (post.publishedAt) {
    node.datePublished = post.publishedAt;
    node.dateModified = post.publishedAt; // schema has no separate updatedAt
  }
  if (post.category?.title) node.articleSection = post.category.title;
  if (post.tags && post.tags.length) node.keywords = post.tags.join(", ");
  return node;
}

/** CollectionPage node for a category, listing its posts. */
function collectionPageNode(
  category: Category,
  canonical: string,
  posts: BlogPost[]
): JsonLd {
  return {
    "@type": "CollectionPage",
    "@id": `${canonical}#collection`,
    name: `${category.title} — The Journal`,
    description:
      category.description ||
      `Articles on ${category.title.toLowerCase()} from the Designature Studio journal.`,
    url: canonical,
    isPartOf: { "@id": WEBSITE_ID },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: posts.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: absUrl(`/journal/${encodeURIComponent(p.slug)}`),
        name: p.title,
      })),
    },
  };
}

/**
 * Build the list of JSON-LD nodes for a route. Each is emitted as its own
 * <script> so a malformed one can't poison the others.
 */
export function buildJsonLd(
  info: RouteInfo,
  project?: ProjectData | null,
  journal?: JournalData
): JsonLd[] {
  const nodes: JsonLd[] = [];
  const withContext = (node: JsonLd): JsonLd => ({
    "@context": "https://schema.org",
    ...node,
  });

  switch (info.key) {
    case "home":
      nodes.push(organizationNode(), localBusinessNode(), webSiteNode());
      break;
    case "portfolio":
      nodes.push(
        breadcrumbNode([
          { name: "Home", url: SITE_URL + "/" },
          { name: "Portfolio", url: absUrl("/portfolio") },
        ])
      );
      break;
    case "portfolioDetail": {
      const crumbs: Crumb[] = [
        { name: "Home", url: SITE_URL + "/" },
        { name: "Portfolio", url: absUrl("/portfolio") },
      ];
      const label = project?.titleEN ?? "Project";
      const id = project?.id ?? info.projectId ?? "";
      crumbs.push({
        name: label,
        url: absUrl(`/portfolio/${encodeURIComponent(id)}`),
      });
      nodes.push(breadcrumbNode(crumbs));
      break;
    }
    case "faq":
      nodes.push(faqPageNode());
      break;
    case "deliverables":
      nodes.push(
        deliverablesFaqNode(),
        breadcrumbNode([
          { name: "Home", url: SITE_URL + "/" },
          { name: "Deliverables", url: absUrl("/deliverables") },
        ])
      );
      break;
    case "journalIndex":
      nodes.push(
        {
          "@type": "Blog",
          "@id": `${absUrl("/journal")}#blog`,
          name: "The Journal",
          url: absUrl("/journal"),
          publisher: { "@id": ORG_ID },
          isPartOf: { "@id": WEBSITE_ID },
        },
        breadcrumbNode([
          { name: "Home", url: SITE_URL + "/" },
          { name: "The Journal", url: absUrl("/journal") },
        ])
      );
      break;
    case "journalDetail": {
      const slug = info.slug ?? "";
      const canonical = absUrl(`/journal/${encodeURIComponent(slug)}`);
      const post = journal?.post;
      if (post) {
        nodes.push(blogPostingNode(post, canonical));
        const crumbs: Crumb[] = [
          { name: "Home", url: SITE_URL + "/" },
          { name: "The Journal", url: absUrl("/journal") },
        ];
        if (post.category?.title && post.category.slug) {
          crumbs.push({
            name: post.category.title,
            url: absUrl(`/journal/category/${encodeURIComponent(post.category.slug)}`),
          });
        }
        crumbs.push({ name: post.title, url: canonical });
        nodes.push(breadcrumbNode(crumbs));
        const faqNode = postFaqNode(post, canonical);
        if (faqNode) nodes.push(faqNode);
      }
      break;
    }
    case "journalCategory": {
      const slug = info.slug ?? "";
      const canonical = absUrl(`/journal/category/${encodeURIComponent(slug)}`);
      const category = journal?.category;
      if (category) {
        nodes.push(collectionPageNode(category, canonical, journal?.categoryPosts ?? []));
        nodes.push(
          breadcrumbNode([
            { name: "Home", url: SITE_URL + "/" },
            { name: "The Journal", url: absUrl("/journal") },
            { name: category.title, url: canonical },
          ])
        );
      }
      break;
    }
    default:
      break;
  }

  return nodes.map(withContext);
}
