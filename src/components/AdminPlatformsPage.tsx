/**
 * /admin/platforms — the money tab (2026-07-19).
 *
 * "Open and see all the paid and free platforms used for the website, and know
 * when and who I'm paying." Promotes the old Platforms section (buried in the
 * Overview page) to its own tab and reshapes it around the owner's two questions:
 *   • WHEN  — renewal dates + a next-renewals timeline + monthly/annual totals
 *   • WHO   — the account each service is billed under (owner_email)
 *
 * The inventory is owner-editable and durable: it seeds from
 * server/config/platforms.json on first boot, then lives in Postgres app_state so
 * edits survive Railway redeploys. Read via GET /api/admin/platforms; the whole
 * list is saved wholesale via PUT /api/admin/platforms.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminMe } from '../lib/adminAuth';
import AdminShell from './admin/AdminShell';

interface Platform {
  name: string;
  owner_email: string;
  monthly_cost: string;
  annual_cost?: string | null;
  free_tier_quota: string | null;
  /** ANCHOR renewal date (the edit form binds here). */
  renewal_date: string | null;
  /** Billing cadence — drives the auto-advancing next renewal. null ⇒ static. */
  cadence?: 'monthly' | 'annual' | 'once' | null;
  /** Server-derived next renewal (anchor rolled forward). Read-only; used for
   *  display / daysUntil / sorting. Falls back to renewal_date when absent. */
  next_renewal?: string | null;
  powers: string;
  criticality: number;
}

/** Live metered usage for a provider (from GET /api/admin/platforms → usage). */
interface Usage {
  todayCount: number;
  monthCount: number;
  window: 'daily' | 'monthly';
  windowLimit: number;
  windowLabel: string;
  monthCostEst: number;
  dailyBudget?: number;
  disabled?: boolean;
}
type UsageMap = Record<string, Usage>;

