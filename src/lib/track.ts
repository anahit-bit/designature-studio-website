/**
 * Tiny fire-and-forget trackers for high-intent user actions (I-016).
 *
 * Each helper POSTs to a backend tracker that writes one entry to the
 * activity log, then performs the original side-effect (open Calendly, etc.).
 * Tracking is best-effort — network failures are swallowed so the UX never
 * blocks on a logging request.
 */
import { getStoredToken } from '../sessionClient';

async function fireAndForget(path: string): Promise<void> {
  try {
    const token = getStoredToken();
    const headers: Record<string, string> = {};
    if (token) headers['x-session-token'] = token;
    await fetch(path, { method: 'POST', headers });
  } catch {
    // tracking must never break the user flow
  }
}

/** Track a "Let's chat" click, then open the Calendly URL in a new tab. */
export function trackCalendly(url: string): void {
  void fireAndForget('/api/track/calendly');
  window.open(url, '_blank', 'noopener,noreferrer');
}

/** Fire-and-forget: user just started the Style Quiz (room 1 appeared). */
export function trackQuizStart(): void {
  void fireAndForget('/api/track/quiz-start');
}

/** Fire-and-forget: user reached the DNA result screen. */
export function trackQuizComplete(): void {
  void fireAndForget('/api/track/quiz-complete');
}
