import React from 'react';

/**
 * S-014 — a card in the /deliverables "Download the sample deliverables" grid.
 *
 * Two variants, both from the approved mockup:
 *   'default' — white card, one of four in the top row (tag, title, body,
 *               size meta, cobalt download link).
 *   'master'  — the full-width navy All-in-One row: horizontal on desktop,
 *               stacked + centred below 1024px.
 */
export interface DownloadCardProps {
  tag: string;
  title: string;
  body: string;
  /** "PDF · 13 MB". */
  meta: string;
  /** Root-relative or absolute URL of the sample PDF. */
  href: string;
  /** Suggested filename for the download attribute. */
  filename: string;
  variant?: 'default' | 'master';
  /** Button label; defaults per variant. */
  downloadLabel?: string;
}

const DownloadCard: React.FC<DownloadCardProps> = ({
  tag,
  title,
  body,
  meta,
  href,
  filename,
  variant = 'default',
  downloadLabel,
}) => {
  if (variant === 'master') {
    return (
      <div className="col-span-full bg-[#0B2240] border border-[#0B2240] text-white px-8 py-9 md:px-10 grid grid-cols-1 lg:grid-cols-[auto_1fr_auto] items-center gap-3.5 lg:gap-8 text-center lg:text-left">
        <div className="justify-self-center lg:justify-self-start">
          <span className="block text-[10px] font-bold uppercase tracking-[0.24em] text-white/85 mb-2">
            {tag}
          </span>
          <h4 className="font-brand-display font-normal text-white text-[28px] md:text-[32px] leading-none">
            {title}
          </h4>
        </div>
        <p className="text-[14px] leading-[1.55] text-white/75 max-w-[52ch] mx-auto lg:mx-0">{body}</p>
        <div className="flex flex-col gap-2.5 items-center lg:items-end justify-self-center lg:justify-self-end">
          <span className="text-[11px] uppercase tracking-[0.14em] text-white/55">{meta}</span>
          <a
            href={href}
            download={filename}
            data-testid="download-link"
            className="inline-flex items-center justify-center gap-2 border border-white/40 text-white px-5 py-3 text-[12px] font-bold uppercase tracking-[0.16em] transition-colors duration-300 hover:bg-white hover:text-[#0B2240]"
          >
            {downloadLabel ?? '↓ Download the sample'}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#DAD2C3] p-6 flex flex-col gap-3.5">
      <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#9E5E41]">{tag}</span>
      <h4 className="font-brand-display font-normal text-[#0A0A0A] text-[20px] leading-tight">{title}</h4>
      <p className="flex-1 text-[13px] leading-[1.55] text-[#404040]">{body}</p>
      <span className="text-[11px] uppercase tracking-[0.14em] text-[#6B6B6B]">{meta}</span>
      <a
        href={href}
        download={filename}
        data-testid="download-link"
        className="self-start inline-flex items-center gap-2 pt-1.5 pb-1 text-[12px] font-bold uppercase tracking-[0.14em] text-[#0047AB] border-b border-[#0047AB] transition-opacity duration-300 hover:opacity-70"
      >
        {downloadLabel ?? '↓ Download'}
      </a>
    </div>
  );
};

export default DownloadCard;
