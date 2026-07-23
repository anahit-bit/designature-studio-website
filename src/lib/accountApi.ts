/**
 * AC-001 — User Dashboard typed API client.
 *
 * Every account-area fetch (/api/user/*, /api/subscriptions/*, /api/billing/*,
 * /api/payment-methods/*, /api/consultation/cancel) goes through this module so
 * that swapping mock data for the real backend is a single flag flip.
 *
 * Behind VITE_USE_MOCK_ACCOUNT (default "true") every method delegates to
 * src/lib/accountApi.mock.ts and returns hand-crafted mock data. When the flag
 * is "false" the real fetch implementations below run — most of those endpoints
 * are NOT built yet (a follow-on backend ticket, AC-001-backend, lands them), so
 * each is marked with `// TODO(AC-001-backend)`.
 *
 * Types mirror spec section 11 exactly. Do not drift from the shapes here without
 * updating the spec + the backend contract.
 */

import { getStoredToken } from '../sessionClient';
import * as mock from './accountApi.mock';

// ── env flag ──────────────────────────────────────────────────────────────
/** Default TRUE — the account UI ships mock-first until the backend endpoints exist. */
export const USE_MOCK_ACCOUNT: boolean =
  ((import.meta as any)?.env?.VITE_USE_MOCK_ACCOUNT ?? 'true') !== 'false';

/**
 * Whether a real session exists. The Library loop (dashboard + saved items) is
 * LIVE on the backend, so when the user is actually signed in we hit the real
 * endpoints regardless of the mock flag; logged-out previews (and the dev tier
 * switcher) still get mock data. Billing/bookings/subscription calls stay mock —
 * there is no live subscription rail yet.
 */
function signedIn(): boolean {
  return !!getStoredToken();
}

// ── shared types (spec §11) ─────────────────────────────────────────────────
export type PlanTier = 'free' | 'design' | 'studio';
export type PlanStatus = 'active' | 'canceled' | 'past_due' | 'grace';
export type ChargeStatus = 'paid' | 'failed' | null;

export type ToolKey =
  | 'ai_vision'
  | 'shopping'
  | 'room_audit'
  | 'style_quiz'
  | 'design_brief'
  | 'cultural';

export interface AccountUser {
  id: string;
  email: string;
  name: string;
  picture: string | null;
}

export interface Plan {
  tier: PlanTier;
  status: PlanStatus;
  renewsAt: string | null; // ISO
  periodEndAt: string | null; // ISO — set when canceled-but-still-active
  latestChargeStatus: ChargeStatus;
  /** Only present when latestChargeStatus === 'failed'. */
  gracePeriodEndsAt?: string | null;
}

/** One tool's usage this cycle. `cap === null` means unlimited; `cap === 0` means locked/not in tier. */
export interface QuotaEntry {
  used: number;
  cap: number | null;
  resetsAt: string | null;
}

export interface Quota {
  aiVision: QuotaEntry;
  shopping: QuotaEntry;
  roomAudit: QuotaEntry;
  styleQuiz: QuotaEntry;
  designBrief: QuotaEntry;
  cultural: QuotaEntry;
}

export interface ActivityItem {
  id: string;
  tool: ToolKey;
  title: string;
  createdAt: string; // ISO
  thumbnailUrl: string | null;
}

export type BookingKind = 'paid_consult' | 'quick_chat';

export interface NextBooking {
  id: string;
  slotStartTime: string; // ISO
  meetLink: string | null;
  kind: BookingKind;
}

export interface DashboardData {
  user: AccountUser;
  plan: Plan;
  quota: Quota;
  recentActivity: ActivityItem[];
  nextBooking: NextBooking | null;
  counts: {
    libraryTotal: number;
    upcomingBookings: number;
  };
}

export interface LibraryItem {
  id: string;
  tool: ToolKey;
  title: string;
  createdAt: string; // ISO
  thumbnailUrl: string | null;
  fullPreviewUrl?: string | null;
  metadata?: Record<string, unknown>;
}

export interface LibraryPage {
  items: LibraryItem[];
  total: number;
  page: number;
}

/** Payload for saving a generated output into the user's Library. */
export interface SaveLibraryPayload {
  tool: ToolKey;
  title: string;
  /** base64 data URL of an image output (AI Vision concept, audit render) — uploaded to Cloudinary server-side. */
  imageDataUrl?: string;
  /** Pre-hosted thumbnail (e.g. an already-Cloudinary URL). */
  thumbnailUrl?: string;
  /** Tool-specific payload: shopping items, style DNA, audit scores, etc. */
  metadata?: Record<string, unknown>;
}

