/**
 * /admin/comments — Journal comment moderation.
 *
 * Mirrors /admin/orders: admin-cookie gate (useAdminMe) + AdminTopBar + filter
 * bar + table. Lists comments (pending by default) with Approve / Reject actions.
 *
 * Data:    GET  /api/admin/comments?status=pending|approved|all
 * Actions: POST /api/admin/comments/moderate  { id, action: 'approve'|'reject' }
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAdminMe } from '../lib/adminAuth';
import AdminShell from './admin/AdminShell';

type CommentStatus = 'pending' | 'approved' | 'rejected';

interface CommentRow {
  id: string;
  post_slug: string;
  author_name: string;
  body: string;
  status: CommentStatus | string;
  created_at: string;
}

const STATUS_OPTIONS = ['pending', 'approved', 'all'] as const;
type StatusFilter = (typeof STATUS_OPTIONS)[number];

function fmtDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '—';
  return `${d.toISOString().slice(0, 10)} · ${d.toISOString().slice(11, 16)}`;
}

const StatusChip: React.FC<{ status: string }> = ({ status }) => {
  const cls =
    status === 'approved'
      ? 'bg-[#15803d] text-white'
      : status === 'pending'
        ? 'bg-black/[0.06] text-neutral-600'
        : 'bg-neutral-200 text-neutral-600'; // rejected
  return (
    <span className={`inline-block px-2 py-0.5 text-[9px] tracking-[0.18em] uppercase font-bold ${cls}`}>
      {status}
    </span>
  );
};

const AdminCommentsPage: React.FC = () => {
  const me = useAdminMe();
  const [rows, setRows] = useState<CommentRow[] | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchComments = useCallback(() => {
    return fetch(`/api/admin/comments?status=${statusFilter}`, { credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) {
          setFetchError(`Fetch failed (${r.status})`);
          return;
        }
        const json = await r.json();
        setRows(json.comments || []);
        setFetchError(null);
      })
      .catch((e) => setFetchError(e instanceof Error ? e.message : 'Fetch failed'));
  }, [statusFilter]);

  useEffect(() => {
    if (!me?.authed) return;
    void fetchComments();
  }, [me?.authed, fetchComments]);

  async function moderate(id: string, action: 'approve' | 'reject') {
    setBusyId(id);
    try {
      const res = await fetch('/api/admin/comments/moderate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        setFetchError(data?.error || `Action failed (${res.status})`);
      } else {
        setFetchError(null);
        await fetchComments();
      }
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setBusyId(null);
    }
  }

  if (me === null) return null;
  if (!me.authed) return <Navigate to="/admin/login" replace />;

  return (
    <AdminShell active="comments" title="Comments">

      {/* Filter bar */}
      <section className="bg-[#F4EFE7] border-b border-[#DAD2C3] py-6">
        <div className="max-w-[1440px] mx-auto px-12">
          <div className="flex items-center gap-3.5 flex-wrap">
            <span className="text-[10px] tracking-[0.22em] uppercase text-neutral-500 font-bold">Status</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="bg-white border border-[#DAD2C3] px-3.5 py-2.5 pr-8 text-[11px] font-semibold text-black cursor-pointer appearance-none"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s === 'all' ? 'All' : s}
                </option>
              ))}
            </select>
            <span className="ml-auto text-[11px] text-neutral-500">
              <strong className="text-black font-bold">{rows?.length ?? 0}</strong> comment
              {(rows?.length ?? 0) === 1 ? '' : 's'}
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
          ) : rows.length === 0 ? (
            <p className="text-sm text-neutral-500 italic">No comments match this filter.</p>
          ) : (
            <table className="w-full bg-white border border-[#DAD2C3] border-collapse">
              <thead>
                <tr>
                  {['Submitted', 'Article', 'Author', 'Comment', 'Status', 'Actions'].map((label, i) => (
                    <th
                      key={label}
                      className={`bg-[#FAFAFA] text-[10px] tracking-[0.22em] uppercase text-neutral-500 font-bold px-5 py-3.5 border-b border-[#DAD2C3] ${
                        i === 5 ? 'text-right' : 'text-left'
                      }`}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-[#DAD2C3] hover:bg-[#FAFAFA] align-top">
                    <td className="px-5 py-4 text-xs text-neutral-700 whitespace-nowrap">
                      {fmtDateTime(r.created_at)}
                    </td>
                    <td className="px-5 py-4 text-xs">
                      <Link
                        to={`/journal/${encodeURIComponent(r.post_slug)}`}
                        className="text-[#0047AB] hover:underline break-all"
                      >
                        {r.post_slug}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-xs text-black font-semibold whitespace-nowrap">
                      {r.author_name}
                    </td>
                    <td className="px-5 py-4 text-xs text-neutral-700 max-w-[420px]">
                      <span className="whitespace-pre-wrap break-words">{r.body}</span>
                    </td>
                    <td className="px-5 py-4 text-xs">
                      <StatusChip status={r.status} />
                    </td>
                    <td className="px-5 py-4 text-xs text-right whitespace-nowrap">
                      {r.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={busyId === r.id}
                            onClick={() => moderate(r.id, 'approve')}
                            className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white bg-[#15803d] hover:bg-[#126b34] disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={busyId === r.id}
                            onClick={() => moderate(r.id, 'reject')}
                            className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-600 border border-[#DAD2C3] hover:bg-neutral-100 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-neutral-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </AdminShell>
  );
};

export default AdminCommentsPage;
