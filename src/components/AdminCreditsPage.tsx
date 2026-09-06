/**
 * /admin/credits — one-time credit-pack ledger + refund (I-033).
 *
 * Separate from /admin/orders because packs live in `credit_purchases`, not `orders`.
 * A 'paid' pack can be refunded: POST /api/admin/credits/refund returns the money via
 * RefundPayment AND claws back the granted credits (floored at zero). A confirmation
 * modal guards the action. Mirrors AdminOrdersPage for a consistent operator UI.
 *
 * Data: GET /api/admin/credits/purchases. Action: POST /api/admin/credits/refund.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminMe } from '../lib/adminAuth';
import AdminShell from './admin/AdminShell';

interface PurchaseRow {
  id: string;
  ameria_order_id: number | string;
  pack_id: string;
  credits: number;
  amount_usd: number | string;
  status: string;
  client_email: string;
  ameria_payment_id: string | null;
  has_payment: boolean;
  created_at: string;
  paid_at: string | null;
}

const STATUS_OPTIONS = ['all', 'paid', 'pending', 'failed', 'refunded'] as const;
type StatusFilter = (typeof STATUS_OPTIONS)[number];

function fmtDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '—';
  return `${d.toISOString().slice(0, 10)} · ${d.toISOString().slice(11, 16)}`;
}

const StatusChip: React.FC<{ status: string }> = ({ status }) => {
  const cls =
    status === 'paid'
      ? 'bg-[#0047AB] text-white'
      : status === 'pending'
        ? 'bg-black/[0.06] text-neutral-600'
        : status === 'failed'
          ? 'bg-red-600 text-white'
          : 'bg-neutral-200 text-neutral-600'; // refunded
  return (
    <span className="inline-block text-[9px] tracking-[0.18em] uppercase font-bold px-2 py-0.5">
      <span className={`inline-block px-2 py-0.5 ${cls}`}>{status}</span>
    </span>
  );
};

const ConfirmModal: React.FC<{
  purchase: PurchaseRow;
  busy: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}> = ({ purchase, busy, error, onConfirm, onClose }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6 py-12 font-body"
    onClick={busy ? undefined : onClose}
  >
    <div
      className="bg-white border border-[#DAD2C3] shadow-[0_20px_40px_rgba(0,0,0,0.08)] w-full max-w-[460px] p-7"
      onClick={(e) => e.stopPropagation()}
    >
      <h3 className="font-serif text-[24px] leading-tight mb-3 text-black">Refund?</h3>
      <p className="text-sm text-neutral-700 leading-relaxed mb-2">
        Refund ${String(purchase.amount_usd)} to {purchase.client_email} and remove the{' '}
        {purchase.credits.toLocaleString('en-US')} credits granted (whatever remains of them)?
        This can&rsquo;t be undone.
      </p>
      <p className="text-[11px] text-neutral-500 mb-5 font-mono break-all">
        purchase {purchase.id} · #{purchase.ameria_order_id}
      </p>
      {error && (
        <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-xs">{error}</div>
      )}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-600 hover:text-black disabled:opacity-50"
        >
          Keep it
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white bg-[#8E3F2D] hover:bg-[#742f20] disabled:opacity-60"
        >
          {busy ? 'Working…' : 'Refund'}
        </button>
      </div>
    </div>
  </div>
);

const AdminCreditsPage: React.FC = () => {
  const me = useAdminMe();
  const [rows, setRows] = useState<PurchaseRow[] | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [emailSearch, setEmailSearch] = useState('');

  const [pending, setPending] = useState<PurchaseRow | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchPurchases = useCallback(() => {
    return fetch('/api/admin/credits/purchases?limit=500', { credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) {
          setFetchError(`Fetch failed (${r.status})`);
          return;
        }
        const json = await r.json();
        setRows(json.purchases || []);
        setFetchError(null);
      })
      .catch((e) => setFetchError(e instanceof Error ? e.message : 'Fetch failed'));
  }, []);

  useEffect(() => {
    if (!me?.authed) return;
    void fetchPurchases();
  }, [me?.authed, fetchPurchases]);

  const visible = useMemo(() => {
    if (!rows) return [];
    const q = emailSearch.trim().toLowerCase();
    return rows
      .filter((r) => statusFilter === 'all' || r.status === statusFilter)
      .filter((r) => !q || r.client_email.toLowerCase().includes(q))
      .slice()
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  }, [rows, statusFilter, emailSearch]);

  async function runRefund() {
    if (!pending) return;
    setActionBusy(true);
    setActionError(null);
    try {
      const res = await fetch('/api/admin/credits/refund', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseId: pending.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        const bankPart = data?.responseCode
          ? ` (bank code ${data.responseCode}${data.responseMessage ? `: ${data.responseMessage}` : ''})`
          : '';
        setActionError((data?.error || `Failed (${res.status})`) + bankPart);
        setActionBusy(false);
        return;
      }
      setActionBusy(false);
      setPending(null);
      await fetchPurchases();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Network error');
      setActionBusy(false);
    }
  }

  function renderAction(r: PurchaseRow) {
    if (r.status !== 'paid' || !r.has_payment) {
      return <span className="text-neutral-300">—</span>;
    }
    return (
      <button
        type="button"
        title="Refund to the original card + reclaim the granted credits"
        onClick={() => { setActionError(null); setPending(r); }}
        className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white bg-[#8E3F2D] hover:bg-[#742f20]"
      >
        Refund
      </button>
    );
  }

  if (me === null) return null;
  if (!me.authed) return <Navigate to="/admin/login" replace />;

  return (
    <AdminShell active="credits" title="Credit packs">
      {/* Filter bar */}
      <section className="bg-[#F4EFE7] border-b border-[#DAD2C3] py-6">
        <div className="max-w-[1440px] mx-auto px-12">
          <div className="flex items-center gap-3.5 flex-wrap">
            <span className="text-[10px] tracking-[0.22em] uppercase text-neutral-500 font-bold">Status</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="bg-white border border-[#DAD2C3] px-3.5 py-2.5 pr-8 text-[11px] font-semibold text-black cursor-pointer appearance-none"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='%23404040' d='M0 0l5 6 5-6z'/></svg>\")",
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
              }}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s === 'all' ? 'All statuses' : s}
                </option>
              ))}
            </select>
            <span className="text-[10px] tracking-[0.22em] uppercase text-neutral-500 font-bold">Email</span>
            <input
              type="text"
              value={emailSearch}
              onChange={(e) => setEmailSearch(e.target.value)}
              placeholder="search email…"
              className="bg-white border border-[#DAD2C3] px-3.5 py-2.5 text-[11px] font-semibold text-black w-[220px] outline-none focus:border-[#0047AB]"
            />
            <span className="ml-auto text-[11px] text-neutral-500">
              <strong className="text-black font-bold">{visible.length}</strong> purchase
              {visible.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </section>

      {/* Table */}
      <section className="py-8">
        <div className="max-w-[1440px] mx-auto px-12">
          {fetchError && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm">{fetchError}</div>
          )}
          {rows === null ? (
            <p className="text-sm text-neutral-500 italic">Loading…</p>
          ) : (
            <table className="w-full bg-white border border-[#DAD2C3] border-collapse">
              <thead>
                <tr>
                  {['Created', 'Customer email', 'Pack', 'Credits', 'Status', 'Amount', 'Order #', 'Payment ID', 'Action'].map(
                    (label, i) => (
                      <th
                        key={label}
                        className={`bg-[#FAFAFA] text-[10px] tracking-[0.22em] uppercase text-neutral-500 font-bold px-5 py-3.5 border-b border-[#DAD2C3] ${
                          i >= 3 ? 'text-right' : 'text-left'
                        }`}
                      >
                        {label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-8 text-sm text-neutral-500 italic text-center">
                      No credit purchases match the current filters.
                    </td>
                  </tr>
                ) : (
                  visible.map((r) => (
                    <tr key={r.id} className="border-b border-[#DAD2C3] hover:bg-[#FAFAFA]">
                      <td className="px-5 py-4 text-xs text-neutral-700 whitespace-nowrap">
                        {fmtDateTime(r.created_at)}
                      </td>
                      <td className="px-5 py-4 text-xs text-black font-semibold">{r.client_email}</td>
                      <td className="px-5 py-4 text-xs text-right text-neutral-700 capitalize whitespace-nowrap">
                        {r.pack_id.replace(/-/g, ' ')}
                      </td>
                      <td className="px-5 py-4 text-xs text-right text-neutral-700 tabular-nums">
                        {Number(r.credits).toLocaleString('en-US')}
                      </td>
                      <td className="px-5 py-4 text-xs text-right">
                        <StatusChip status={r.status} />
                      </td>
                      <td className="px-5 py-4 text-xs text-right text-neutral-700 tabular-nums whitespace-nowrap">
                        ${String(r.amount_usd)}
                      </td>
                      <td className="px-5 py-4 text-xs text-right text-neutral-700 tabular-nums">
                        {r.ameria_order_id}
                      </td>
                      <td
                        className="px-5 py-4 text-xs text-right text-neutral-500 font-mono"
                        title={r.ameria_payment_id || undefined}
                      >
                        {r.ameria_payment_id ? `${r.ameria_payment_id.slice(0, 8)}…` : '—'}
                      </td>
                      <td className="px-5 py-4 text-xs text-right">{renderAction(r)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {pending && (
        <ConfirmModal
          purchase={pending}
          busy={actionBusy}
          error={actionError}
          onConfirm={runRefund}
          onClose={() => {
            setPending(null);
            setActionError(null);
          }}
        />
      )}
    </AdminShell>
  );
};

export default AdminCreditsPage;
