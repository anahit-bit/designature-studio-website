import React from 'react';
import { useLanguage } from '../LanguageContext';
import { trackCalendly } from '../lib/track';
import { DELIVERABLES_FAQ, type DeliverablesFaqItem } from '../data/deliverablesFaq';
import PhaseSection from './deliverables/PhaseSection';
import ComparisonTable from './deliverables/ComparisonTable';
import DownloadCard from './deliverables/DownloadCard';

/**
 * S-014 — /deliverables. "A design package built to build from."
 *
 * A static marketing + GEO page: four phase bands, an AI-vs-studio comparison,
 * five real sample PDF downloads, and an 8-question FAQ that also feeds the
 * FAQPage JSON-LD (server/seo/jsonld.ts, sourced from src/data/deliverablesFaq.ts).
 *
 * Ported 1:1 from the owner-approved mockup:
 *   E:\Business\Claude\_Mockups\Website\WEBSITE-PLAN-S014-deliverables-mockup.html
 * Every headline, eyebrow, paragraph, list item and button label is signed off —
 * do not rewrite copy here without owner approval.
 *
 * The comparison table lives in ./deliverables/ComparisonTable.tsx and carries a
 * hard sync rule; read that file's header before touching the rows.
 *
 * Header/Footer chrome is supplied by DeliverablesRoute in src/App.tsx.
 */

/** Free 15-min intro chat — same Calendly link the header/studio surfaces use. */
const FREE_CONVO_URL = 'https://calendly.com/hello-designature/quick-conversation';

/**
 * The five sample PDFs, served from Cloudinary `raw` delivery (a plain
 * downloadable file — no image pipeline, no PDF-delivery security gate).
 * Uploaded by scripts/upload-deliverable-samples.mjs.
 *
 * URLs carry `fl_attachment:<name>`, which makes Cloudinary send
 * `Content-Disposition: attachment; filename="<name>.pdf"`. That matters:
 * browsers IGNORE the HTML `download` attribute on cross-origin links, so
 * without this flag every "Download" button would just open the PDF viewer.
 *
 * `size` is the REAL file size and is the single source for every size label on
 * the page (cover captions, download-card meta, the master button). Keep it
 * accurate — it sets the visitor's download expectation.
 *
 * To replace a file: re-run the upload script, then update `version` + `size`.
 */
const CLD_RAW = 'https://res.cloudinary.com/dys2k5muv/raw/upload';

interface Sample {
  publicId: string;
  version: string;
  /** Download filename, WITHOUT the .pdf extension (Cloudinary appends it). */
  filename: string;
  size: string;
}

const sampleHref = (s: Sample): string =>
  `${CLD_RAW}/fl_attachment:${s.filename}/${s.version}/${s.publicId}.pdf`;

const SAMPLE_DEFS = {
  phase12: {
    publicId: 'deliverables-phase-1-2',
    version: 'v1787226156',
    filename: 'Designature-Phase-1-2-Brief-and-Concept',
    size: '9 MB',
  },
  aiConcept: {
    publicId: 'deliverables-phase-3-ai-concept',
    version: 'v1787227891',
    filename: 'Designature-Phase-3-AI-Concept',
    size: '1.5 MB',
  },
  renders: {
    publicId: 'deliverables-phase-3-renders',
    version: 'v1787227892',
    filename: 'Designature-Phase-3-Renders',
    size: '4 MB',
  },
  technical: {
    publicId: 'deliverables-phase-4-technical',
    version: 'v1787227893',
    filename: 'Designature-Phase-4-Technical-Documents',
    size: '7 MB',
  },
  allInOne: {
    publicId: 'deliverables-all-in-one',
    version: 'v1787227894',
    filename: 'Designature-All-in-One-Sample-Project',
    size: '10 MB',
  },
} satisfies Record<string, Sample>;

type SampleKey = keyof typeof SAMPLE_DEFS;

