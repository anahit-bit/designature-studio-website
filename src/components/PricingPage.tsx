import React, { useEffect } from 'react';
import Header from './Header';
import PricingSection from './PricingSection';
import Footer from './Footer';
import { useLanguage } from '../LanguageContext';
import { ArrowLeft } from 'lucide-react';
import { cld, cldSrcSet, DEFAULT_WIDTHS } from '../lib/cld';

const PRICING_HERO = 'https://res.cloudinary.com/dys2k5muv/image/upload/v1772391549/3d_render_2_uoxs3r.jpg';

/** A CTA elsewhere can request that we land on the plans (not the hero) by setting this
 *  before navigating. We honour it once, then clear it. */
export const PRICING_SCROLL_KEY = 'ds_pricing_scroll';

const PricingPage: React.FC = () => {
  const { navigateTo, t } = useLanguage();

  // When a CTA asked to land on the plans, scroll past the hero. We run inside rAF so we
  // win against LanguageContext's on-navigation scroll-to-top (which fires synchronously
  // on this same commit); the rAF callback runs on the next frame, after that reset.
  useEffect(() => {
    let flagged = false;
    try {
      flagged = sessionStorage.getItem(PRICING_SCROLL_KEY) === 'plans';
    } catch { /* sessionStorage unavailable — just land on top */ }
    if (!flagged) return;
    // Consume the flag INSIDE the rAF (not here): in dev, StrictMode runs
    // mount → cleanup → mount, and clearing the flag in the effect body would make the
    // second mount miss it. The rAF also beats LanguageContext's synchronous
    // scroll-to-top fired on this same navigation commit.
    const id = requestAnimationFrame(() => {
      try { sessionStorage.removeItem(PRICING_SCROLL_KEY); } catch { /* ignore */ }
      document.getElementById('pricing-plans')?.scrollIntoView({ behavior: 'auto', block: 'start' });
    });
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="min-h-screen bg-white font-body">
      <Header />

      {/* Hero */}
      <section className="relative w-full h-[85vh] md:h-screen overflow-hidden bg-black font-body">
        <div className="absolute inset-0 z-0">
          <img
            src={cld(PRICING_HERO, 1920)}
            srcSet={cldSrcSet(PRICING_HERO, DEFAULT_WIDTHS)}
            sizes="100vw"
            width={1920} height={1080}
            loading="eager"
            fetchPriority="high"
            decoding="sync"
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            draggable={false}
          />
          <div className="absolute inset-0 bg-black/50 z-[1]" />
        </div>
        <div className="relative z-10 h-full max-w-[1800px] mx-auto px-8 md:px-16 flex flex-col justify-center pb-20">
          <div className="max-w-4xl pt-20">
            <button
              onClick={() => navigateTo('home')}
              className="text-[11px] font-bold uppercase tracking-[0.35em] text-white/75 mb-10 hover:text-white transition-colors flex items-center gap-2 group w-fit"
            >
              <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
              {t('pricing.backHome')}
            </button>
            <h1 className="text-3xl md:text-5xl lg:text-[5.5vw] font-bold font-display text-white tracking-architectural leading-[0.85] uppercase animate-in fade-in slide-in-from-bottom duration-1000">
              {t('pricing.hero')}
            </h1>
            <span aria-hidden className="block w-20 h-[2px] bg-[#9E5E41] my-7" />
            <p className="text-white/80 text-base md:text-lg font-light leading-relaxed animate-in fade-in slide-in-from-bottom duration-1000 delay-300">
              {t('pricing.subtitle')}
            </p>
          </div>
        </div>
      </section>

      <div id="pricing-plans" className="bg-white w-full scroll-mt-28">
        <div className="max-w-[1800px] mx-auto px-8 md:px-16 pt-16 pb-2">
          <h2 className="text-3xl md:text-5xl font-bold font-display text-black tracking-architectural uppercase leading-[0.9] text-center">
            {t('pricing.title')}
          </h2>
        </div>
      </div>
      {/* The PricingSection ends with the $99 consultation band (I-025 PR 2), which is
          now the page's single bottom CTA. The universal <CTABanner/> ("Start a
          conversation", free) is intentionally omitted here so the free "talk to us"
          offer doesn't appear twice and sandwich the paid consultation on the one page
          where the visitor is in a paying mindset. CTABanner stays site-wide elsewhere;
          the Header "Let's talk" still preserves the free-chat path. */}
      <PricingSection hideHeader />
      <Footer />
    </div>
  );
};

export default PricingPage;
