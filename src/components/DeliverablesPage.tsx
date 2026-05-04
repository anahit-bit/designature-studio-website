import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * Placeholder route for /deliverables. The home page CTA "See what you'll
 * receive →" links here. S-014 will replace this stub with the full page
 * (sample design brief PDF, deliverable previews, etc.).
 */
const DeliverablesPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="min-h-[60vh] flex items-center justify-center bg-white pt-32 md:pt-40 pb-20 md:pb-24">
      <div className="max-w-[680px] mx-auto px-6 md:px-14 text-center">
        <span className="block text-[12px] md:text-[13px] font-bold uppercase tracking-[0.26em] text-[#6B6B6B] mb-5">
          What you'll receive
        </span>
        <h1 className="font-display font-normal text-[#0A0A0A] leading-[1.1] tracking-[-0.01em] text-[36px] md:text-[48px] lg:text-[56px] mb-7">
          We're putting this page together.
        </h1>
        <p className="text-[16px] md:text-[17px] leading-[1.6] text-[#404040] mb-10 max-w-[520px] mx-auto">
          A full walk-through of the brief, drawings, and material specs you'll get from a Designature
          project — coming soon. In the meantime, write to us and we'll send a sample.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="mailto:hello@designature.studio?subject=Sample design brief"
            className="inline-flex items-center justify-center px-8 py-4 bg-[#0A0A0A] text-white text-[12px] font-bold tracking-[0.25em] uppercase hover:opacity-85 transition-opacity"
          >
            Request a sample
          </a>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center justify-center gap-2 text-[12px] font-bold uppercase tracking-[0.25em] text-[#0047AB] hover:opacity-80 transition-opacity"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back home
          </button>
        </div>
      </div>
    </section>
  );
};

export default DeliverablesPage;
