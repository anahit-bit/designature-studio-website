import React, { useEffect, useState } from 'react';
import Header from './Header';
import Footer from './Footer';
import { useAuth } from '../AuthContext';
import { trackEvent } from '../lib/analytics';

/**
 * /consultation — paid $99 / 45-min virtual consultation funnel (Rail B / I-025).
 *
 * Ports WEBSITE-PLAN-consultation-page-mockup.html onto the real site chrome
 * (shared <Header/> + <Footer/>). White-dominant, cobalt primary, oxide accents,
 * Cormorant (font-display) + Montserrat (font-body) per the locked design system.
 *
 * The form posts to /api/payments/ameria/initiate and redirects the browser to
 * the Ameriabank hosted page. No public surface links here yet — entry buttons
 * ship in PR 2 after sandbox testing passes.
 */

const COBALT = '#0047AB';

const INCLUDED: Array<{ n: string; title: string; body: string }> = [
  {
    n: '01',
    title: '45 minutes on Google Meet',
    body: 'A focused, designer-led conversation — face to face, screen-sharing as we go.',
  },
  {
    n: '02',
    title: 'A real review of your room',
    body: "We look at your photos, Pinterest, or floor plan together and talk through what's working and what isn't.",
  },
  {
    n: '03',
    title: 'Direction you can act on',
    body: 'Style direction, palette ideas, or layout feedback — whatever you need most for your space.',
  },
  {
    n: '04',
    title: 'A written recap',
    body: 'A short follow-up email within 48 hours with the key takeaways, so nothing gets lost.',
  },
];

const FAQS: Array<{ q: string; a: React.ReactNode; open?: boolean }> = [
  {
    q: "What if I can't make my slot?",
    a: 'No problem — you can reschedule any time through the booking link, right up to the session.',
    open: true,
  },
  {
    q: 'Can I reschedule or cancel?',
    a: (
      <>
        Yes. Reschedule or cancel free up to 24 hours before your booked start time for a full refund. If we can't hold the call, you're fully refunded — your choice of a rebook or your money back. See our{' '}
        <a
          href="/refund"
          className="text-[#0047AB] font-semibold hover:text-[#9E5E41] transition-colors"
        >
          Refund Policy
        </a>{' '}
        for details.
      </>
    ),
  },
  {
    q: 'What if I want a full project instead?',
    a: 'Even better. Your $99 credits straight toward a Designature design project if you book one within 30 days.',
  },
  {
    q: 'Do I need to prepare anything?',
    a: 'Whatever you have helps — a few room photos, a Pinterest board, or a rough sketch. Nothing formal required.',
  },
  {
    q: 'What if I just want a free chat first?',
    a: (
      <>
        That's completely fine.{' '}
        <a
          href="https://calendly.com/designature-studio-us/free_consultation"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#0047AB] font-semibold hover:text-[#9E5E41] transition-colors"
        >
          Book a free introductory call →
        </a>{' '}
        and we'll see if a paid session or a full project is the better next step.
      </>
    ),
  },
];

const SectionHead: React.FC<{ label: string; title: string }> = ({ label, title }) => (
  <div className="text-center mb-12">
    <span className="inline-block text-[11px] font-bold uppercase tracking-[0.3em] text-[#0047AB]">
      {label}
    </span>
    <h2 className="font-display tracking-architectural text-[clamp(30px,3.6vw,44px)] leading-tight mt-3">
      {title}
    </h2>
    <span className="block w-[50px] h-[2px] bg-[#9E5E41] mx-auto mt-4" />
  </div>
);

const GoogleG: React.FC = () => (
  <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden="true">
    <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
    <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
    <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
  </svg>
);

