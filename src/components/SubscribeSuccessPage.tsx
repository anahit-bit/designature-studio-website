import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import { useAuth } from '../AuthContext';
import { trackEvent } from '../lib/analytics';

/**
 * /subscribe/success — shown after the Ameriabank hosted page returns and the
 * subscription-callback has activated the subscription (Rail A). Quiet, matter-of-
 * fact confirmation; primary action is to open the AI Studio.
 */
const SubscribeSuccessPage: React.FC = () => {
  const { refreshQuota } = useAuth();
  useEffect(() => {
    const prev = document.title;
    document.title = "You're subscribed — Designature Studio";
    trackEvent('subscription_activated');
    // Refresh the client's cached user so the header reflects the new state.
    refreshQuota?.();
    return () => { document.title = prev; };
  }, [refreshQuota]);

  return (
    <div className="min-h-screen bg-white font-body text-[#1C1C1C]">
      <Header />
      <div className="max-w-[1180px] mx-auto px-6">
        <div className="max-w-[620px] mx-auto pt-36 md:pt-44 pb-20 text-center">
          <div className="w-[60px] h-[60px] rounded-full border border-[#15803d] text-[#15803d] flex items-center justify-center text-[30px] mx-auto mb-6">
            ✓
          </div>
          <h1 className="font-display tracking-architectural text-[clamp(38px,4.8vw,62px)] leading-[1.06] mb-4">
            You're subscribed.
          </h1>
          <p className="text-[17px] text-[#404040] leading-relaxed mb-8">
            Your subscription is active. A receipt is on its way to your inbox. You can
            manage or cancel anytime — cancelling keeps your access until the end of the
            period you've already paid for.
          </p>
          <div>
            <Link
              to="/ai-concepts"
              className="inline-flex items-center justify-center gap-2.5 bg-[#0047AB] text-white px-10 text-[14px] font-bold uppercase tracking-[0.2em] transition-all hover:bg-[#0036a0] hover:-translate-y-0.5 mb-4"
              style={{ paddingTop: '18px', paddingBottom: '18px' }}
            >
              Open the AI Studio
            </Link>
          </div>
          <p className="text-[13.5px] text-[#6B6B6B]">
            Questions about your subscription?{' '}
            <a href="mailto:hello@designature.studio" className="text-[#0047AB] font-semibold">
              Email hello@designature.studio
            </a>
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default SubscribeSuccessPage;
