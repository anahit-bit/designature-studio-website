/**
 * Prerender copy for the highest-value pages, so JS-less crawlers get real text
 * inside #root (the SPA overwrites it on mount — createRoot render, not hydrate,
 * so there is no mismatch risk).
 *
 * The home + services strings MIRROR the English values in
 * src/LanguageContext.tsx. They are duplicated here (not imported) on purpose:
 * LanguageContext is a React/react-router module and pulling it into the Node
 * server would drag browser code server-side. If you edit the copy in
 * LanguageContext, update the matching key below. Keys are noted inline.
 *
 * The FAQ prerender, by contrast, reads src/data/faqs.ts directly (shared source
 * of truth) — see render.ts.
 */

export interface PrerenderCopy {
  /** eyebrow / kicker line */
  eyebrow?: string;
  /** primary <h1> */
  headline: string;
  /** supporting paragraph(s) */
  intro: string;
}

/** Mirrors LanguageContext keys: home.hero.eyebrow / headline.l1+l2 / tagline. */
export const HOME_COPY: PrerenderCopy = {
  eyebrow: "Online interior design studio",
  headline: "Bring us a space. We'll bring it to life.",
  intro:
    "Apartments. Houses. Commercial. Designature Studio designs the space you've imagined — and the parts you haven't yet.",
};

/** Mirrors LanguageContext keys: serv.pageHeroTitle / serv.pageHeroSub. */
export const SERVICES_COPY: PrerenderCopy = {
  eyebrow: "Design Services",
  headline: "Design Services",
  intro:
    "Tailored architectural and interior design solutions for visionary clients — residential, commercial, and renovation, from concept to installation.",
};

/** Mirrors FAQPage hero copy (src/components/FAQPage.tsx). */
export const FAQ_COPY: PrerenderCopy = {
  eyebrow: "FAQ",
  headline: "Questions & answers.",
  intro:
    "Everything you need to know about the AI Studio, our design tools, and how we work.",
};

/** Mirrors JournalPage hero copy (src/components/JournalPage.tsx). */
export const JOURNAL_COPY: PrerenderCopy = {
  eyebrow: "The Journal",
  headline: "Notes on design & living well.",
  intro:
    "Ideas, how-tos, and behind-the-scenes from the studio — on interior design, AI-assisted tools, and making a home that feels like you.",
};

/** Mirrors the /listing-photos hero (src/components/ListingPhotosPage.tsx).
 *  English-only, like the page itself — the audience is the US. */
export const LISTING_PHOTOS_COPY: PrerenderCopy = {
  eyebrow: "For US hosts, agents & owners",
  headline: "Your listing isn't the problem. The photos are.",
  intro:
    "Before you drop the nightly rate again, look at the first three images. Upload one photo of the room and Designature shows you the same space restyled — then hands you the shopping list of real products, at real prices, that get it there. Free to start, no card.",
};