/** Map a platform's display name → the metered provider slug, or null. */
function providerKeyFor(name: string): string | null {
  const n = name.toLowerCase();
  if (n.includes('serper')) return 'serper';
  if (n.includes('gemini') || n.includes('google cloud')) return 'gemini';
  if (n.includes('cloudinary')) return 'cloudinary';
  if (n.includes('sheet')) return 'sheets';
  if (n.includes('ipapi') || n.includes('ip api')) return 'ipapi';
  if (n.includes('emailjs')) return 'emailjs';
  return null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Largest positive dollar amount mentioned in a cost string, or 0 if none.
 *  "$4.83" → 4.83 · "~$5 + usage" → 5 · "$0-10" → 10 · "$0 → $50" → 50 · "$0" → 0 */
function maxDollar(s: string | null | undefined): number {
  if (!s) return 0;
  const nums = (s.match(/\d+(?:\.\d+)?/g) || []).map(Number).filter((n) => n > 0);
  return nums.length ? Math.max(...nums) : 0;
}

/** A platform is "paid" if any positive number appears in its monthly OR annual
 *  cost (covers fixed, ranged, and usage-based). Otherwise it's free. */
function isPaid(p: Platform): boolean {
  return maxDollar(p.monthly_cost) > 0 || maxDollar(p.annual_cost) > 0;
}

/** Best monthly estimate (upper bound): parsed monthly, else annual / 12. */
function monthlyEstimate(p: Platform): number {
  const m = maxDollar(p.monthly_cost);
  if (m > 0) return m;
  const a = maxDollar(p.annual_cost);
  return a > 0 ? a / 12 : 0;
}

/** Best yearly estimate (upper bound): parsed annual, else monthly × 12. */
function yearlyEstimate(p: Platform): number {
  const a = maxDollar(p.annual_cost);
  if (a > 0) return a;
  return maxDollar(p.monthly_cost) * 12;
}

function fmtMoney(n: number): string {
  if (n <= 0) return '$0';
  if (Number.isInteger(n)) return `$${n}`;
  return `$${n.toFixed(2)}`;
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const t = Date.parse(dateStr);
  if (!Number.isFinite(t)) return null;
  return Math.ceil((t - Date.now()) / (24 * 60 * 60 * 1000));
}

/** The date to DISPLAY / sort on: server-derived next renewal, else the raw anchor. */
function renewOf(p: Platform): string | null {
  return p.next_renewal ?? p.renewal_date;
}

const BLANK: Platform = {
  name: '',
  owner_email: '',
  monthly_cost: '$0',
  annual_cost: null,
  free_tier_quota: null,
  renewal_date: null,
  powers: '',
  criticality: 3,
};

// ── Small presentational bits ────────────────────────────────────────────────

const SummaryTile: React.FC<{ label: string; value: React.ReactNode; sub?: string }> = ({ label, value, sub }) => (
  <div className="bg-white border border-[#DAD2C3] px-4 py-4 flex flex-col gap-1.5">
    <span className="text-[9px] tracking-[0.28em] uppercase text-neutral-500 font-bold">{label}</span>
    <span className="font-serif text-[30px] leading-none text-black tabular-nums">{value}</span>
    {sub && <span className="text-[11px] font-semibold text-neutral-500">{sub}</span>}
  </div>
);

const CritDots: React.FC<{ n: number }> = ({ n }) => (
  <span className="inline-flex gap-[3px] align-middle" title={`Criticality ${n}/5`}>
    {[1, 2, 3, 4, 5].map((i) => (
      <span key={i} className={`inline-block w-1.5 h-1.5 rounded-full ${i <= n ? 'bg-[#0047AB]' : 'bg-[#DAD2C3]'}`} />
    ))}
  </span>
);

const TH: React.FC<{ children: React.ReactNode; right?: boolean }> = ({ children, right }) => (
  <th className={`px-4 py-3 text-[9px] tracking-[0.22em] uppercase text-neutral-500 font-bold border-b border-[#DAD2C3] ${right ? 'text-right' : 'text-left'}`}>
    {children}
  </th>
);

/** Compact "how much already used" line under a platform's name (metered providers). */
const UsageLine: React.FC<{ u: Usage }> = ({ u }) => {
  if (u.disabled) {
    return <div className="mt-1 text-[11px] text-amber-700 font-semibold">Offline · Shopping kill-switch on</div>;
  }
  const dailyCap = u.dailyBudget ?? (u.window === 'daily' ? u.windowLimit : 0);
  const nearDay = dailyCap > 0 && u.todayCount / dailyCap >= 0.8;
  return (
    <div className="mt-1 text-[11px] text-[#0047AB]">
      <strong>{u.monthCount.toLocaleString()}</strong> used this mo
      {u.monthCostEst > 0 && <span className="text-neutral-500"> · ~${u.monthCostEst.toFixed(2)}</span>}
      {dailyCap > 0 ? (
        <span className={nearDay ? 'text-amber-700 font-semibold' : 'text-neutral-500'}> · {u.todayCount}/{dailyCap} today</span>
      ) : (
        u.todayCount > 0 && <span className="text-neutral-500"> · {u.todayCount} today</span>
      )}
    </div>
  );
};

// ── Read-only table for a group (paid / free) ────────────────────────────────

const GroupTable: React.FC<{ items: Platform[]; usage: UsageMap }> = ({ items, usage }) => (
  <div className="overflow-x-auto border border-[#DAD2C3] bg-white">
    <table className="w-full min-w-[900px]">
      <thead>
        <tr>
          <TH>Platform</TH>
          <TH>What it powers</TH>
          <TH right>Cost / mo</TH>
          <TH right>Cost / yr</TH>
          <TH>Free tier</TH>
          <TH>Renews</TH>
          <TH>Billed to (who)</TH>
          <TH right>Crit.</TH>
        </tr>
      </thead>
      <tbody>
        {items.map((p, i) => {
          const renews = renewOf(p);
          const d = daysUntil(renews);
          const soon = d !== null && d < 60;
          const key = providerKeyFor(p.name);
          const u = key ? usage[key] : undefined;
          return (
            <tr key={`${p.name}-${i}`} className="border-b border-[#DAD2C3] last:border-b-0 align-top">
              <td className="px-4 py-3 text-[13px] text-black font-semibold whitespace-nowrap">
                {p.name}
                {u && <UsageLine u={u} />}
              </td>
              <td className="px-4 py-3 text-[12px] text-neutral-600 max-w-[260px]">{p.powers || '—'}</td>
              <td className="px-4 py-3 text-[12px] text-black text-right tabular-nums whitespace-nowrap">{p.monthly_cost || '—'}</td>
              <td className="px-4 py-3 text-[12px] text-neutral-700 text-right tabular-nums whitespace-nowrap">{p.annual_cost || '—'}</td>
              <td className="px-4 py-3 text-[12px] text-neutral-600">{p.free_tier_quota || '—'}</td>
              <td className="px-4 py-3 text-[12px] whitespace-nowrap">
                {renews ? (
                  <span className={soon ? 'text-amber-700 font-semibold' : 'text-neutral-700'}>
                    {renews}
                    {d !== null && <span className="text-neutral-400"> · {d}d</span>}
                  </span>
                ) : (
                  <span className="text-neutral-400">pay-as-you-go</span>
                )}
              </td>
              <td className="px-4 py-3 text-[11px] text-neutral-700 font-mono whitespace-nowrap">{p.owner_email || '—'}</td>
              <td className="px-4 py-3 text-right"><CritDots n={p.criticality} /></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

// ── Editable row ─────────────────────────────────────────────────────────────

const cellInput =
  'w-full bg-white border border-[#DAD2C3] px-2 py-1.5 text-[12px] text-black focus:outline-none focus:border-[#0047AB]';

const EditRow: React.FC<{
  p: Platform;
  onChange: (patch: Partial<Platform>) => void;
  onDelete: () => void;
}> = ({ p, onChange, onDelete }) => (
  <tr className="border-b border-[#DAD2C3] last:border-b-0 align-top">
    <td className="px-2 py-2 min-w-[130px]">
      <input className={cellInput} value={p.name} placeholder="Name" onChange={(e) => onChange({ name: e.target.value })} />
    </td>
    <td className="px-2 py-2 min-w-[200px]">
      <input className={cellInput} value={p.powers} placeholder="What it powers" onChange={(e) => onChange({ powers: e.target.value })} />
    </td>
    <td className="px-2 py-2 min-w-[110px]">
      <input className={cellInput} value={p.monthly_cost} placeholder="$0" onChange={(e) => onChange({ monthly_cost: e.target.value })} />
    </td>
    <td className="px-2 py-2 min-w-[110px]">
      <input className={cellInput} value={p.annual_cost ?? ''} placeholder="—" onChange={(e) => onChange({ annual_cost: e.target.value })} />
    </td>
    <td className="px-2 py-2 min-w-[120px]">
      <input className={cellInput} value={p.free_tier_quota ?? ''} placeholder="—" onChange={(e) => onChange({ free_tier_quota: e.target.value })} />
    </td>
    <td className="px-2 py-2 min-w-[140px]">
      <input className={cellInput} type="date" value={p.renewal_date ?? ''} onChange={(e) => onChange({ renewal_date: e.target.value })} />
      <select
        className={`${cellInput} mt-1.5`}
        value={p.cadence ?? ''}
        onChange={(e) => onChange({ cadence: (e.target.value || null) as Platform['cadence'] })}
        title="How this renewal recurs — drives the auto-advancing date"
      >
        <option value="monthly">Monthly</option>
        <option value="annual">Annual</option>
        <option value="once">One-time</option>
        <option value="">None</option>
      </select>
    </td>
    <td className="px-2 py-2 min-w-[200px]">
      <input className={cellInput} value={p.owner_email} placeholder="billed to (email)" onChange={(e) => onChange({ owner_email: e.target.value })} />
    </td>
    <td className="px-2 py-2 w-[70px]">
      <select
        className={cellInput}
        value={p.criticality}
        onChange={(e) => onChange({ criticality: Number(e.target.value) })}
      >
        {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
    </td>
    <td className="px-2 py-2 w-[40px] text-center">
      <button
        type="button"
        onClick={onDelete}
        className="text-neutral-400 hover:text-red-600 text-lg leading-none"
        title="Remove this platform"
      >
        ×
      </button>
    </td>
  </tr>
);

// ── Page ─────────────────────────────────────────────────────────────────────

const AdminPlatformsPage: React.FC = () => {
  const me = useAdminMe();
  const [items, setItems] = useState<Platform[] | null>(null);
  const [usage, setUsage] = useState<UsageMap>({});
  const [draft, setDraft] = useState<Platform[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (!me?.authed) return;
    let cancelled = false;
    fetch('/api/admin/platforms', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Fetch failed (${r.status})`))))
      .then((d) => { if (!cancelled) { setItems(d.items || []); setUsage(d.usage || {}); } })
      .catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [me?.authed]);

  const view = editing ? draft : (items || []);
  const paid = useMemo(() => view.filter(isPaid), [view]);
  const free = useMemo(() => view.filter((p) => !isPaid(p)), [view]);

  const monthlyTotal = useMemo(() => paid.reduce((a, p) => a + monthlyEstimate(p), 0), [paid]);
  const yearlyTotal = useMemo(() => paid.reduce((a, p) => a + yearlyEstimate(p), 0), [paid]);
  const nextRenewals = useMemo(
    () =>
      view
        .filter((p) => daysUntil(renewOf(p)) !== null)
        .sort((a, b) => (daysUntil(renewOf(a))! - daysUntil(renewOf(b))!)),
    [view],
  );

  function startEdit() {
    setDraft((items || []).map((p) => ({ ...p })));
    setEditing(true);
    setError(null);
  }
  function cancelEdit() {
    setEditing(false);
    setDraft([]);
    setError(null);
  }
  function patchRow(idx: number, patch: Partial<Platform>) {
    setDraft((d) => d.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  }
  function deleteRow(idx: number) {
    setDraft((d) => d.filter((_, i) => i !== idx));
  }
  function addRow() {
    setDraft((d) => [...d, { ...BLANK }]);
  }

  async function save() {
    // Normalize blank optionals to null; drop rows with no name.
    const payload = draft
      .map((p) => ({
        ...p,
        name: p.name.trim(),
        annual_cost: p.annual_cost && String(p.annual_cost).trim() ? String(p.annual_cost).trim() : null,
        free_tier_quota: p.free_tier_quota && String(p.free_tier_quota).trim() ? String(p.free_tier_quota).trim() : null,
        renewal_date: p.renewal_date && String(p.renewal_date).trim() ? String(p.renewal_date).trim() : null,
        cadence: p.cadence ?? null,
      }))
      .filter((p) => p.name);
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/platforms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ items: payload }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Save failed (${res.status})`);
      }
      const d = await res.json();
      setItems(d.items || payload);
      setEditing(false);
      setDraft([]);
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (me === null) return null;
  if (!me.authed) return <Navigate to="/admin/login" replace />;

  const btnBase = 'text-[11px] tracking-[0.05em] font-semibold px-3 py-1.5 border transition-colors';

  return (
    <AdminShell
      active="platforms"
      title="Platforms"
      rightSlot={
        editing ? (
          <div className="flex items-center gap-2 normal-case tracking-normal">
            <button type="button" onClick={cancelEdit} disabled={saving}
              className={`${btnBase} border-[#DAD2C3] text-neutral-600 hover:bg-[#FAFAFA]`}>
              Cancel
            </button>
            <button type="button" onClick={save} disabled={saving}
              className={`${btnBase} border-[#0047AB] bg-[#0047AB] text-white hover:opacity-90 disabled:opacity-60`}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 normal-case tracking-normal">
            {savedFlash && <span className="text-[11px] text-green-700 font-semibold">Saved ✓</span>}
            <button type="button" onClick={startEdit} disabled={items === null}
              className={`${btnBase} border-[#0047AB] text-[#0047AB] hover:bg-[#F4EFE7] disabled:opacity-50`}>
              Edit inventory
            </button>
          </div>
        )
      }
    >
      {/* Intro + summary band */}
      <section className="bg-[#F4EFE7] border-b border-[#DAD2C3] py-6 px-8">
        <p className="text-[13px] text-neutral-700 max-w-[760px]">
          Every service the website runs on — <strong>what you pay, when it renews, and which account it's billed to.</strong>{' '}
          Paid and usage-based services are separated from the free ones below. Edits are saved durably and survive redeploys.
        </p>
        {items && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 mt-5">
            <SummaryTile label="Est. monthly · max" value={fmtMoney(monthlyTotal)} sub="upper bound, incl. usage caps" />
            <SummaryTile label="Est. yearly · max" value={fmtMoney(yearlyTotal)} sub="upper bound" />
            <SummaryTile label="Paid services" value={paid.length} sub={`of ${view.length} total`} />
            <SummaryTile label="Free services" value={free.length} sub="$0 tier" />
            <SummaryTile
              label="Next renewal"
              value={nextRenewals.length ? `${daysUntil(renewOf(nextRenewals[0]))}d` : '—'}
              sub={nextRenewals.length ? nextRenewals[0].name : 'no fixed renewals'}
            />
          </div>
        )}
      </section>

      <div className="px-8 py-7">
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}
        {items === null && !error && <p className="text-sm text-neutral-500 italic">Loading…</p>}

        {/* Next renewals timeline (view mode only) */}
        {!editing && items && nextRenewals.length > 0 && (
          <div className="mb-8">
            <h2 className="text-[10px] tracking-[0.28em] uppercase text-neutral-500 font-bold mb-3">Next renewals</h2>
            <div className="flex flex-wrap gap-2.5">
              {nextRenewals.map((p) => {
                const d = daysUntil(renewOf(p))!;
                const soon = d < 60;
                return (
                  <div key={p.name} className={`border px-3.5 py-2 bg-white ${soon ? 'border-amber-300' : 'border-[#DAD2C3]'}`}>
                    <div className="text-[12px] font-semibold text-black">{p.name}</div>
                    <div className={`text-[11px] ${soon ? 'text-amber-700 font-semibold' : 'text-neutral-500'}`}>
                      in {d} days · {renewOf(p)}
                    </div>
                    <div className="text-[10px] text-neutral-400 font-mono mt-0.5">{p.owner_email}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* View mode — grouped tables */}
        {!editing && items && (
          <>
            <div className="mb-8">
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="font-serif text-[20px] text-black">Paid &amp; usage-based</h2>
                <span className="text-[11px] text-neutral-500">{paid.length} service{paid.length === 1 ? '' : 's'} · up to {fmtMoney(monthlyTotal)}/mo</span>
              </div>
              {paid.length ? <GroupTable items={paid} usage={usage} /> : (
                <p className="text-sm text-neutral-500 italic bg-white border border-[#DAD2C3] px-4 py-6 text-center">No paid services.</p>
              )}
            </div>
            <div>
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="font-serif text-[20px] text-black">Free</h2>
                <span className="text-[11px] text-neutral-500">{free.length} service{free.length === 1 ? '' : 's'} · $0</span>
              </div>
              {free.length ? <GroupTable items={free} usage={usage} /> : (
                <p className="text-sm text-neutral-500 italic bg-white border border-[#DAD2C3] px-4 py-6 text-center">No free services.</p>
              )}
            </div>
          </>
        )}

        {/* Edit mode — one editable table */}
        {editing && (
          <>
            <div className="overflow-x-auto border border-[#DAD2C3] bg-white">
              <table className="w-full min-w-[1000px]">
                <thead>
                  <tr>
                    <TH>Platform</TH>
                    <TH>What it powers</TH>
                    <TH>Cost / mo</TH>
                    <TH>Cost / yr</TH>
                    <TH>Free tier</TH>
                    <TH>Renewal date</TH>
                    <TH>Billed to (who)</TH>
                    <TH>Crit.</TH>
                    <TH> </TH>
                  </tr>
                </thead>
                <tbody>
                  {draft.map((p, i) => (
                    <EditRow key={i} p={p} onChange={(patch) => patchRow(i, patch)} onDelete={() => deleteRow(i)} />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <button type="button" onClick={addRow}
                className="text-[12px] font-semibold text-[#0047AB] border border-[#0047AB] px-3 py-1.5 hover:bg-[#F4EFE7]">
                + Add platform
              </button>
              <p className="text-[11px] text-neutral-400">
                Paid vs free is auto-detected from the cost (any non-zero amount = paid). Leave a field blank for “—”.
              </p>
            </div>
          </>
        )}
      </div>
    </AdminShell>
  );
};

export default AdminPlatformsPage;
