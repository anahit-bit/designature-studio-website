import React from 'react';

/**
 * S-014 — one "phase detail" band on /deliverables.
 *
 * Four instances render on the page (Phase 1–2, Phase 3 AI Concept, Phase 3
 * Renders, Phase 4 Technical). Identical structure; `reverse` flips the
 * text/cover sides so the bands alternate, and `tinted` paints the #FAFAFA
 * alternating background. Ported 1:1 from the approved mockup.
 */

export interface PhaseCover {
  /** Small chip in the cover's top-left corner. */
  tag: string;
  /** Large serif line on the placeholder cover. */
  big: string;
  /** Tracked caption under the serif line. */
  sub: string;
  /** Bottom line — "<file>.pdf · N MB". */
  filename: string;
  /**
   * Optional Cloudinary thumbnail of the PDF's first page. When absent the
   * typographic placeholder from the mockup renders instead.
   */
  imageUrl?: string;
}

export interface PhaseSectionProps {
  /** Anchor id, e.g. "phase-4-technical". */
  id: string;
  eyebrow: string;
  heading: string;
  paragraphs: string[];
  /** "What's inside" / "What your technical set will contain". */
  containsLabel: string;
  contains: string[];
  downloadLabel: string;
  /** Absolute or root-relative URL of the sample PDF. */
  downloadHref: string;
  /** Suggested filename for the download attribute. */
  downloadFilename: string;
  /** Optional second CTA (Phase 3 AI Concept → "Try AI Vision free →"). */
  extraCta?: { label: string; onClick: () => void };
  cover: PhaseCover;
  /** Put the cover on the left instead of the right (alternating bands). */
  reverse?: boolean;
  /** Paint the #FAFAFA alternating background. */
  tinted?: boolean;
}

const PhaseSection: React.FC<PhaseSectionProps> = ({
  id,
  eyebrow,
  heading,
  paragraphs,
  containsLabel,
  contains,
  downloadLabel,
  downloadHref,
  downloadFilename,
  extraCta,
  cover,
  reverse = false,
  tinted = false,
}) => (
  <section
    id={id}
    data-testid="phase-section"
    className={`py-16 lg:py-24 border-t border-[#DAD2C3] ${tinted ? 'bg-[#FAFAFA]' : 'bg-white'}`}
  >
    <div className="max-w-[1240px] mx-auto px-7">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-start">
        {/* ── Text column ── */}
        <div className={reverse ? 'lg:order-2' : 'lg:order-1'}>
          <span className="block text-[11px] font-bold uppercase tracking-[0.28em] text-[#9E5E41] mb-4">
            {eyebrow}
          </span>
          <h2 className="font-brand-display font-normal text-[#0A0A0A] leading-[1.05] tracking-[-0.01em] text-[34px] md:text-[42px] lg:text-[48px] max-w-[16ch] mb-6">
            {heading}
          </h2>
          {paragraphs.map((p) => (
            <p key={p.slice(0, 40)} className="text-[15px] leading-[1.7] text-[#404040] max-w-[52ch] mb-4">
              {p}
            </p>
          ))}

          <div className="my-8 pt-5 border-t border-[#DAD2C3]">
            <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#6B6B6B] mb-3.5">
              {containsLabel}
            </div>
            <ul className="list-none p-0 m-0 grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-6">
              {contains.map((item) => (
                <li
                  key={item}
                  className="relative pl-4 text-[13px] text-[#0A0A0A] before:content-[''] before:absolute before:left-0 before:top-[9px] before:w-1.5 before:h-px before:bg-[#9E5E41]"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap gap-3 mt-3">
            <a
              href={downloadHref}
              download={downloadFilename}
              data-testid="phase-download"
              className="inline-flex items-center justify-center gap-2 border border-[#0A0A0A] text-[#0A0A0A] px-6 py-3.5 text-[12px] font-bold uppercase tracking-[0.16em] transition-colors duration-300 hover:bg-[#0A0A0A] hover:text-white"
            >
              {downloadLabel}
            </a>
            {extraCta && (
              <button
                type="button"
                onClick={extraCta.onClick}
                className="inline-flex items-center justify-center gap-2 bg-[#0047AB] text-white px-6 py-3.5 text-[12px] font-bold uppercase tracking-[0.16em] transition-colors duration-300 hover:bg-[#003b8f]"
              >
                {extraCta.label}
              </button>
            )}
          </div>
        </div>

        {/* ── Cover column ── */}
        <div className={reverse ? 'lg:order-1' : 'lg:order-2'}>
          <div className="relative aspect-[4/5] w-full max-w-[400px] mx-auto lg:max-w-none bg-[#FAFAFA] border border-[#DAD2C3] overflow-hidden flex items-center justify-center">
            {cover.imageUrl ? (
              <img
                src={cover.imageUrl}
                alt={`${cover.big} — sample cover page`}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="p-10 text-center">
                <div className="font-brand-display font-normal text-[44px] leading-none text-[#0A0A0A] mb-3.5">
                  {cover.big}
                </div>
                <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#6B6B6B]">
                  {cover.sub}
                </div>
              </div>
            )}
            <span className="absolute top-4 left-4 bg-[#0A0A0A]/70 text-white text-[10px] font-bold uppercase tracking-[0.24em] px-3 py-1.5">
              {cover.tag}
            </span>
            <div
              className={`absolute bottom-4 left-4 right-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[#6B6B6B] ${
                cover.imageUrl ? 'bg-white/85 px-2 py-1' : ''
              }`}
            >
              {cover.filename}
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default PhaseSection;
