import React from 'react';
import Header from './Header';
import PricingSection from './PricingSection';
import Footer from './Footer';
import CTABanner from './CTABanner';
import { useLanguage } from '../LanguageContext';
import { ArrowLeft } from 'lucide-react';

const PricingPage: React.FC = () => {
  const { navigateTo } = useLanguage();

  return (
    <div className="min-h-screen bg-white font-body">
      <Header />

      {/* Hero */}
      <section className="relative w-full h-[85vh] md:h-screen overflow-hidden bg-black font-body">
        <div
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(https://res.cloudinary.com/dys2k5muv/image/upload/v1772391549/3d_render_2_uoxs3r.jpg)` }}
        >
          <div className="absolute inset-0 bg-black/50 z-[1]" />
        </div>
        <div className="relative z-10 h-full max-w-[1800px] mx-auto px-8 md:px-16 flex flex-col justify-center pb-20">
          <div className="max-w-4xl pt-20">
            <button
              onClick={() => navigateTo('home')}
              className="text-[9px] font-bold uppercase tracking-[0.35em] text-white/40 mb-10 hover:text-white transition-colors flex items-center gap-2 group w-fit"
            >
              <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
              Back to Home
            </button>
            <h1 className="text-3xl md:text-5xl lg:text-[5.5vw] font-bold font-display text-white tracking-architectural leading-[0.85] uppercase mb-8 animate-in fade-in slide-in-from-bottom duration-1000">
              Pricing.
            </h1>
            <p className="text-white/60 text-base font-light leading-relaxed animate-in fade-in slide-in-from-bottom duration-1000 delay-300">
              Start free — no card needed. Paid plans launching soon.
            </p>
          </div>
        </div>
      </section>

      <div className="bg-white w-full">
        <div className="max-w-[1800px] mx-auto px-8 md:px-16 pt-16 pb-2">
          <h2 className="text-3xl md:text-5xl font-bold font-display text-black tracking-architectural uppercase leading-[0.9] text-center">
            Simple, honest pricing.
          </h2>
        </div>
      </div>
      <PricingSection hideHeader />
      <CTABanner />
      <Footer />
    </div>
  );
};

export default PricingPage;
