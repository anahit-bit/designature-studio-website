/**
 * AI-disclosure banner — shown on an article when `post.aiDisclosure === true`.
 * Honest, low-key label: content was AI-drafted and reviewed by the studio team.
 */
import React from 'react';
import { Sparkles } from 'lucide-react';

const AIDisclosureBanner: React.FC = () => (
  <div className="flex items-start gap-3 border border-[#E4DACd] bg-[#FAF6EF] px-5 py-4 text-black/70">
    <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#9E5E41]" aria-hidden />
    <p className="text-[13px] leading-relaxed">
      <span className="font-bold uppercase tracking-[0.15em] text-[11px] text-black/80">
        AI-assisted
      </span>
      <span className="mx-2 text-black/30">·</span>
      This article was AI-generated and reviewed by our team for accuracy and tone.
    </p>
  </div>
);

export default AIDisclosureBanner;
