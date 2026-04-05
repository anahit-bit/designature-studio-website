import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

const PAIRS = [
  {
    before: 'https://res.cloudinary.com/dys2k5muv/image/upload/c_fill,w_480,h_360,g_auto/v1774284110/before_1_fnbjlt.jpg',
    after:  'https://res.cloudinary.com/dys2k5muv/image/upload/c_fill,w_480,h_360,g_auto/v1774284114/after_1_khwg9g.jpg',
    style:  'Mid-Century',
  },
  {
    before: 'https://res.cloudinary.com/dys2k5muv/image/upload/c_fill,w_480,h_360,g_auto/v1774284111/before_2_k7jvg3.png',
    after:  'https://res.cloudinary.com/dys2k5muv/image/upload/c_fill,w_480,h_360,g_auto/v1774284111/after_2_kzpr3p.png',
    style:  'Bohemian',
  },
  {
    before: 'https://res.cloudinary.com/dys2k5muv/image/upload/c_fill,w_480,h_360,g_auto/v1774284116/before_3_blruai.jpg',
    after:  'https://res.cloudinary.com/dys2k5muv/image/upload/c_fill,w_480,h_360,g_auto/v1774284111/after_3_z5x2lg.png',
    style:  'Modern',
  },
  {
    before: 'https://res.cloudinary.com/dys2k5muv/image/upload/c_fill,w_480,h_360,g_auto/v1774284112/before_4_vpepte.png',
    after:  'https://res.cloudinary.com/dys2k5muv/image/upload/c_fill,w_480,h_360,g_auto/v1774284115/after_4_xgalms.png',
    style:  'Dopamine',
  },
  {
    before: 'https://res.cloudinary.com/dys2k5muv/image/upload/c_fill,w_480,h_360,g_auto/v1774284115/before_5_swe3ua.png',
    after:  'https://res.cloudinary.com/dys2k5muv/image/upload/c_fill,w_480,h_360,g_auto/v1774284109/after_5_hpcmzu.jpg',
    style:  'Rustic',
  },
  {
    before: 'https://res.cloudinary.com/dys2k5muv/image/upload/c_fill,w_480,h_360,g_auto/v1774284116/before_6_s9l1sb.jpg',
    after:  'https://res.cloudinary.com/dys2k5muv/image/upload/c_fill,w_480,h_360,g_auto/v1774284114/after_6_gmuyn5.png',
    style:  'Japandi',
  },
  {
    before: 'https://res.cloudinary.com/dys2k5muv/image/upload/c_fill,w_480,h_360,g_auto/v1774284117/before_7_bwczrl.jpg',
    after:  'https://res.cloudinary.com/dys2k5muv/image/upload/c_fill,w_480,h_360,g_auto/v1774284109/after_7_i66inr.jpg',
    style:  'Mid-Century',
  },
];

// Duplicate for seamless infinite scroll
const ALL_PAIRS = [...PAIRS, ...PAIRS];

