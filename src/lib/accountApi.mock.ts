/**
 * AC-001 — hand-crafted mock data for the User Dashboard.
 *
 * Used whenever VITE_USE_MOCK_ACCOUNT !== "false" (the default). Lets the whole
 * account UI render — every tab, every state — without a backend or a seeded DB.
 *
 * Dev-only tier + plan-state toggles are persisted in localStorage so all three
 * tiers (and the canceled / failed-charge variants) can be previewed in one
 * browser. The <MockTierSwitcher/> control in AccountPage flips these.
 *
 * Free-tier caps mirror the real server constants (server.ts):
 *   FREE_TIER_MAX_CONCEPTS = 3, FREE_TIER_MAX_SHOPPING_LISTS = 3, audits = 0/sample.
 * Per-tier monthly caps for Design/Studio are product decisions taken straight
 * from the AC-001 mockup (Design 10/12/5 · Studio 60/60/20).
 */

import type {
  AccountUser,
  BillingHistory,
  BillingRow,
  Booking,
  BookingsResult,
  DashboardData,
  LibraryFilters,
  LibraryItem,
  LibraryPage,
  NotificationPrefs,
  PaymentMethod,
  Plan,
  PlanTier,
  ProjectFolder,
  Quota,
} from './accountApi';

// ── dev toggles (localStorage) ───────────────────────────────────────────────
export const MOCK_TIER_KEY = 'ds_mock_account_tier';
export const MOCK_PLAN_STATE_KEY = 'ds_mock_account_plan_state';

export type MockPlanState = 'active' | 'canceled' | 'failed';

function readLS(key: string): string | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}
function writeLS(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore (private mode / SSR) */
  }
}

export function getMockTier(): PlanTier {
  const v = readLS(MOCK_TIER_KEY);
  return v === 'free' || v === 'design' || v === 'studio' ? v : 'design';
}
export function setMockTier(tier: PlanTier): void {
  writeLS(MOCK_TIER_KEY, tier);
}

export function getMockPlanState(): MockPlanState {
  const v = readLS(MOCK_PLAN_STATE_KEY);
  return v === 'active' || v === 'canceled' || v === 'failed' ? v : 'active';
}
export function setMockPlanState(state: MockPlanState): void {
  writeLS(MOCK_PLAN_STATE_KEY, state);
}

// ── helpers ──────────────────────────────────────────────────────────────────
/** Small artificial latency so loading skeletons are visible in the browser. */
const LATENCY = 140;
function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY));
}

function iso(daysFromNow: number, hour = 15): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

const IMG = (id: string) =>
  `https://res.cloudinary.com/dys2k5muv/image/upload/w_400,h_500,c_fill,q_auto,f_auto/${id}`;

const CONCEPT = (slug: string) =>
  `https://res.cloudinary.com/dys2k5muv/image/upload/w_400,h_500,c_fill,q_auto,f_auto/journal/post-04-ai-interior-design-styles/${slug}`;

const MOCK_USER: AccountUser = {
  id: 'mock-user-1',
  email: 'anahit@designature.studio',
  name: 'Anahit Ghasabyan',
  picture: null,
};

// ── plan ─────────────────────────────────────────────────────────────────────
function buildPlan(tier: PlanTier, state: MockPlanState): Plan {
  if (tier === 'free') {
    return {
      tier: 'free',
      status: 'active',
      renewsAt: null,
      periodEndAt: null,
      latestChargeStatus: null,
    };
  }
  if (state === 'canceled') {
    return {
      tier,
      status: 'canceled',
      renewsAt: null,
      periodEndAt: iso(24),
      latestChargeStatus: 'paid',
    };
  }
  if (state === 'failed') {
    return {
      tier,
      status: 'grace',
      renewsAt: iso(24),
      periodEndAt: null,
      latestChargeStatus: 'failed',
      gracePeriodEndsAt: iso(7),
    };
  }
  return {
    tier,
    status: 'active',
    renewsAt: iso(24),
    periodEndAt: null,
    latestChargeStatus: 'paid',
  };
}

