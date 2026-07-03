import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import Header from './Header';
import Footer from './Footer';
import CTABanner from './CTABanner';
// Single source of truth — shared with the server-side FAQ JSON-LD + prerender.
import { FAQ_SECTIONS } from '../data/faqs';

const FAQS = FAQ_SECTIONS;

const FAQPage: React.FC = () => {
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  const toggle = (key: string) =>
    setOpenMap(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="min-h-screen bg-white font-body">
      <Header />

      <div className="max-w-[1800px] mx-auto px-8 md:px-16 pt-24 pb-20">
        <div className="max-w-3xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.5em] lg:tracking-[1em] text-black/65 mb-6">FAQ</p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-display tracking-architectural leading-[1] mb-6">
            Questions &amp; answers.
          </h1>
          <p className="text-black/75 text-sm md:text-base font-light leading-relaxed">
            Everything you need to know about the AI Studio, our design tools, and how we work.
          </p>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-8 md:px-16 pb-24">
        <div className="flex flex-col gap-16">
          {FAQS.map((section) => (
            <div key={section.category} className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6 lg:gap-20">
              <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-[#0047AB] lg:pt-5 lg:sticky lg:top-28 lg:self-start">
                {section.category}
              </p>
              <div className="flex flex-col divide-y divide-black/8 max-w-3xl">
                {section.items.map((item, idx) => {
                  const key = `${section.category}-${idx}`;
                  const isOpen = !!openMap[key];
                  return (
                    <div key={key}>
                      <button
                        onClick={() => toggle(key)}
                        className="w-full flex items-start justify-between gap-6 py-5 text-left group"
                      >
                        <span className="text-sm md:text-base font-medium text-black group-hover:text-[#0047AB] transition-colors leading-snug">
                          {item.q}
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 text-black/55 flex-shrink-0 mt-1 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {isOpen && (
                        <p className="text-[14px] md:text-[15px] text-black/75 leading-relaxed pb-5 pr-10">
                          {item.a}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <CTABanner />
      <Footer />
    </div>
  );
};

export default FAQPage;
