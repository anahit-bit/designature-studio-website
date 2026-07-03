/**
 * JSON-LD (schema.org) builders, injected per route as
 * <script type="application/ld+json">.
 *
 *   /                → Organization + LocalBusiness (with hasOfferCatalog) + WebSite
 *   /portfolio       → BreadcrumbList
 *   /portfolio/:id   → BreadcrumbList (Home › Portfolio › Project)
 *   /faq             → FAQPage (generated from src/data/faqs.ts — same source the
 *                      rendered page uses, so schema always matches the content)
 *
 * Builders return plain objects; render.ts serializes them safely.
 */
import type { ProjectData } from "../../src/constants";
import { BUSINESS, SITE_URL, absUrl, CORE_SERVICES } from "./config.js";
import { FAQ_SECTIONS } from "../../src/data/faqs.js";
import type { RouteInfo } from "./meta.js";

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
 * Build the list of JSON-LD nodes for a route. Each is emitted as its own
 * <script> so a malformed one can't poison the others.
 */
export function buildJsonLd(
  info: RouteInfo,
  project?: ProjectData | null
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
    default:
      break;
  }

  return nodes.map(withContext);
}
