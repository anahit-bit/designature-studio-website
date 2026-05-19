/**
 * /admin/login — standalone gate, decoupled from Google OAuth (I-019).
 *
 * Posts to /api/admin/login. On success the server sets an HttpOnly
 * admin_session cookie and we navigate to /admin. On failure we render
 * the inline error per the mockup (attempts remaining → cool-down).
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAdminMe } from '../lib/adminAuth';

const ADMIN_EMAIL = 'anahit@designature.studio';

const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ message: string; remaining?: number; lockedUntilSec?: number } | null>(null);
  const [checking, setChecking] = useState(true);

  // If already signed in, bounce straight to /admin
  useEffect(() => {
    let cancelled = false;
    void fetchAdminMe().then((me) => {
      if (cancelled) return;
      if (me.authed) navigate('/admin', { replace: true });
      else setChecking(false);
    });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        navigate('/admin', { replace: true });
        return;
      }
      if (res.status === 429) {
        const sec = Math.ceil(((data?.lockedUntil ?? 0) - Date.now()) / 1000);
        setError({ message: data?.error || 'Too many attempts.', lockedUntilSec: sec });
      } else {
        setError({
          message: data?.error || 'Sign-in failed.',
          remaining: typeof data?.attemptsRemaining === 'number' ? data.attemptsRemaining : undefined,
        });
      }
    } catch {
      setError({ message: 'Network error — try again.' });
    } finally {
      setSubmitting(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-[90vh] bg-[#F4EFE7] flex items-center justify-center px-6 py-20">
        <div className="text-xs uppercase tracking-[0.22em] text-neutral-500">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-[90vh] bg-[#F4EFE7] flex items-center justify-center px-6 py-20 font-body">
      <form
        onSubmit={onSubmit}
        className="bg-white w-full max-w-[420px] p-14 border border-[#DAD2C3] shadow-[0_24px_60px_rgba(0,0,0,0.06)]"
        autoComplete="off"
      >
        <p className="text-[10px] tracking-[0.32em] uppercase text-[#0047AB] font-bold text-center mb-4">
          Designature · Observability
        </p>
        <h1 className="font-serif text-4xl text-center mb-8 leading-[1.1] text-black">Admin</h1>

        <label htmlFor="login-email" className="block text-[10px] tracking-[0.22em] uppercase text-neutral-500 font-bold mb-2">
          Email
        </label>
        <input
          id="login-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-[#FAFAFA] border border-[#DAD2C3] px-3.5 py-3 text-sm text-black focus:outline-none focus:border-[#0047AB]"
          autoComplete="username"
        />

        <label htmlFor="login-pwd" className="block text-[10px] tracking-[0.22em] uppercase text-neutral-500 font-bold mb-2 mt-[18px]">
          Password
        </label>
        <input
          id="login-pwd"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
          className="w-full bg-[#FAFAFA] border border-[#DAD2C3] px-3.5 py-3 text-sm text-black focus:outline-none focus:border-[#0047AB]"
          autoComplete="current-password"
          autoFocus
        />

        <button
          type="submit"
          disabled={submitting || !password}
          className="block w-full mt-8 py-4 bg-[#0047AB] text-white text-[11px] font-bold tracking-[0.25em] uppercase hover:bg-[#003d99] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? 'Signing in…' : 'Sign in →'}
        </button>

        <p className="mt-[18px] text-[11px] text-neutral-500 text-center tracking-[0.04em]">
          Studio access only · sessions expire after 12 hours.
        </p>

        {error && (
          <div className="mt-6 px-3.5 py-2.5 bg-red-50 text-red-700 border-l-[3px] border-red-600 text-[11px] font-bold tracking-[0.02em]">
            {error.message}
            {typeof error.remaining === 'number' && (
              <span className="ml-1 font-medium">
                {' '}· {error.remaining} attempt{error.remaining === 1 ? '' : 's'} left before 15-min cooldown.
              </span>
            )}
            {typeof error.lockedUntilSec === 'number' && error.lockedUntilSec > 0 && (
              <span className="ml-1 font-medium">
                {' '}· retry in {Math.ceil(error.lockedUntilSec / 60)} minute{Math.ceil(error.lockedUntilSec / 60) === 1 ? '' : 's'}.
              </span>
            )}
          </div>
        )}
      </form>
    </div>
  );
};

export default AdminLoginPage;
