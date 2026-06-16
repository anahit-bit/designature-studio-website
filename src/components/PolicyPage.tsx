import React, { useEffect } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import { Link } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

const SITE_ORIGIN = 'https://www.designature.studio';

/**
 * Shared chrome for the legal policy pages (/terms, /privacy, /refund).
 * Content lives in markdown under src/content/policies and is passed in as a
 * raw string — edits happen in the .md, not here. Mirrors the FAQ/Services
 * content-page style: Cormorant display headings, Montserrat body, cobalt
 * eyebrow, centered column capped at ~720px for readability.
 */
type PolicyPageProps = {
  /** Small uppercase cobalt label above the H1 (e.g. "Studio policies"). */
  eyebrow: string;
  /** Distinct <title> for SEO + the GA4 page_title dimension. */
  docTitle: string;
  /** Raw markdown content (imported via ?raw). */
  content: string;
};

// react-markdown → branded elements. Headings use Cormorant (font-display),
// body copy uses Montserrat (font-body).
const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="text-4xl md:text-5xl font-bold font-display tracking-architectural leading-[1.05] mt-2 mb-8">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-2xl md:text-3xl font-bold font-display tracking-architectural leading-tight mt-14 mb-4">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-lg md:text-xl font-semibold font-display mt-8 mb-3">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="text-[15px] text-black/75 font-body font-light leading-relaxed mb-5">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-5 mb-6 space-y-2 marker:text-black/40">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-5 mb-6 space-y-2 marker:text-black/40">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-[15px] text-black/75 font-body font-light leading-relaxed pl-1">
      {children}
    </li>
  ),
  strong: ({ children }) => <strong className="font-semibold text-black">{children}</strong>,
  hr: () => <hr className="my-10 border-black/10" />,
  a: ({ href, children }) => {
    const target = href ?? '';
    // Cross-policy links are authored as absolute prod URLs in the markdown.
    // Normalise same-site links to a relative path so they resolve via the
    // SPA router both locally and in production.
    const internalPath = target.startsWith(SITE_ORIGIN)
      ? target.slice(SITE_ORIGIN.length) || '/'
      : target.startsWith('/')
        ? target
        : null;

    const linkClass =
      'text-[#0047AB] underline underline-offset-2 decoration-1 hover:text-[#8E3F2D] transition-colors';

    if (internalPath) {
      return (
        <Link to={internalPath} className={linkClass}>
          {children}
        </Link>
      );
    }
    const isExternal = /^https?:\/\//i.test(target);
    return (
      <a
        href={target}
        className={linkClass}
        {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {children}
      </a>
    );
  },
};

const PolicyPage: React.FC<PolicyPageProps> = ({ eyebrow, docTitle, content }) => {
  useEffect(() => {
    const prev = document.title;
    document.title = docTitle;
    return () => {
      document.title = prev;
    };
  }, [docTitle]);

  return (
    <div className="min-h-screen bg-white font-body">
      <Header />

      <article className="max-w-[720px] mx-auto px-6 md:px-8 pt-24 pb-28">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#0047AB] mb-6">
          {eyebrow}
        </p>
        <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
      </article>

      <Footer />
    </div>
  );
};

export default PolicyPage;
