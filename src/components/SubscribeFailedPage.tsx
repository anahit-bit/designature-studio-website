import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import { trackEvent } from '../lib/analytics';

/**
 * /subscribe/failed — shown when a subscription's first payment is declined or
 * doesn't complete (Rail A). Matter-of-fact; primary action is to try again from
 * the pricing page.
 */
const REASONS: string[] = [
  'Your card was declined by your bank.',
  '3-D Secure authentication timed out.',
  'For international cards, your issuer may block recurring charges.',
];

const SubscribeFailedPage: React.FC = () => {
  useEffect(() => {
    const prev = document.title;
    document.title = "Subscription didn't start — Designature Studio";
    trackEvent('subscription_failed');
    return () => { document.title = prev; };
  }, []);

  return (
    <div className="min-h-screen bg-white font-body text-[#1C1C1C]">
      <Header />
      <div className="max-w-[1180px] mx-auto px-6">
        <div className="max-w-[620px] mx-auto pt-36 md:pt-44 pb-20 text-center">
          <div className="w-[60px] h-[60px] rounded-full border border-[#9E5E41] text-[#9E5E41] flex items-center justify-center text-[30px] mx-auto mb-6">
            ↻
          </div>
          <h1 className="font-display tracking-architectural text-[clamp(38px,4.8vw,62px)] leading-[1.06] mb-4">
            That didn't
            <br />
            go through.
          </h1>
          <p className="text-[17px] text-[#404040] leading-relaxed mb-8">
            Your subscription didn't start and you have not been charged. Most often this is
            a card or 3-D Secure issue — try again, or get in touch and we'll help.
          </p>
          <div>
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center gap-2.5 bg-[#0047AB] text-white px-10 text-[14px] font-bold uppercase tracking-[0.2em] transition-all hover:bg-[#0036a0] hover:-translate-y-0.5 mb-4"
              style={{ paddingTop: '18px', paddingBottom: '18px' }}
            >
              Try again
            </Link>
          </div>
          <p className="text-[13.5px] text-[#6B6B6B]">
            Still stuck?{' '}
            <a href="mailto:hello@designature.studio" className="text-[#0047AB] font-semibold">
              Email hello@designature.studio
            </a>
          </p>
          <div className="max-w-[560px] mx-auto mt-12 text-left border-t border-[#E7E3DB] pt-8">
            <div className="text-[10px] tracking-[0.26em] uppercase font-bold text-[#6B6B6B] text-center mb-[18px]">
              Common reasons
            </div>
            {REASONS.map((r, i) => (
              <div key={i} className="flex gap-3.5 items-start py-2.5">
                <span className="w-[7px] h-[7px] rounded-full bg-[#9E5E41] mt-[7px] flex-shrink-0" />
                <p className="text-[14px] text-[#404040] leading-snug">{r}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default SubscribeFailedPage;
