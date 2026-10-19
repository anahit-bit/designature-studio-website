import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

/**
 * Catch-all for unknown URLs. The server answers these with a real HTTP 404
 * (server/seo/meta.ts → statusForRoute), so Google drops old and mistyped URLs;
 * this screen is what a visitor sees. It deliberately does NOT redirect to the
 * home page — a silent redirect hides the problem and reads as a soft-404.
 */
const LINKS: Array<{ to: string; label: string }> = [
  { to: '/portfolio', label: 'Portfolio' },
  { to: '/ai-concepts', label: 'AI Studio' },
  { to: '/journal', label: 'Journal' },
  { to: '/consultation', label: 'Book a consultation' },
];

const NotFoundPage: React.FC = () => {
  useEffect(() => {
    const prev = document.title;
    document.title = 'Page not found — Designature Studio';
    return () => {
      document.title = prev;
    };
  }, []);

  return (
    <div className="min-h-screen bg-white font-body text-[#1C1C1C]">
      <Header />

      <div className="max-w-[1180px] mx-auto px-6">
        <div className="max-w-[620px] mx-auto pt-36 md:pt-44 pb-20 text-center">
          <div className="text-[10px] tracking-[0.26em] uppercase font-bold text-[#6B6B6B] mb-5">
            Error 404
          </div>
          <h1 className="font-display tracking-architectural text-[clamp(38px,4.8vw,62px)] leading-[1.06] mb-4">
            This page isn't here.
          </h1>
          <p className="text-[17px] text-[#404040] leading-relaxed mb-8">
            The link may be out of date, or the page may have moved when we rebuilt the site.
          </p>

          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2.5 bg-[#0047AB] text-white px-10 text-[14px] font-bold uppercase tracking-[0.2em] transition-all hover:bg-[#0036a0] hover:-translate-y-0.5"
            style={{ paddingTop: '18px', paddingBottom: '18px' }}
          >
            Back to home
          </Link>

          <div className="mt-12 border-t border-[#E7E3DB] pt-8">
            <div className="text-[10px] tracking-[0.26em] uppercase font-bold text-[#6B6B6B] mb-4">
              Or try
            </div>
            <ul className="flex flex-wrap justify-center gap-x-8 gap-y-2">
              {LINKS.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-[#0047AB] font-semibold text-[14px]">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default NotFoundPage;
