/**
 * S-014 /deliverables FAQ content — single source of truth.
 *
 * Consumed by BOTH:
 *   - src/components/DeliverablesPage.tsx (the rendered accordion humans see)
 *   - server/seo/jsonld.ts (the FAQPage structured data Google reads)
 *
 * Keeping the copy here means the rich-result schema and the visible page can
 * never drift apart. Edit questions/answers in this file only.
 *
 * Copy is owner-approved (mockup WEBSITE-PLAN-S014-deliverables-mockup.html).
 * Do not rewrite without sign-off.
 */

export interface DeliverablesFaqLink {
  /** Exact substring of `a` to turn into a link. First occurrence only. */
  text: string;
  /** In-app route the phrase navigates to. */
  to: string;
}

export interface DeliverablesFaqItem {
  q: string;
  /** Plain text — this exact string is what the FAQPage schema emits. */
  a: string;
  /** Optional in-copy links, applied at render time only (schema stays plain). */
  links?: DeliverablesFaqLink[];
}

export const DELIVERABLES_FAQ: DeliverablesFaqItem[] = [
  {
    q: 'What does an interior design package actually include?',
    a: 'A full Designature package includes four phases: the written brief, the concept and moodboard direction, AI-assisted room previews with photoreal 3D renders, and the technical drawing set (dimensioned floor plans, elevations, and MEP — electrical, plumbing, heating). Everything a homeowner, contractor, or joiner needs to build the space as designed.',
  },
  {
    q: 'Can I build from AI-generated interior design alone?',
    a: 'AI-generated interior design is excellent for exploring style direction, testing colour palettes, and building a moodboard fast. But it does not produce dimensioned floor plans, electrical layouts, plumbing routes, or tiling patterns — the drawings a contractor actually quotes and builds from. A full studio project bundles both: AI previews for speed, plus technical drawings for the build.',
  },
  {
    q: "What's in an interior design floor plan?",
    a: 'A Designature floor plan set includes a measured plan, a zoning plan, a furnishing plan, furnishing tags and measurements, a room-labels plan, a ceiling plan, and a floor-board direction plan. Together, they document every dimension, every furniture placement, and every material call for the space.',
  },
  {
    q: 'How are 3D renders produced?',
    a: 'After the client approves the AI concept previews and material palette in Phase 3, we produce photoreal 3D renders in a dedicated render pipeline. Each key room — living, kitchen and dining, master bedroom, kid rooms, bathrooms, hallway — is rendered at final quality with the exact materials, lighting, and finishes agreed. Renders are the last stop before technical drawings.',
  },
  {
    q: 'Do I get technical drawings a contractor can quote from?',
    a: 'Yes. Phase 4 delivers a full drawing set — 40+ sheets on a real project, including dimensioned floor plans, elevations, electrical layouts, plumbing routes, heating floor layouts, lighting plans, tiling patterns, and floor board directions. Every sheet carries a proper title block: sheet name, number, project number, scale, and designer sign-off. This is a professional drawing set a contractor quotes and builds from directly.',
  },
  {
    q: 'How much does a full interior design project cost?',
    a: "Full-service Designature projects are quoted per project based on scope, area, and phase depth. Start with a free 15-minute conversation or a paid 45-minute studio consultation to scope your project — we'll walk through what your space needs and give you a transparent proposal. See Pricing for the AI Studio tools and the paid consultation, or start a project for the full studio package.",
    links: [
      { text: 'Pricing', to: '/pricing' },
      { text: 'start a project', to: '/consultation' },
    ],
  },
  {
    q: 'Can I hire an interior designer online for a Yerevan apartment?',
    a: 'Yes. Designature Studio is based in Yerevan and works with clients across Armenia and internationally. Discovery and concept phases happen online (video calls, shared documents). Site measurements and contractor handoff happen in-person for local projects; for international projects, we work from measured plans and site photos you supply.',
  },
  {
    q: 'How long does a full project take?',
    a: 'A typical residential project (80–150 m²) takes six to twelve weeks from signed brief to full technical drawing set — depending on scope, room count, and how quickly review rounds close. Phase 1–2 usually takes two weeks, Phase 3 (AI concept + renders) two to four weeks, Phase 4 (technical) three to six weeks.',
  },
];
