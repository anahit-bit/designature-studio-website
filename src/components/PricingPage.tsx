import React from 'react';
import Header from './Header';
import PricingSection from './PricingSection';
import Footer from './Footer';
import { useLanguage } from '../LanguageContext';
import { ArrowLeft } from 'lucide-react';

const PricingPage: React.FC = () => {
  const { navigateTo } = useLanguage();

  return (
    <div className="min-h-screen bg-white font-body">
      <Header />
      <div className="pt-20 pb-0">
        <div className="max-w-[1800px] mx-auto px-8 md:px-16 py-8">
          <button
            onClick={() => navigateTo('home')}
            className="text-[9px] font-bold uppercase tracking-[0.35em] text-black/30 hover:text-black/60 transition-colors flex items-center gap-2 group"
          >
            <ArrowLeft className="w-3 h-3 transition-transform group-hover:-translate-x-1" />
            Back to Home
          </button>
        </div>
      </div>
      <PricingSection compact />
      <Footer />
    </div>
  );
};

export default PricingPage;
