import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import {
  getStoredToken,
  storeToken,
  clearSessionLocal,
  touchActivity,
  SESSION_EXPIRED_EVENT,
} from './sessionClient';
import { clearSigninSource } from './lib/signinSource';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

export interface AuthUser {
  email: string;
  name: string;
  picture: string;
  generationsLeft: number;
  /** Free-tier shopping list runs remaining (from server) */
  shoppingListsLeft?: number;
  isPaid?: boolean;
  /** Paid-tier audit quota (999 = unlimited) */
  auditsLeft?: number;
}

export interface SignInOptions {
  toolUsed?: string;
  source?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  /** True once the Google Identity Services script is loaded and initialize() has run. */
  googleReady: boolean;
  signIn: (options?: SignInOptions) => void;
  signOut: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<AuthUser | null>>;
  /** Re-fetch /api/auth/me and merge quota fields into the current user. */
  refreshQuota: () => Promise<void>;
  /** Fetch helper that adds the x-session-token header. */
  apiFetch: (path: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (el: HTMLElement, config: any) => void;
          prompt: () => void;
          cancel: () => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

function apiFetchHelper(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers['x-session-token'] = token;
  return fetch(path, { ...options, headers });
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [googleReady, setGoogleReady] = useState(false);
  /** Set by signIn() before the Google credential callback fires; consumed by handleGoogleCallback. */
  const pendingSignInOptionsRef = useRef<SignInOptions | undefined>(undefined);

  const apiFetch = useCallback(
    (path: string, options: RequestInit = {}) => apiFetchHelper(path, options),
    []
  );

  // ── Restore session on mount ──
  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    apiFetchHelper('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.email) {
          touchActivity();
          setUser(data);
        } else {
          clearSessionLocal();
        }
      })
      .catch(() => clearSessionLocal())
      .finally(() => setIsLoading(false));
  }, []);

  // ── Sync UI when app-wide inactivity guard clears the session ──
  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  // ── Google credential callback ──
  const handleGoogleCallback = useCallback(
    async (response: { credential: string }) => {
      const opts = pendingSignInOptionsRef.current ?? {};
      pendingSignInOptionsRef.current = undefined;
      try {
        const res = await apiFetchHelper('/api/auth/google', {
          method: 'POST',
          body: JSON.stringify({
            credential: response.credential,
            toolUsed: opts.toolUsed,
            source: opts.source,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Auth failed');
        storeToken(data.token);
        setUser(data.user);
        try {
          window.google?.accounts?.id?.cancel?.();
          requestAnimationFrame(() => {
            window.google?.accounts?.id?.cancel?.();
          });
        } catch {
          /* ignore */
        }
      } catch (err) {
        console.error('Google auth error:', err);
      }
    },
    []
  );

  // ── Load Google Identity Services script + initialize ──
  useEffect(() => {
    let cancelled = false;
    const initialize = () => {
      if (cancelled) return;
      if (!GOOGLE_CLIENT_ID || !window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCallback,
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      setGoogleReady(true);
    };

    if (window.google?.accounts?.id) {
      initialize();
      return;
    }

    const existing = document.getElementById('google-gsi-script') as HTMLScriptElement | null;
    if (existing) {
      const prev = existing.onload;
      existing.onload = (e) => {
        if (prev) (prev as any)(e);
        initialize();
      };
      return () => {
        cancelled = true;
      };
    }

    const script = document.createElement('script');
    script.id = 'google-gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initialize;
    document.head.appendChild(script);

    return () => {
      cancelled = true;
    };
  }, [handleGoogleCallback]);

  const signIn = useCallback((options?: SignInOptions) => {
    pendingSignInOptionsRef.current = options;
    if (!window.google?.accounts?.id) return;

    // Render an off-screen Google button and click it programmatically.
    const tmp = document.createElement('div');
    tmp.style.position = 'absolute';
    tmp.style.opacity = '0';
    tmp.style.pointerEvents = 'none';
    document.body.appendChild(tmp);
    window.google.accounts.id.renderButton(tmp, {
      theme: 'outline',
      size: 'large',
      width: '300',
    });
    setTimeout(() => {
      const btn = tmp.querySelector('div[role=button]') as HTMLElement | null;
      if (btn) btn.click();
      setTimeout(() => {
        if (tmp.parentNode) tmp.parentNode.removeChild(tmp);
      }, 1000);
    }, 300);
  }, []);

  const signOut = useCallback(async () => {
    try {
      window.google?.accounts?.id?.cancel?.();
      window.google?.accounts?.id?.disableAutoSelect?.();
    } catch {
      /* gsi not loaded */
    }
    try {
      await apiFetchHelper('/api/auth/logout', { method: 'POST' });
    } catch {
      /* still clear client-side */
    }
    clearSessionLocal();
    clearSigninSource(); // C-followup — no stale signup attribution after sign-out
    setUser(null);
  }, []);

  const refreshQuota = useCallback(async () => {
    try {
      const res = await apiFetchHelper('/api/auth/me');
      if (!res.ok) return;
      const data = await res.json();
      setUser((prev) =>
        prev
          ? {
              ...prev,
              generationsLeft: data?.generationsLeft ?? prev.generationsLeft,
              shoppingListsLeft: data?.shoppingListsLeft ?? prev.shoppingListsLeft,
              auditsLeft: data?.auditsLeft ?? prev.auditsLeft,
              isPaid: data?.isPaid ?? prev.isPaid,
            }
          : prev
      );
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, googleReady, signIn, signOut, setUser, refreshQuota, apiFetch }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
