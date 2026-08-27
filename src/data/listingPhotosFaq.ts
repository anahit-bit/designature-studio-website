/**
 * /listing-photos FAQ content — single source of truth.
 *
 * Consumed by BOTH:
 *   - src/components/ListingPhotosPage.tsx (the accordion humans read)
 *   - server/seo/jsonld.ts (the FAQPage structured data Google reads)
 *
 * Same contract as src/data/deliverablesFaq.ts: `a` is PLAIN TEXT and is what
 * the FAQPage schema emits verbatim, so the rich result and the visible page
 * can never drift. Optional `links` are applied at render time only.
 *
 * Copy rules for this page (it is the paid-search landing page for the US
 * "listing photos" campaign — see docs/marketing/google-ads/README.md):
 *   1. No performance claims we cannot substantiate. No invented statistics
 *      about bookings, days-on-market, or sale price. Google Ads
 *      "unacceptable business practices" + FTC substantiation both bite here.
 *   2. Never imply an AI restyle may be passed off as the room's current
 *      state. Q2 is the disclosure answer and is deliberately blunt.
 *   3. Only describe what ships today: AI Vision restyle, Shopping List,
 *      Room Audit, the $99 consultation, full studio projects. The fal
 *      virtual-staging engine is parked (services/aiVision/virtualStaging.ts)
 *      — do not sell it here until it is switched on.
 */

export interface ListingPhotosFaqLink {
  /** Exact substring of `a` to turn into a link. First occurrence only. */
  text: string;
  /** In-app route the phrase navigates to. */
  to: string;
}

export interface ListingPhotosFaqItem {
  q: string;
  /** Plain text — this exact string is what the FAQPage schema emits. */
  a: string;
  /** Optional in-copy links, applied at render time only (schema stays plain). */
  links?: ListingPhotosFaqLink[];
}

export const LISTING_PHOTOS_FAQ: ListingPhotosFaqItem[] = [
  {
    q: "Why is my rental listing getting views but no bookings?",
    a: "Views mean your title, price, and location are working — the listing is being found. Bookings stall later, at the photos. A guest decides in a couple of seconds from a thumbnail, and a room that photographs flat, bare, or dated loses that moment even when the space itself is fine. Before you cut your nightly rate, look hard at the first three images: is there a focal point, is the scale readable, does the room look like somewhere a person wants to wake up? Those are design problems, and design problems are fixable without a renovation.",
  },
  {
    q: "Can I use an AI-restyled photo in my Airbnb or MLS listing?",
    a: "Not as a photo of the room as it stands today — that is a misrepresentation, and it is the fastest way to a bad review or a complaint. A restyle shows a design idea, not the current state of the space. If you do publish one, label it clearly as virtually staged: many US MLSs require that disclosure, and some states legislate it. The use we actually recommend is simpler and safer — restyle the room to decide what to buy, furnish it for real, then photograph the real result.",
  },
  {
    q: "How is this different from virtual staging?",
    a: "Virtual staging drops furniture into a photo so a listing looks furnished. Nothing is bought and nothing changes in the room. Designature is built for the opposite outcome: the restyle is the plan, and the Shopping List that comes with it is a list of real products at real prices you can order, so the physical room ends up matching the picture. If your only goal is a furnished-looking listing photo for a vacant property you are about to sell, a dedicated virtual staging tool is the more direct buy.",
  },
  {
    q: "What is actually in the shopping list?",
    a: "For each piece the AI identifies in your restyled room, the Shopping List returns real, currently listed products from retailers such as West Elm, Pottery Barn, Crate & Barrel, CB2, Wayfair, and Article — with the price, the retailer, an image, and a link to buy. You can swap any item for an alternate if the pick is wrong or out of budget. Some links may earn us a small commission, which never changes what gets recommended.",
  },
  {
    q: "What does it cost?",
    a: "Starting costs nothing and needs no card: the free tier includes three AI Vision concepts and three shopping lists. If you want a designer involved rather than the tool alone, a one-to-one consultation is 99 US dollars, and full studio projects — brief, concept, photoreal renders, and technical drawings — are quoted per project.",
    links: [
      { text: "free tier", to: "/pricing" },
      { text: "one-to-one consultation", to: "/consultation" },
      { text: "full studio projects", to: "/services" },
    ],
  },
  {
    q: "How long does it take?",
    a: "The restyle itself takes about a minute: upload one photo, choose a style, and AI Vision returns a photoreal version of your own room with the walls, windows, and layout kept as they are. Generating the shopping list from that image takes another minute or so. Booking a designer consultation depends on the calendar, and a full studio project runs on a project timeline agreed up front.",
  },
  {
    q: "Do you work with properties in the United States?",
    a: "Yes. The AI tools are online and location-independent — hosts, agents, and owners anywhere in the US can use them today, and the Shopping List is matched to US retailers and US pricing. Designature Studio itself is based in Yerevan, Armenia, so consultations and project work run remotely over video and shared documents. Our on-site design and build service is Armenia-only.",
  },
];
