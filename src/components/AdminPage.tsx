/**
 * /admin — owner-only observability dashboard (I-017 · gate updated I-019).
 *
 * Polls /api/admin/usage every 30s and renders four sections: API credits
 * (per-provider rolling counters), recent activity (last 50 log entries),
 * platform inventory (cards from server/config/platforms.json), and a
 * Shopping incident view (status pill + last 100 Serper requests).
 *
 * Auth: admin_session HttpOnly cookie (I-019). Probes /api/admin/me on
 * mount; redirects to /admin/login if not authed. No Google OAuth coupling.
 */
import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { useAdminMe, adminLogout } from '../lib/adminAuth';

const POLL_MS = 30_000;
const SERPER_MONTHLY_CAP = 2500; // $50 plan — only counter with a hard cap configured

interface ProviderCounter {
  daily: { date: string; count: number };
  weekly: { date: string; count: number };
  monthly: { date: string; count: number };
}

interface Platform {
  name: string;
  owner_email: string;
  monthly_cost: string;
  free_tier_quota: string | null;
  renewal_date: string | null;
  powers: string;
  criticality: number;
}

interface ActivityEntry {
  ts: string;
  userEmail: string;
  action: string;
}

interface SerperLogEntry {
  ts: string;
  userEmail: string;
  query: string;
  count: number;
  source: string;
}

interface UsageResponse {
  counters: Record<string, ProviderCounter>;
  activity: ActivityEntry[];
  platforms: Platform[];
  serperLog: SerperLogEntry[];
  users: { total: number; signups7d: number; logins24h: number; paid: number; free: number };
  shoppingStatus:
    | { disabled: false; dailyBudget: number; todayCount: number }
    | { disabled: true; code: 'disabled'; dailyBudget: number; todayCount: number }
    | { disabled: true; code: 'daily_budget_exceeded'; dailyBudget: number; todayCount: number; resetAt: string };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const t = Date.parse(dateStr);
  if (!Number.isFinite(t)) return null;
  return Math.ceil((t - Date.now()) / (24 * 60 * 60 * 1000));
}

function serperStatusDot(monthlyCount: number): { className: string; label: string } {
  const pct = (monthlyCount / SERPER_MONTHLY_CAP) * 100;
  if (pct >= 80) return { className: 'bg-red-500', label: `${pct.toFixed(0)}% of monthly cap` };
  if (pct >= 50) return { className: 'bg-amber-500', label: `${pct.toFixed(0)}% of monthly cap` };
  return { className: 'bg-green-500', label: `${pct.toFixed(0)}% of monthly cap` };
}

const ANON = 'anonymous';

// ── Section components ────────────────────────────────────────────────────

