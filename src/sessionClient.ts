/** Browser session token + last-activity tracking for forced inactivity logout app-wide. */

export const SESSION_KEY = 'ds_session_token';
const LAST_ACTIVITY_KEY = 'ds_last_activity';

export const INACTIVITY_LOGOUT_MS = 15 * 60 * 1000;

export function getStoredToken(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

export function touchActivity(): void {
  localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
}

export function getLastActivityTime(): number | null {
  const raw = localStorage.getItem(LAST_ACTIVITY_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Call when restoring a session so idle timeout starts from "now" if key missing (migration). */
export function ensureActivityForSession(): void {
  if (!getStoredToken()) return;
  if (getLastActivityTime() === null) touchActivity();
}

export function clearSessionLocal(): void {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(LAST_ACTIVITY_KEY);
}

export function storeToken(token: string): void {
  localStorage.setItem(SESSION_KEY, token);
  touchActivity();
}

export function isInactivityExpired(): boolean {
  const token = getStoredToken();
  if (!token) return false;
  const last = getLastActivityTime();
  if (last === null) return false;
  return Date.now() - last >= INACTIVITY_LOGOUT_MS;
}

export const SESSION_EXPIRED_EVENT = 'ds-session-expired';

export function dispatchSessionExpired(): void {
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
}