const SAMPLES = Object.fromEntries(
  (Object.entries(SAMPLE_DEFS) as [SampleKey, Sample][]).map(([k, v]) => [
    k,
    { href: sampleHref(v), filename: `${v.filename}.pdf`, size: v.size },
  ])
) as Record<SampleKey, { href: string; filename: string; size: string }>;

/**
 * Phase cover thumbnails — a render of page 1 of each sample PDF (the studio's
 * branded title page), uploaded by scripts/upload-deliverable-covers.mjs.
 * Delivered through the shared cld() helper for f_auto/q_auto + srcset.
 * Drop a key to fall back to the mockup's typographic placeholder.
 */
const CLD_IMG = 'https://res.cloudinary.com/dys2k5muv/image/upload';
const COVERS = {
  phase12: `${CLD_IMG}/v1787242983/deliverables-cover-phase-1-2.jpg`,
  aiConcept: `${CLD_IMG}/v1787242984/deliverables-cover-phase-3-ai-concept.jpg`,
  renders: `${CLD_IMG}/v1787242985/deliverables-cover-phase-3-renders.jpg`,
  technical: `${CLD_IMG}/v1787242986/deliverables-cover-phase-4-technical.jpg`,
} as const;

const GLANCE = [
  { num: '4', label: 'Phases' },
  { num: '40+', label: 'Sheets per project' },
  { num: 'Every', label: 'Room · plans + renders' },
  { num: '1', label: 'PDF a builder can quote' },
];

const PHASE_CARDS = [
  {
    num: 'Phase 1 · Discover',
    title: 'The Brief',
    body: 'Client intake, functional program, key constraints, budget frame, aesthetic direction. The single source of truth every later phase answers to.',
    out: 'Output: Design Brief PDF',
  },
  {
    num: 'Phase 2 · Direct',
    title: 'Concept & Style',
    body: "Moodboards, palette calls, material direction, room-by-room concept. This is where the project's personality gets fixed on paper.",
    out: 'Output: Concept Deck',
  },
  {
    num: 'Phase 3 · Visualize',
    title: 'AI Concept + Renders',
    body: 'AI-assisted concept previews with locked RAL colours, followed by photoreal 3D renders — living, kitchen, bedrooms, bathrooms. You see it before it exists.',
    out: 'Output: Concept + Render decks',
  },
  {
    num: 'Phase 4 · Build',
    title: 'Technical Documents',
    body: 'Measured plans, elevations, electrical, plumbing, heating, floor & tile layouts, lighting connections. Everything a contractor needs to quote and build.',
    out: 'Output: 40+ sheet drawing set',
  },
];

const MASTER_STATS = [
  { num: '4', label: 'Phases bundled' },
  { num: '40+', label: 'Sheets · full set' },
  { num: '1', label: 'PDF handover' },
];

const DOWNLOADS = [
  {
    tag: 'Phase 1 – 2',
    title: 'The Brief + Concept',
    body: 'Client intake, functional program, palette board, aesthetic direction, and per-room concept notes.',
    meta: `PDF · ${SAMPLES.phase12.size}`,
    ...SAMPLES.phase12,
  },
  {
    tag: 'Phase 3',
    title: 'AI Concept',
    body: 'Room-by-room AI previews with locked RAL colour codes, door/wall/floor calls, and approved-variant markers.',
    meta: `PDF · ${SAMPLES.aiConcept.size}`,
    ...SAMPLES.aiConcept,
  },
  {
    tag: 'Phase 3',
    title: 'Photoreal Renders',
    body: 'Final photoreal 3D renders of every key room — living, kitchen, dining, master, bathrooms, hallway.',
    meta: `PDF · ${SAMPLES.renders.size}`,
    ...SAMPLES.renders,
  },
  {
    tag: 'Phase 4',
    title: 'Technical Documents',
    body: 'The full drawing set — dimensioned plans, elevations, MEP, tiling and floor layouts. Everything a contractor quotes from.',
    meta: `PDF · ${SAMPLES.technical.size}`,
    ...SAMPLES.technical,
  },
];