const ApiCountersSection: React.FC<{ counters: Record<string, ProviderCounter> }> = ({ counters }) => {
  const providers = Object.keys(counters).sort();
  return (
    <section className="mb-16">
      <h2 className="font-serif text-3xl text-[#0047AB] mb-6">API credits</h2>
      {providers.length === 0 ? (
        <p className="text-sm text-neutral-500 italic">No API calls recorded yet.</p>
      ) : (
        <div className="bg-white border border-black/10">
          <table className="w-full text-sm">
            <thead className="bg-[#0047AB]/5 border-b border-black/10">
              <tr>
                <th className="text-left px-4 py-3 font-semibold tracking-wide uppercase text-xs">Provider</th>
                <th className="text-right px-4 py-3 font-semibold tracking-wide uppercase text-xs">Daily</th>
                <th className="text-right px-4 py-3 font-semibold tracking-wide uppercase text-xs">Weekly</th>
                <th className="text-right px-4 py-3 font-semibold tracking-wide uppercase text-xs">Monthly</th>
                <th className="text-left px-4 py-3 font-semibold tracking-wide uppercase text-xs">Status</th>
              </tr>
            </thead>
            <tbody>
              {providers.map((p) => {
                const c = counters[p];
                const dot = p === 'serper' ? serperStatusDot(c.monthly.count) : { className: 'bg-green-500', label: 'no cap' };
                return (
                  <tr key={p} className="border-b border-black/5 last:border-b-0">
                    <td className="px-4 py-3 font-mono uppercase text-xs">{p}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{c.daily.count}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{c.weekly.count}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{c.monthly.count}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2">
                        <span className={`inline-block w-2.5 h-2.5 rounded-full ${dot.className}`} aria-label={dot.label} />
                        <span className="text-xs text-neutral-500">{dot.label}</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

const ActivitySection: React.FC<{ rows: ActivityEntry[] }> = ({ rows }) => (
  <section className="mb-16">
    <h2 className="font-serif text-3xl text-[#0047AB] mb-6">Recent activity</h2>
    {rows.length === 0 ? (
      <p className="text-sm text-neutral-500 italic">No activity recorded yet.</p>
    ) : (
      <div className="bg-white border border-black/10 max-h-[500px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#0047AB]/5 border-b border-black/10 sticky top-0">
            <tr>
              <th className="text-left px-4 py-3 font-semibold tracking-wide uppercase text-xs w-32">Time</th>
              <th className="text-left px-4 py-3 font-semibold tracking-wide uppercase text-xs">User</th>
              <th className="text-left px-4 py-3 font-semibold tracking-wide uppercase text-xs">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const isAnon = r.userEmail === ANON;
              return (
                <tr key={`${r.ts}-${i}`} className="border-b border-black/5 last:border-b-0">
                  <td className="px-4 py-2 text-neutral-600 text-xs whitespace-nowrap">{relativeTime(r.ts)}</td>
                  <td className={`px-4 py-2 font-mono text-xs ${isAnon ? 'text-neutral-400 italic' : 'text-black'}`}>
                    {r.userEmail}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-[#0047AB]">{r.action}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}
  </section>
);

const PlatformsSection: React.FC<{ items: Platform[] }> = ({ items }) => (
  <section className="mb-16">
    <h2 className="font-serif text-3xl text-[#0047AB] mb-6">Platforms</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((p) => {
        const days = daysUntil(p.renewal_date);
        return (
          <div key={p.name} className="bg-white border border-black/10 p-5">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-lg">{p.name}</h3>
              <span className="inline-flex gap-0.5" title={`Criticality ${p.criticality}/5`}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <span
                    key={n}
                    className={`inline-block w-1.5 h-1.5 rounded-full ${n <= p.criticality ? 'bg-[#0047AB]' : 'bg-neutral-300'}`}
                  />
                ))}
              </span>
            </div>
            <p className="text-xs text-neutral-600 mb-3">{p.powers}</p>
            <dl className="text-xs space-y-1">
              <div className="flex justify-between">
                <dt className="text-neutral-500 uppercase tracking-wide">Cost/mo</dt>
                <dd className="font-mono">{p.monthly_cost}</dd>
              </div>
              {p.free_tier_quota && (
                <div className="flex justify-between">
                  <dt className="text-neutral-500 uppercase tracking-wide">Free tier</dt>
                  <dd className="font-mono">{p.free_tier_quota}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-neutral-500 uppercase tracking-wide">Owner</dt>
                <dd className="font-mono text-[11px]">{p.owner_email}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500 uppercase tracking-wide">Renews</dt>
                <dd className="font-mono">
                  {days === null ? '—' : days < 0 ? <span className="text-red-600">overdue</span> : `${days} days`}
                </dd>
              </div>
            </dl>
          </div>
        );
      })}
    </div>
  </section>
);

const ShoppingIncidentSection: React.FC<{ rows: SerperLogEntry[]; status: UsageResponse['shoppingStatus'] }> = ({ rows, status }) => {
  const pillBase = 'inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider';
  const pillClass = status.disabled
    ? `${pillBase} bg-red-50 text-red-700 border border-red-200`
    : `${pillBase} bg-green-50 text-green-700 border border-green-200`;
  const pillLabel = status.disabled
    ? status.code === 'disabled'
      ? 'OFFLINE — kill switch'
      : 'OFFLINE — daily budget exceeded'
    : `ONLINE — ${status.todayCount} / ${status.dailyBudget} today`;

  return (
    <section className="mb-16">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-3xl text-[#0047AB]">Shopping incident view</h2>
        <span className={pillClass}>{pillLabel}</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-neutral-500 italic">No Serper calls recorded yet.</p>
      ) : (
        <div className="bg-white border border-black/10 max-h-[500px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#0047AB]/5 border-b border-black/10 sticky top-0">
              <tr>
                <th className="text-left px-4 py-3 font-semibold tracking-wide uppercase text-xs w-32">Time</th>
                <th className="text-left px-4 py-3 font-semibold tracking-wide uppercase text-xs">User</th>
                <th className="text-left px-4 py-3 font-semibold tracking-wide uppercase text-xs">Query</th>
                <th className="text-right px-4 py-3 font-semibold tracking-wide uppercase text-xs w-20">Credits</th>
                <th className="text-left px-4 py-3 font-semibold tracking-wide uppercase text-xs w-32">Source</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.ts}-${i}`} className="border-b border-black/5 last:border-b-0">
                  <td className="px-4 py-2 text-neutral-600 text-xs whitespace-nowrap">{relativeTime(r.ts)}</td>
                  <td className="px-4 py-2 font-mono text-xs">{r.userEmail}</td>
                  <td className="px-4 py-2 text-xs truncate max-w-[400px]" title={r.query}>{r.query}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{r.count}</td>
                  <td className="px-4 py-2 font-mono text-xs text-neutral-500">{r.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

// ── Main page ──────────────────────────────────────────────────────────────

const AdminPage: React.FC = () => {
  const me = useAdminMe();
  const navigate = useNavigate();
  const [data, setData] = useState<UsageResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  useEffect(() => {
    if (!me?.authed) return; // wait for /me probe; redirect handled below
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch('/api/admin/usage', { credentials: 'include' });
        if (cancelled) return;
        if (res.status === 401) {
          navigate('/admin/login', { replace: true });
          return;
        }
        if (!res.ok) {
          setError(`Fetch failed (${res.status})`);
          return;
        }
        const json = (await res.json()) as UsageResponse;
        if (cancelled) return;
        setData(json);
        setError(null);
        setLastFetched(new Date());
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Fetch failed');
      }
    };

    void load();
    const id = window.setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [me?.authed, navigate]);

  async function onSignOut() {
    await adminLogout();
    navigate('/admin/login', { replace: true });
  }

  if (me === null) return null; // probing
  if (!me.authed) return <Navigate to="/admin/login" replace />;

  return (
    <div className="min-h-screen bg-[#F4EFE7] font-body">
      <main className="pt-12 pb-24 max-w-[1600px] mx-auto px-8 md:px-16">
        <header className="flex items-baseline justify-between mb-12 border-b border-black/10 pb-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#0047AB] mb-2">Observability</p>
            <h1 className="font-serif text-5xl text-black">Admin dashboard</h1>
          </div>
          <div className="text-xs text-neutral-500 text-right flex items-baseline gap-6">
            <div>
              {lastFetched && <p>Updated {relativeTime(lastFetched.toISOString())}</p>}
              <p>Polling every {Math.round(POLL_MS / 1000)}s</p>
            </div>
            <Link
              to="/admin/users"
              className="text-[10px] tracking-[0.22em] uppercase font-bold text-[#0047AB] hover:underline"
            >
              View users →
            </Link>
            <button
              type="button"
              onClick={onSignOut}
              className="text-[10px] tracking-[0.22em] uppercase font-bold text-black hover:text-[#0047AB]"
            >
              Sign out
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-8 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm">
            <strong>Fetch failed:</strong> {error}
            {data && <span className="ml-2 text-red-600 italic">(showing stale data)</span>}
          </div>
        )}

        {data && data.users && (
          <section className="mb-12 grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Total users', value: data.users.total },
              { label: 'Signups · 7d', value: data.users.signups7d },
              { label: 'Logins · 24h', value: data.users.logins24h },
              { label: 'Paid', value: data.users.paid },
              { label: 'Free', value: data.users.free },
            ].map((s) => (
              <div key={s.label} className="bg-white border border-black/10 p-4 text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 mb-1">{s.label}</p>
                <p className="text-3xl font-serif text-[#0047AB] tabular-nums">{s.value}</p>
              </div>
            ))}
          </section>
        )}

        {data ? (
          <>
            <ApiCountersSection counters={data.counters} />
            <ActivitySection rows={data.activity} />
            <PlatformsSection items={data.platforms} />
            <ShoppingIncidentSection rows={data.serperLog} status={data.shoppingStatus} />
          </>
        ) : (
          !error && <p className="text-sm text-neutral-500 italic">Loading…</p>
        )}
      </main>
    </div>
  );
};

export default AdminPage;
