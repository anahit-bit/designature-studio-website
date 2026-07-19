/** AC-001 — Overview tab. Welcome + plan status + usage grid + recent activity + next booking. */
import React from 'react';
import {
  Button,
  Card,
  Eyebrow,
  TOOL_META,
  fmtDate,
  fmtMonthDay,
  fmtDateTime,
  timeAgo,
} from '../ui';
import type { DashboardData, PlanTier, QuotaEntry, Booking } from '../../../lib/accountApi';

const PLAN_NAME: Record<PlanTier, string> = { free: 'Free', design: 'Design', studio: 'Studio' };
const PLAN_PRICE: Record<PlanTier, string> = {
  free: 'No card on file.',
  design: '$19 / month · billed monthly',
  studio: '$49 / month · billed monthly',
};

// ── usage card ───────────────────────────────────────────────────────────────
const UsageCard: React.FC<{ eyebrow: string; entry: QuotaEntry; tier: PlanTier }> = ({
  eyebrow,
  entry,
  tier,
}) => {
  const locked = entry.cap === 0;
  const unlimited = entry.cap === null;
  const pct = unlimited || locked ? 0 : Math.min(100, Math.round((entry.used / (entry.cap || 1)) * 100));
  const warn = !unlimited && !locked && pct >= 80;
  const full = !unlimited && !locked && entry.used >= (entry.cap || 0);

  let big: React.ReactNode;
  if (locked) big = '— / —';
  else if (unlimited) big = 'Unlimited';
  else big = `${entry.used} / ${entry.cap}`;

  let reset: string;
  if (tier === 'free') {
    reset = locked ? 'Free tier — upgrade to unlock' : `Free tier — ${entry.cap}/month`;
  } else {
    reset = unlimited ? 'Included with your plan' : `Resets ${fmtMonthDay(entry.resetsAt)}`;
  }

  return (
    <div className="border border-black/10 p-5">
      <Eyebrow>{eyebrow}</Eyebrow>
      <div
        className={`font-display text-[38px] leading-none my-3 ${full ? 'text-[#9E5E41]' : 'text-[#0A0A0A]'}`}
      >
        {big}
      </div>
      {locked ? (
        <div className="relative h-[22px] flex items-center justify-center bg-[#DAD2C3]/40 text-[11px] font-bold tracking-[0.1em] uppercase text-[#6B6B6B]">
          🔒 Design+ unlocks this
        </div>
      ) : (
        <div className="h-[2px] bg-[#DAD2C3] relative overflow-hidden">
          <span
            className="absolute left-0 top-0 bottom-0"
            style={{
              width: unlimited ? '100%' : `${pct}%`,
              background: unlimited ? '#0047AB' : warn ? '#9E5E41' : '#0A0A0A',
            }}
          />
        </div>
      )}
      <div className="text-[11px] text-[#6B6B6B] mt-[10px] font-body">{reset}</div>
    </div>
  );
};

