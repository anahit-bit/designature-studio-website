/**
 * Tiny fire-and-forget trackers for high-intent user actions (I-016).
 *
 * Each helper POSTs to a backend tracker that writes one entry to the
 * activity log, then performs the original side-effect (open Calendly, etc.).
 * Tracking is best-effort — network failures are swallowed so the UX never
 * blocks on a logging request.
 *
 * A-004/A-005/I-023: each helper also fires a parallel GA4 custom event via
 * trackEvent(). The internal POST (activityLog → /admin) and the GA4 event are
 * independent — the POST is unchanged; the gtag call no-ops when GA4 is unset.
 */
import { getStoredToken } from '../sessionClient';
import { trackEvent } from './analytics';

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

/**
 * Track a "Let's chat" click, then open the Calendly URL in a new tab.
 * `source` identifies the surface the click came from (A-005 conversion attribution).
 */
export function trackCalendly(url: string, source?: string): void {
  trackEvent('calendly_open', { source: source ?? 'unknown' });
  void fireAndForget('/api/track/calendly');
  window.open(url, '_blank', 'noopener,noreferrer');
}

/** Fire-and-forget: user just started the Style Quiz (room 1 appeared). */
export function trackQuizStart(): void {
  trackEvent('ai_quiz_started');
  void fireAndForget('/api/track/quiz-start');
}

/** Fire-and-forget: user reached the DNA result screen. `topStyle` = winning DNA style. */
export function trackQuizComplete(topStyle?: string): void {
  trackEvent('ai_quiz_completed', { dna_top_style: topStyle ?? 'unknown' });
  void fireAndForget('/api/track/quiz-complete');
}

/** I-021b — fires once when the AI Vision generate button transitions disabled → enabled. */
export function trackVisionStart(): void {
  trackEvent('ai_vision_started');
  void fireAndForget('/api/track/vision-start');
}

/** I-021b — fires once when the Shopping List search button transitions disabled → enabled. */
export function trackShoppingStart(): void {
  trackEvent('ai_shopping_started');
  void fireAndForget('/api/track/shopping-start');
}

/** I-021b — fires once when the Room Audit analyze button transitions disabled → enabled. */
export function trackAuditStart(): void {
  trackEvent('ai_audit_started');
  void fireAndForget('/api/track/audit-start');
}
