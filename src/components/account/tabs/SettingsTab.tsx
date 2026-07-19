/** AC-001 — Settings tab. Profile (name/email) + notification toggles + language + danger zone. */
import React, { useState } from 'react';
import { Button, Eyebrow, Skeleton } from '../ui';
import { useResource } from '../useResource';
import { accountApi, type AccountUser, type NotificationPrefs } from '../../../lib/accountApi';

const Switch: React.FC<{ on: boolean; onToggle?: () => void; locked?: boolean }> = ({
  on,
  onToggle,
  locked,
}) => (
  <button
    role="switch"
    aria-checked={on}
    disabled={locked}
    onClick={onToggle}
    className={`w-11 h-6 rounded-full relative flex-shrink-0 transition-colors ${
      on ? 'bg-[#15803d]' : 'bg-[#DAD2C3]'
    } ${locked ? 'opacity-55 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    <span
      className={`absolute top-[2px] w-5 h-5 rounded-full bg-white transition-all ${
        on ? 'left-[22px]' : 'left-[2px]'
      }`}
    />
  </button>
);

const ToggleRow: React.FC<{
  title: string;
  desc: string;
  on: boolean;
  first?: boolean;
  locked?: boolean;
  onToggle?: () => void;
}> = ({ title, desc, on, first, locked, onToggle }) => (
  <div
    className={`flex items-center justify-between py-4 max-w-[520px] ${first ? '' : 'border-t border-black/[0.07]'}`}
  >
    <div>
      <div className="font-body font-semibold text-[#0A0A0A]">{title}</div>
      <div className="text-[12px] text-[#6B6B6B] font-body">{desc}</div>
    </div>
    <Switch on={on} onToggle={onToggle} locked={locked} />
  </div>
);

export const SettingsTab: React.FC<{
  user: AccountUser;
  hasUpcomingBookings: boolean;
  onDeleteAccount: () => void;
  onToast: (msg: string) => void;
}> = ({ user, hasUpcomingBookings, onDeleteAccount, onToast }) => {
  const [name, setName] = useState(user.name);
  const prefsRes = useResource(() => accountApi.getNotificationPrefs(), []);
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const current = prefs ?? prefsRes.data;

  const saveName = async () => {
    if (name.trim() && name.trim() !== user.name) {
      await accountApi.updateProfile(name.trim());
      onToast('Name saved');
    }
  };

  const toggle = async (key: keyof NotificationPrefs) => {
    if (!current) return;
    if (key === 'bookingReminders' && hasUpcomingBookings) return; // locked on
    const next = { ...current, [key]: !current[key] };
    setPrefs(next);
    await accountApi.updateNotifications({ [key]: next[key] });
  };

  return (
    <section>
      <h1 className="font-display text-[44px] leading-[1.05] mb-1 text-[#0A0A0A]">Settings</h1>
      <p className="text-[#6B6B6B] mb-7 font-body">Profile, notifications, and account.</p>

      {/* profile */}
      <Eyebrow className="mb-[14px]">Profile</Eyebrow>
      <div className="flex flex-col gap-[6px] mb-[18px] max-w-[420px]">
        <label className="text-[11px] font-bold tracking-[0.14em] uppercase text-[#6B6B6B]">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
          className="border border-black/15 px-3 py-[11px] font-body text-[14px]"
        />
      </div>
      <div className="flex flex-col gap-[6px] mb-[18px] max-w-[420px]">
        <label className="text-[11px] font-bold tracking-[0.14em] uppercase text-[#6B6B6B]">
          Email (managed by Google)
        </label>
        <input
          value={user.email}
          disabled
          className="border border-black/15 px-3 py-[11px] font-body text-[14px] bg-[#FAFAFA] text-[#6B6B6B]"
        />
      </div>

      {/* notifications */}
      <Eyebrow className="mt-[26px] mb-[6px]">Notifications</Eyebrow>
      {prefsRes.loading && !current ? (
        <div className="max-w-[520px] flex flex-col gap-3 py-3">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </div>
      ) : current ? (
        <>
          <ToggleRow
            first
            title="Product updates"
            desc="Occasional news about new tools."
            on={current.productUpdates}
            onToggle={() => toggle('productUpdates')}
          />
          <ToggleRow
            title="Journal — new posts"
            desc="A note when we publish something new."
            on={current.journalNew}
            onToggle={() => toggle('journalNew')}
          />
          <ToggleRow
            title="Booking reminders"
            desc={
              hasUpcomingBookings
                ? "Can't be turned off while you have upcoming bookings."
                : 'Reminders before your consultations.'
            }
            on={current.bookingReminders}
            locked={hasUpcomingBookings}
            onToggle={() => toggle('bookingReminders')}
          />
        </>
      ) : null}

      {/* language */}
      <Eyebrow className="mt-[26px] mb-[6px]">Language</Eyebrow>
      <div className="text-[#6B6B6B] text-[13px] font-body">English</div>

      {/* danger zone */}
      <div className="border border-[#9E5E41] p-6 mt-[30px]">
        <Eyebrow style={{ color: '#9E5E41' }}>Danger zone</Eyebrow>
        <p className="text-[#6B6B6B] text-[12px] my-[8px] mb-4 font-body">
          Permanently deletes your saved work, bookings history, and cancels any active plan (no
          refund per policy).
        </p>
        <Button variant="danger" onClick={onDeleteAccount}>
          Delete my account
        </Button>
      </div>
    </section>
  );
};
