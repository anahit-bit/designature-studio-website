/**
 * /admin/orders — consultation order ledger + refund/cancel actions (I-025).
 *
 * Mirrors /admin/users: admin-cookie gate (useAdminMe), AdminTopBar, filter bar,
 * sortable-ish table. Each paid order gets context-aware actions:
 *   - paid & < 24h since capture → Cancel/Void (same-day, before settlement) AND
 *     Refund (post-settlement) — operator picks.
 *   - paid & ≥ 24h → Refund only (Cancel won't work post-settlement).
 *   - pending → no action; shows the auto-expire time.
 *   - failed / refunded / cancelled → status chip only.
 * A confirmation modal guards both destructive actions.
 *
 * Data: GET /api/payments/ameria/orders. Actions: POST /refund | /cancel.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminMe } from '../lib/adminAuth';
import AdminShell from './admin/AdminShell';

type OrderStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled';

interface OrderRow {
  id: string;
  ameria_order_id: number | string;
  status: OrderStatus | string;
  amount: number | string;
  currency: string;
  client_email: string;
  ameria_payment_id: string | null;
  has_payment: boolean;
  slot_start_time: string | null;
  google_calendar_event_id: string | null;
  created_at: string;
  paid_at: string | null;
}

const STATUS_OPTIONS = ['all', 'paid', 'pending', 'failed', 'refunded', 'cancelled'] as const;
type StatusFilter = (typeof STATUS_OPTIONS)[number];

const VOID_WINDOW_MS = 24 * 60 * 60 * 1000; // same-day void window (heuristic)
const EXPIRE_AFTER_MS = 30 * 60 * 1000; // matches the server auto-expire sweep

function fmtDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '—';
  return `${d.toISOString().slice(0, 10)} · ${d.toISOString().slice(11, 16)}`;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '—';
  return `${d.toISOString().slice(11, 16)} UTC`;
}

function fmtAmount(amount: number | string, currency: string): string {
  const n = Number(amount);
  return Number.isFinite(n) ? `${n} ${currency}` : `${amount} ${currency}`;
}

const StatusChip: React.FC<{ status: string }> = ({ status }) => {
  const cls =
    status === 'paid'
      ? 'bg-[#0047AB] text-white'
      : status === 'pending'
        ? 'bg-black/[0.06] text-neutral-600'
        : status === 'failed'
          ? 'bg-red-600 text-white'
          : 'bg-neutral-200 text-neutral-600'; // refunded / cancelled
  return (
    <span className="inline-block text-[9px] tracking-[0.18em] uppercase font-bold px-2 py-0.5">
      <span className={`inline-block px-2 py-0.5 ${cls}`}>{status}</span>
    </span>
  );
};

// ── Confirmation modal ───────────────────────────────────────────────────────

const ConfirmModal: React.FC<{
  kind: 'refund' | 'cancel';
  order: OrderRow;
  busy: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}> = ({ kind, order, busy, error, onConfirm, onClose }) => {
  const amount = fmtAmount(order.amount, order.currency);
  const verb = kind === 'refund' ? 'Refund' : 'Cancel / void';
  const msg =
    kind === 'refund'
      ? `Refund ${amount} to ${order.client_email}? This action can't be undone.`
      : `Cancel / void ${amount} for ${order.client_email}? This voids the payment before settlement and can't be undone.`;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6 py-12 font-body"
      onClick={busy ? undefined : onClose}
    >
      <div
        className="bg-white border border-[#DAD2C3] shadow-[0_20px_40px_rgba(0,0,0,0.08)] w-full max-w-[460px] p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-serif text-[24px] leading-tight mb-3 text-black">{verb}?</h3>
        <p className="text-sm text-neutral-700 leading-relaxed mb-2">{msg}</p>
        <p className="text-[11px] text-neutral-500 mb-5 font-mono break-all">
          order {order.id} · #{order.ameria_order_id}
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
            Keep order
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white disabled:opacity-60 ${
              kind === 'refund' ? 'bg-[#8E3F2D] hover:bg-[#742f20]' : 'bg-[#0047AB] hover:bg-[#0036a0]'
            }`}
          >
            {busy ? 'Working…' : verb}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main page ────────────────────────────────────────────────────────────────

const AdminOrdersPage: React.FC = () => {
  const me = useAdminMe();
  const [rows, setRows] = useState<OrderRow[] | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [emailSearch, setEmailSearch] = useState('');

  const [pending, setPending] = useState<{ order: OrderRow; kind: 'refund' | 'cancel' } | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchOrders = useCallback(() => {
    return fetch('/api/payments/ameria/orders?limit=500', { credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) {
          setFetchError(`Fetch failed (${r.status})`);
          return;
        }
        const json = await r.json();
        setRows(json.orders || []);
        setFetchError(null);
      })
      .catch((e) => setFetchError(e instanceof Error ? e.message : 'Fetch failed'));
  }, []);

  useEffect(() => {
    if (!me?.authed) return;
    void fetchOrders();
  }, [me?.authed, fetchOrders]);

  const visible = useMemo(() => {
    if (!rows) return [];
    const q = emailSearch.trim().toLowerCase();
    return rows
      .filter((r) => statusFilter === 'all' || r.status === statusFilter)
      .filter((r) => !q || r.client_email.toLowerCase().includes(q))
      .slice()
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)); // Created desc
  }, [rows, statusFilter, emailSearch]);

  async function runAction() {
    if (!pending) return;
    setActionBusy(true);
    setActionError(null);
    try {
      const path = pending.kind === 'refund' ? 'refund' : 'cancel';
      const res = await fetch(`/api/payments/ameria/${path}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: pending.order.id }),
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
      await fetchOrders();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Network error');
      setActionBusy(false);
    }
  }

  function renderAction(r: OrderRow) {
    if (r.status === 'pending') {
      const expireAt = new Date(Date.parse(r.created_at) + EXPIRE_AFTER_MS).toISOString();
      return (
        <span className="text-[11px] text-neutral-500 italic">
          Auto-expires {fmtTime(expireAt)}
        </span>
      );
    }
    if (r.status !== 'paid' || !r.has_payment) {
      return <span className="text-neutral-300">—</span>;
    }
    // paid: age from capture (paid_at) decides whether same-day void is still offered.
    const captured = Date.parse(r.paid_at || r.created_at);
    const sameDay = Number.isFinite(captured) && Date.now() - captured < VOID_WINDOW_MS;
    return (
      <div className="flex items-center justify-end gap-2">
        {sameDay && (
          <button
            type="button"
            title="Cancel/Void if same-day (before settlement); Refund after"
            onClick={() => { setActionError(null); setPending({ order: r, kind: 'cancel' }); }}
            className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white bg-[#0047AB] hover:bg-[#0036a0]"
          >
            Cancel/Void
          </button>
        )}
        <button
          type="button"
          title="Refund to the original card (post-settlement)"
          onClick={() => { setActionError(null); setPending({ order: r, kind: 'refund' }); }}
          className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white bg-[#8E3F2D] hover:bg-[#742f20]"
        >
          Refund
        </button>
      </div>
    );
  }

  if (me === null) return null;
  if (!me.authed) return <Navigate to="/admin/login" replace />;

  return (
    <AdminShell active="orders" title="Orders">

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
              <strong className="text-black font-bold">{visible.length}</strong> order
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
                  {['Created', 'Customer email', 'Slot (UTC)', 'Status', 'Amount', 'Order #', 'Payment ID', 'Action'].map(
                    (label, i) => (
                      <th
                        key={label}
                        className={`bg-[#FAFAFA] text-[10px] tracking-[0.22em] uppercase text-neutral-500 font-bold px-5 py-3.5 border-b border-[#DAD2C3] ${
                          i >= 4 ? 'text-right' : 'text-left'
                        } ${label === 'Action' ? 'text-right' : ''}`}
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
                    <td colSpan={8} className="px-5 py-8 text-sm text-neutral-500 italic text-center">
                      No orders match the current filters.
                    </td>
                  </tr>
                ) : (
                  visible.map((r) => (
                    <tr key={r.id} className="border-b border-[#DAD2C3] hover:bg-[#FAFAFA]">
                      <td className="px-5 py-4 text-xs text-neutral-700 whitespace-nowrap">
                        {fmtDateTime(r.created_at)}
                      </td>
                      <td className="px-5 py-4 text-xs text-black font-semibold">{r.client_email}</td>
                      <td className="px-5 py-4 text-xs text-neutral-700 whitespace-nowrap">
                        {fmtDateTime(r.slot_start_time)}
                        {r.google_calendar_event_id ? (
                          <span title="Google Calendar event created" className="ml-1.5">📅</span>
                        ) : null}
                      </td>
                      <td className="px-5 py-4 text-xs">
                        <StatusChip status={r.status} />
                      </td>
                      <td className="px-5 py-4 text-xs text-right text-neutral-700 tabular-nums whitespace-nowrap">
                        {fmtAmount(r.amount, r.currency)}
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
          kind={pending.kind}
          order={pending.order}
          busy={actionBusy}
          error={actionError}
          onConfirm={runAction}
          onClose={() => {
            setPending(null);
            setActionError(null);
          }}
        />
      )}
    </AdminShell>
  );
};

export default AdminOrdersPage;
