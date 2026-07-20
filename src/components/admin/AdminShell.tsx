/**
 * AdminShell — shared left-sidebar chrome for every /admin surface (2026-07-10).
 *
 * Replaces the old top-bar-with-buried-links pattern (AdminTopBar). Renders a
 * persistent left nav with live count badges (fetched once from /api/admin/counts)
 * and a per-page top strip (title + optional rightSlot). Each admin page wraps its
 * body: <AdminShell active="users" title="Users">…</AdminShell>.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { adminLogout } from '../../lib/adminAuth';

export type AdminNavKey = 'overview' | 'users' | 'comments' | 'feedback' | 'waitlist' | 'orders' | 'platforms';

interface Counts {
  users: number;
  comments: number;
  feedback: number;
  waitlist: number;
  orders: number;
}

interface NavDef {
  key: AdminNavKey;
  label: string;
  to: string;
  icon: string;
  /** cobalt "needs attention" badge when the count is > 0 */
  alerts?: boolean;
}

const NAV: NavDef[] = [
  { key: 'overview', label: 'Overview', to: '/admin', icon: '▤' },
  { key: 'users', label: 'Users', to: '/admin/users', icon: '◍' },
  { key: 'comments', label: 'Comments', to: '/admin/comments', icon: '❝', alerts: true },
  { key: 'feedback', label: 'Feedback', to: '/admin/feedback', icon: '✎', alerts: true },
  { key: 'waitlist', label: 'Waitlist', to: '/admin/waitlist', icon: '✦' },
  { key: 'orders', label: 'Orders', to: '/admin/orders', icon: '▣' },
  { key: 'platforms', label: 'Platforms', to: '/admin/platforms', icon: '⬡' },
];

interface Props {
  active: AdminNavKey;
  title: string;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
}

const AdminShell: React.FC<Props> = ({ active, title, rightSlot, children }) => {
  const navigate = useNavigate();
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/counts', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d) setCounts(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  async function onSignOut() {
    await adminLogout();
    navigate('/admin/login', { replace: true });
  }

  const countFor = (k: AdminNavKey): number | null => {
    if (!counts) return null;
    if (k === 'overview') return null;
    return (counts as unknown as Record<string, number>)[k] ?? null;
  };

  return (
    <div className="flex min-h-screen bg-white font-body">
      {/* Sidebar */}
      <aside className="w-[236px] shrink-0 border-r border-[#DAD2C3] flex flex-col sticky top-0 h-screen bg-white">
        <div className="px-6 pt-6 pb-5 border-b border-[#DAD2C3]">
          <div className="text-[10px] tracking-[0.32em] uppercase text-[#0047AB] font-bold">Observability</div>
          <Link to="/admin" className="block font-serif text-[22px] font-medium tracking-tight text-black mt-1.5 no-underline hover:text-[#0047AB]">
            Admin
          </Link>
        </div>

        <nav className="flex-1 py-3 overflow-y-auto">
          {NAV.map((n) => {
            const isActive = n.key === active;
            const c = countFor(n.key);
            const alert = !!n.alerts && (c ?? 0) > 0;
            return (
              <Link
                key={n.key}
                to={n.to}
                className={`flex items-center justify-between gap-2 px-6 py-[11px] no-underline border-l-[3px] ${
                  isActive
                    ? 'bg-[#F4EFE7] border-[#0047AB] text-black font-semibold'
                    : 'border-transparent text-neutral-700 hover:bg-[#FAFAFA]'
                }`}
              >
                <span className="flex items-center gap-2.5 text-[13px]">
                  <span className="w-[15px] text-center opacity-75">{n.icon}</span>
                  {n.label}
                </span>
                {c !== null && (
                  <span
                    className={`text-[11px] tabular-nums rounded-full px-2 min-w-[24px] text-center ${
                      alert ? 'bg-[#0047AB] text-white' : isActive ? 'bg-white text-neutral-600' : 'bg-[#F0ECE3] text-neutral-500'
                    }`}
                  >
                    {c}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[#DAD2C3] px-6 py-3.5">
          <button
            type="button"
            onClick={onSignOut}
            className="text-[12px] tracking-[0.05em] text-neutral-700 hover:text-[#0047AB]"
          >
            Sign out →
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-center justify-between gap-6 px-8 py-5 border-b border-[#DAD2C3]">
          <h1 className="font-serif text-[26px] font-medium text-black">{title}</h1>
          <div className="flex items-center gap-6 text-[10px] tracking-[0.22em] uppercase text-neutral-500 font-semibold">
            {rightSlot}
          </div>
        </div>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
};

export default AdminShell;
