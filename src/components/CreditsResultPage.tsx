import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import { useAuth } from '../AuthContext';
import { trackEvent } from '../lib/analytics';

/**
 * /credits/success and /credits/failed — where the Ameriabank hosted page returns the
 * browser after a one-time credit pack purchase (I-033).
 *
 * The success page does NOT grant anything; the callback already verified the payment
 * server-side via GetPaymentDetails before crediting. This screen only reports, and
 * reads the balance back so the number shown is the ledger's, never a client guess.
 */

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-white font-body text-[#1C1C1C]">
    <Header />
    <div className="max-w-[1180px] mx-auto px-6">
      <div className="max-w-[620px] mx-auto pt-36 md:pt-44 pb-20 text-center">{children}</div>
    </div>
    <Footer />
  </div>
);

export const CreditsSuccessPage: React.FC = () => {
  const { refreshQuota } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    const prev = document.title;
    document.title = 'Credits added — Designature Studio';
    trackEvent('credits_purchased');
    refreshQuota?.();

    // Read the balance back from the ledger rather than trusting anything in the URL.
    let alive = true;
    fetch('/api/credits/balance', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d?.balance) setBalance(d.balance.total); })
      .catch(() => { /* the credits landed regardless — this is only the display */ });

    return () => { alive = false; document.title = prev; };
  }, [refreshQuota]);

  return (
    <Shell>
      <div className="w-[60px] h-[60px] rounded-full border border-[#15803d] text-[#15803d] flex items-center justify-center text-[30px] mx-auto mb-6">
        ✓
      </div>
      <h1 className="font-display tracking-architectural text-[clamp(38px,4.8vw,62px)] leading-[1.06] mb-4">
        Your credits are in.
      </h1>
      <p className="text-[17px] text-[#404040] leading-relaxed mb-8">
        {balance === null
          ? 'The payment went through and your credits have been added to your account.'
          : `The payment went through. You now have ${balance.toLocaleString('en-US')} credits.`}{' '}
        They never expire — spend them on whatever you need, whenever the project needs it.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <Link
          to="/ai-concepts"
          className="inline-block bg-[#0047AB] text-white text-[11px] font-bold uppercase tracking-[0.2em] px-7 py-4 no-underline"
        >
          Open the AI Studio
        </Link>
        <Link
          to="/account"
          className="inline-block border border-black/25 text-black/75 text-[11px] font-bold uppercase tracking-[0.2em] px-7 py-4 no-underline"
        >
          See my balance
        </Link>
      </div>
    </Shell>
  );
};

export const CreditsFailedPage: React.FC = () => {
  useEffect(() => {
    const prev = document.title;
    document.title = 'Payment not completed — Designature Studio';
    trackEvent('credits_purchase_failed');
    return () => { document.title = prev; };
  }, []);

  return (
    <Shell>
      <div className="w-[60px] h-[60px] rounded-full border border-[#B45309] text-[#B45309] flex items-center justify-center text-[26px] mx-auto mb-6">
        !
      </div>
      <h1 className="font-display tracking-architectural text-[clamp(38px,4.8vw,62px)] leading-[1.06] mb-4">
        That didn&rsquo;t go through.
      </h1>
      <p className="text-[17px] text-[#404040] leading-relaxed mb-8">
        No credits were added and <strong>you have not been charged</strong>. Payment pages
        also expire after about twenty minutes, so if you left the tab open a while, starting
        again is usually all it takes.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <Link
          to="/pricing"
          className="inline-block bg-[#0047AB] text-white text-[11px] font-bold uppercase tracking-[0.2em] px-7 py-4 no-underline"
        >
          Back to pricing
        </Link>
        <a
          href="mailto:hello@designature.studio"
          className="inline-block border border-black/25 text-black/75 text-[11px] font-bold uppercase tracking-[0.2em] px-7 py-4 no-underline"
        >
          Email us
        </a>
      </div>
    </Shell>
  );
};