export const OverviewTab: React.FC<{
  dashboard: DashboardData;
  onUpgrade: () => void;
  onManagePlan: () => void;
  onResume: () => void;
  onJoinCall: (link: string | null) => void;
  onReschedule: (booking: Booking | null) => void;
  onCancelBooking: () => void;
  onGoStudio: () => void;
}> = ({
  dashboard,
  onUpgrade,
  onManagePlan,
  onResume,
  onJoinCall,
  onReschedule,
  onCancelBooking,
  onGoStudio,
}) => {
  const { user, plan, quota, recentActivity, nextBooking } = dashboard;
  const tier = plan.tier;
  const paid = tier !== 'free';
  const canceled = plan.status === 'canceled';
  const firstName = user.name.split(' ')[0] || user.name;

  return (
    <section>
      <h1 className="font-display text-[44px] leading-[1.05] mb-1 text-[#0A0A0A]">
        Welcome back, {firstName}.
      </h1>
      <p className="text-[#6B6B6B] mb-7 font-body">Your studio at a glance.</p>

      {/* plan status */}
      <Card>
        <div className="flex justify-between gap-6 flex-wrap items-center">
          <div>
            <Eyebrow>Current plan</Eyebrow>
            <div className="font-display text-[32px] mt-[6px] mb-[4px] text-[#0A0A0A]">
              {PLAN_NAME[tier]}
            </div>
            <div className="text-[#6B6B6B] text-[12px] font-body">{PLAN_PRICE[tier]}</div>
            {paid && (
              <div className="text-[#6B6B6B] text-[12px] font-body mt-[6px]">
                {canceled && plan.periodEndAt
                  ? `Cancels ${fmtDate(plan.periodEndAt)}`
                  : plan.renewsAt
                    ? `Renews ${fmtDate(plan.renewsAt)}`
                    : ''}
              </div>
            )}
          </div>
          <div className="flex gap-[10px] flex-wrap">
            {tier === 'free' && (
              <Button variant="primary" onClick={onUpgrade}>
                Upgrade to Design →
              </Button>
            )}
            {paid && canceled && (
              <Button variant="success" onClick={onResume}>
                Resume subscription
              </Button>
            )}
            {paid && !canceled && (
              <Button variant="secondary" onClick={onManagePlan}>
                Manage plan
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* usage */}
      <Eyebrow className="mt-[26px] mb-3">This cycle</Eyebrow>
      <div className={`grid gap-4 ${tier === 'studio' ? 'md:grid-cols-4 grid-cols-2' : 'md:grid-cols-3 grid-cols-2'}`}>
        <UsageCard eyebrow="AI Vision" entry={quota.aiVision} tier={tier} />
        <UsageCard eyebrow="Shopping List" entry={quota.shopping} tier={tier} />
        <UsageCard eyebrow="Room Audit" entry={quota.roomAudit} tier={tier} />
        {tier === 'studio' && <UsageCard eyebrow="Style Quiz" entry={quota.styleQuiz} tier={tier} />}
      </div>

      {/* recent activity */}
      <Eyebrow className="mt-[26px] mb-[6px]">Recent activity</Eyebrow>
      {recentActivity.length > 0 ? (
        <Card className="!py-2 !px-6">
          <div className="flex flex-col">
            {recentActivity.map((a, i) => {
              const { Icon } = TOOL_META[a.tool];
              return (
                <div
                  key={a.id}
                  className={`flex items-center gap-[14px] py-[13px] ${i > 0 ? 'border-t border-black/[0.07]' : ''}`}
                >
                  <div className="w-[34px] h-[34px] border border-black/[0.12] flex items-center justify-center flex-shrink-0">
                    <Icon className="w-[15px] h-[15px] text-[#0A0A0A]" />
                  </div>
                  <div className="flex-1 font-body text-[14px] text-[#0A0A0A]">{a.title}</div>
                  <div className="text-[12px] text-[#6B6B6B] font-body whitespace-nowrap">
                    {timeAgo(a.createdAt)}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        <Card className="text-center text-[#6B6B6B]">
          <button onClick={onGoStudio} className="font-body hover:text-[#0047AB] transition-colors">
            No activity yet. Try a tool from the AI Studio →
          </button>
        </Card>
      )}

      {/* next booking */}
      {nextBooking && (
        <>
          <Eyebrow className="mt-[26px] mb-[10px]">Upcoming consultation</Eyebrow>
          <div className="border border-[#9E5E41] p-[22px] flex justify-between gap-5 flex-wrap items-center">
            <div>
              <div className="font-display text-[24px] text-[#0A0A0A]">
                {fmtDateTime(nextBooking.slotStartTime)}
              </div>
              <div className="text-[#6B6B6B] text-[12px] font-body">
                (GMT+4, your local time) ·{' '}
                {nextBooking.kind === 'paid_consult' ? '$99 Consultation' : 'Free Quick Chat'}
              </div>
            </div>
            <div className="flex gap-[10px] flex-wrap">
              <Button size="sm" variant="primary" onClick={() => onJoinCall(nextBooking.meetLink)}>
                Join call
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  onReschedule({
                    id: nextBooking.id,
                    slotStartTime: nextBooking.slotStartTime,
                    meetLink: nextBooking.meetLink,
                    rescheduleUrl: null,
                    kind: nextBooking.kind,
                    amount: nextBooking.kind === 'paid_consult' ? 99 : 0,
                    state: 'upcoming',
                  })
                }
              >
                Reschedule
              </Button>
              <Button size="sm" variant="danger" onClick={onCancelBooking}>
                Cancel
              </Button>
            </div>
          </div>
        </>
      )}
    </section>
  );
};
