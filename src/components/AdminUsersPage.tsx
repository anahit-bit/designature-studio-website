/**
 * /admin/users — lifetime user list + drawer (I-020b · Surface 3 of Phase C).
 *
 * Filter bar (tier / signup year-month / last-seen window) + sortable table.
 * Click a row → drawer opens with the user's meta + activity history,
 * loaded from /api/admin/users-detail?email=<urlenc>.
 *
 * Auth: admin cookie. Probes /api/admin/me on mount, redirects to login
 * if not authed.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAdminMe } from '../lib/adminAuth';
import AdminTopBar from './admin/AdminTopBar';

type Tier = 'unlimited' | 'paid' | 'free';

interface UserRow {
  email: string;
  name: string;
  signupDate: string;
  lastLogin: string;
  tier: Tier;
  totalActivityCount: number;
}

interface UserDetail extends UserRow {
  generationsLeft: number;
  shoppingListsLeft: number | null;
}

interface ActivityEntry {
  ts: string;
  userEmail: string;
  action: string;
}

type SortKey = 'email' | 'signupDate' | 'lastLogin' | 'tier' | 'totalActivityCount';
type SortDir = 'asc' | 'desc';

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '—';
  const date = d.toISOString().slice(0, 10);
  return date;
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '—';
  const date = d.toISOString().slice(0, 10);
  const time = d.toISOString().slice(11, 16);
  return `${date} · ${time}`;
}

function relativeTime(iso: string): string {
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const s = Math.floor(ms / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function signupYears(rows: UserRow[]): string[] {
  const years = new Set<string>();
  for (const r of rows) {
    const y = r.signupDate.slice(0, 4);
    if (/^\d{4}$/.test(y)) years.add(y);
  }
  return [...years].sort().reverse();
}

const LAST_SEEN_WINDOWS = [
  { label: 'All', value: 'all' },
  { label: 'Last 24h', value: '24h' },
  { label: 'Last 7d', value: '7d' },
  { label: 'Last 30d', value: '30d' },
  { label: 'Last 90d', value: '90d' },
  { label: 'Never returned', value: 'never' },
] as const;
type LastSeenWindow = (typeof LAST_SEEN_WINDOWS)[number]['value'];

function withinWindow(iso: string, win: LastSeenWindow): boolean {
  if (win === 'all') return true;
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms)) return false;
  if (win === '24h') return ms < 24 * 60 * 60 * 1000;
  if (win === '7d') return ms < 7 * 24 * 60 * 60 * 1000;
  if (win === '30d') return ms < 30 * 24 * 60 * 60 * 1000;
  if (win === '90d') return ms < 90 * 24 * 60 * 60 * 1000;
  // 'never': signupDate === lastLogin → user never returned after signup.
  // Handled in the filter callback (needs both fields).
  return false;
}

// ── Drawer ─────────────────────────────────────────────────────────────────

const Drawer: React.FC<{ email: string; onClose: () => void }> = ({ email, onClose }) => {
  const [detail, setDetail] = useState<{ user: UserDetail; activity: ActivityEntry[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDetail(null);
    setError(null);
    fetch(`/api/admin/users-detail?email=${encodeURIComponent(email)}`, { credentials: 'include' })
      .then(async (r) => {
        if (cancelled) return;
        if (!r.ok) { setError(`Fetch failed (${r.status})`); return; }
        setDetail(await r.json());
      })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Fetch failed'); });
    return () => { cancelled = true; };
  }, [email]);

  // Centered modal
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6 py-12 font-body"
      onClick={onClose}
    >
      <div
        className="bg-white border border-[#DAD2C3] shadow-[0_20px_40px_rgba(0,0,0,0.08)] w-full max-w-[720px] max-h-[90vh] overflow-y-auto p-7"
        onClick={(e) => e.stopPropagation()}
      >
        {error ? (
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-700">{error}</p>
            <button type="button" onClick={onClose} className="text-xl text-neutral-500 hover:text-black px-2">×</button>
          </div>
        ) : !detail ? (
          <p className="text-sm text-neutral-500 italic">Loading…</p>
        ) : (
          <>
            <div className="flex justify-between items-start mb-6 pb-[18px] border-b border-[#DAD2C3]">
              <div>
                <h3 className="font-serif text-[26px] leading-[1.1] mb-1 text-black">{detail.user.email}</h3>
                <p className="text-[11px] text-neutral-500 tracking-[0.04em]">
                  {detail.user.tier} tier · signed up {fmtDate(detail.user.signupDate)} · {' '}
                  {Math.max(0, Math.floor((Date.now() - Date.parse(detail.user.signupDate)) / (24 * 60 * 60 * 1000)))} days as a user
                </p>
              </div>
              <button type="button" onClick={onClose} className="text-xl text-neutral-500 hover:text-black px-2 -mr-2">×</button>
            </div>
            <div className="grid grid-cols-4 gap-3.5 mb-6">
              <div className="bg-[#FAFAFA] p-3">
                <p className="text-[9px] tracking-[0.22em] uppercase text-neutral-500 font-bold mb-1.5">Last login</p>
                <p className="font-serif text-lg text-black">{relativeTime(detail.user.lastLogin)}</p>
              </div>
              <div className="bg-[#FAFAFA] p-3">
                <p className="text-[9px] tracking-[0.22em] uppercase text-neutral-500 font-bold mb-1.5">Total actions</p>
                <p className="font-serif text-lg text-black tabular-nums">{detail.user.totalActivityCount}</p>
              </div>
              <div className="bg-[#FAFAFA] p-3">
                <p className="text-[9px] tracking-[0.22em] uppercase text-neutral-500 font-bold mb-1.5">Gens left</p>
                <p className="font-serif text-lg text-black tabular-nums">{detail.user.generationsLeft}</p>
              </div>
              <div className="bg-[#FAFAFA] p-3">
                <p className="text-[9px] tracking-[0.22em] uppercase text-neutral-500 font-bold mb-1.5">Shopping left</p>
                <p className="font-serif text-lg text-black tabular-nums">{detail.user.shoppingListsLeft ?? '—'}</p>
              </div>
            </div>
            <p className="text-[10px] tracking-[0.22em] uppercase text-neutral-500 font-bold mb-2.5">
              Activity history · newest first
            </p>
            <div className="max-h-[320px] overflow-y-auto">
              {detail.activity.length === 0 ? (
                <p className="text-sm text-neutral-500 italic">No activity recorded yet.</p>
              ) : (
                detail.activity.map((e, i) => (
                  <div
                    key={`${e.ts}-${i}`}
                    className="grid grid-cols-[120px_1fr] gap-[18px] py-2.5 border-b border-[#DAD2C3] last:border-b-0 text-xs"
                  >
                    <span className="text-neutral-500">{relativeTime(e.ts)}</span>
                    <span className="text-[#0047AB] font-bold tracking-[0.02em] font-mono">{e.action}</span>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ── Main page ──────────────────────────────────────────────────────────────

const AdminUsersPage: React.FC = () => {
  const me = useAdminMe();
  const [rows, setRows] = useState<UserRow[] | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [openEmail, setOpenEmail] = useState<string | null>(null);

  // Filters
  const [tierFilter, setTierFilter] = useState<'all' | Tier>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [lastSeenFilter, setLastSeenFilter] = useState<LastSeenWindow>('all');

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>('lastLogin');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  useEffect(() => {
    if (!me?.authed) return;
    let cancelled = false;
    fetch('/api/admin/users-detail', { credentials: 'include' })
      .then(async (r) => {
        if (cancelled) return;
        if (!r.ok) { setFetchError(`Fetch failed (${r.status})`); return; }
        const json = await r.json();
        setRows(json.users || []);
        setFetchError(null);
      })
      .catch((e) => { if (!cancelled) setFetchError(e instanceof Error ? e.message : 'Fetch failed'); });
    return () => { cancelled = true; };
  }, [me?.authed]);

  const years = useMemo(() => signupYears(rows || []), [rows]);

  const visible = useMemo(() => {
    if (!rows) return [];
    return rows
      .filter((r) => tierFilter === 'all' || r.tier === tierFilter)
      .filter((r) => yearFilter === 'all' || r.signupDate.startsWith(yearFilter))
      .filter((r) => {
        if (lastSeenFilter === 'all') return true;
        if (lastSeenFilter === 'never') return r.lastLogin === r.signupDate;
        return withinWindow(r.lastLogin, lastSeenFilter);
      })
      .slice()
      .sort((a, b) => {
        const dir = sortDir === 'asc' ? 1 : -1;
        if (sortKey === 'totalActivityCount') return dir * (a.totalActivityCount - b.totalActivityCount);
        if (sortKey === 'tier') {
          const order = { free: 0, paid: 1, unlimited: 2 } as const;
          return dir * (order[a.tier] - order[b.tier]);
        }
        const av = a[sortKey] as string;
        const bv = b[sortKey] as string;
        return dir * av.localeCompare(bv);
      });
  }, [rows, tierFilter, yearFilter, lastSeenFilter, sortKey, sortDir]);

  function onSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'totalActivityCount' || key === 'lastLogin' ? 'desc' : 'asc');
    }
  }

  if (me === null) return null;
  if (!me.authed) return <Navigate to="/admin/login" replace />;

  return (
    <div className="min-h-screen bg-white font-body">
      <AdminTopBar
        product="Users"
        rightSlot={
          <Link to="/admin" className="text-[#0047AB] hover:underline">
            ← Back to dashboard
          </Link>
        }
      />

      {/* Filter bar */}
      <section className="bg-[#F4EFE7] border-b border-[#DAD2C3] py-6">
        <div className="max-w-[1440px] mx-auto px-12">
          <div className="flex items-center gap-3.5 flex-wrap">
            <span className="text-[10px] tracking-[0.22em] uppercase text-neutral-500 font-bold">Tier</span>
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value as any)}
              className="bg-white border border-[#DAD2C3] px-3.5 py-2.5 pr-8 text-[11px] font-semibold text-black cursor-pointer appearance-none"
              style={{
                backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='%23404040' d='M0 0l5 6 5-6z'/></svg>\")",
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
              }}
            >
              <option value="all">All tiers</option>
              <option value="free">Free</option>
              <option value="paid">Paid</option>
              <option value="unlimited">Unlimited</option>
            </select>
            <span className="text-[10px] tracking-[0.22em] uppercase text-neutral-500 font-bold">Signup year</span>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="bg-white border border-[#DAD2C3] px-3.5 py-2.5 pr-8 text-[11px] font-semibold text-black cursor-pointer appearance-none"
              style={{
                backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='%23404040' d='M0 0l5 6 5-6z'/></svg>\")",
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
              }}
            >
              <option value="all">All time</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <span className="text-[10px] tracking-[0.22em] uppercase text-neutral-500 font-bold">Last seen</span>
            <select
              value={lastSeenFilter}
              onChange={(e) => setLastSeenFilter(e.target.value as LastSeenWindow)}
              className="bg-white border border-[#DAD2C3] px-3.5 py-2.5 pr-8 text-[11px] font-semibold text-black cursor-pointer appearance-none"
              style={{
                backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='%23404040' d='M0 0l5 6 5-6z'/></svg>\")",
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
              }}
            >
              {LAST_SEEN_WINDOWS.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
            </select>
            <span className="ml-auto text-[11px] text-neutral-500">
              <strong className="text-black font-bold">{visible.length}</strong> user{visible.length === 1 ? '' : 's'} · showing {tierFilter === 'all' && yearFilter === 'all' && lastSeenFilter === 'all' ? 'all' : 'filtered'}
            </span>
          </div>
        </div>
      </section>

      {/* Table */}
      <section className="py-8">
        <div className="max-w-[1440px] mx-auto px-12">
          {fetchError && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm">
              {fetchError}
            </div>
          )}
          {rows === null ? (
            <p className="text-sm text-neutral-500 italic">Loading…</p>
          ) : (
            <table className="w-full bg-white border border-[#DAD2C3] border-collapse">
              <thead>
                <tr>
                  {([
                    { key: 'email', label: 'Email', align: 'left' },
                    { key: 'signupDate', label: 'Signup', align: 'left' },
                    { key: 'lastLogin', label: 'Last login', align: 'left' },
                    { key: 'tier', label: 'Tier', align: 'left' },
                    { key: 'totalActivityCount', label: 'Activity', align: 'right' },
                  ] as Array<{ key: SortKey; label: string; align: 'left' | 'right' }>).map((col) => (
                    <th
                      key={col.key}
                      onClick={() => onSort(col.key)}
                      className={`bg-[#FAFAFA] text-[10px] tracking-[0.22em] uppercase text-neutral-500 font-bold px-5 py-3.5 border-b border-[#DAD2C3] cursor-pointer select-none hover:text-[#0047AB] ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                    >
                      {col.label}
                      {sortKey === col.key && (
                        <span className="ml-1.5 text-[#0047AB] text-[10px]">{sortDir === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-sm text-neutral-500 italic text-center">
                      No users match the current filters.
                    </td>
                  </tr>
                ) : (
                  visible.map((r) => {
                    const selected = openEmail === r.email;
                    return (
                      <tr
                        key={r.email}
                        onClick={() => setOpenEmail(r.email)}
                        className={`border-b border-[#DAD2C3] cursor-pointer transition-colors ${
                          selected ? 'bg-[#0047AB]/5' : 'hover:bg-[#FAFAFA]'
                        }`}
                      >
                        <td className={`px-5 py-4 text-xs text-black font-semibold ${selected ? 'border-l-[3px] border-[#0047AB] pl-[17px]' : ''}`}>
                          {r.email}
                        </td>
                        <td className="px-5 py-4 text-xs text-neutral-700">{fmtDate(r.signupDate)}</td>
                        <td className="px-5 py-4 text-xs text-neutral-700">{fmtDateTime(r.lastLogin)}</td>
                        <td className="px-5 py-4 text-xs">
                          <span className={`inline-block text-[9px] tracking-[0.22em] uppercase font-bold px-2 py-0.5 ${
                            r.tier === 'free'      ? 'bg-black/[0.06] text-neutral-500' :
                            r.tier === 'paid'      ? 'bg-[#0047AB] text-white' :
                                                      'bg-black text-white'
                          }`}>
                            {r.tier}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs text-right text-neutral-700 tabular-nums">
                          {r.totalActivityCount} {r.totalActivityCount === 1 ? 'action' : 'actions'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {openEmail && <Drawer email={openEmail} onClose={() => setOpenEmail(null)} />}
    </div>
  );
};

export default AdminUsersPage;
