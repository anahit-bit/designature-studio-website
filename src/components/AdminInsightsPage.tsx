/**
 * /admin/insights — "how the site is breathing" + GEO tracking (2026-08).
 *
 * Four sections off the (free, already-wired) GA4 + Search Console feeds:
 *  1. Traffic pulse   — sessions trend, new/returning, engagement, channels, top pages
 *  2. Blog readership — per-Journal-post views/readers/time (is anyone reading?)
 *  3. Search & GEO    — query table w/ position, per-post search perf, AI-assistant referrals
 *  4. GEO watchlist   — editable phrases → Google position + impressions + trend over time
 *
 * Data: GET /api/admin/insights (6h server cache). Watchlist edits: PUT /api/admin/geo-phrases.
 */
import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminMe } from '../lib/adminAuth';
import AdminShell from './admin/AdminShell';

interface Pulse {
  ok: boolean; error?: string;
  byDate: Array<{ date: string; sessions: number; users: number }>;
  newUsers: number; returningUsers: number;
  engagementRatePct: number | null; avgEngagementSec: number | null;
  totalUsers: number;
  topPages: Array<{ path: string; views: number; users: number }>;
}
interface Channels {
  ok: boolean;
  totalSessions: number; bounceRatePct: number | null;
  channels: Array<{ channel: string; sessions: number }>;
  organicSearch: number; direct: number; social: number; aiAssistant: number;
  topCountry: { country: string; sessions: number } | null;
}
interface Blog {
  ok: boolean; error?: string;
  totalViews: number; totalReaders: number;
  posts: Array<{ path: string; views: number; users: number; avgEngagementSec: number }>;
}
interface GscHeadline { ok: boolean; clicks: number; impressions: number; ctrPct: number; position: number; }
interface GscInsights {
  ok: boolean; error?: string;
  queries: Array<{ query: string; clicks: number; impressions: number; ctrPct: number; position: number }>;
  journalPages: Array<{ page: string; clicks: number; impressions: number; position: number }>;
}
interface WatchRow {
  phrase: string; display: string; found: boolean;
  clicks: number; impressions: number; ctrPct: number; position: number | null;
  history: Array<{ date: string; position: number | null }>;
  volume?: { google: number | null; bing: number | null };
}
interface InsightsPayload {
  configured: boolean; updatedAt: string; rangeDays: number;
  pulse: Pulse | null; channels: Channels | null; blog: Blog | null;
  gscHeadline: GscHeadline | null; gsc: GscInsights | null;
  watchlist: WatchRow[];
  volumeSources: string[];
}

// ── formatters ────────────────────────────────────────────────────────────
const num = (n: number) => n.toLocaleString('en-US');
function fmtSec(s: number | null): string {
  if (s === null || !Number.isFinite(s)) return '—';
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
}
function stripJournal(path: string): string {
  return path.replace(/^https?:\/\/[^/]+/, '').replace(/\/$/, '') || '/';
}

const Tile: React.FC<{ label: string; value: React.ReactNode; sub?: string }> = ({ label, value, sub }) => (
  <div className="bg-white border border-[#DAD2C3] px-4 py-4 flex flex-col gap-1.5">
    <span className="text-[9px] tracking-[0.28em] uppercase text-neutral-500 font-bold">{label}</span>
    <span className="font-serif text-[28px] leading-none text-black tabular-nums">{value}</span>
    {sub && <span className="text-[11px] font-semibold text-neutral-500">{sub}</span>}
  </div>
);

const Spark: React.FC<{ data: number[] }> = ({ data }) => {
  if (!data.length) return <div className="h-8" />;
  const max = Math.max(...data, 1);
  return (
    <div className="h-9 flex items-end gap-[2px]">
      {data.map((v, i) => (
        <div key={i} className="flex-1 bg-[#0047AB] opacity-70" style={{ height: `${Math.max(6, (v / max) * 100)}%` }} title={String(v)} />
      ))}
    </div>
  );
};

const SectionTitle: React.FC<{ children: React.ReactNode; sub?: string }> = ({ children, sub }) => (
  <div className="flex items-baseline justify-between mb-3 mt-9 first:mt-0">
    <h2 className="font-serif text-[20px] text-black">{children}</h2>
    {sub && <span className="text-[11px] text-neutral-500">{sub}</span>}
  </div>
);

const TH: React.FC<{ children?: React.ReactNode; right?: boolean }> = ({ children, right }) => (
  <th className={`px-3 py-2.5 text-[9px] tracking-[0.2em] uppercase text-neutral-500 font-bold border-b border-[#DAD2C3] ${right ? 'text-right' : 'text-left'}`}>{children}</th>
);