export interface Booking {
  id: string;
  slotStartTime: string; // ISO
  endTime?: string | null;
  meetLink: string | null;
  rescheduleUrl: string | null;
  kind: BookingKind;
  amount: number; // USD, 0 for free chats
  state: 'upcoming' | 'past';
}

export interface BookingsResult {
  upcoming: Booking[];
  past: Booking[];
}

export type BillingRowStatus = 'paid' | 'pending' | 'failed' | 'refunded';

export interface BillingRow {
  orderId: string;
  date: string; // ISO
  description: string;
  amount: number; // USD
  status: BillingRowStatus;
  invoiceUrl: string | null;
}

export interface BillingHistory {
  rows: BillingRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PaymentMethod {
  brand: string; // 'VISA' | 'MASTERCARD' | ...
  last4: string;
  expMonth: number;
  expYear: number;
  cardholderName: string;
}

export interface NotificationPrefs {
  productUpdates: boolean;
  journalNew: boolean;
  bookingReminders: boolean;
}

/** Studio-tier project folders (AC-003 backend; UI-only stub here). */
export interface ProjectFolder {
  id: string;
  name: string;
  coverUrl: string | null;
  itemCount: number;
}

export interface LibraryFilters {
  tool?: ToolKey | 'all';
  from?: string;
  to?: string;
  search?: string;
  page?: number;
}

// ── real fetch helper ────────────────────────────────────────────────────────
async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers['x-session-token'] = token;
  const res = await fetch(path, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

// ── client surface ───────────────────────────────────────────────────────────
export const accountApi = {
  // reads — the Library loop is LIVE, so prefer the real endpoint when signed in.
  getDashboard(): Promise<DashboardData> {
    if (signedIn()) return api<DashboardData>('/api/user/dashboard');
    return mock.getDashboard();
  },

  getLibrary(filters: LibraryFilters = {}): Promise<LibraryPage> {
    if (signedIn()) {
      const q = new URLSearchParams();
      if (filters.tool && filters.tool !== 'all') q.set('tool', filters.tool);
      if (filters.from) q.set('from', filters.from);
      if (filters.to) q.set('to', filters.to);
      if (filters.search) q.set('q', filters.search);
      if (filters.page) q.set('page', String(filters.page));
      return api<LibraryPage>(`/api/user/library?${q.toString()}`);
    }
    return mock.getLibrary(filters);
  },

  getLibraryItem(id: string): Promise<LibraryItem> {
    if (signedIn()) return api<LibraryItem>(`/api/user/library/${encodeURIComponent(id)}`);
    return mock.getLibraryItem(id);
  },

  /** PUBLIC read of a saved item by id — powers shareable /shared/:id links (no auth). */
  async getSharedItem(id: string): Promise<LibraryItem> {
    const res = await fetch(`/api/share/${encodeURIComponent(id)}`);
    if (!res.ok) {
      if (!signedIn()) return mock.getLibraryItem(id); // preview fallback
      throw new Error('Not found');
    }
    return res.json() as Promise<LibraryItem>;
  },

  /** Absolute shareable URL for a share token. */
  shareUrl(token: string): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/shared/${token}`;
  },

  /** Mint (or reuse) an expiring share token for an item and return its link. */
  async createShareLink(
    id: string
  ): Promise<{ token: string; url: string; expiresAt: string | null }> {
    if (signedIn()) {
      const r = await api<{ token: string; expiresAt: string | null }>(
        `/api/user/library/${encodeURIComponent(id)}/share`,
        { method: 'POST' }
      );
      return { token: r.token, url: accountApi.shareUrl(r.token), expiresAt: r.expiresAt };
    }
    // preview (logged out): the item id doubles as the token
    return { token: id, url: accountApi.shareUrl(id), expiresAt: null };
  },

  /** Save a generated output to the user's Library (AI Vision concept, Shopping list, …). */
  saveLibraryItem(payload: SaveLibraryPayload): Promise<LibraryItem> {
    if (signedIn())
      return api<LibraryItem>('/api/user/library', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    return mock.saveLibraryItem(payload);
  },

  deleteLibraryItem(id: string): Promise<void> {
    if (signedIn())
      return api<void>(`/api/user/library/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return mock.deleteLibraryItem(id);
  },

  /** Delete several saved items at once. Returns how many were removed. */
  async bulkDeleteLibraryItems(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    if (signedIn()) {
      const r = await api<{ deleted: number }>('/api/user/library/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ ids }),
      });
      return r.deleted ?? 0;
    }
    for (const id of ids) await mock.deleteLibraryItem(id);
    return ids.length;
  },

