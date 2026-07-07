import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import { useAuth } from '../AuthContext';
import { trackEvent } from '../lib/analytics';

/**
 * /booking/confirmed — quiet receipt shown after a verified payment (I-025-v2).
 *
 * Book-first: the customer already picked their time on the way in, and Google
 * Calendar has sent the invite with the Meet link + reminders. So this page is a
 * calm confirmation — "You're booked for {slot}" + "check your inbox" — with NO
 * booking CTA. The confirmation endpoint returns the paid status + the booked
 * slot; we render the slot in the customer's local timezone.
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
  slotStartTime?: string | null;
}

function fmtLongLocal(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** "GMT+4" for the customer's own browser timezone — no city name. */
function localGmtLabel(): string {
  const mins = -new Date().getTimezoneOffset();
  const sign = mins >= 0 ? '+' : '-';
  const abs = Math.abs(mins);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `GMT${sign}${h}${m ? ':' + String(m).padStart(2, '0') : ''}`;
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
            items: [{ item_id: 'consultation', item_name: 'Paid Consultation', price: 99, quantity: 1 }],
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

  const slot = data?.slotStartTime || null;

  return (
    <div className="min-h-screen bg-white font-body text-[#1C1C1C]">
      <Header />

      {/* CONFIRM HERO */}
      <section className="text-center pt-32 md:pt-40 pb-10 px-6">
        <div className="max-w-[1180px] mx-auto">
          <div className="w-[62px] h-[62px] rounded-full bg-[rgba(21,128,61,0.12)] border border-[#15803d] text-[#15803d] flex items-center justify-center text-[28px] mx-auto mb-6">
            ✓
          </div>
          <h1 className="font-display tracking-architectural text-[clamp(40px,5vw,68px)] leading-[1.05] mb-4">
            {!loaded ? (
              "You're booked."
            ) : slot ? (
              <>
                You're booked for
                <br />
                <em className="italic text-[#0047AB]">{fmtLongLocal(slot)}</em>.
              </>
            ) : (
              "You're booked."
            )}
          </h1>
          <p className="text-[17px] text-[#404040] max-w-[560px] mx-auto leading-relaxed">
            Your payment cleared. Check your inbox — Google Calendar has sent your invitation with the{' '}
            <b className="text-[#1C1C1C]">Google Meet link</b> and reminders.
            {slot ? ` Times are shown in ${localGmtLabel()} (your local time).` : ''}
          </p>
        </div>
      </section>

      {/* PERSONALIZED CONFIRMATION BANNER */}
      <div className="max-w-[1180px] mx-auto px-6">
        <div className="max-w-[680px] mx-auto bg-white border border-[#E7E3DB] border-l-[3px] border-l-[#0047AB] rounded-r-md px-6 py-4 text-[13.5px] text-[#404040]">
          <b className="text-[#1C1C1C]">
            {user?.name ? `Booking confirmed for ${user.name}.` : 'Booking confirmed.'}
          </b>{' '}
          We've emailed the details to{' '}
          <b className="text-[#1C1C1C]">{user?.email || data?.email || 'your inbox'}</b> — if the calendar
          invite isn't there in a few minutes, check your spam folder.
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
                <span className="w-2 h-2 rounded-full bg-[#9E5E41] mt-2 flex-shrink-0" />
                <p className="text-[14.5px] text-[#404040] leading-snug">{p}</p>
              </div>
            ))}
          </div>
          <p className="text-center max-w-[620px] mx-auto mt-10 text-[13.5px] text-[#6B6B6B] leading-relaxed">
            A quiet reminder: your <b className="text-[#0047AB]">$99 credits toward a full design project</b> for
            the next 30 days. Need to reschedule or cancel? Reply to your confirmation email or write to{' '}
            <a href="mailto:hello@designature.studio" className="text-[#0047AB] font-semibold">
              hello@designature.studio
            </a>
            .
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default BookingConfirmedPage;
