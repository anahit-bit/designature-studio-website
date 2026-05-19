/**
 * Round-trip signup attribution across navigation + OAuth (C-followup).
 *
 * The actual Google OAuth flow fires from /ai-concepts (triggerGoogleSignIn).
 * CTAs that live on other pages — header, home hero, home AI section, closing
 * band — stamp a slug here before navigating, and triggerGoogleSignIn pops it
 * when the user finally signs in. Cleared on pop and on TTL expiry so a stale
 * slug never leaks into a different sign-in attempt.
 */
const KEY = 'ds_signin_source';
const TTL_MS = 5 * 60 * 1000; // 5 minutes — long enough to navigate + browse a page.

interface Stored { source: string; expiresAt: number; }

/** Stamp a source slug. Caller should use a short snake_case string. */
export function setSigninSource(source: string): void {
  if (typeof sessionStorage === 'undefined') return;
  if (!source) return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ source, expiresAt: Date.now() + TTL_MS } satisfies Stored));
  } catch {
    /* sessionStorage full / disabled — non-fatal */
  }
}

/** Read + clear in one call. Returns null if missing or expired. */
export function popSigninSource(): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY); // pop semantics — clear on read
    const parsed = JSON.parse(raw) as Partial<Stored>;
    if (!parsed?.source || !parsed?.expiresAt) return null;
    if (Date.now() > parsed.expiresAt) return null;
    return String(parsed.source);
  } catch {
    return null;
  }
}

/** Convenience: forget any pending source (e.g. on signOut). */
export function clearSigninSource(): void {
  if (typeof sessionStorage === 'undefined') return;
  try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
}