// ── quota ────────────────────────────────────────────────────────────────────
function buildQuota(tier: PlanTier): Quota {
  const resetsAt = tier === 'free' ? null : iso(24);
  if (tier === 'free') {
    return {
      aiVision: { used: 0, cap: 0, resetsAt: null }, // locked — Design+ unlocks
      shopping: { used: 1, cap: 3, resetsAt: null },
      roomAudit: { used: 0, cap: 1, resetsAt: null }, // 1 sample
      styleQuiz: { used: 2, cap: 5, resetsAt: null },
      designBrief: { used: 0, cap: 1, resetsAt: null },
      cultural: { used: 0, cap: 1, resetsAt: null },
    };
  }
  if (tier === 'studio') {
    return {
      aiVision: { used: 24, cap: 60, resetsAt },
      shopping: { used: 18, cap: 60, resetsAt },
      roomAudit: { used: 6, cap: 20, resetsAt },
      styleQuiz: { used: 12, cap: null, resetsAt }, // unlimited
      designBrief: { used: 3, cap: 20, resetsAt },
      cultural: { used: 2, cap: 20, resetsAt },
    };
  }
  // design
  return {
    aiVision: { used: 3, cap: 10, resetsAt },
    shopping: { used: 9, cap: 12, resetsAt },
    roomAudit: { used: 1, cap: 5, resetsAt },
    styleQuiz: { used: 4, cap: null, resetsAt }, // unlimited on paid
    designBrief: { used: 1, cap: 5, resetsAt },
    cultural: { used: 0, cap: 5, resetsAt },
  };
}

// ── library ──────────────────────────────────────────────────────────────────
const LIBRARY: LibraryItem[] = [
  {
    id: 'lib-1',
    tool: 'ai_vision',
    title: 'Kitchen — Mid-Century Coastal',
    createdAt: iso(-3),
    thumbnailUrl: CONCEPT('2-japandi.png'),
  },
  {
    id: 'lib-2',
    tool: 'ai_vision',
    title: 'Living Room — Warm Minimalist',
    createdAt: iso(-5),
    thumbnailUrl: CONCEPT('1-warm-minimalism.png'),
  },
  {
    id: 'lib-3',
    tool: 'shopping',
    title: 'Living Room — 12 items',
    createdAt: iso(-8),
    thumbnailUrl: CONCEPT('6-bohemian.png'),
  },
  {
    id: 'lib-4',
    tool: 'room_audit',
    title: 'Bedroom — scored 74',
    createdAt: iso(-12),
    thumbnailUrl: IMG('v1773055153/2_fmejx8.jpg'),
  },
  {
    id: 'lib-5',
    tool: 'ai_vision',
    title: 'Hallway — Scandinavian',
    createdAt: iso(-16),
    thumbnailUrl: CONCEPT('3-scandinavian.png'),
  },
  {
    id: 'lib-6',
    tool: 'style_quiz',
    title: 'Your style — Industrial Warm',
    createdAt: iso(-18),
    thumbnailUrl: CONCEPT('7-industrial.png'),
  },
];

const PROJECT_FOLDERS: ProjectFolder[] = [
  {
    id: 'proj-1',
    name: 'Vardanyan Apartment',
    coverUrl:
      'https://res.cloudinary.com/dys2k5muv/image/upload/w_400,h_240,c_fill,q_auto,f_auto/v1773055155/1_fbuajl.jpg',
    itemCount: 14,
  },
  {
    id: 'proj-2',
    name: 'Lakeside House',
    coverUrl:
      'https://res.cloudinary.com/dys2k5muv/image/upload/w_400,h_240,c_fill,q_auto,f_auto/v1773054125/1_ecqvsk.jpg',
    itemCount: 9,
  },
];

// ── bookings ─────────────────────────────────────────────────────────────────
function buildBookings(): BookingsResult {
  return {
    upcoming: [
      {
        id: 'bk-1',
        slotStartTime: iso(5, 15), // > 24h out → full-refund branch
        endTime: iso(5, 16),
        meetLink: 'https://meet.google.com/mock-abc-defg',
        rescheduleUrl: 'https://calendly.com/hello-designature/consultation/reschedule',
        kind: 'paid_consult',
        amount: 99,
        state: 'upcoming',
      },
    ],
    past: [
      {
        id: 'bk-0',
        slotStartTime: iso(-47, 15),
        endTime: iso(-47, 16),
        meetLink: null,
        rescheduleUrl: null,
        kind: 'paid_consult',
        amount: 99,
        state: 'past',
      },
    ],
  };
}

// ── billing ──────────────────────────────────────────────────────────────────
const BILLING_ROWS: BillingRow[] = [
  {
    orderId: 'ord-104',
    date: iso(-7),
    description: 'Design — monthly',
    amount: 19,
    status: 'paid',
    invoiceUrl: '/api/billing/invoice/ord-104.pdf',
  },
  {
    orderId: 'ord-103',
    date: iso(-37),
    description: 'Design — monthly',
    amount: 19,
    status: 'paid',
    invoiceUrl: '/api/billing/invoice/ord-103.pdf',
  },
  {
    orderId: 'ord-102',
    date: iso(-47),
    description: '$99 Consultation',
    amount: 99,
    status: 'paid',
    invoiceUrl: '/api/billing/invoice/ord-102.pdf',
  },
  {
    orderId: 'ord-101',
    date: iso(-67),
    description: 'Design — monthly',
    amount: 19,
    status: 'refunded',
    invoiceUrl: '/api/billing/invoice/ord-101.pdf',
  },
];