// ── Shared atoms (mockup .btn / .rule / .eyebrow) ───────────────────────────
const BTN =
  'inline-flex items-center justify-center gap-2 px-6 py-3.5 text-[12px] font-bold uppercase tracking-[0.16em] whitespace-nowrap transition-colors duration-300';
const BTN_PRIMARY = `${BTN} bg-[#0A0A0A] text-white hover:bg-[#333333]`;
const BTN_SECONDARY = `${BTN} border border-[#0A0A0A] text-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-white`;
const BTN_OUTLINE_WHITE = `${BTN} border border-white/40 text-white hover:bg-white hover:text-[#0B2240]`;
const EYEBROW = 'block text-[11px] font-bold uppercase tracking-[0.28em] text-[#6B6B6B] mb-4';

const WarmRule: React.FC = () => <div className="w-11 h-px bg-[#9E5E41] mx-auto mb-6" />;

/**
 * Render an FAQ answer, turning any declared `links` phrases into in-app links.
 * The schema (jsonld.ts) emits the same string as plain text, so the visible
 * copy and the structured data can never drift.
 */
const FaqAnswer: React.FC<{ item: DeliverablesFaqItem; onNavigate: (to: string) => void }> = ({
  item,
  onNavigate,
}) => {
  if (!item.links?.length) return <>{item.a}</>;

  // Split the answer on each declared phrase, in order of appearance.
  const ordered = [...item.links].sort((a, b) => item.a.indexOf(a.text) - item.a.indexOf(b.text));
  const nodes: React.ReactNode[] = [];
  let rest = item.a;
  ordered.forEach((link, i) => {
    const at = rest.indexOf(link.text);
    if (at === -1) return;
    nodes.push(rest.slice(0, at));
    nodes.push(
      <button
        key={`${link.to}-${i}`}
        type="button"
        onClick={() => onNavigate(link.to)}
        className="text-[#0047AB] underline hover:opacity-70 transition-opacity"
      >
        {link.text}
      </button>
    );
    rest = rest.slice(at + link.text.length);
  });
  nodes.push(rest);
  return <>{nodes}</>;
};

