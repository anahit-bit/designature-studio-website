import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import { useAuth } from '../AuthContext';
import { trackEvent } from '../lib/analytics';

/**
 * /booking/confirmed — shown after a verified payment (Rail B / I-025).
 *
 * Ports WEBSITE-PLAN-booking-confirmed-mockup.html. The user just paid, so the
 * FOCAL action is a large cobalt "Pick your time →" button linking straight to
 * the Calendly URL (new tab) — they book right here, not via their inbox.
 * /api/payments/ameria/confirmation returns the Calendly URL UNCONDITIONALLY; the
 * paid-status + email it also returns just personalize the secondary banner. The
 * confirmation email is the FALLBACK for when they close the tab / book later.
 */

const PREP: string[] = [
  'A few photos of the room — phone shots are completely fine.',
  "A Pinterest board or saved screenshots, if you've been collecting ideas.",
  "What's bothering you about the space — or how you want it to feel.",
  'A rough floor plan, if you happen to have one. Not required.',
];

interface Confirmation {
  paid: boolean;
  email?: string;
  calendlyUrl?: string;
}

const BookingConfirmedPage: React.FC = () => {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const orderId = params.get('order') || '';
  const [loaded, setLoaded] = useState(false);
  const [data, setData] = useState<Confirmation | null>(null);

  useEffect(() => {
    const prev = document.title;
    document.title = "You're booked — Designature Studio";
    return () => {
      document.title = prev;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const url = orderId
      ? `/api/payments/ameria/confirmation?orderId=${encodeURIComponent(orderId)}`
      : '/api/payments/ameria/confirmation';
    fetch(url)
      .then((r) => r.json())
      .then((d: Confirmation) => {
        if (!active) return;
        setData(d);
        setLoaded(true);
        // GA4 purchase fires ONLY for a genuinely paid order (env-gated; no-op locally).
        if (d?.paid) {
          trackEvent('purchase', {
            transaction_id: orderId,
            value: 99,
            currency: 'USD',
            items: [
              { item_id: 'consultation', item_name: 'Paid Consultation', price: 99, quantity: 1 },
            ],
          });
        }
      })
      .catch(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [orderId]);

  const calendlyUrl = data?.calendlyUrl || '';

  return (
    <div className="min-h-screen bg-white font-body text-[#1C1C1C]">
      <Header />

      {/* CONFIRM HERO */}
      <section className="text-center pt-32 md:pt-40 pb-10 px-6">
        <div className="max-w-[1180px] mx-auto">
          <div className="w-[62px] h-[62px] rounded-full bg-[rgba(60,110,71,0.12)] border border-[#3C6E47] text-[#3C6E47] flex items-center justify-center text-[28px] mx-auto mb-6">
            ✓
          </div>
          <h1 className="font-display tracking-architectural text-[clamp(40px,5vw,68px)] leading-[1.05] mb-4">
            You're booked.
            <br />
            Now pick your time.
          </h1>
          <p className="text-[17px] text-[#404040] max-w-[540px] mx-auto leading-relaxed">
            Your payment cleared. Use the link below to choose a 45-minute slot that works for you.
          </p>
        </div>
      </section>

      {/* FOCAL CTA — the largest, most prominent element: book right here, now */}
      <section className="text-center pt-2 pb-14 px-6">
        <div className="max-w-[1180px] mx-auto">
          {!loaded ? (
            <div className="text-[14px] text-[#6B6B6B]">Loading…</div>
          ) : calendlyUrl ? (
            <>
              <a
                href={calendlyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2.5 bg-[#0047AB] text-white px-12 py-6 text-[16px] font-bold uppercase tracking-[0.2em] shadow-[0_16px_36px_rgba(0,71,171,0.32)] transition-all hover:bg-[#0036a0] hover:-translate-y-0.5"
              >
                Pick your time →
              </a>
              <p className="text-[13px] text-[#6B6B6B] mt-4">
                Google Meet link is auto-generated when you book.
              </p>
            </>
          ) : (
            <p className="text-[14px] text-[#404040] max-w-[520px] mx-auto leading-relaxed">
              We've emailed your private booking link — please open it from your inbox to pick your
              time, or write to{' '}
              <a href="mailto:hello@designature.studio" className="text-[#0047AB] font-semibold">
                hello@designature.studio
              </a>
              .
            </p>
          )}
        </div>
      </section>

      {/* PERSONALIZED CONFIRMATION BANNER */}
      <div className="max-w-[1180px] mx-auto px-6">
        <div className="max-w-[680px] mx-auto bg-white border border-[#E7E3DB] border-l-[3px] border-l-[#0047AB] rounded-r-md px-6 py-4 text-[13.5px] text-[#404040]">
          <b className="text-[#1C1C1C]">
            {user?.name ? `Booking confirmed for ${user.name}.` : 'Booking confirmed.'}
          </b>{' '}
          We've emailed the details to{' '}
          <b className="text-[#1C1C1C]">{user?.email || data?.email || 'your inbox'}</b> — if it's not
          there in a few minutes, check your spam folder.
        </div>
      </div>

      {/* WHAT TO HAVE READY */}
      <section className="bg-[#FAFAFA] border-t border-[#E7E3DB] mt-14 py-[60px] px-6">
        <div className="max-w-[1180px] mx-auto">
          <div className="text-center mb-9">
            <span className="inline-block text-[11px] font-bold uppercase tracking-[0.3em] text-[#0047AB] mb-2.5">
              Before we meet
            </span>
            <h2 className="font-display tracking-architectural text-[clamp(28px,3.4vw,40px)]">
              What to have ready.
            </h2>
          </div>
          <div className="max-w-[680px] mx-auto flex flex-col gap-3.5">
            {PREP.map((p, i) => (
              <div
                key={i}
                className="flex gap-3.5 items-start bg-white border border-[#E7E3DB] rounded-md px-[22px] py-[18px]"
              >
                <span className="w-2 h-2 rounded-full bg-[#C97A60] mt-2 flex-shrink-0" />
                <p className="text-[14.5px] text-[#404040] leading-snug">{p}</p>
              </div>
            ))}
          </div>
          <p className="text-center max-w-[620px] mx-auto mt-10 text-[13.5px] text-[#6B6B6B] leading-relaxed">
            A quiet reminder: your <b className="text-[#0047AB]">$99 credits toward a full design project</b> for the
            next 30 days.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default BookingConfirmedPage;
