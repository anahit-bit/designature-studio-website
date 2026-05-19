/**
 * Admin-session client helpers (I-019).
 *
 * The admin gate is server-side (HttpOnly cookie). The client can't read
 * the cookie, so we probe /api/admin/me to know whether we're authed.
 *
 * No localStorage involvement — refresh-safe by design (the cookie travels
 * with the browser, the React state is rebuilt on mount).
 */
import { useEffect, useState } from 'react';

export interface AdminMe {
  authed: boolean;
  email?: string;
}

export async function fetchAdminMe(): Promise<AdminMe> {
  try {
    const res = await fetch('/api/admin/me', { credentials: 'include' });
    if (!res.ok) return { authed: false };
    return (await res.json()) as AdminMe;
  } catch {
    return { authed: false };
  }
}

export async function adminLogout(): Promise<void> {
  try {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
  } catch {
    // best-effort
  }
}

/**
 * React hook — probes /api/admin/me on mount.
 * Returns `null` while loading, otherwise the AdminMe payload.
 */
export function useAdminMe(): AdminMe | null {
  const [me, setMe] = useState<AdminMe | null>(null);
  useEffect(() => {
    let cancelled = false;
    void fetchAdminMe().then((v) => {
      if (!cancelled) setMe(v);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return me;
}
