/** AC-001 — left rail: identity card + nav list + sign out. Flattens to a horizontal pill row below 1024px. */
import React from 'react';
import { PlanPill, fmtDate } from './ui';
import type { AccountUser, Plan } from '../../lib/accountApi';
import type { AccountTab } from './AccountPage';

const NAV: { key: AccountTab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'library', label: 'Library' },
  { key: 'bookings', label: 'Bookings' },
  { key: 'billing', label: 'Billing' },
  { key: 'settings', label: 'Settings' },
];

export const AccountRail: React.FC<{
  user: AccountUser;
  plan: Plan;
  libraryCount: number;
  upcomingCount: number;
  activeTab: AccountTab;
  onNav: (tab: AccountTab) => void;
  onSignOut: () => void;
}> = ({ user, plan, libraryCount, upcomingCount, activeTab, onNav, onSignOut }) => {
  const initial = (user.name || user.email || '?').charAt(0).toUpperCase();
  const paid = plan.tier !== 'free';
  const canceled = plan.status === 'canceled';

  const badgeFor = (key: AccountTab): number | null => {
    if (key === 'library') return paid && libraryCount > 0 ? libraryCount : null;
    if (key === 'bookings') return upcomingCount > 0 ? upcomingCount : null;
    return null;
  };

  return (
    <aside className="lg:sticky lg:top-24 flex flex-row lg:flex-col flex-wrap items-center lg:items-stretch gap-3 lg:gap-[22px]">
      {/* identity */}
      <div className="border border-black/10 p-[22px] lg:p-[22px] flex lg:block items-center gap-3 flex-[1_1_100%] lg:flex-none">
        <div className="w-12 h-12 rounded-full bg-[#9E5E41] text-white flex items-center justify-center font-display text-[22px] overflow-hidden lg:mb-[14px] flex-shrink-0">
          {user.picture ? (
            <img src={user.picture} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            initial
          )}
        </div>
        <div>
          <div className="font-body font-semibold text-[15px] text-[#0A0A0A]">{user.name}</div>
          <div className="mt-2">
            <PlanPill tier={plan.tier} />
          </div>
          {paid && (
            <div className="text-[11px] text-[#6B6B6B] mt-2 font-body">
              {canceled && plan.periodEndAt
                ? `Ends ${fmtDate(plan.periodEndAt)}`
                : plan.renewsAt
                  ? `Renews ${fmtDate(plan.renewsAt)}`
                  : ''}
            </div>
          )}
          {!paid && <div className="text-[11px] text-[#6B6B6B] mt-2 font-body">No card on file</div>}
        </div>
      </div>

      {/* nav */}
      <nav className="flex flex-row lg:flex-col w-full lg:w-auto overflow-x-auto lg:overflow-visible border-y border-[#DAD2C3] lg:border-0">
        {NAV.map((item) => {
          const active = activeTab === item.key;
          const badge = badgeFor(item.key);
          return (
            <button
              key={item.key}
              onClick={() => onNav(item.key)}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center justify-between gap-2 font-body text-[15px] text-left h-12 lg:h-11 px-4 whitespace-nowrap transition-colors border-b-[3px] border-l-0 lg:border-b-0 lg:border-l-[3px] ${
                active
                  ? 'text-[#0A0A0A] font-semibold border-[#9E5E41]'
                  : 'text-[#6B6B6B] border-transparent hover:text-[#0A0A0A]'
              }`}
            >
              <span>{item.label}</span>
              {badge != null && (
                <span className="text-[11px] font-bold bg-black/[0.06] text-[#0A0A0A] px-2 py-[1px]">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* sign out (desktop rail only) */}
      <button
        onClick={onSignOut}
        className="hidden lg:block text-[13px] text-[#0A0A0A] pl-4 text-left hover:underline"
      >
        Sign out
      </button>
    </aside>
  );
};
