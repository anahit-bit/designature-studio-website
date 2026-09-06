/**
 * Credit balance + recent ledger history for /account (credit model).
 *
 * Self-contained: fetches /api/credits/balance itself and renders nothing until the
 * answer is in. When `enabled` is false (tier system still metering) it renders
 * nothing AND reports that up via `onResolved`, so the Overview tab can keep showing
 * the legacy tier usage grid instead of a contradictory empty credits panel.
 */
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../AuthContext';
import { Card, Eyebrow, fmtMonthDay } from './ui';

interface Balance { monthly: number; permanent: number; total: number }
interface Txn {
  id: string;
  delta: number;
  bucket: 'monthly' | 'permanent' | 'split';
  reason: string;
  tool: string | null;
  balance_after: number;
  created_at: string;
}
interface BalanceResponse {
  enabled: boolean;
  balance: Balance | null;
  transactions: Txn[];
}

const REASON_LABEL: Record<string, string> = {
  signup_grant: 'Welcome credits',
  pack_purchase: 'Credit pack purchase',
  sub_refill: 'Monthly refill',
  admin_adjust: 'Adjustment',
  refund: 'Refund',
};

/** A human line for one ledger row. Spends carry a tool; grants carry a reason. */
function txnLabel(t: Txn): string {
  if (t.delta < 0) {
    const tool = (t.tool || '').replace(/[-_]/g, ' ').trim();
    return tool ? `Spent — ${tool}` : 'Spent';
  }
  return REASON_LABEL[t.reason] ?? t.reason.replace(/_/g, ' ');
}

const fmtCredits = (n: number) => n.toLocaleString('en-US');

export const CreditBalanceCard: React.FC<{ onResolved?: (enabled: boolean) => void }> = ({
  onResolved,
}) => {
  const { apiFetch } = useAuth();
  const [data, setData] = useState<BalanceResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await apiFetch('/api/credits/balance');
        const body: BalanceResponse = await res.json();
        if (!alive) return;
        setData(body);
        onResolved?.(!!body.enabled);
      } catch {
        if (!alive) return;
        setFailed(true);
        onResolved?.(false);
      }
    })();
    return () => {
      alive = false;
    };
    // apiFetch is stable from context; run once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (failed || !data || !data.enabled || !data.balance) return null;

  const { balance, transactions } = data;
  const hasMonthly = balance.monthly > 0;

  return (
    <>
      <Eyebrow className="mt-[26px] mb-3">Your credits</Eyebrow>
      <Card>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <Eyebrow>Balance</Eyebrow>
            <div className="font-display text-[44px] leading-none my-2 text-[#0A0A0A]">
              {fmtCredits(balance.total)}
              <span className="text-[16px] text-[#6B6B6B] ml-2 font-body">credits</span>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-[12px] font-body text-[#6B6B6B]">
              {hasMonthly && (
                <span>
                  <strong className="text-[#0A0A0A]">{fmtCredits(balance.monthly)}</strong> monthly
                  · resets on renewal
                </span>
              )}
              <span>
                <strong className="text-[#0A0A0A]">{fmtCredits(balance.permanent)}</strong> purchased
                · never expire
              </span>
            </div>
          </div>
          <a
            href="/pricing"
            className="text-[11px] font-bold tracking-[0.14em] uppercase text-[#0047AB] hover:underline whitespace-nowrap"
          >
            Add credits →
          </a>
        </div>
      </Card>

      {transactions.length > 0 && (
        <>
          <Eyebrow className="mt-[26px] mb-[6px]">Credit history</Eyebrow>
          <Card className="!py-2 !px-6">
            <div className="flex flex-col">
              {transactions.map((t, i) => (
                <div
                  key={t.id}
                  className={`flex items-center gap-[14px] py-[13px] ${
                    i > 0 ? 'border-t border-black/[0.07]' : ''
                  }`}
                >
                  <div className="flex-1 font-body text-[14px] text-[#0A0A0A]">{txnLabel(t)}</div>
                  <div
                    className={`font-body text-[14px] font-semibold whitespace-nowrap ${
                      t.delta < 0 ? 'text-[#6B6B6B]' : 'text-[#15803d]'
                    }`}
                  >
                    {t.delta > 0 ? '+' : ''}
                    {fmtCredits(t.delta)}
                  </div>
                  <div className="text-[12px] text-[#6B6B6B] font-body whitespace-nowrap w-[60px] text-right">
                    {fmtMonthDay(t.created_at)}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </>
  );
};
