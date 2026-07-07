import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Header from './Header';
import Footer from './Footer';
import { useAuth } from '../AuthContext';
import { trackEvent } from '../lib/analytics';

/**
 * /consultation — book-first paid $99 / 45-min virtual consultation (I-025-v2).
 *
 * Flow: sign in with Google → pick a slot from the next 30 days (availability =
 * studio working hours minus Google-Calendar busy minus live holds) → the server
 * HOLDS the slot for 20 minutes and reserves the Ameriabank payment → "Book & pay"
 * redirects to the gateway. On success Google Calendar creates the event + Meet
 * link. No Calendly anywhere.
 *
 * White-dominant, cobalt primary, oxide/terracotta accents, Cormorant
 * (font-display) + Montserrat (font-body) per the locked design system. Slot
 * times are rendered in the CUSTOMER's local timezone.
 */

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
    q: 'How do I get my Google Meet link?',
    a: 'As soon as your payment clears, Google Calendar sends you an invitation for your chosen time — it carries the Meet link and reminders, and shows the time in your own timezone. Nothing else to book.',
    open: true,
  },
  {
    q: 'Can I reschedule or cancel?',
    a: (
      <>
        Yes. Reschedule or cancel free up to 24 hours before your booked start time for a full refund.
        Just reply to your confirmation email or write to{' '}
        <a
          href="mailto:hello@designature.studio"
          className="text-[#0047AB] font-semibold hover:text-[#9E5E41] transition-colors"
        >
          hello@designature.studio
        </a>
        . See our{' '}
        <a href="/refund" className="text-[#0047AB] font-semibold hover:text-[#9E5E41] transition-colors">
          Refund Policy
        </a>{' '}
        for details.
      </>
    ),
  },
  {
    q: "What if I don't pay in time?",
    a: "When you pick a slot we hold it for 20 minutes so you can pay without losing it. If the payment isn't completed in that window, the slot is simply released back to the calendar — no charge, and you're welcome to start again.",
  },
  {
    q: 'What if I want a full project instead?',
    a: 'Even better. Your $99 credits straight toward a Designature design project if you book one within 30 days.',
  },
  {
    q: 'Do I need to prepare anything?',
    a: 'Whatever you have helps — a few room photos, a Pinterest board, or a rough sketch. Nothing formal required.',
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

// ── Slot formatting (customer's local timezone) ──────────────────────────────

interface DayGroup {
  key: string; // yyyy-mm-dd in local tz
  label: string; // "Tuesday, 14 January"
  slots: string[]; // ISO UTC
}

function groupByDay(slots: string[]): DayGroup[] {
  const dayFmt = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const keyFmt = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const groups = new Map<string, DayGroup>();
  for (const iso of slots) {
    const d = new Date(iso);
    const key = keyFmt.format(d);
    if (!groups.has(key)) groups.set(key, { key, label: dayFmt.format(d), slots: [] });
    groups.get(key)!.slots.push(iso);
  }
  return Array.from(groups.values());
}

function fmtTime(iso: string): string {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
}

function fmtLongLocal(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

/** "GMT+4" / "GMT-5:30" for the customer's own browser timezone — no city name. */
function localGmtLabel(): string {
  const mins = -new Date().getTimezoneOffset(); // e.g. +240 → GMT+4
  const sign = mins >= 0 ? '+' : '-';
  const abs = Math.abs(mins);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `GMT${sign}${h}${m ? ':' + String(m).padStart(2, '0') : ''}`;
}

// ── Hold / countdown modal ───────────────────────────────────────────────────

const HoldModal: React.FC<{
  slotIso: string;
  holdExpiresAt: string;
  onPay: () => void;
  onClose: () => void;
  onExpire: () => void;
}> = ({ slotIso, holdExpiresAt, onPay, onClose, onExpire }) => {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Math.floor((Date.parse(holdExpiresAt) - Date.now()) / 1000)),
  );

  useEffect(() => {
    const tick = () => {
      const secs = Math.max(0, Math.floor((Date.parse(holdExpiresAt) - Date.now()) / 1000));
      setRemaining(secs);
      if (secs <= 0) onExpire();
    };
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [holdExpiresAt, onExpire]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  const expired = remaining <= 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-6 py-12 font-body"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-white border border-[#E7E3DB] shadow-[0_24px_60px_rgba(0,0,0,0.16)] w-full max-w-[480px] p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="inline-block text-[10px] font-bold uppercase tracking-[0.3em] text-[#0047AB] mb-3">
          Slot reserved
        </span>
        <h3 className="font-display text-[28px] leading-tight mb-2">
          You've reserved
          <br />
          {fmtLongLocal(slotIso)}.
        </h3>
        <p className="text-[13.5px] text-[#6B6B6B] mb-6">{localGmtLabel()} · your local time</p>

        {!expired ? (
          <>
            <div className="flex items-center gap-3 mb-6 px-4 py-3.5 bg-[#FAFAFA] border border-[#E7E3DB]">
              <span className="text-[22px]">⏳</span>
              <div>
                <p className="text-[13px] text-[#404040] leading-snug">
                  Complete payment within{' '}
                  <b className="text-[#1C1C1C] tabular-nums">
                    {mm}:{ss}
                  </b>{' '}
                  to confirm this time.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onPay}
              className="w-full inline-flex items-center justify-center gap-2.5 bg-[#0047AB] text-white px-8 py-4 text-[13px] font-bold uppercase tracking-[0.2em] transition-all hover:bg-[#0036a0]"
            >
              Book &amp; pay $99 →
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full mt-3 text-[12px] font-semibold text-[#6B6B6B] hover:text-[#1C1C1C] py-2"
            >
              Pick a different time
            </button>
          </>
        ) : (
          <>
            <p className="text-[14px] text-[#9E5E41] font-semibold mb-5">
              This hold has expired and the slot has been released. Please choose another time.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full inline-flex items-center justify-center bg-[#0047AB] text-white px-8 py-4 text-[13px] font-bold uppercase tracking-[0.2em] hover:bg-[#0036a0]"
            >
              Back to available times
            </button>
          </>
        )}
        <p className="text-[11px] text-[#9a9a9a] leading-relaxed mt-4 text-center">
          You'll be redirected to Ameriabank's secure payment page. 🔒 Visa, Mastercard &amp; ArCa accepted.
        </p>
      </div>
    </div>
  );
};

// ── Slot picker ──────────────────────────────────────────────────────────────

interface HoldState {
  orderId: string;
  redirectUrl: string;
  slotIso: string;
  holdExpiresAt: string;
}

const SlotPicker: React.FC = () => {
  const { apiFetch } = useAuth();
  const [slots, setSlots] = useState<string[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState(0);

  const [holding, setHolding] = useState(false);
  const [holdError, setHoldError] = useState<string | null>(null);
  const [hold, setHold] = useState<HoldState | null>(null);
  const releasedRef = useRef(false);

  const loadSlots = useCallback(async () => {
    setLoadError(null);
    setSlots(null);
    try {
      const res = await apiFetch('/api/consultation/slots');
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !Array.isArray(data?.slots)) {
        setLoadError(data?.error || "We couldn't load availability. Please try again.");
        setSlots([]);
        return;
      }
      setSlots(data.slots);
      setActiveDay(0);
    } catch {
      setLoadError('Network error. Please check your connection and try again.');
      setSlots([]);
    }
  }, [apiFetch]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  const days = useMemo(() => (slots ? groupByDay(slots) : []), [slots]);

  const releaseHold = useCallback(
    (orderId: string) => {
      if (releasedRef.current) return;
      releasedRef.current = true;
      // Best-effort — keepalive so it still fires if the tab is closing.
      apiFetch('/api/consultation/release', {
        method: 'POST',
        body: JSON.stringify({ orderId }),
        keepalive: true,
      } as RequestInit).catch(() => {});
    },
    [apiFetch],
  );

  const pickSlot = async (iso: string) => {
    if (holding) return;
    setHoldError(null);
    setHolding(true);
    trackEvent('consultation_initiated', { value: 99 });
    try {
      const res = await apiFetch('/api/consultation/hold', {
        method: 'POST',
        body: JSON.stringify({ slot_start_time: iso }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.redirectUrl || !data?.orderId) {
        setHoldError(data?.error || "We couldn't hold that slot. Please pick another.");
        setHolding(false);
        // A 409 means the slot was taken — refresh availability.
        if (res.status === 409) void loadSlots();
        return;
      }
      releasedRef.current = false;
      setHold({
        orderId: data.orderId,
        redirectUrl: data.redirectUrl,
        slotIso: data.slotStartTime || iso,
        holdExpiresAt: data.holdExpiresAt,
      });
      setHolding(false);
    } catch {
      setHoldError('Network error. Please try again.');
      setHolding(false);
    }
  };

  const closeModal = () => {
    if (hold) releaseHold(hold.orderId);
    setHold(null);
    void loadSlots();
  };

  const payNow = () => {
    if (!hold) return;
    // Committing to pay — don't release on unmount.
    releasedRef.current = true;
    window.location.href = hold.redirectUrl;
  };

  const onExpire = () => {
    // Server auto-expires too; this just reflects it in the UI.
    releasedRef.current = true;
  };

  return (
    <>
      {slots === null ? (
        <p className="text-center text-[14px] text-[#6B6B6B] py-8">Loading available times…</p>
      ) : loadError ? (
        <div className="text-center py-8">
          <p className="text-[14px] text-[#9E5E41] font-semibold mb-4">{loadError}</p>
          <button
            type="button"
            onClick={() => void loadSlots()}
            className="inline-flex items-center justify-center border border-[#0047AB] text-[#0047AB] px-7 py-3 text-[12px] font-bold uppercase tracking-[0.18em] hover:bg-[#0047AB] hover:text-white transition-colors"
          >
            Try again
          </button>
        </div>
      ) : days.length === 0 ? (
        <p className="text-center text-[14px] text-[#404040] py-8 max-w-[440px] mx-auto leading-relaxed">
          No open times in the next 30 days right now. Please check back soon, or email{' '}
          <a href="mailto:hello@designature.studio" className="text-[#0047AB] font-semibold">
            hello@designature.studio
          </a>{' '}
          and we'll find a time.
        </p>
      ) : (
        <div className="max-w-[820px] mx-auto">
          <p className="text-center text-[12.5px] text-[#6B6B6B] mb-6">
            Times shown in <b className="text-[#1C1C1C]">{localGmtLabel()}</b> (your local time)
          </p>
          {/* Day tabs */}
          <div className="flex gap-2 overflow-x-auto pb-3 mb-6 border-b border-[#E7E3DB]">
            {days.map((d, i) => (
              <button
                key={d.key}
                type="button"
                onClick={() => setActiveDay(i)}
                className={`flex-shrink-0 px-4 py-2.5 text-[12px] font-semibold whitespace-nowrap border transition-colors ${
                  i === activeDay
                    ? 'bg-[#0047AB] text-white border-[#0047AB]'
                    : 'bg-white text-[#404040] border-[#E7E3DB] hover:border-[#0047AB]'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
          {/* Slots for the active day */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {(days[activeDay]?.slots || []).map((iso) => (
              <button
                key={iso}
                type="button"
                disabled={holding}
                onClick={() => void pickSlot(iso)}
                className="border border-[#E7E3DB] bg-white px-4 py-3.5 text-[15px] font-semibold text-[#1C1C1C] tabular-nums transition-all hover:border-[#0047AB] hover:text-[#0047AB] disabled:opacity-50 disabled:cursor-wait"
              >
                {fmtTime(iso)}
              </button>
            ))}
          </div>
          {holdError && (
            <p role="alert" className="text-center text-[13px] text-[#9E5E41] font-semibold mt-6">
              {holdError}
            </p>
          )}
        </div>
      )}

      {hold && (
        <HoldModal
          slotIso={hold.slotIso}
          holdExpiresAt={hold.holdExpiresAt}
          onPay={payNow}
          onClose={closeModal}
          onExpire={onExpire}
        />
      )}
    </>
  );
};

// ── Page ─────────────────────────────────────────────────────────────────────

const ConsultationPage: React.FC = () => {
  const { user, isLoading: authLoading, signIn } = useAuth();

  useEffect(() => {
    const prev = document.title;
    document.title = 'Book a paid consultation — Designature Studio';
    return () => {
      document.title = prev;
    };
  }, []);

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
            A paid virtual consultation with the studio. Pick a time that suits you, pay securely, and
            we'll meet on Google Meet — the invite lands in your inbox automatically.
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
              Choose your time
            </a>
          </div>
        </div>
      </section>

      {/* WHAT'S INCLUDED */}
      <section className="bg-[#FAFAFA] border-t border-[#E7E3DB] py-[72px] px-6">
        <div className="max-w-[1180px] mx-auto">
          <SectionHead label="What's included" title="What the session covers." />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[22px] max-w-[900px] mx-auto">
            {INCLUDED.map((c) => (
              <div key={c.n} className="flex gap-4 bg-white border border-[#E7E3DB] rounded-md px-7 py-6">
                <div className="font-display text-[30px] text-[#0047AB] leading-none flex-shrink-0">{c.n}</div>
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
              Your <em className="italic">$99 is fully creditable</em> toward a Designature design project —
              if you book one within 30 days.
            </p>
          </div>
        </div>
      </section>

      {/* BOOKING — slot picker */}
      <section id="book" className="bg-[#FAFAFA] border-t border-[#E7E3DB] py-[72px] px-6 scroll-mt-24">
        <div className="max-w-[1180px] mx-auto">
          <SectionHead label="Book your session" title="Pick a time that works." />

          {authLoading ? (
            <p className="text-center text-[14px] text-[#6B6B6B]">Loading…</p>
          ) : !user ? (
            <div className="max-w-[520px] mx-auto bg-white border border-[#E7E3DB] rounded-lg px-10 py-10 text-center shadow-[0_20px_50px_rgba(0,0,0,0.06)]">
              <h3 className="font-display text-[26px] mb-3">Sign in to book</h3>
              <p className="text-[14.5px] text-[#404040] leading-relaxed mb-6">
                Sign in with Google to see live availability and reserve your 45 minutes. Your booking
                confirmation goes to your verified inbox.
              </p>
              <button
                type="button"
                onClick={() => signIn({ source: 'consultation' })}
                className="w-full inline-flex items-center justify-center gap-3 border border-[#1C1C1C]/20 bg-white px-8 py-3.5 text-[13px] font-semibold text-[#1C1C1C] tracking-[0.02em] transition-colors hover:border-[#1C1C1C]/50 hover:bg-black/[0.02]"
              >
                <GoogleG /> Sign in with Google
              </button>
              <div className="flex items-center justify-center gap-2.5 text-[12px] text-[#404040] mt-5">
                <span>🔒</span> Secure payment via Ameriabank VPOS · Visa, Mastercard &amp; ArCa
              </div>
            </div>
          ) : (
            <SlotPicker />
          )}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-[#E7E3DB] py-[72px] px-6 scroll-mt-24">
        <div className="max-w-[1180px] mx-auto">
          <SectionHead label="Good to know" title="Questions, answered." />
          <div className="max-w-[760px] mx-auto">
            {FAQS.map((f, i) => (
              <details key={i} open={f.open} className="group border-b border-[#E7E3DB] py-1">
                <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer py-[18px] text-[16px] font-semibold flex justify-between items-center gap-4">
                  <span>{f.q}</span>
                  <span className="font-display text-[26px] text-[#0047AB] leading-none group-open:hidden">+</span>
                  <span className="font-display text-[26px] text-[#0047AB] leading-none hidden group-open:block">–</span>
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