const PAYMENT_METHOD: PaymentMethod = {
  brand: 'VISA',
  last4: '4242',
  expMonth: 8,
  expYear: 2027,
  cardholderName: 'Anahit Ghasabyan',
};

// mutable notification prefs (so toggles persist within a session)
let notificationPrefs: NotificationPrefs = {
  productUpdates: false,
  journalNew: false,
  bookingReminders: true,
};

// ── recent activity ──────────────────────────────────────────────────────────
function buildActivity() {
  return LIBRARY.slice(0, 5).map((item) => ({
    id: `act-${item.id}`,
    tool: item.tool,
    title: item.title,
    createdAt: item.createdAt,
    thumbnailUrl: item.thumbnailUrl,
  }));
}

// ── exported mock methods ────────────────────────────────────────────────────
export function getDashboard(): Promise<DashboardData> {
  const tier = getMockTier();
  const state = getMockPlanState();
  const paid = tier !== 'free';
  return delay({
    user: MOCK_USER,
    plan: buildPlan(tier, state),
    quota: buildQuota(tier),
    recentActivity: paid ? buildActivity() : [],
    nextBooking: {
      id: 'bk-1',
      slotStartTime: iso(5, 15),
      meetLink: 'https://meet.google.com/mock-abc-defg',
      kind: 'paid_consult',
    },
    counts: {
      libraryTotal: paid ? LIBRARY.length : 0,
      upcomingBookings: 1,
    },
  });
}

export function getLibrary(filters: LibraryFilters = {}): Promise<LibraryPage> {
  const tier = getMockTier();
  if (tier === 'free') return delay({ items: [], total: 0, page: 1 });
  let items = LIBRARY;
  if (filters.tool && filters.tool !== 'all') {
    items = items.filter((i) => i.tool === filters.tool);
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    items = items.filter((i) => i.title.toLowerCase().includes(q));
  }
  return delay({ items, total: items.length, page: filters.page ?? 1 });
}

export function getProjectFolders(): Promise<ProjectFolder[]> {
  return delay(getMockTier() === 'studio' ? PROJECT_FOLDERS : []);
}

export function getBookings(): Promise<BookingsResult> {
  return delay(buildBookings());
}

export function getBillingHistory(page = 1): Promise<BillingHistory> {
  const tier = getMockTier();
  if (tier === 'free') {
    return delay({ rows: [], total: 0, page, pageSize: 10 });
  }
  return delay({ rows: BILLING_ROWS, total: BILLING_ROWS.length, page, pageSize: 10 });
}

export function getPaymentMethod(): Promise<PaymentMethod | null> {
  return delay(getMockTier() === 'free' ? null : PAYMENT_METHOD);
}

export function getNotificationPrefs(): Promise<NotificationPrefs> {
  return delay({ ...notificationPrefs });
}

export function cancelSubscription(_reason?: string): Promise<Plan> {
  void _reason;
  const tier = getMockTier();
  setMockPlanState('canceled');
  return delay(buildPlan(tier, 'canceled'));
}

export function resumeSubscription(): Promise<Plan> {
  const tier = getMockTier();
  setMockPlanState('active');
  return delay(buildPlan(tier, 'active'));
}

export function changePlan(toTier: Exclude<PlanTier, 'free'>): Promise<Plan> {
  setMockTier(toTier);
  setMockPlanState('active');
  return delay(buildPlan(toTier, 'active'));
}

export function replacePaymentMethod(): Promise<{ redirectUrl: string | null }> {
  // In mock mode there is no bank redirect — the modal just closes + toasts.
  return delay({ redirectUrl: null });
}

export function removePaymentMethod(): Promise<void> {
  return delay(undefined);
}

export function cancelConsultation(_orderId: string): Promise<Booking> {
  void _orderId;
  const past = buildBookings().past[0];
  return delay({ ...past, id: _orderId });
}

export function updateProfile(name: string): Promise<AccountUser> {
  return delay({ ...MOCK_USER, name });
}

export function updateNotifications(prefs: Partial<NotificationPrefs>): Promise<NotificationPrefs> {
  notificationPrefs = { ...notificationPrefs, ...prefs };
  return delay({ ...notificationPrefs });
}

export function deleteAccount(): Promise<void> {
  return delay(undefined);
}
