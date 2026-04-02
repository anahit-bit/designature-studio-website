import React, { useEffect, useRef, useCallback } from 'react';
import {
  getStoredToken,
  touchActivity,
  ensureActivityForSession,
  clearSessionLocal,
  isInactivityExpired,
  dispatchSessionExpired,
} from '../sessionClient';

const POLL_MS = 2000;
const ACTIVITY_THROTTLE_MS = 30_000;

async function performForcedLogout(): Promise<void> {
  const token = getStoredToken();
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'x-session-token': token } : {}),
      },
    });
  } catch {
    /* still clear client session */
  }
  try {
    window.google?.accounts?.id?.cancel?.();
    window.google?.accounts?.id?.disableAutoSelect?.();
  } catch {
    /* gsi not loaded */
  }
  clearSessionLocal();
  dispatchSessionExpired();
}

/**
 * Enforces server + local session expiry after INACTIVITY_LOGOUT_MS with no user activity,
 * app-wide (survives navigation and reloads via last-activity timestamp in localStorage).
 */
const SessionInactivityGuard: React.FC = () => {
  const lastThrottleRef = useRef(0);

  const onUserActivity = useCallback(() => {
    if (!getStoredToken()) return;
    const now = Date.now();
    if (now - lastThrottleRef.current < ACTIVITY_THROTTLE_MS) return;
    lastThrottleRef.current = now;
    touchActivity();
  }, []);

  useEffect(() => {
    ensureActivityForSession();

    const runCheck = () => {
      if (!getStoredToken()) return;
      if (isInactivityExpired()) {
        void performForcedLogout();
      }
    };

    runCheck();
    const intervalId = window.setInterval(runCheck, POLL_MS);

    const events: (keyof WindowEventMap)[] = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click',
    ];
    events.forEach((ev) =>
      window.addEventListener(ev, onUserActivity, { passive: true, capture: true })
    );

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        ensureActivityForSession();
        onUserActivity();
        runCheck();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearInterval(intervalId);
      events.forEach((ev) =>
        window.removeEventListener(ev, onUserActivity, { capture: true })
      );
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [onUserActivity]);

  // Re-check when tab becomes active (timers can be throttled in background tabs)
  useEffect(() => {
    const onFocus = () => {
      if (!getStoredToken()) return;
      if (isInactivityExpired()) void performForcedLogout();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  return null;
};

export default SessionInactivityGuard;
