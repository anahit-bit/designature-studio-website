import { motion } from 'framer-motion';
import { cld, cldSrcSet, THUMB_WIDTHS } from '../lib/cld';

// ─── Cloudinary base — swap filenames if assets change ───────────────────────
// f_auto + q_auto baked in via cld(); kept here as raw public IDs.
const CLD = 'https://res.cloudinary.com/dys2k5muv/image/upload';

const EXAMPLES = [
  {
    id: 1,
    roomUrl:    `${CLD}/before_1_tjwkhh.jpg`,
    inspoUrls:  [`${CLD}/inspo_1_x0f61y.jpg`, `${CLD}/inspo_1_1_q216nn.jpg`],
    conceptUrl: `${CLD}/after_1_wp9msc.png`,
    label: 'Rental apartment — Japandi dream',
    chip: { label: 'Japandi', type: 'style' as const },
  },
  {
    id: 2,
    roomUrl:    `${CLD}/before_2_s6lh97.png`,
    inspoUrls:  [
      `${CLD}/inspo_2_1_ewilhk.jpg`,
      `${CLD}/inspo_2_2_eg0lr9.jpg`,
    ],
    conceptUrl: `${CLD}/after_2_aq8cwh.png`,
    label: 'Empty shell — Mid-Century sanctuary',
    chip: { label: 'Living Room', type: 'room' as const },
  },
  {
    id: 3,
    roomUrl:    `${CLD}/before_3_mne2jp.jpg`,
    inspoUrls:  [`${CLD}/inspo_3_scvknf.png`],
    conceptUrl: `${CLD}/after_3_f14b5p.jpg`,
    label: 'Plain bedroom — Bohemian retreat',
    chip: { label: 'Bohemian', type: 'style' as const },
  },
];

// Image-delivery transforms applied to existing <img> tags. Layout/JSX is
// LOCKED for this component — we only swap src/srcSet/sizes/loading.
const SMALL_FILL = { crop: 'fill' as const, aspectRatio: '4/3' };
const HERO_LIMIT = { crop: 'limit' as const };
// ─────────────────────────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.55, ease: 'easeOut', delay: i * 0.15 },
  }),
};

interface Props { onRequestLogin: () => void; }

