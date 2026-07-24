/**
 * AC-001 — User Dashboard ("My account") shell.
 *
 * - Tabs are URL-driven via ?tab= (overview is the default, param omitted).
 * - One /api/user/dashboard fetch powers the rail + Overview; each other tab
 *   fetches its own resource on mount.
 * - Four modals (cancel plan, cancel booking, update card, delete account) are
 *   owned here so any tab can open them.
 * - A dev-only tier / plan-state switcher (mock mode only) lets the owner preview
 *   Free / Design / Studio — and the canceled + failed-charge variants — in one
 *   browser without seeding a DB.
 */
import React, { useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import { accountApi, USE_MOCK_ACCOUNT, type Booking } from '../../lib/accountApi';
import {
  getMockTier,
  setMockTier,
  getMockPlanState,
  setMockPlanState,
  type MockPlanState,
} from '../../lib/accountApi.mock';
import type { PlanTier } from '../../lib/accountApi';
import { useResource } from './useResource';
import { AccountRail } from './AccountRail';
import { Skeleton, ErrorBanner } from './ui';
import { OverviewTab } from './tabs/OverviewTab';
import { LibraryTab } from './tabs/LibraryTab';
import { BookingsTab } from './tabs/BookingsTab';
import { BillingTab } from './tabs/BillingTab';
import { SettingsTab } from './tabs/SettingsTab';
import { CancelPlanModal } from './modals/CancelPlanModal';
import { CancelBookingModal } from './modals/CancelBookingModal';
import { UpdatePaymentModal } from './modals/UpdatePaymentModal';
import { DeleteAccountModal } from './modals/DeleteAccountModal';

export type AccountTab = 'overview' | 'library' | 'bookings' | 'billing' | 'settings';
const TABS: AccountTab[] = ['overview', 'library', 'bookings', 'billing', 'settings'];

type ModalKind = 'cancelPlan' | 'cancelBooking' | 'updateCard' | 'delete' | null;

const AccountPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const rawTab = searchParams.get('tab') as AccountTab | null;
  const activeTab: AccountTab = rawTab && TABS.includes(rawTab) ? rawTab : 'overview';

  const dashboard = useResource(() => accountApi.getDashboard(), []);
  const [version, setVersion] = useState(0); // bump to remount tabs on mock switch

  const [modal, setModal] = useState<ModalKind>(null);
  const [modalBooking, setModalBooking] = useState<Booking | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // Live library total reported by the Library tab — keeps the rail badge in sync
  // even when a save/delete happened after the dashboard's own count was fetched.
  const [liveLibraryTotal, setLiveLibraryTotal] = useState<number | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2500);
  }, []);

  const goTab = useCallback(
    (tab: AccountTab) => {
      if (tab === 'overview') setSearchParams({});
      else setSearchParams({ tab });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [setSearchParams]
  );

  const onSignOut = useCallback(async () => {
    await signOut();
    navigate('/ai-concepts');
  }, [signOut, navigate]);

  const onResume = useCallback(async () => {
    await accountApi.resumeSubscription();
    showToast('Subscription resumed');
    dashboard.reload();
  }, [dashboard, showToast]);

  const openCancelBooking = useCallback((b: Booking) => {
    setModalBooking(b);
    setModal('cancelBooking');
  }, []);

  // ── mock dev switcher ──
  const applyMock = (tier: PlanTier, state: MockPlanState) => {
    setMockTier(tier);
    setMockPlanState(state);
    setVersion((v) => v + 1);
    dashboard.reload();
  };

  // ── top-level loading / error ──
  if (dashboard.loading && !dashboard.data) {
    return (
      <div className="max-w-[1240px] mx-auto grid grid-cols-1 lg:grid-cols-[256px_1fr] gap-5 lg:gap-10 px-7 pt-8 pb-20 items-start">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-[140px] w-full" />
          <Skeleton className="h-[220px] w-full" />
        </div>
        <div className="flex flex-col gap-4 max-w-[900px]">
          <Skeleton className="h-[52px] w-1/2" />
          <Skeleton className="h-[120px] w-full" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-[120px]" />
            <Skeleton className="h-[120px]" />
            <Skeleton className="h-[120px]" />
          </div>
        </div>
      </div>
    );
  }

  if (dashboard.error || !dashboard.data) {
    return (
      <div className="max-w-[900px] mx-auto px-7 pt-10 pb-20">
        <ErrorBanner onRetry={dashboard.reload} message="Couldn't load your dashboard. Retry" />
      </div>
    );
  }

  const data = dashboard.data;
  const plan = data.plan;
  const tier = plan.tier;

  return (
    <div className="max-w-[1240px] mx-auto grid grid-cols-1 lg:grid-cols-[256px_1fr] gap-5 lg:gap-10 px-7 pt-8 pb-20 items-start">
      <AccountRail
        user={data.user}
        plan={plan}
        libraryCount={liveLibraryTotal ?? data.counts.libraryTotal}
        upcomingCount={data.counts.upcomingBookings}
        activeTab={activeTab}
        onNav={goTab}
        onSignOut={onSignOut}
      />

      <main key={version} className="min-w-0 max-w-[900px] w-full">
        {activeTab === 'overview' && (
          <OverviewTab
            dashboard={data}
            onUpgrade={() => navigate('/pricing')}
            onManagePlan={() => goTab('billing')}
            onResume={onResume}
            onJoinCall={(link) => link && window.open(link, '_blank', 'noopener')}
            onReschedule={(b) => b?.rescheduleUrl && window.open(b.rescheduleUrl, '_blank', 'noopener')}
            onCancelBooking={() => {
              if (data.nextBooking) {
                openCancelBooking({
                  id: data.nextBooking.id,
                  slotStartTime: data.nextBooking.slotStartTime,
                  meetLink: data.nextBooking.meetLink,
                  rescheduleUrl: null,
                  kind: data.nextBooking.kind,
                  amount: data.nextBooking.kind === 'paid_consult' ? 99 : 0,
                  state: 'upcoming',
                });
              }
            }}
            onGoStudio={() => navigate('/ai-concepts')}
          />
        )}

        {activeTab === 'library' && (
          <LibraryTab
            tier={tier}
            onTryTool={(hash) => navigate(hash ? `/ai-concepts#${hash}` : '/ai-concepts')}
            onSeePlans={() => navigate('/pricing')}
            onChanged={() => dashboard.reload()}
            onTotalChange={setLiveLibraryTotal}
          />
        )}

        {activeTab === 'bookings' && (
          <BookingsTab
            onCancel={openCancelBooking}
            onToast={showToast}
            onBookConsultation={() => navigate('/consultation')}
            onFreeChat={() =>
              window.open('https://calendly.com/hello-designature/quick-conversation', '_blank', 'noopener')
            }
          />
        )}

        {activeTab === 'billing' && (
          <BillingTab
            plan={plan}
            onUpgrade={(t) => navigate(`/pricing?upgrade=${t}`)}
            onCancelPlan={() => setModal('cancelPlan')}
            onUpdateCard={() => setModal('updateCard')}
            onToast={showToast}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            user={data.user}
            hasUpcomingBookings={data.counts.upcomingBookings > 0}
            onDeleteAccount={() => setModal('delete')}
            onToast={showToast}
          />
        )}
      </main>

      {/* ── modals ── */}
      <CancelPlanModal
        open={modal === 'cancelPlan'}
        onClose={() => setModal(null)}
        periodEndAt={plan.periodEndAt ?? plan.renewsAt}
        onCanceled={() => {
          showToast('Plan canceled — access until period end');
          dashboard.reload();
        }}
      />
      <CancelBookingModal
        open={modal === 'cancelBooking'}
        onClose={() => setModal(null)}
        booking={modalBooking}
        onCanceled={() => {
          showToast('Booking canceled');
          setVersion((v) => v + 1);
          dashboard.reload();
        }}
      />
      <UpdatePaymentModal open={modal === 'updateCard'} onClose={() => setModal(null)} onToast={showToast} />
      <DeleteAccountModal
        open={modal === 'delete'}
        onClose={() => setModal(null)}
        email={data.user.email}
        onDeleted={async () => {
          setModal(null);
          showToast('Account deleted');
          await signOut().catch(() => {});
          navigate('/');
        }}
      />

      {/* ── toast ── */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[400] bg-[#0A0A0A] text-white text-[12px] font-bold tracking-[0.12em] uppercase px-5 py-3"
        >
          {toast}
        </div>
      )}

      {/* ── dev-only tier / plan-state switcher (mock mode) ── */}
      {USE_MOCK_ACCOUNT && (
        <div className="fixed bottom-4 left-4 z-[400] bg-white border border-black/15 shadow-lg p-3 text-[10px] font-body">
          <div className="font-bold tracking-[0.18em] uppercase text-[#6B6B6B] mb-2">
            Preview as (mock)
          </div>
          <div className="flex gap-1 mb-2">
            {(['free', 'design', 'studio'] as PlanTier[]).map((t) => (
              <button
                key={t}
                onClick={() => applyMock(t, getMockPlanState())}
                className={`px-2 py-1 uppercase tracking-[0.1em] font-bold border ${
                  getMockTier() === t
                    ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]'
                    : 'bg-white text-[#6B6B6B] border-black/15'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {(['active', 'canceled', 'failed'] as MockPlanState[]).map((s) => (
              <button
                key={s}
                onClick={() => applyMock(getMockTier(), s)}
                disabled={getMockTier() === 'free'}
                className={`px-2 py-1 uppercase tracking-[0.1em] font-bold border disabled:opacity-30 ${
                  getMockPlanState() === s
                    ? 'bg-[#9E5E41] text-white border-[#9E5E41]'
                    : 'bg-white text-[#6B6B6B] border-black/15'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountPage;
