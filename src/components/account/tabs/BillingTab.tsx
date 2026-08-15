/** AC-001 — Billing tab. Plan card + payment method + billing-history table; failed-charge banner; free-tier variants. */
import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button, Card, Eyebrow, Skeleton, ErrorBanner, fmtDate } from '../ui';
import { useResource } from '../useResource';
import {
  accountApi,
  type Plan,
  type PlanTier,
  type BillingRowStatus,
} from '../../../lib/accountApi';

const PLAN_NAME: Record<PlanTier, string> = { free: 'Free', design: 'Design', studio: 'Studio' };

const STATUS_STYLE: Record<BillingRowStatus, string> = {
  paid: 'border-[#15803d] text-[#15803d]',
  pending: 'border-[#6B6B6B] text-[#6B6B6B]',
  failed: 'border-[#9E5E41] text-[#9E5E41]',
  refunded: 'border-[#6B6B6B] text-[#6B6B6B]',
};

export const BillingTab: React.FC<{
  plan: Plan;
  onUpgrade: (tier: 'design' | 'studio') => void;
  onCancelPlan: () => void;
  onUpdateCard: () => void;
  onToast: (msg: string) => void;
}> = ({ plan, onUpgrade, onCancelPlan, onUpdateCard, onToast }) => {
  const tier = plan.tier;
  const paid = tier !== 'free';
  const canceled = plan.status === 'canceled';
  const failed = plan.latestChargeStatus === 'failed';

  const card = useResource(() => accountApi.getPaymentMethod(), []);
  const [page, setPage] = useState(1);
  const history = useResource(() => accountApi.getBillingHistory(page), [page]);
  const totalPages = history.data ? Math.max(1, Math.ceil(history.data.total / history.data.pageSize)) : 1;

  return (
    <section>
      <h1 className="font-display text-[44px] leading-[1.05] mb-1 text-[#0A0A0A]">Billing</h1>
      <p className="text-[#6B6B6B] mb-7 font-body">Plan, payment method, and history.</p>

      {/* failed charge banner */}
      {failed && (
        <div className="flex items-center gap-4 border border-[#9E5E41] px-[18px] py-[14px] mb-[22px]">
          <AlertTriangle className="w-4 h-4 text-[#9E5E41] flex-shrink-0" />
          <span className="flex-1 font-body text-[13px]">
            Your recent charge failed. Update your card by{' '}
            <b>{plan.gracePeriodEndsAt ? fmtDate(plan.gracePeriodEndsAt) : 'soon'}</b> to keep{' '}
            {PLAN_NAME[tier]}.
          </span>
          <Button size="sm" variant="danger" onClick={onUpdateCard}>
            Update card now
          </Button>
        </div>
      )}

      {/* plan card */}
      <Card>
        <div className="flex justify-between gap-6 flex-wrap items-center">
          <div>
            <Eyebrow>Current plan</Eyebrow>
            <div className="font-display text-[32px] mt-[6px] mb-[4px] text-[#0A0A0A]">
              {PLAN_NAME[tier]}
            </div>
            <div className="text-[#6B6B6B] text-[12px] font-body">
              {tier === 'free' && 'No active subscription.'}
              {tier === 'design' &&
                (canceled && plan.periodEndAt
                  ? `$19 / month · Cancels ${fmtDate(plan.periodEndAt)}`
                  : `$19 / month · Renews ${fmtDate(plan.renewsAt)}`)}
              {tier === 'studio' &&
                (canceled && plan.periodEndAt
                  ? `$49 / month · Cancels ${fmtDate(plan.periodEndAt)}`
                  : `$49 / month · Renews ${fmtDate(plan.renewsAt)}`)}
            </div>
          </div>
          <div className="flex gap-[10px] flex-wrap justify-end">
            {tier === 'free' && (
              <>
                <Button size="sm" variant="primary" onClick={() => onUpgrade('design')}>
                  Upgrade to Design ($19/mo)
                </Button>
                <Button size="sm" variant="secondary" onClick={() => onUpgrade('studio')}>
                  Upgrade to Studio ($49/mo)
                </Button>
              </>
            )}
            {tier === 'design' && (
              <Button size="sm" variant="primary" onClick={() => onUpgrade('studio')}>
                Upgrade to Studio ($49/mo)
              </Button>
            )}
            {paid && !canceled && (
              <Button size="sm" variant="danger" onClick={onCancelPlan}>
                Cancel subscription
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* payment method (paid only) */}
      {paid && (
        <>
          <Eyebrow className="mt-[26px] mb-3">Payment method</Eyebrow>
          {card.loading ? (
            <Skeleton className="h-[120px] w-[300px]" />
          ) : card.error ? (
            <ErrorBanner onRetry={card.reload} />
          ) : card.data ? (
            <div className="flex gap-6 flex-wrap items-start">
              <div className="w-[300px] max-w-full border border-black/[0.14] p-5 bg-[#FAFAFA] flex flex-col gap-[14px]">
                <div className="text-[11px] tracking-[0.2em] uppercase text-[#6B6B6B]">
                  {card.data.brand}
                </div>
                <div className="font-display text-[22px] tracking-[0.08em] text-[#0A0A0A]">
                  •••• •••• •••• {card.data.last4}
                </div>
                <div className="text-[#6B6B6B] text-[12px] font-body">
                  Expires {String(card.data.expMonth).padStart(2, '0')} /{' '}
                  {String(card.data.expYear).slice(-2)} · {card.data.cardholderName}
                </div>
              </div>
              <div className="flex flex-col gap-[10px]">
                <Button size="sm" variant="secondary" onClick={onUpdateCard}>
                  Update card
                </Button>
                <Button size="sm" variant="secondary" disabled title="Disabled while a subscription is active">
                  Remove card
                </Button>
                <span className="text-[11px] text-[#6B6B6B] italic">
                  Remove is disabled while a subscription is active.
                </span>
              </div>
            </div>
          ) : (
            <p className="text-[#6B6B6B] font-body text-[13px]">
              No card on file yet. Add one when you upgrade.
            </p>
          )}
        </>
      )}

      {/* billing history */}
      <Eyebrow className="mt-[26px] mb-3">Billing history</Eyebrow>
      {history.error ? (
        <ErrorBanner onRetry={history.reload} />
      ) : history.loading ? (
        <Skeleton className="h-[180px] w-full" />
      ) : history.data && history.data.rows.length > 0 ? (
        <>
          <div className="border border-black/10 overflow-x-auto">
            <table className="w-full border-collapse text-[13px] font-body">
              <thead>
                <tr>
                  {['Date', 'Description', 'Amount', 'Status', 'Invoice'].map((h) => (
                    <th
                      key={h}
                      className="text-left text-[10px] font-bold tracking-[0.18em] uppercase text-[#6B6B6B] px-[14px] py-3 border-b border-[#DAD2C3]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.data.rows.map((r) => (
                  <tr key={r.orderId}>
                    <td className="px-[14px] py-[14px] border-b border-black/[0.07] whitespace-nowrap">
                      {fmtDate(r.date)}
                    </td>
                    <td className="px-[14px] py-[14px] border-b border-black/[0.07]">
                      {r.description}
                    </td>
                    <td className="px-[14px] py-[14px] border-b border-black/[0.07] whitespace-nowrap">
                      ${r.amount.toFixed(2)}
                    </td>
                    <td className="px-[14px] py-[14px] border-b border-black/[0.07]">
                      <span
                        className={`text-[10px] font-bold tracking-[0.12em] uppercase px-[9px] py-[3px] border ${STATUS_STYLE[r.status]}`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-[14px] py-[14px] border-b border-black/[0.07]">
                      {r.invoiceUrl ? (
                        <button
                          onClick={() => onToast('Invoice PDF coming soon')}
                          className="text-[#0047AB] hover:underline"
                        >
                          Download PDF
                        </button>
                      ) : (
                        <span className="text-[#6B6B6B]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex gap-2 justify-end mt-4">
              <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                ← Prev
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </Button>
            </div>
          )}
        </>
      ) : (
        <Card className="text-center text-[#6B6B6B]">No transactions yet.</Card>
      )}
    </section>
  );
};
