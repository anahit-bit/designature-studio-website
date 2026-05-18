/**
 * Graceful "Shopping List is offline" card with email-notify capture.
 *
 * Shown inside the AI Studio when /api/shopping/search 503s with either
 * code="disabled" (kill switch) or code="daily_budget_exceeded" (per-UTC-day
 * cap reached). Mirrors AI-022/023 cohesion: cream bg, cobalt accent,
 * Cormorant heading. Subscribes to the existing newsletter endpoint.
 */
import { useState } from 'react';

interface Props {
  code: 'disabled' | 'daily_budget_exceeded';
  resetAt?: string;
}

function formatResetLocal(iso?: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    // E.g. "tomorrow 4:00 AM" — local time, short form.
    return d.toLocaleString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

export default function ShoppingOfflineCard({ code, resetAt }: Props) {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const heading =
    code === 'disabled'
      ? 'Shopping List is temporarily offline'
      : 'Daily limit reached, back tomorrow';

  const body =
    code === 'disabled'
      ? "We'll email you the moment it's back."
      : `Service resets ${formatResetLocal(resetAt) || 'at midnight UTC'} — drop your email and we'll ping you when fresh credits land.`;

  const ctaLabel = code === 'disabled' ? 'Notify me when it\'s back' : 'Notify me when it resets';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || done) return;
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Enter a valid email address.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // I-021a — source slug surfaces in /admin newsletter section.
        body: JSON.stringify({ email: trimmed, source: 'shopping_offline' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Could not save your email — try again in a moment.');
      }
      setDone(true);
    } catch (err: any) {
      setError(err?.message || 'Could not save your email — try again in a moment.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="px-8 py-16 flex justify-center bg-[#F4EFE7]">
      <div className="w-full max-w-xl text-center flex flex-col items-center gap-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-[#0047AB]">
          Shopping List · Offline
        </p>
        <h3 className="font-display text-3xl md:text-4xl font-light tracking-tight text-black leading-snug">
          {heading}
        </h3>
        <p className="text-[13px] md:text-[14px] text-black/70 leading-relaxed max-w-md">
          {body}
        </p>

        {done ? (
          <div className="mt-2 border border-[#0047AB]/30 bg-white px-6 py-5 w-full max-w-md">
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#0047AB]">
              You're on the list
            </p>
            <p className="mt-2 text-[13px] text-black/70 leading-relaxed">
              We'll email <strong>{email.trim()}</strong> when Shopping List is back.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mt-2 w-full max-w-md flex flex-col sm:flex-row gap-2"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="flex-1 border border-black/15 bg-white px-4 py-3 text-[13px] text-black placeholder:text-black/40 focus:outline-none focus:border-[#0047AB] transition-colors"
              aria-label="Email address"
              disabled={submitting}
            />
            <button
              type="submit"
              disabled={submitting}
              className="bg-[#0047AB] text-white text-[10px] font-bold uppercase tracking-[0.25em] px-6 py-3 hover:bg-[#003d99] transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {submitting ? 'Saving…' : `${ctaLabel} →`}
            </button>
          </form>
        )}

        {error && (
          <p className="text-[11px] text-red-600 uppercase tracking-widest font-bold">{error}</p>
        )}

        <p className="text-[10px] text-black/40 uppercase tracking-[0.25em] mt-2">
          Other AI Studio tools are unaffected.
        </p>
      </div>
    </div>
  );
}