// Position badge: lower is better; color by tier.
const PosBadge: React.FC<{ pos: number | null; found: boolean }> = ({ pos, found }) => {
  if (!found || pos === null) return <span className="text-[11px] text-neutral-400 italic">not ranking yet</span>;
  const tier = pos <= 10 ? 'bg-green-100 text-green-700' : pos <= 30 ? 'bg-amber-100 text-amber-800' : 'bg-black/[0.06] text-neutral-600';
  return <span className={`text-[12px] font-bold tabular-nums py-0.5 px-2 ${tier}`}>#{pos}</span>;
};

const AdminInsightsPage: React.FC = () => {
  const me = useAdminMe();
  const [data, setData] = useState<InsightsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    fetch('/api/admin/insights', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Fetch failed (${r.status})`))))
      .then((d) => setData(d))
      .catch((e) => setError(e.message));
  }
  useEffect(() => { if (me?.authed) load(); }, [me?.authed]);

  async function savePhrases() {
    const phrases = draft.split('\n').map((s) => s.trim()).filter(Boolean);
    setSaving(true);
    try {
      const res = await fetch('/api/admin/geo-phrases', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ phrases }),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      setEditing(false);
      setData(null); // show loading while insights rebuild
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally { setSaving(false); }
  }

  if (me === null) return null;
  if (!me.authed) return <Navigate to="/admin/login" replace />;

  const p = data?.pulse;
  const ch = data?.channels;
  const blog = data?.blog;
  const gscH = data?.gscHeadline;
  const gsc = data?.gsc;

  return (
    <AdminShell active="insights" title="Insights"
      rightSlot={data && <span>Last {data.rangeDays}d · GA4 + Search Console</span>}>
      <section className="bg-[#F4EFE7] border-b border-[#DAD2C3] py-6 px-8">
        <p className="text-[13px] text-neutral-700 max-w-[820px]">
          How the site is breathing — <strong>traffic, who's reading the Journal, and where you rank in search + AI answers.</strong>{' '}
          Numbers are the last {data?.rangeDays ?? 28} days; search data lags Google by ~2–3 days.
        </p>
      </section>

      <div className="px-8 py-7">
        {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
        {!data && !error && <p className="text-sm text-neutral-500 italic">Loading…</p>}

        {data && !data.configured && (
          <div className="bg-[#FAFAFA] border border-dashed border-[#DAD2C3] p-7">
            <p className="text-[9px] tracking-[0.32em] uppercase text-[#0047AB] font-bold mb-2">Not configured</p>
            <p className="text-[13px] text-neutral-600 leading-[1.6]">
              Set <code className="font-mono text-[12px]">GA4_PROPERTY_ID</code> and grant the service account read access in GA4 + Search Console.
            </p>
          </div>
        )}

        {data && data.configured && (
          <>
            {/* 1 · TRAFFIC PULSE */}
            <SectionTitle sub={p?.ok === false ? `GA4: ${p.error}` : undefined}>Traffic pulse</SectionTitle>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
              <Tile label="Sessions" value={ch?.ok ? num(ch.totalSessions) : '—'} sub={ch?.topCountry ? `top: ${ch.topCountry.country}` : undefined} />
              <Tile label="Visitors" value={p?.ok ? num(p.totalUsers) : '—'} sub={p?.ok ? `${num(p.newUsers)} new · ${num(p.returningUsers)} returning` : undefined} />
              <Tile label="Engagement rate" value={p?.engagementRatePct !== null && p?.engagementRatePct !== undefined ? `${p.engagementRatePct}%` : '—'} />
              <Tile label="Avg time" value={fmtSec(p?.avgEngagementSec ?? null)} sub="per session" />
              <Tile label="Bounce rate" value={ch?.bounceRatePct !== null && ch?.bounceRatePct !== undefined ? `${ch.bounceRatePct}%` : '—'} />
            </div>
            {p?.ok && p.byDate.length > 0 && (
              <div className="mt-3.5 bg-white border border-[#DAD2C3] px-5 py-4">
                <p className="text-[9px] tracking-[0.22em] uppercase text-neutral-500 font-bold mb-2">Sessions · daily</p>
                <Spark data={p.byDate.map((d) => d.sessions)} />
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-3.5">
              {ch?.ok && (
                <div className="bg-white border border-[#DAD2C3] p-4">
                  <p className="text-[9px] tracking-[0.22em] uppercase text-neutral-500 font-bold mb-2.5">Where visitors come from</p>
                  {ch.channels.slice(0, 6).map((c) => {
                    const wpct = ch.totalSessions > 0 ? Math.round((c.sessions / ch.totalSessions) * 100) : 0;
                    return (
                      <div key={c.channel} className="flex items-center gap-3 mb-1.5">
                        <span className="text-[12px] text-neutral-700 w-[120px] shrink-0">{c.channel}</span>
                        <div className="flex-1 h-3 bg-[#FAFAFA] border border-[#DAD2C3]"><div className="h-full bg-[#0047AB] opacity-80" style={{ width: `${wpct}%` }} /></div>
                        <span className="text-[11px] tabular-nums text-neutral-600 w-[64px] text-right">{num(c.sessions)} · {wpct}%</span>
                      </div>
                    );
                  })}
                </div>
              )}
              {p?.ok && (
                <div className="bg-white border border-[#DAD2C3] p-4">
                  <p className="text-[9px] tracking-[0.22em] uppercase text-neutral-500 font-bold mb-2.5">Top pages</p>
                  {p.topPages.slice(0, 6).map((pg) => (
                    <div key={pg.path} className="flex items-center justify-between gap-3 mb-1.5">
                      <span className="text-[12px] text-neutral-700 truncate" title={pg.path}>{stripJournal(pg.path)}</span>
                      <span className="text-[11px] tabular-nums text-neutral-600 shrink-0">{num(pg.views)} views</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2 · BLOG READERSHIP */}
            <SectionTitle sub={blog?.ok ? `${num(blog.totalViews)} views · ${num(blog.totalReaders)} readers` : blog?.error}>Journal readership</SectionTitle>
            {blog?.ok && blog.posts.length > 0 ? (
              <div className="overflow-x-auto border border-[#DAD2C3] bg-white">
                <table className="w-full min-w-[640px]">
                  <thead><tr><TH>Post</TH><TH right>Views</TH><TH right>Readers</TH><TH right>Avg time</TH></tr></thead>
                  <tbody>
                    {blog.posts.map((post) => (
                      <tr key={post.path} className="border-b border-[#DAD2C3] last:border-b-0">
                        <td className="px-3 py-2.5 text-[12px] text-black">{stripJournal(post.path)}</td>
                        <td className="px-3 py-2.5 text-[12px] text-right tabular-nums text-neutral-700">{num(post.views)}</td>
                        <td className="px-3 py-2.5 text-[12px] text-right tabular-nums text-neutral-700">{num(post.users)}</td>
                        <td className="px-3 py-2.5 text-[12px] text-right tabular-nums text-neutral-700">{fmtSec(post.avgEngagementSec)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-white border border-[#DAD2C3] px-5 py-8 text-center text-sm text-neutral-500 italic">
                No Journal reads recorded in this window yet.
              </div>
            )}

            {/* 3 · SEARCH & GEO */}
            <SectionTitle sub={gscH?.ok ? `${num(gscH.clicks)} clicks · ${num(gscH.impressions)} impressions · ${gscH.ctrPct}% CTR · avg pos ${gscH.position}` : undefined}>Search &amp; GEO</SectionTitle>
            <div className="bg-white border border-[#DAD2C3] border-l-2 border-l-[#0047AB] p-3 flex items-center justify-between gap-4 mb-3.5">
              <div>
                <p className="text-[9px] tracking-[0.22em] uppercase text-neutral-500 font-bold mb-0.5">AI-assistant referrals · your GEO leading indicator</p>
                <p className="text-[10px] text-neutral-500">Sessions sent by ChatGPT · Perplexity · Copilot</p>
              </div>
              <p className="font-serif text-[24px] text-black whitespace-nowrap">{ch?.ok ? num(ch.aiAssistant) : '—'} <span className="text-[11px] text-neutral-500">sessions</span></p>
            </div>
            {gsc?.ok && gsc.queries.length > 0 ? (
              <div className="overflow-x-auto border border-[#DAD2C3] bg-white">
                <table className="w-full min-w-[640px]">
                  <thead><tr><TH>Search query (Google)</TH><TH right>Position</TH><TH right>Impr.</TH><TH right>Clicks</TH></tr></thead>
                  <tbody>
                    {gsc.queries.map((q) => (
                      <tr key={q.query} className="border-b border-[#DAD2C3] last:border-b-0">
                        <td className="px-3 py-2.5 text-[12px] text-neutral-800 truncate max-w-[360px]" title={q.query}>{q.query}</td>
                        <td className="px-3 py-2.5 text-[12px] text-right tabular-nums text-neutral-700">{q.position}</td>
                        <td className="px-3 py-2.5 text-[12px] text-right tabular-nums text-neutral-700">{num(q.impressions)}</td>
                        <td className="px-3 py-2.5 text-[12px] text-right tabular-nums text-neutral-700">{num(q.clicks)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-neutral-500 italic bg-white border border-[#DAD2C3] px-4 py-6 text-center">{gsc?.error || 'No search queries in range yet.'}</p>
            )}

            {/* 4 · GEO WATCHLIST */}
            <div className="flex items-baseline justify-between mb-3 mt-9">
              <h2 className="font-serif text-[20px] text-black">Target phrases · GEO watchlist</h2>
              {!editing ? (
                <button onClick={() => { setDraft(data.watchlist.map((w) => w.display).join('\n')); setEditing(true); }}
                  className="text-[11px] font-semibold text-[#0047AB] border border-[#0047AB] px-3 py-1.5 hover:bg-[#F4EFE7]">Edit phrases</button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setEditing(false)} disabled={saving} className="text-[11px] font-semibold text-neutral-600 border border-[#DAD2C3] px-3 py-1.5 hover:bg-[#FAFAFA]">Cancel</button>
                  <button onClick={savePhrases} disabled={saving} className="text-[11px] font-semibold text-white bg-[#0047AB] border border-[#0047AB] px-3 py-1.5 hover:opacity-90 disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button>
                </div>
              )}
            </div>
            {editing ? (
              <div className="bg-white border border-[#DAD2C3] p-4">
                <p className="text-[11px] text-neutral-500 mb-2">One phrase per line (max 25). Lowercase, exact-match against Google Search Console.</p>
                <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={Math.max(4, draft.split('\n').length + 1)}
                  className="w-full border border-[#DAD2C3] p-2.5 text-[13px] font-mono focus:outline-none focus:border-[#0047AB]" />
              </div>
            ) : data.watchlist.length === 0 ? (
              <p className="text-sm text-neutral-500 italic bg-white border border-[#DAD2C3] px-4 py-6 text-center">No phrases tracked. Click “Edit phrases” to add some.</p>
            ) : (
              <>
                {data.volumeSources.length === 0 && (
                  <div className="mb-2 px-3 py-2 bg-[#F4EFE7] border border-[#DAD2C3] text-[11px] text-neutral-600">
                    Search-volume column is empty — connect <strong>Bing Webmaster</strong> (<code className="font-mono">BING_WEBMASTER_API_KEY</code>) or <strong>Google Keyword Planner</strong> to populate it.
                  </div>
                )}
                <div className="overflow-x-auto border border-[#DAD2C3] bg-white">
                  <table className="w-full min-w-[720px]">
                    <thead><tr><TH>Phrase</TH><TH right>Volume / mo</TH><TH right>Google position</TH><TH right>Impr. (28d)</TH><TH right>Clicks</TH><TH>Trend</TH></tr></thead>
                    <tbody>
                      {data.watchlist.map((w) => {
                        const hist = w.history.filter((h) => h.position !== null).map((h) => h.position as number);
                        const v = w.volume;
                        return (
                          <tr key={w.phrase} className="border-b border-[#DAD2C3] last:border-b-0">
                            <td className="px-3 py-2.5 text-[13px] text-black font-semibold">{w.display}</td>
                            <td className="px-3 py-2.5 text-right">
                              {v && v.google != null ? (
                                <span className="text-[12px] tabular-nums text-black">{num(v.google)}{v.bing != null && <span className="text-[10px] text-neutral-400"> · {num(v.bing)} Bing</span>}</span>
                              ) : v && v.bing != null ? (
                                <span className="text-[12px] tabular-nums text-black">{num(v.bing)}<span className="text-[10px] text-neutral-400"> Bing</span></span>
                              ) : <span className="text-[12px] text-neutral-400">—</span>}
                            </td>
                            <td className="px-3 py-2.5 text-right"><PosBadge pos={w.position} found={w.found} /></td>
                            <td className="px-3 py-2.5 text-[12px] text-right tabular-nums text-neutral-700">{w.found ? num(w.impressions) : '—'}</td>
                            <td className="px-3 py-2.5 text-[12px] text-right tabular-nums text-neutral-700">{w.found ? num(w.clicks) : '—'}</td>
                            <td className="px-3 py-2.5">
                              {hist.length > 1
                                ? <span className="text-[11px] text-neutral-500">{hist.length} snapshots</span>
                                : <span className="text-[11px] text-neutral-400 italic">building…</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Honest limitations */}
            <div className="mt-6 bg-[#FAFAFA] border border-[#DAD2C3] p-4 text-[11px] text-neutral-500 leading-[1.6]">
              <strong className="text-neutral-700">What this can and can't see:</strong> Google Search Console only shows phrases you <em>already</em> appear for — a brand-new target phrase stays blank until Google starts showing your pages, so “not ranking yet” means no impressions, not necessarily nowhere. Ranking <em>inside</em> ChatGPT/Perplexity answers has no public API — the AI-assistant referral count above is the proxy for GEO working. Bing and other engines aren’t connected yet.
            </div>
          </>
        )}
      </div>
    </AdminShell>
  );
};

export default AdminInsightsPage;