  getProjectFolders(): Promise<ProjectFolder[]> {
    if (USE_MOCK_ACCOUNT) return mock.getProjectFolders();
    // TODO(AC-003-backend): GET /api/user/project-folders
    return api<ProjectFolder[]>('/api/user/project-folders');
  },

  getBookings(): Promise<BookingsResult> {
    if (USE_MOCK_ACCOUNT) return mock.getBookings();
    // TODO(AC-001-backend): GET /api/user/bookings?state=
    return api<BookingsResult>('/api/user/bookings');
  },

  getBillingHistory(page = 1): Promise<BillingHistory> {
    if (USE_MOCK_ACCOUNT) return mock.getBillingHistory(page);
    // TODO(AC-001-backend): GET /api/billing/history?page=
    return api<BillingHistory>(`/api/billing/history?page=${page}`);
  },

  getPaymentMethod(): Promise<PaymentMethod | null> {
    if (USE_MOCK_ACCOUNT) return mock.getPaymentMethod();
    // TODO(AC-001-backend): GET /api/payment-methods/current
    return api<PaymentMethod | null>('/api/payment-methods/current');
  },

  getNotificationPrefs(): Promise<NotificationPrefs> {
    if (USE_MOCK_ACCOUNT) return mock.getNotificationPrefs();
    // TODO(AC-001-backend): GET /api/user/notifications
    return api<NotificationPrefs>('/api/user/notifications');
  },

  // mutations
  cancelSubscription(reason?: string): Promise<Plan> {
    if (USE_MOCK_ACCOUNT) return mock.cancelSubscription(reason);
    // TODO(AC-001-backend): POST /api/subscriptions/cancel
    return api<Plan>('/api/subscriptions/cancel', {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  resumeSubscription(): Promise<Plan> {
    if (USE_MOCK_ACCOUNT) return mock.resumeSubscription();
    // TODO(AC-001-backend): POST /api/subscriptions/resume
    return api<Plan>('/api/subscriptions/resume', { method: 'POST' });
  },

  changePlan(toTier: Exclude<PlanTier, 'free'>): Promise<Plan> {
    if (USE_MOCK_ACCOUNT) return mock.changePlan(toTier);
    // TODO(AC-001-backend): POST /api/subscriptions/change-plan
    return api<Plan>('/api/subscriptions/change-plan', {
      method: 'POST',
      body: JSON.stringify({ toTier }),
    });
  },

  /** Kicks off the Ameria vPOS card-binding flow. Returns a redirect URL in real mode. */
  replacePaymentMethod(): Promise<{ redirectUrl: string | null }> {
    if (USE_MOCK_ACCOUNT) return mock.replacePaymentMethod();
    // TODO(AC-001-backend): POST /api/payment-methods/replace
    return api<{ redirectUrl: string | null }>('/api/payment-methods/replace', {
      method: 'POST',
    });
  },

  removePaymentMethod(): Promise<void> {
    if (USE_MOCK_ACCOUNT) return mock.removePaymentMethod();
    // TODO(AC-001-backend): DELETE /api/payment-methods/current
    return api<void>('/api/payment-methods/current', { method: 'DELETE' });
  },

  cancelConsultation(orderId: string): Promise<Booking> {
    if (USE_MOCK_ACCOUNT) return mock.cancelConsultation(orderId);
    // TODO(AC-001-backend): POST /api/consultation/cancel
    return api<Booking>('/api/consultation/cancel', {
      method: 'POST',
      body: JSON.stringify({ orderId }),
    });
  },

  updateProfile(name: string): Promise<AccountUser> {
    if (USE_MOCK_ACCOUNT) return mock.updateProfile(name);
    // TODO(AC-001-backend): PATCH /api/user/profile
    return api<AccountUser>('/api/user/profile', {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    });
  },

  updateNotifications(prefs: Partial<NotificationPrefs>): Promise<NotificationPrefs> {
    if (USE_MOCK_ACCOUNT) return mock.updateNotifications(prefs);
    // TODO(AC-001-backend): PATCH /api/user/notifications
    return api<NotificationPrefs>('/api/user/notifications', {
      method: 'PATCH',
      body: JSON.stringify(prefs),
    });
  },

  deleteAccount(): Promise<void> {
    if (USE_MOCK_ACCOUNT) return mock.deleteAccount();
    // TODO(AC-001-backend): DELETE /api/user/me
    return api<void>('/api/user/me', { method: 'DELETE' });
  },
};

export type AccountApi = typeof accountApi;
