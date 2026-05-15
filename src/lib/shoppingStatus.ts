/**
 * Cheap module-level cache + React hook around /api/shopping/status.
 *
 * The probe answers "is the Shopping List tool available right now?" — used
 * by the logged-out showcase (CTA swap), the AI Studio tab strip (offline
 * pill), and anywhere else that wants to render disabled state without
 * making a POST that would 503.
 *
 * One request per page session is plenty: status changes are tied to env
 * changes (rare) or daily-budget rollover (UTC midnight). Components that
 * mount later read the cached value synchronously.
 */
import { useEffect, useState } from 'react';

export interface ShoppingStatus {
  disabled: boolean;
  code?: 'disabled' | 'daily_budget_exceeded';
  resetAt?: string;
}

let cached: ShoppingStatus | null = null;
let inflight: Promise<ShoppingStatus> | null = null;
const subscribers = new Set<(s: ShoppingStatus) => void>();

async function fetchStatus(): Promise<ShoppingStatus> {
  try {
    const res = await fetch('/api/shopping/status', { credentials: 'include' });
    if (!res.ok) return { disabled: false };
    const data = (await res.json()) as ShoppingStatus;
    return { disabled: !!data.disabled, code: data.code, resetAt: data.resetAt };
  } catch {
    // Probe failure should never break the page — assume online.
    return { disabled: false };
  }
}

function ensureLoaded(): Promise<ShoppingStatus> {
  if (cached) return Promise.resolve(cached);
  if (!inflight) {
    inflight = fetchStatus().then((s) => {
      cached = s;
      inflight = null;
      subscribers.forEach((cb) => cb(s));
      return s;
    });
  }
  return inflight;
}

/** Read the cached status synchronously without forcing a fetch. */
export function getCachedShoppingStatus(): ShoppingStatus | null {
  return cached;
}

/** React hook — kicks the probe if not yet loaded, re-renders when it lands. */
export function useShoppingStatus(): ShoppingStatus | null {
  const [status, setStatus] = useState<ShoppingStatus | null>(cached);

  useEffect(() => {
    if (cached) {
      setStatus(cached);
      return;
    }
    subscribers.add(setStatus);
    void ensureLoaded();
    return () => {
      subscribers.delete(setStatus);
    };
  }, []);

  return status;
}