// ── One example row ──────────────────────────────────────────────────────────
function ExampleRow({ example, index }: { example: typeof EXAMPLES[0]; index: number }) {
  return (
    <motion.div
      custom={index}
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      className="flex flex-col gap-1"
    >
      {/* Image grid: inputs | arrow | concept (hero) */}
      <div
        className="items-stretch gap-3 md:gap-4 hidden md:grid"
        style={{ gridTemplateColumns: '0.6fr 40px 1.4fr' }}
      >
        {/* LEFT — room + inspo stacked */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/55">Room</span>
            <div className="overflow-hidden" style={{ aspectRatio: '4/3' }}>
              <img
                src={cld(example.roomUrl, 360, SMALL_FILL)}
                srcSet={cldSrcSet(example.roomUrl, THUMB_WIDTHS, SMALL_FILL)}
                sizes="(min-width: 768px) 240px, 50vw"
                width={400} height={300}
                loading="lazy" decoding="async"
                alt="Room"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/55">
              {example.inspoUrls.length > 1 ? 'Inspiration x2' : 'Inspiration'}
            </span>
            {example.inspoUrls.map((url, i) => (
              <div key={i} className="overflow-hidden" style={{ aspectRatio: '4/3' }}>
                <img
                  src={cld(url, 360, SMALL_FILL)}
                  srcSet={cldSrcSet(url, THUMB_WIDTHS, SMALL_FILL)}
                  sizes="(min-width: 768px) 240px, 50vw"
                  width={400} height={300}
                  loading="lazy" decoding="async"
                  alt={`Inspiration ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>

        {/* ARROW */}
        <div className="flex items-center justify-center">
          <span className="font-display text-2xl font-light text-black/55">&#8594;</span>
        </div>

        {/* RIGHT — concept (hero) */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/55">Concept</span>
          <div className="overflow-hidden w-full" style={{ aspectRatio: '4/3' }}>
            <img
              src={cld(example.conceptUrl, 768, HERO_LIMIT)}
              srcSet={cldSrcSet(example.conceptUrl, [480, 768, 1024], HERO_LIMIT)}
              sizes="(min-width: 768px) 580px, 100vw"
              width={1024} height={768}
              loading="lazy" decoding="async"
              alt="Concept"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      {/* Mobile layout — stacked */}
      <div className="flex flex-col gap-3 md:hidden">
        <div className="flex gap-2">
          <div className="flex flex-col gap-1 flex-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/55">Room</span>
            <div className="overflow-hidden" style={{ aspectRatio: '4/3' }}>
              <img
                src={cld(example.roomUrl, 360, SMALL_FILL)}
                srcSet={cldSrcSet(example.roomUrl, THUMB_WIDTHS, SMALL_FILL)}
                sizes="50vw"
                width={400} height={300}
                loading="lazy" decoding="async"
                alt="Room"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/55">
              {example.inspoUrls.length > 1 ? 'Inspiration x2' : 'Inspiration'}
            </span>
            {example.inspoUrls.map((url, i) => (
              <div key={i} className="overflow-hidden" style={{ aspectRatio: '4/3' }}>
                <img
                  src={cld(url, 360, SMALL_FILL)}
                  srcSet={cldSrcSet(url, THUMB_WIDTHS, SMALL_FILL)}
                  sizes="50vw"
                  width={400} height={300}
                  loading="lazy" decoding="async"
                  alt={`Inspiration ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-center">
          <span className="font-display text-xl font-light text-black/55">&#8595;</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/55">Concept</span>
          <div className="overflow-hidden w-full" style={{ aspectRatio: '4/3' }}>
            <img
              src={cld(example.conceptUrl, 768, HERO_LIMIT)}
              srcSet={cldSrcSet(example.conceptUrl, [480, 768, 1024], HERO_LIMIT)}
              sizes="100vw"
              width={1024} height={768}
              loading="lazy" decoding="async"
              alt="Concept"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      {/* Bottom row: chip + label — mirroring the grid columns */}
      <div
        className="items-center gap-3 md:gap-4 mt-2 hidden md:grid"
        style={{ gridTemplateColumns: '0.6fr 40px 1.4fr' }}
      >
        <div>
          <span className="inline-block px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] border border-black bg-black text-white rounded-[2px]">
            {example.chip.label}
          </span>
        </div>
        <div />
        <div>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-black/70">
            {example.label}
          </span>
        </div>
      </div>

      {/* Mobile bottom row */}
      <div className="flex items-center gap-3 mt-1 md:hidden">
        <span className="inline-block px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] border border-black bg-black text-white rounded-[2px]">
          {example.chip.label}
        </span>
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-black/70">
          {example.label}
        </span>
      </div>

      {/* Separator */}
      <div className="pb-3 pt-3">
        <div className="border-t border-black/8" />
      </div>
    </motion.div>
  );
}

// ── Main showcase ────────────────────────────────────────────────────────────
export default function AIVisionShowcase({ onRequestLogin }: Props) {
  return (
    <div className="w-full bg-white border-t border-black/10">
      <div className="flex flex-col items-center px-8 md:px-12 py-10 gap-7 w-full max-w-[900px] mx-auto">

        {/* Header — centered, matching Style Quiz */}
        <motion.div
          custom={-1} variants={fadeUp} initial="hidden"
          whileInView="visible" viewport={{ once: true }}
          className="text-center w-full"
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-black/65 mb-3">
            How it works
          </p>
          <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight leading-tight text-black mb-3">
            Your room. Your taste. Your concept.
          </h2>
          <p className="text-sm md:text-[15px] text-black/75 leading-relaxed mx-auto max-w-xl">
            Upload a photo of your room, pick a style or room type,
            and AI Vision returns a realistic concept for your space.
          </p>
        </motion.div>

        {/* Example rows */}
        <div className="flex flex-col w-full">
          {EXAMPLES.map((example, i) => (
            <ExampleRow key={example.id} example={example} index={i} />
          ))}
        </div>

        {/* CTA — tinted panel matching Style Quiz */}
        <motion.div
          custom={EXAMPLES.length} variants={fadeUp} initial="hidden"
          whileInView="visible" viewport={{ once: true }}
          className="flex flex-col items-center gap-3 w-full bg-black/[0.03] border-t border-black/[0.06] pt-6 pb-5 -mx-8 px-8"
          style={{ width: 'calc(100% + 4rem)' }}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-black/65">Ready to see the result?</p>
          <button
            onClick={onRequestLogin}
            className="inline-flex items-center gap-2 bg-[#0047AB] text-white text-[11px] font-bold uppercase tracking-[0.25em] px-7 py-4 hover:bg-[#003d99] transition-colors"
          >
            Sign in to try with your room &#8594;
          </button>
          <p className="text-[12px] text-black/70 uppercase tracking-[0.2em]">
            Free &#183; 3 concepts &#183; No card needed
          </p>
        </motion.div>

      </div>
    </div>
  );
}