const MultimodalSearch: React.FC = () => {
  const { language, t, navigateTo } = useLanguage();

  return (
    <section className="bg-black text-white font-body relative overflow-hidden">

      {/* Subtle grid overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
        <div className="grid grid-cols-6 h-full border-l border-white/20">
          {[...Array(6)].map((_, i) => <div key={i} className="border-r border-white/20 h-full" />)}
        </div>
      </div>

      {/* ── TOP: Header ── */}
      <div className="max-w-[1800px] mx-auto px-8 md:px-16 pt-16 md:pt-20 pb-10 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-12">

          {/* Left — title + tool list */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <Sparkles className="w-4 h-4 text-[#0047AB]" />
              <span className="text-[9px] font-bold uppercase tracking-[0.5em] text-white/40">
                {t('ai.engine')}
              </span>
            </div>
            <h3 className="text-5xl md:text-6xl lg:text-7xl font-bold font-display tracking-tight leading-[0.9] uppercase mb-4">
              {language === 'en'
                ? <><span>Design First.</span><br /><span className="italic font-light text-white/45">Commit Later.</span></>
                : <><span>Design First.</span><br /><span className="italic font-light text-white/45">Commit Later.</span></>}
            </h3>
            <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] mb-8">
              {t('ai.desc')}
            </p>
            {/* Tool list */}
            <div className="flex flex-col gap-3.5 mb-8">
              {[
                { n: '01', label: language === 'en' ? 'Style Quiz — find out what you actually love' : 'Style Quiz', live: true },
                { n: '02', label: language === 'en' ? 'AI Vision — see it in your real room' : 'AI Vision', live: true },
                { n: '03', label: language === 'en' ? 'Shopping List — get the exact products' : 'Shopping List', live: true },
                { n: '04', label: language === 'en' ? 'Room Audit — score your current space' : 'Room Audit', live: false },
                { n: '05', label: language === 'en' ? 'Design Brief — walk in knowing what you want' : 'Design Brief', live: false },
                { n: '06', label: language === 'en' ? 'Cultural Advisor — blend global styles' : 'Cultural Advisor', live: false },
              ].map(tool => (
                <div key={tool.n} className="flex items-center gap-4">
                  <span className={`text-[11px] font-bold tracking-widest w-7 flex-shrink-0 ${tool.live ? 'text-[#0047AB]' : 'text-white/20'}`}>{tool.n}</span>
                  <span className={`text-sm tracking-wide ${tool.live ? 'text-white/70' : 'text-white/25'}`}>{tool.label}</span>
                  {tool.live
                    ? <span className="text-[7px] font-bold uppercase tracking-[0.1em] px-2 py-0.5 bg-green-500/15 text-green-400 flex-shrink-0">Live</span>
                    : <span className="text-[7px] font-bold uppercase tracking-[0.1em] px-2 py-0.5 bg-white/5 text-white/20 flex-shrink-0">Soon</span>
                  }
                </div>
              ))}
            </div>

          </div>

          {/* Right — description */}
          <div className="md:max-w-xs md:text-right hidden md:block">
            <p className="text-white/50 text-sm tracking-wide leading-relaxed">
              {language === 'en'
                ? 'Your complete starting point — style, vision, and shopping list — before you speak to anyone.'
                : "Let's Talk"}
            </p>
          </div>

        </div>
      </div>

      {/* ── MIDDLE: Scrolling before/after strip ── */}
      <div className="relative overflow-hidden py-4">

        {/* Fade edges */}
        <div className="absolute top-0 bottom-0 left-0 w-32 md:w-48 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
        <div className="absolute top-0 bottom-0 right-0 w-32 md:w-48 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />

        {/* Scrolling track — pauses on hover */}
        <div
          className="flex gap-4 w-max"
          style={{
            animation: 'ds-scroll 40s linear infinite',
          }}
          onMouseEnter={e => (e.currentTarget.style.animationPlayState = 'paused')}
          onMouseLeave={e => (e.currentTarget.style.animationPlayState = 'running')}
        >
          {ALL_PAIRS.map((pair, idx) => (
            <div key={idx} className="flex items-center gap-1 flex-shrink-0">

              {/* Before */}
              <div className="relative overflow-hidden flex-shrink-0" style={{ width: 240, height: 180 }}>
                <img
                  src={pair.before}
                  alt={`Before ${idx + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-0.5">
                  <span className="text-[7px] font-bold uppercase tracking-[0.25em] text-white/50">Before</span>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex-shrink-0 px-1 text-white/15 text-sm">→</div>

              {/* After */}
              <div className="relative overflow-hidden flex-shrink-0" style={{ width: 240, height: 180 }}>
                <img
                  src={pair.after}
                  alt={`After ${idx + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-0.5">
                  <span className="text-[7px] font-bold uppercase tracking-[0.25em] text-[#0047AB]">
                    {pair.style}
                  </span>
                </div>
              </div>

            </div>
          ))}
        </div>
      </div>

      {/* ── BOTTOM: Stats + CTA bar ── */}
      <div className="border-t border-white/6 relative z-10">
        <div className="max-w-[1800px] mx-auto px-8 md:px-16 py-8 flex flex-col md:flex-row items-center justify-between gap-6">

          {/* Left — stats */}
          <div className="flex items-center gap-8 md:gap-12">
            <div>
              <div className="text-xl font-bold font-display tracking-tight">3</div>
              <div className="text-[8px] uppercase tracking-[0.3em] text-white/30 mt-0.5">Free concepts</div>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div>
              <div className="text-xl font-bold font-display tracking-tight">12</div>
              <div className="text-[8px] uppercase tracking-[0.3em] text-white/30 mt-0.5">Design styles</div>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div>
              <div className="text-xl font-bold font-display tracking-tight">20s</div>
              <div className="text-[8px] uppercase tracking-[0.3em] text-white/30 mt-0.5">Generation time</div>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div>
              <div className="text-xl font-bold font-display tracking-tight">Free</div>
              <div className="text-[8px] uppercase tracking-[0.3em] text-white/30 mt-0.5">To explore</div>
            </div>
          </div>

          {/* Right — CTA button */}
          <button
            onClick={() => navigateTo('ai-concepts')}
            className="group flex items-center gap-4 bg-[#0047AB] text-white px-10 py-4 text-[10px] font-bold uppercase tracking-[0.4em] hover:bg-[#003d99] transition-all duration-300"
          >
            {t('btn.tryAi')}
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </button>

        </div>
      </div>

      {/* ── CSS animation injected inline ── */}
      <style>{`
        @keyframes ds-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>

    </section>
  );
};

export default MultimodalSearch;