const DeliverablesPage: React.FC = () => {
  const { navigateTo } = useLanguage();

  const goConsultation = () => {
    navigateTo('consultation');
    window.scrollTo({ top: 0 });
  };
  const goAiConcepts = () => {
    navigateTo('ai-concepts');
    window.scrollTo({ top: 0 });
  };
  const goRoute = (to: string) => {
    if (to === '/pricing') navigateTo('pricing');
    else if (to === '/consultation') navigateTo('consultation');
    else if (to === '/ai-concepts') navigateTo('ai-concepts');
    window.scrollTo({ top: 0 });
  };
  const bookFreeChat = () => trackCalendly(FREE_CONVO_URL, 'deliverables');

  const scrollToDownloads = () =>
    document.getElementById('downloads')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <main className="bg-white text-[#0A0A0A] font-brand-body text-[14px] leading-[1.55]">
      {/* ══════════ HERO ══════════ */}
      <section className="bg-white pt-[150px] md:pt-[220px] pb-16 lg:pb-24">
        <div className="max-w-[1240px] mx-auto px-7 text-center">
          <div className="w-11 h-px bg-[#9E5E41] mx-auto mb-8" />
          <span className={EYEBROW}>What you actually receive</span>
          <h1 className="font-brand-display font-normal text-[#0A0A0A] leading-[1.05] tracking-[-0.01em] text-[48px] md:text-[72px] lg:text-[92px] max-w-[16ch] mx-auto mb-7">
            A design package built to build from.
          </h1>
          <p className="text-[17px] md:text-[19px] leading-[1.6] text-[#404040] max-w-[64ch] mx-auto mb-10">
            Every Designature project ships as a complete four-phase deliverable — brief, concept,
            photoreal renders, and technical drawings a contractor can build from. Explore each phase
            below, or download a real sample.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button type="button" onClick={scrollToDownloads} className={BTN_PRIMARY}>
              See the sample project →
            </button>
            <button type="button" onClick={goConsultation} className={BTN_SECONDARY}>
              Start yours
            </button>
          </div>
        </div>
      </section>

      {/* ══════════ AT-A-GLANCE ══════════ */}
      <section className="bg-[#FAFAFA] py-14">
        <div className="max-w-[1240px] mx-auto px-7">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#DAD2C3] border border-[#DAD2C3]">
            {GLANCE.map((cell) => (
              <div key={cell.label} className="bg-[#FAFAFA] px-5 py-7 text-center">
                <div className="font-brand-display font-normal text-[40px] md:text-[48px] leading-none text-[#0A0A0A] mb-2.5">
                  {cell.num}
                </div>
                <div className="text-[11px] md:text-[12px] font-bold uppercase tracking-[0.2em] text-[#6B6B6B]">
                  {cell.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ 4-PHASE OVERVIEW ══════════ */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-[1240px] mx-auto px-7">
          <div className="text-center mb-12 lg:mb-16">
            <WarmRule />
            <span className={EYEBROW}>The four phases</span>
            <h2 className="font-brand-display font-normal text-[#0A0A0A] leading-[1.05] tracking-[-0.01em] text-[36px] md:text-[46px] lg:text-[56px] max-w-[22ch] mx-auto mb-5">
              Discovery to build, in one continuous flow.
            </h2>
            <p className="text-[16px] leading-[1.6] text-[#404040] max-w-[60ch] mx-auto">
              We work in four phases so no stage guesses at the one before. Each phase produces a
              document your team can hold — and the next phase builds on it.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PHASE_CARDS.map((card) => (
              <div key={card.title} className="relative bg-white border border-black/10 px-5 py-7">
                <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#9E5E41] mb-3">
                  {card.num}
                </div>
                <h3 className="font-brand-display font-normal text-[22px] leading-tight text-[#0A0A0A] mb-3">
                  {card.title}
                </h3>
                <p className="text-[13px] leading-[1.6] text-[#404040]">{card.body}</p>
                <div className="mt-5 pt-3.5 border-t border-black/[0.08] text-[11px] font-bold uppercase tracking-[0.16em] text-[#6B6B6B]">
                  {card.out}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ PHASE DETAIL BANDS ══════════ */}
      <PhaseSection
        id="phase-1-2"
        eyebrow="Phase 1 & 2 · Discovery + Direction"
        heading="Before a single line is drawn."
        paragraphs={[
          "The brief captures how you live, how you use each room, what's fixed, what's flexible — plus the budget frame and timeline. The concept phase then locks aesthetic direction: palette, materials, mood, and room-by-room style guidance.",
          "Every later drawing and every render traces back to what's decided here. That's why we ship these as documents you can review, edit, and sign off — not conversations you're expected to remember later.",
        ]}
        containsLabel="What's inside"
        contains={[
          'Client intake summary',
          'Functional program per room',
          'Budget frame & priorities',
          'Aesthetic direction call',
          'Material palette board',
          'Colour language + RAL codes',
          'Room-by-room concept notes',
          'Fixed vs flexible constraint list',
        ]}
        downloadLabel="↓ Download sample (Phase 1–2)"
        downloadHref={SAMPLES.phase12.href}
        downloadFilename={SAMPLES.phase12.filename}
        cover={{
          tag: 'Phase 1 – Phase 2',
          imageUrl: COVERS.phase12,
          big: 'The Brief',
          sub: '+ Concept Direction',
          filename: `Phase 1 – Phase 2.pdf · ${SAMPLES.phase12.size}`,
        }}
      />

      <PhaseSection
        id="phase-3-ai-concept"
        eyebrow="Phase 3 · AI Concept"
        heading="AI-assisted previews with fixed colour language."
        paragraphs={[
          'Before the full renders, we generate AI concept variants for each room — quick to iterate, locked to the palette agreed in Phase 2. This is where we test direction fast without committing render time.',
          'Every AI concept is annotated with the exact RAL colour codes and finish specifications, so what you approve here matches what the renders — and later the contractor — build against.',
        ]}
        containsLabel="What's inside"
        contains={[
          'Room-by-room AI previews',
          'RAL colour code annotations',
          'Door, wall, floor style calls',
          'Approved-variant marker per room',
          'Alt-direction options for review',
          'Notes for the render brief',
        ]}
        downloadLabel="↓ Download sample (AI Concept)"
        downloadHref={SAMPLES.aiConcept.href}
        downloadFilename={SAMPLES.aiConcept.filename}
        extraCta={{ label: 'Try AI Vision free →', onClick: goAiConcepts }}
        cover={{
          tag: 'Phase 3 · AI Concept',
          imageUrl: COVERS.aiConcept,
          big: 'AI Concept',
          sub: 'Locked to your palette',
          filename: `Phase 3 AI Concept.pdf · ${SAMPLES.aiConcept.size}`,
        }}
        reverse
        tinted
      />

      <PhaseSection
        id="phase-3-renders"
        eyebrow="Phase 3 · Photoreal Renders"
        heading="See it before it's built."
        paragraphs={[
          'Once the AI concept is signed off, we produce photoreal 3D renders — every key room at final quality, at the exact proportions, materials, lighting, and finishes locked in Phase 2. Living, kitchen and dining, master bedroom, kid room, bathrooms, hallway.',
          'Renders are the last stop before technical drawings — the moment you can walk through the finished space and correct anything that reads differently in reality than it did on the moodboard.',
        ]}
        containsLabel="What's inside"
        contains={[
          'Living room · multiple angles',
          'Kitchen & dining',
          'Master bedroom',
          'Kid rooms · guest bedrooms',
          'Bathrooms · en-suite + guest',
          'Hallway · transition spaces',
        ]}
        downloadLabel="↓ Download sample (Renders)"
        downloadHref={SAMPLES.renders.href}
        downloadFilename={SAMPLES.renders.filename}
        cover={{
          tag: 'Phase 3 · Renders',
          imageUrl: COVERS.renders,
          big: '3D Renders',
          sub: 'Photoreal · every room',
          filename: `Phase 3 Renders.pdf · ${SAMPLES.renders.size}`,
        }}
      />

      <PhaseSection
        id="phase-4-technical"
        eyebrow="Phase 4 · Technical Documents"
        heading="A drawing set your contractor can build from."
        paragraphs={[
          'The final phase converts every design decision into working drawings — dimensioned floor plans, elevations, MEP layouts (electrical, plumbing, heating), lighting connections, tiling patterns, and floor board directions. Everything a contractor needs to quote accurately and build without back-and-forth.',
          "Every sheet carries a title block: sheet name, sheet number, project number, scale, designer, senior designer, date. It's a professional drawing set — not a mood presentation with dimensions grafted on.",
        ]}
        containsLabel="What your technical set will contain"
        contains={[
          'Dimensioned floor plans',
          'Zoning + furnishing plans',
          'Furnishing tags & measurements',
          'Ceiling plan · per room',
          'Floor board direction plan',
          'Elevations · every room',
          'Wall motives · living, bedroom, hallway',
          'Kitchen · backsplash + cabinetry',
          'Bathroom & laundry tiling',
          'Electrical · sockets, switches, low-voltage',
          'Lighting plan + connections',
          'Plumbing · hot & cold water',
          'Heating floor layout',
        ]}
        downloadLabel="↓ Download sample (Technical)"
        downloadHref={SAMPLES.technical.href}
        downloadFilename={SAMPLES.technical.filename}
        cover={{
          tag: 'Phase 4 · Technical',
          imageUrl: COVERS.technical,
          big: 'Technical',
          sub: '40+ sheets · dimensioned',
          filename: `Phase 4 Technical Documents.pdf · ${SAMPLES.technical.size}`,
        }}
        reverse
        tinted
      />

      {/* ══════════ ALL-IN-ONE MASTER PACKAGE ══════════ */}
      <section className="bg-[#0B2240] text-white py-16 lg:py-24">
        <div className="max-w-[1240px] mx-auto px-7">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-20 items-center">
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-[0.28em] text-white/70 mb-4">
                One PDF · everything
              </span>
              <h2 className="font-brand-display font-normal text-white leading-[1.05] tracking-[-0.01em] text-[38px] md:text-[50px] lg:text-[60px] max-w-[14ch] mb-6">
                The All-in-One reference.
              </h2>
              <p className="text-[16px] leading-[1.7] text-white/[0.82] max-w-[50ch] mb-4">
                Every phase — brief, concept, AI previews, photoreal renders, and the full technical
                drawing set — bundled as one master reference. This is what we hand over at project
                close, and what every contractor, joiner, electrician, and tile setter works from.
              </p>
              <p className="text-[16px] leading-[1.7] text-white/[0.82] max-w-[50ch] mb-4">
                Download the sample to see exactly how a Designature project looks on the day the keys
                change hands.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 my-8 py-6 border-t border-b border-white/15">
                {MASTER_STATS.map((s) => (
                  <div key={s.label}>
                    <div className="font-brand-display font-normal text-[44px] leading-none text-white">
                      {s.num}
                    </div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70 mt-1.5">
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-3 mt-3">
                <a
                  href={SAMPLES.allInOne.href}
                  download={SAMPLES.allInOne.filename}
                  data-testid="download-link"
                  className={BTN_OUTLINE_WHITE}
                >
                  {`↓ Download the sample (${SAMPLES.allInOne.size})`}
                </a>
              </div>
            </div>
            <div className="aspect-[4/5] bg-white/[0.06] border border-white/[0.14] p-8 md:p-11 flex flex-col justify-between max-w-[400px] w-full mx-auto lg:max-w-none">
              <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/70">
                Interior Design Project
              </div>
              <div className="font-brand-display font-normal text-[40px] md:text-[48px] leading-[1.05] text-white">
                All-in-One
                <br />
                Sample Project
              </div>
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/50">
                Designature Studio · Yerevan
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ AI vs STUDIO COMPARISON ══════════ */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-[1240px] mx-auto px-7">
          <div className="text-center mb-12 lg:mb-14">
            <WarmRule />
            <span className={EYEBROW}>Why not just AI</span>
            <h2 className="font-brand-display font-normal text-[#0A0A0A] leading-[1.05] tracking-[-0.01em] text-[34px] md:text-[44px] lg:text-[52px] max-w-[22ch] mx-auto mb-4">
              What AI ships. What a studio ships.
            </h2>
            <p className="text-[16px] leading-[1.6] text-[#404040] max-w-[60ch] mx-auto">
              Our free AI tools generate concepts, style directions, and shopping lists — brilliant
              for getting started. A studio project delivers everything AI does, plus the drawings you
              cannot build a home without.
            </p>
          </div>

          <ComparisonTable />

          <div className="text-center mt-11">
            <p className="font-brand-display text-[22px] leading-[1.4] text-[#0A0A0A] max-w-[38ch] mx-auto mb-6">
              Start free. Upgrade when you're ready to build.
            </p>
            <div className="inline-flex gap-3 flex-wrap justify-center">
              <button type="button" onClick={goAiConcepts} className={BTN_SECONDARY}>
                Try the AI Studio free →
              </button>
              <button type="button" onClick={goConsultation} className={BTN_PRIMARY}>
                Start a studio project
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ DOWNLOAD SAMPLES ══════════ */}
      <section id="downloads" className="bg-[#FAFAFA] py-16 lg:py-24 scroll-mt-24">
        <div className="max-w-[1240px] mx-auto px-7">
          <div className="text-center mb-12 lg:mb-14">
            <WarmRule />
            <span className={EYEBROW}>Real project · real files</span>
            <h2 className="font-brand-display font-normal text-[#0A0A0A] leading-[1.05] tracking-[-0.01em] text-[34px] md:text-[42px] lg:text-[48px] max-w-[20ch] mx-auto mb-4">
              Download the sample deliverables.
            </h2>
            <p className="text-[16px] leading-[1.6] text-[#404040] max-w-[60ch] mx-auto">
              Every file below is from a real Designature project (details anonymised). Same format,
              same title blocks, same rigour as what your project would receive.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {DOWNLOADS.map((d) => (
              <DownloadCard key={d.title} {...d} />
            ))}
            <DownloadCard
              variant="master"
              tag="Everything · bundled"
              title="All-in-One Sample"
              body="All four phases in one master PDF — the exact package handed over at project close. Same title blocks, same rigour as what your project would receive."
              meta={`PDF · ${SAMPLES.allInOne.size}`}
              href={SAMPLES.allInOne.href}
              filename={SAMPLES.allInOne.filename}
            />
          </div>
        </div>
      </section>

      {/* ══════════ FAQ (GEO) ══════════ */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-[1240px] mx-auto px-7">
          <div className="text-center mb-12 lg:mb-14">
            <WarmRule />
            <span className={EYEBROW}>Questions we hear a lot</span>
            <h2 className="font-brand-display font-normal text-[#0A0A0A] leading-[1.05] tracking-[-0.01em] text-[34px] md:text-[42px] lg:text-[48px] max-w-[20ch] mx-auto mb-4">
              Deliverables · questions.
            </h2>
          </div>
          <div className="max-w-[820px] mx-auto border-t border-[#DAD2C3]">
            {DELIVERABLES_FAQ.map((item, i) => (
              <details
                key={item.q}
                data-testid="deliverables-faq-item"
                open={i === 0}
                className="group border-b border-[#DAD2C3] py-5"
              >
                <summary className="flex justify-between items-baseline gap-5 cursor-pointer list-none [&::-webkit-details-marker]:hidden font-brand-display text-[20px] md:text-[22px] leading-[1.3] text-[#0A0A0A]">
                  {item.q}
                  <span
                    aria-hidden
                    className="font-brand-body font-normal text-[24px] leading-none text-[#9E5E41] shrink-0"
                  >
                    <span className="group-open:hidden">+</span>
                    <span className="hidden group-open:inline">−</span>
                  </span>
                </summary>
                <div className="mt-3.5 text-[14px] leading-[1.7] text-[#404040] max-w-[64ch]">
                  <FaqAnswer item={item} onNavigate={goRoute} />
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ CTA BAND ══════════ */}
      <section className="bg-[#9E5E41] text-white py-16 lg:py-24">
        <div className="max-w-[1240px] mx-auto px-7">
          <div className="flex justify-between items-center gap-10 flex-wrap">
            <div className="flex-1 min-w-[280px]">
              <span className="block text-[11px] font-bold uppercase tracking-[0.28em] text-white/75 mb-3.5">
                Ready to see yours
              </span>
              <h2 className="font-brand-display font-normal text-white leading-[1.05] tracking-[-0.01em] text-[30px] md:text-[36px] lg:text-[42px] max-w-[20ch] mb-3">
                Start with a free 15-minute conversation.
              </h2>
              <p className="text-[15px] leading-[1.6] text-white/90 max-w-[52ch]">
                Walk us through your space. We'll tell you which phases fit, what a realistic timeline
                looks like, and what a project like yours typically costs.
              </p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <button
                type="button"
                onClick={bookFreeChat}
                className={`${BTN} bg-white text-[#9E5E41] hover:bg-[#0A0A0A] hover:text-white`}
              >
                Book a free chat →
              </button>
              <button type="button" onClick={goConsultation} className={BTN_OUTLINE_WHITE}>
                Book a $99 consultation
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default DeliverablesPage;