const ConsultationPage: React.FC = () => {
  const { user, isLoading: authLoading, signIn, apiFetch } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const prev = document.title;
    document.title = 'Book a paid consultation — Designature Studio';
    return () => {
      document.title = prev;
    };
  }, []);

  const handleBook = async () => {
    setError(null);
    setSubmitting(true);
    // GA4 e-commerce begin-checkout signal (env-gated; no-op on localhost).
    trackEvent('consultation_initiated', { value: 99 });
    try {
      // apiFetch attaches the x-session-token; the server reads the email from
      // the session, so no body is needed.
      const res = await apiFetch('/api/payments/ameria/initiate', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.redirectUrl) {
        setError(data?.error || "We couldn't start checkout. Please try again.");
        setSubmitting(false);
        return;
      }
      window.location.href = data.redirectUrl;
    } catch {
      setError('Network error. Please check your connection and try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white font-body text-[#1C1C1C]">
      <Header />

      {/* HERO */}
      <section className="text-center pt-32 md:pt-40 pb-16 px-6">
        <div className="max-w-[1180px] mx-auto">
          <span className="inline-block text-[11px] font-bold uppercase tracking-[0.3em] text-[#0047AB] mb-5">
            Paid consultation · 45 minutes
          </span>
          <h1 className="font-display tracking-architectural text-[clamp(44px,5.4vw,76px)] leading-[1.04] mb-5">
            A focused 45 minutes
            <br />
            on <em className="italic text-[#0047AB]">your space.</em>
          </h1>
          <p className="text-[18px] text-[#404040] max-w-[600px] mx-auto mb-7 leading-relaxed">
            A paid virtual consultation with the studio. Bring your questions, photos, or a Pinterest
            board — and walk away with concrete direction.
          </p>
          <div className="inline-flex items-baseline gap-2.5 mb-7">
            <span className="font-display text-[46px] leading-none">$99</span>
            <span className="text-[12px] uppercase tracking-[0.18em] text-[#6B6B6B] font-semibold">
              · one session · 45 min
            </span>
          </div>
          <div>
            <a
              href="#book"
              className="inline-flex items-center justify-center gap-2.5 bg-[#0047AB] text-white px-10 py-5 text-[14px] font-bold uppercase tracking-[0.2em] transition-all hover:bg-[#0036a0] hover:-translate-y-0.5"
            >
              Book &amp; pay $99
            </a>
          </div>
          <span className="block mt-5 text-[13px] text-[#6B6B6B]">
            Just want a free chat first?{' '}
            <a href="#faq" className="text-[#0047AB] font-semibold">
              That option's still here →
            </a>
          </span>
        </div>
      </section>

      {/* WHAT'S INCLUDED */}
      <section className="bg-[#FAFAFA] border-t border-[#E7E3DB] py-[72px] px-6">
        <div className="max-w-[1180px] mx-auto">
          <SectionHead label="What's included" title="What the session covers." />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[22px] max-w-[900px] mx-auto">
            {INCLUDED.map((c) => (
              <div
                key={c.n}
                className="flex gap-4 bg-white border border-[#E7E3DB] rounded-md px-7 py-6"
              >
                <div className="font-display text-[30px] text-[#0047AB] leading-none flex-shrink-0">
                  {c.n}
                </div>
                <div>
                  <h3 className="font-display text-[21px] leading-tight mb-1">{c.title}</h3>
                  <p className="text-[13.5px] text-[#404040] leading-relaxed">{c.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CREDIT CALLOUT */}
      <section className="border-t border-[#E7E3DB] py-[72px] px-6">
        <div className="max-w-[1180px] mx-auto">
          <div className="bg-[#0047AB] text-white rounded-lg max-w-[900px] mx-auto px-11 py-10 text-center">
            <span className="inline-block text-[11px] font-bold uppercase tracking-[0.3em] text-white/70">
              No risk if you go further
            </span>
            <p className="font-display text-[clamp(24px,3vw,32px)] leading-snug mt-3">
              Your <em className="italic">$99 is fully creditable</em> toward a Designature design
              project — if you book one within 30 days.
            </p>
          </div>
        </div>
      </section>

      {/* BOOKING FORM */}
      <section id="book" className="bg-[#FAFAFA] border-t border-[#E7E3DB] py-[72px] px-6 scroll-mt-24">
        <div className="max-w-[1180px] mx-auto">
          <SectionHead label="Book your session" title="Reserve your 45 minutes." />
          <div className="max-w-[560px] mx-auto bg-white border border-[#E7E3DB] rounded-lg px-10 pt-10 pb-9 shadow-[0_20px_50px_rgba(0,0,0,0.06)]">
            <div className="flex items-baseline justify-between mb-6">
              <h3 className="font-display text-[26px]">Book &amp; pay</h3>
              <span className="font-display text-[30px] text-[#0047AB]">$99</span>
            </div>

            {authLoading ? (
              <p className="text-[13px] text-[#6B6B6B]">Loading…</p>
            ) : !user ? (
              <>
                <p className="text-[14.5px] text-[#404040] leading-relaxed mb-5">
                  Sign in with Google to book — your booking link will go to your verified inbox.
                </p>
                <button
                  type="button"
                  onClick={() => signIn({ source: 'consultation' })}
                  className="w-full inline-flex items-center justify-center gap-3 border border-[#1C1C1C]/20 bg-white px-8 py-3.5 text-[13px] font-semibold text-[#1C1C1C] tracking-[0.02em] transition-colors hover:border-[#1C1C1C]/50 hover:bg-black/[0.02]"
                >
                  <GoogleG /> Sign in with Google
                </button>
              </>
            ) : (
              <>
                <div className="mb-5">
                  <label className="block text-[10px] uppercase tracking-[0.18em] font-bold text-[#6B6B6B] mb-2">
                    Booking link goes to
                  </label>
                  <div className="w-full border border-[#E7E3DB] bg-[#FAFAFA] px-4 py-3.5 text-[15px] text-[#1C1C1C] truncate">
                    {user.email}
                  </div>
                  <p className="text-[12px] text-[#6B6B6B] mt-2">
                    We'll send your booking link to{' '}
                    <span className="text-[#1C1C1C] font-semibold">{user.email}</span>.
                  </p>
                </div>

                {error && (
                  <p role="alert" className="text-[13px] text-[#9E5E41] font-semibold mb-3">
                    {error}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleBook}
                  disabled={submitting}
                  className="w-full inline-flex items-center justify-center gap-2.5 bg-[#0047AB] text-white px-8 py-4 text-[13px] font-bold uppercase tracking-[0.2em] transition-all hover:bg-[#0036a0] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Redirecting to secure payment…' : 'Book & pay $99 →'}
                </button>
              </>
            )}

            <p className="text-[12px] text-[#6B6B6B] leading-relaxed mt-4 text-center">
              You'll be redirected to Ameriabank's secure payment page. After payment, we'll email you a
              private link to pick your time.
            </p>

            <div className="flex flex-col gap-2.5 mt-5 pt-5 border-t border-[#E7E3DB]">
              <div className="flex items-center gap-2.5 text-[12px] text-[#404040]">
                <span className="w-5 text-center flex-shrink-0">🔒</span> Secure payment via Ameriabank
                VPOS
              </div>
              <div className="flex items-center gap-2.5 text-[12px] text-[#404040]">
                <span className="w-5 text-center flex-shrink-0">💳</span> Visa, Mastercard &amp; ArCa
                accepted
              </div>
              <div className="flex items-center gap-2.5 text-[12px] text-[#404040]">
                <span className="w-5 text-center flex-shrink-0">↩</span> Free cancel up to 24h before
                — see{' '}
                <a href="/refund" className="text-[#0047AB] font-semibold hover:text-[#9E5E41] transition-colors">
                  Refund Policy
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-[#E7E3DB] py-[72px] px-6 scroll-mt-24">
        <div className="max-w-[1180px] mx-auto">
          <SectionHead label="Good to know" title="Questions, answered." />
          <div className="max-w-[760px] mx-auto">
            {FAQS.map((f, i) => (
              <details
                key={i}
                open={f.open}
                className="group border-b border-[#E7E3DB] py-1"
              >
                <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer py-[18px] text-[16px] font-semibold flex justify-between items-center gap-4">
                  <span>{f.q}</span>
                  <span className="font-display text-[26px] text-[#0047AB] leading-none group-open:hidden">
                    +
                  </span>
                  <span className="font-display text-[26px] text-[#0047AB] leading-none hidden group-open:block">
                    –
                  </span>
                </summary>
                <p className="text-[14px] text-[#404040] leading-relaxed pb-5 max-w-[640px]">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ConsultationPage;
