/**
 * /admin — owner-only observability dashboard.
 *
 * Redesigned 2026-07-10: left-sidebar shell (AdminShell) + collapsible sections
 * (CollapsibleSection). The "at-a-glance" strip is reordered around the owner's
 * daily questions (new signups · waitlist · pending comments · unread feedback),
 * and each analytics section folds independently (state persisted per section).
 *
 * Auth: admin_session HttpOnly cookie. Probes /api/admin/me on mount; redirects
 * to /admin/login if not authed. Polls /api/admin/usage every 30s; fetches the
 * lightweight /api/admin/counts once for the glance strip + sidebar badges.
 */
import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAdminMe } from '../lib/adminAuth';
import AdminShell from './admin/AdminShell';
import CollapsibleSection from './admin/CollapsibleSection';

const POLL_MS = 30_000;

// ── Types ──────────────────────────────────────────────────────────────────

interface ProviderCounter {
  daily: { date: string; count: number };
  weekly: { date: string; count: number };
  monthly: { date: string; count: number };
  history?: Array<{ date: string; count: number }>;
}

interface ActivityEntry { ts: string; userEmail: string; action: string; }
interface SerperLogEntry { ts: string; userEmail: string; query: string; count: number; source: string; }
interface FunnelRow { name: string; status: 'live' | 'offline'; started: number; completed: number; pct: number; }
interface NewsletterRow { email: string; signupDate: string; source: string; }
interface CostProviderRow {
  provider: string;
  windowCount: number;
  windowLimit: number;
  windowLabel: string;
  pct: number;
  status: 'healthy' | 'watch' | 'critical' | 'offline';
  mtdCost: number;
}

interface UsageResponse {
  counters: Record<string, ProviderCounter>;
  activity: ActivityEntry[];
  serperLog: SerperLogEntry[];
  users: { total: number; signups7d: number; logins24h: number; paid: number; free: number };
  shoppingStatus:
    | { disabled: false; dailyBudget: number; todayCount: number }
    | { disabled: true; code: 'disabled'; dailyBudget: number; todayCount: number }
    | { disabled: true; code: 'daily_budget_exceeded'; dailyBudget: number; todayCount: number; resetAt: string };
  /** Prepaid Serper credits remaining (depletes on use, not monthly). null when unavailable. */
  serperBalance: { balance: number; rateLimit: number } | null;
  funnels: FunnelRow[];
  activation: {
    anonToSignupRatePct: number | null;
    medianTimeToFirstToolSec: number | null;
    topSignupTrigger: string | null;
    topSignupSource: { source: string; count: number; pctOfSignups: number } | null;
    allSources: Array<{ source: string; count: number }>;
    totalSignups: number;
    ttftSampleSize: number;
  };
  newsletter: { count: number; recent: NewsletterRow[]; error?: string };
  retention: {
    d1ReturnPct: number | null;
    d7ReturnPct: number | null;
    d30ReturnPct: number | null;
    dau: number;
    wau: number;
    mau: number;
  };
  cost: {
    mtdSpendEst: number;
    costPerActiveUserEst: number | null;
    byProvider: CostProviderRow[];
  };
}

interface Counts { users: number; comments: number; feedback: number; waitlist: number; orders: number; }

// ── Acquisition (I-027) — mirrors server/analytics/acquisition.ts ────────────
interface Ga4Acq {
  ok: boolean;
  error?: string;
  totalSessions: number;
  bounceRatePct: number | null;
  channels: Array<{ channel: string; sessions: number; bounceRatePct: number }>;
  organicSearch: number;
  direct: number;
  social: number;
  aiAssistant: number;
  topLandingPage: { path: string; sessions: number } | null;
  topCountry: { country: string; sessions: number } | null;
}
interface GscAcq {
  ok: boolean;
  error?: string;
  clicks: number;
  impressions: number;
  ctrPct: number;
  position: number;
  topQueries: Array<{ query: string; clicks: number; impressions: number }>;
  topPage: { page: string; clicks: number } | null;
  topCountry: { country: string; clicks: number } | null;
}
export interface AcquisitionData {
  configured: boolean;
  updatedAt: string;
  rangeDays: number;
  ga4: Ga4Acq | null;
  gsc: GscAcq | null;
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

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '—';
  return `${d.toISOString().slice(0, 10)} · ${d.toISOString().slice(11, 16)}`;
}

function fmtUsd(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  if (n < 0.01) return '$0.00';
  return `$${n.toFixed(2)}`;
}

function readableSource(slug: string): string {
  if (!slug) return '—';
  return slug.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function humanizeSignupSource(slug: string): string {
  if (!slug) return 'Unknown / pre-attribution';
  if (slug === 'unknown') return 'Unknown / pre-attribution';
  const words = slug.split(/[_\s-]+/).filter(Boolean).map((w) => w.toLowerCase());
  if (words.length === 0) return slug;
  return words[0].charAt(0).toUpperCase() + words[0].slice(1) + (words.length > 1 ? ' ' + words.slice(1).join(' ') : '');
}

// ── Sparkline (inline divs, no library) ────────────────────────────────────

const Sparkline: React.FC<{ history?: Array<{ date: string; count: number }>; days?: number }> = ({ history, days = 7 }) => {
  const slice = (history || []).slice(-days);
  if (slice.length === 0) {
    return <div className="h-8 flex items-end gap-[3px]"><div className="flex-1 bg-neutral-200 min-h-[4px]" /></div>;
  }
  const max = Math.max(...slice.map((h) => h.count), 1);
  const padding = Math.max(0, days - slice.length);
  return (
    <div className="h-8 flex items-end gap-[3px] mt-3.5" aria-label="7-day trend">
      {Array.from({ length: padding }).map((_, i) => (
        <div key={`p-${i}`} className="flex-1 bg-neutral-200" style={{ minHeight: '4px' }} />
      ))}
      {slice.map((h, i) => (
        <div
          key={`${h.date}-${i}`}
          className="flex-1 bg-[#0047AB] opacity-70"
          style={{ height: `${Math.max(15, (h.count / max) * 100)}%`, minHeight: '4px' }}
          title={`${h.date}: ${h.count}`}
        />
      ))}
    </div>
  );
};

// ── Glance tile ─────────────────────────────────────────────────────────────

const GlanceTile: React.FC<{ label: string; value: React.ReactNode; delta?: React.ReactNode; deltaTone?: 'up' | 'down' | 'flat' | 'alert' }> = ({ label, value, delta, deltaTone = 'up' }) => (
  <div className="bg-white border border-[#DAD2C3] px-4 py-4 flex flex-col gap-1.5">
    <span className="text-[9px] tracking-[0.28em] uppercase text-neutral-500 font-bold">{label}</span>
    <span className="font-serif text-[32px] leading-none text-black">{value}</span>
    {delta && (
      <span className={`text-[11px] font-semibold ${
        deltaTone === 'up' ? 'text-green-700' : deltaTone === 'down' ? 'text-red-700' : deltaTone === 'alert' ? 'text-[#0047AB]' : 'text-neutral-500'
      }`}>{delta}</span>
    )}
  </div>
);

// ── Section bodies (chrome provided by CollapsibleSection) ───────────────────

const FunnelsBody: React.FC<{ rows: FunnelRow[] }> = ({ rows }) => (
  <div className="bg-white border border-[#DAD2C3]">
    {rows.map((row, idx) => {
      const isOffline = row.status === 'offline';
      const fillPct = Math.max(0, Math.min(100, row.pct));
      return (
        <div
          key={row.name}
          className={`grid grid-cols-[200px_1fr_140px_120px] items-center px-6 py-[18px] gap-6 ${
            idx < rows.length - 1 ? 'border-b border-[#DAD2C3]' : ''
          }`}
        >
          <div className="font-serif text-[20px] text-black">
            {row.name}
            <span
              className={`inline-block ml-2 align-middle text-[9px] tracking-[0.22em] uppercase font-bold py-[3px] px-2 font-body ${
                isOffline ? 'bg-black/[0.06] text-neutral-500' : 'bg-green-100 text-green-700'
              }`}
            >
              {row.status}
            </span>
          </div>
          <div className="relative h-9 bg-[#FAFAFA] border border-[#DAD2C3]">
            <div
              className={`absolute left-0 top-0 bottom-0 ${isOffline ? 'bg-neutral-400' : 'bg-[#0047AB] opacity-85'}`}
              style={{ width: `${fillPct}%` }}
            />
            {!isOffline && row.started > 0 && (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white text-[11px] font-bold z-10">{row.pct}%</span>
            )}
            {isOffline && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-black text-[11px] font-bold">—</span>
            )}
          </div>
          <div className="text-xs text-neutral-700 text-right">
            <strong className="text-black font-bold">{row.started}</strong> started → <strong className="text-black font-bold">{row.completed}</strong> completed
          </div>
          <div className={`font-serif text-[28px] text-right ${isOffline ? 'text-neutral-500 text-[16px]' : 'text-black'}`}>
            {isOffline ? 'offline' : <>{row.pct}<span style={{ fontSize: 18 }}>%</span></>}
          </div>
        </div>
      );
    })}
  </div>
);

const ActivationBody: React.FC<{ data: UsageResponse['activation']; counters: Record<string, ProviderCounter> }> = ({ data, counters }) => {
  const geminiHistory = counters.gemini?.history;
  return (
    <div className="grid grid-cols-3 gap-3.5">
      <div className="bg-white border border-[#DAD2C3] p-6">
        <p className="text-[10px] tracking-[0.28em] uppercase text-neutral-500 font-bold mb-3">Anon → signup rate</p>
        <p className="font-serif text-[40px] leading-none text-black">
          {data.anonToSignupRatePct === null ? '—' : <>{data.anonToSignupRatePct}<span className="text-sm text-neutral-500 ml-1 font-body">%</span></>}
        </p>
        <p className="text-[11px] font-semibold text-neutral-500 mt-2">7-day rolling window</p>
        <Sparkline history={geminiHistory} />
      </div>
      <div className="bg-white border border-[#DAD2C3] p-6">
        <p className="text-[10px] tracking-[0.28em] uppercase text-neutral-500 font-bold mb-3">Time to first tool</p>
        <p className="font-serif text-[40px] leading-none text-black">
          {data.medianTimeToFirstToolSec === null ? '—' : (
            <>
              {Math.floor(data.medianTimeToFirstToolSec / 60)}:{String(data.medianTimeToFirstToolSec % 60).padStart(2, '0')}
              <span className="text-sm text-neutral-500 ml-1 font-body">median min</span>
            </>
          )}
        </p>
        <p className="text-[11px] font-semibold text-neutral-500 mt-2">{data.ttftSampleSize} signed-up user{data.ttftSampleSize === 1 ? '' : 's'} sampled</p>
      </div>
      <div className="bg-white border border-[#DAD2C3] p-6">
        <p className="text-[10px] tracking-[0.28em] uppercase text-neutral-500 font-bold mb-3">Top sign-up trigger</p>
        {(() => {
          const total = data.totalSignups;
          const top = data.topSignupSource;
          if (total === 0 || !top) {
            return (
              <>
                <p className="font-serif text-[22px] leading-tight text-neutral-500 italic">No signups yet</p>
                <p className="text-[11px] font-semibold text-neutral-500 mt-2">First sign-in will appear here</p>
              </>
            );
          }
          if (total === 1) {
            return (
              <>
                <p className="font-serif text-[22px] leading-tight text-black">{humanizeSignupSource(top.source)}</p>
                <p className="text-[11px] font-semibold text-neutral-500 mt-2">1 signup</p>
              </>
            );
          }
          return (
            <>
              <p className="font-serif text-[22px] leading-tight text-black">{humanizeSignupSource(top.source)}</p>
              <p className="text-[11px] font-semibold text-neutral-500 mt-2">
                {top.pctOfSignups}% of {total} signups
                {data.allSources.length > 1 && ` · ${data.allSources.length} sources tracked`}
              </p>
            </>
          );
        })()}
      </div>
    </div>
  );
};

const NewsletterBody: React.FC<{ data: UsageResponse['newsletter'] }> = ({ data }) => (
  <>
    {data.error && (
      <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm">
        Sheet read failed: {data.error}
      </div>
    )}
    <div className="grid grid-cols-[280px_1fr] gap-3.5">
      <div className="bg-white border border-[#DAD2C3] p-6">
        <p className="text-[10px] tracking-[0.28em] uppercase text-neutral-500 font-bold mb-3">Total subscribers</p>
        <p className="font-serif text-[40px] leading-none text-black tabular-nums">{data.count}</p>
        <p className="text-[11px] font-semibold text-neutral-500 mt-2">Lifetime</p>
      </div>
      <div className="bg-white border border-[#DAD2C3]">
        {data.recent.length === 0 ? (
          <div className="px-5 py-8 text-sm text-neutral-500 italic text-center">
            No newsletter signups yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left px-[18px] py-3 text-[9px] tracking-[0.22em] uppercase text-neutral-500 font-bold border-b border-[#DAD2C3]">Email</th>
                <th className="text-left px-[18px] py-3 text-[9px] tracking-[0.22em] uppercase text-neutral-500 font-bold border-b border-[#DAD2C3]">Signed up</th>
                <th className="text-left px-[18px] py-3 text-[9px] tracking-[0.22em] uppercase text-neutral-500 font-bold border-b border-[#DAD2C3]">Source</th>
              </tr>
            </thead>
            <tbody>
              {data.recent.map((r, i) => (
                <tr key={`${r.email}-${i}`} className="border-b border-[#DAD2C3] last:border-b-0">
                  <td className="px-[18px] py-3 text-xs text-black font-semibold">{r.email}</td>
                  <td className="px-[18px] py-3 text-xs text-neutral-700">{r.signupDate ? fmtDateTime(r.signupDate) : '—'}</td>
                  <td className="px-[18px] py-3 text-xs text-neutral-500">{readableSource(r.source)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
    <p className="mt-4 text-[11px] text-neutral-500">
      Showing {data.recent.length} of {data.count} · full list on the <a href="/admin/waitlist" className="text-[#0047AB] hover:underline">Waitlist page</a>.
    </p>
  </>
);

const RetentionBody: React.FC<{ data: UsageResponse['retention'] }> = ({ data }) => (
  <>
    <div className="grid grid-cols-3 gap-3.5 mb-3.5">
      {[
        { label: 'Day-1 return rate', value: data.d1ReturnPct },
        { label: 'Day-7 return rate', value: data.d7ReturnPct },
        { label: 'Day-30 return rate', value: data.d30ReturnPct },
      ].map((c) => (
        <div key={c.label} className="bg-white border border-[#DAD2C3] p-6">
          <p className="text-[10px] tracking-[0.28em] uppercase text-neutral-500 font-bold mb-3">{c.label}</p>
          <p className="font-serif text-[40px] leading-none text-black">
            {c.value === null ? '—' : <>{c.value}<span className="text-sm text-neutral-500 ml-1 font-body">%</span></>}
          </p>
          <p className="text-[11px] font-semibold text-neutral-500 mt-2">
            {c.value === null ? 'No cohort old enough yet' : 'Of users old enough to count'}
          </p>
        </div>
      ))}
    </div>
    <div className="grid grid-cols-3 gap-3.5">
      {[
        { label: 'Daily active', value: data.dau, sub: 'last 24 hours' },
        { label: 'Weekly active', value: data.wau, sub: 'last 7 days' },
        { label: 'Monthly active', value: data.mau, sub: 'last 30 days' },
      ].map((c) => (
        <div key={c.label} className="bg-white border border-[#DAD2C3] p-[18px]">
          <p className="text-[9px] tracking-[0.28em] uppercase text-neutral-500 font-bold mb-2">{c.label}</p>
          <p className="font-serif text-[28px] text-black tabular-nums">
            {c.value}<span className="text-xs text-neutral-500 ml-1.5 font-body">{c.sub}</span>
          </p>
        </div>
      ))}
    </div>
  </>
);

const COST_PROVIDER_LABELS: Record<string, string> = {
  gemini:     'AI concept gen, room audit, item ID',
  cloudinary: 'Image CDN + transforms',
  serper:     'Shopping API',
  sheets:     'Newsletter / testimonials / user tracking',
  ipapi:      'Geo lookup for Serper region',
  emailjs:    'Contact form delivery',
};

const CostBody: React.FC<{ data: UsageResponse['cost'] }> = ({ data }) => (
  <>
    <div className="bg-white border border-[#DAD2C3]">
      {data.byProvider.map((p, idx) => {
        const fill = p.windowLimit > 0 ? Math.min(100, p.pct) : 0;
        const barClass =
          p.status === 'critical' ? 'bg-red-600' :
          p.status === 'watch'    ? 'bg-amber-600' :
                                     'bg-green-600';
        const pillClass =
          p.status === 'critical' ? 'bg-red-50 text-red-700' :
          p.status === 'watch'    ? 'bg-amber-50 text-amber-800' :
          p.status === 'offline'  ? 'bg-black/[0.06] text-neutral-500' :
                                     'bg-green-50 text-green-700';
        return (
          <div
            key={p.provider}
            className={`grid grid-cols-[160px_1fr_140px_80px] items-center px-5 py-3.5 gap-5 ${
              idx < data.byProvider.length - 1 ? 'border-b border-[#DAD2C3]' : ''
            }`}
          >
            <div>
              <p className="text-xs font-bold text-black tracking-[0.04em] uppercase">{p.provider}</p>
              <p className="text-[10px] text-neutral-500 mt-0.5">{COST_PROVIDER_LABELS[p.provider] || ''}</p>
            </div>
            <div className="relative h-[22px] bg-[#FAFAFA] border border-[#DAD2C3]">
              <div className={`absolute left-0 top-0 bottom-0 ${barClass} opacity-85`} style={{ width: `${fill}%` }} />
            </div>
            <div className="text-xs text-neutral-700 text-right">
              <strong className="text-black">{p.windowCount}</strong> / {p.windowLabel}
            </div>
            <span className={`text-[9px] tracking-[0.22em] uppercase font-bold py-1 px-2 text-center ${pillClass}`}>{p.status}</span>
          </div>
        );
      })}
    </div>
    <div className="mt-4 flex justify-between items-center text-xs text-neutral-500">
      <span>Cost per active user (last 30d, est.): <strong className="text-black">{fmtUsd(data.costPerActiveUserEst)}</strong></span>
      <span>Total API spend MTD (est.): <strong className="text-black">{fmtUsd(data.mtdSpendEst)}</strong></span>
    </div>
    <p className="mt-2 text-[10px] text-neutral-500 italic">
      Rough estimates — edit CALL_COSTS in server.ts when provider pricing shifts materially.
    </p>
  </>
);

const AcqTile: React.FC<{ label: string; value: React.ReactNode; sub?: string; title?: string }> = ({ label, value, sub, title }) => (
  <div className="bg-white border border-[#DAD2C3] p-3">
    <p className="text-[9px] tracking-[0.22em] uppercase text-neutral-500 font-bold mb-1">{label}</p>
    <p className="font-serif text-[22px] text-black leading-tight truncate" title={title}>{value}</p>
    {sub && <p className="text-[10px] text-neutral-500 mt-0.5">{sub}</p>}
  </div>
);

const num = (n: number) => n.toLocaleString('en-US');

export const AcquisitionBody: React.FC<{ data: AcquisitionData | null }> = ({ data }) => {
  if (!data) return <p className="text-sm text-neutral-500 italic py-3">Loading…</p>;

  if (!data.configured) {
    return (
      <div className="bg-[#FAFAFA] border border-dashed border-[#DAD2C3] p-7">
        <p className="text-[9px] tracking-[0.32em] uppercase text-[#0047AB] font-bold mb-2">Not configured</p>
        <p className="text-[13px] text-neutral-500 leading-[1.55]">
          Set <code className="font-mono text-[12px]">GA4_PROPERTY_ID</code> and grant the Sheets service account read
          access in Search Console + GA4. See the I-027 plan in memory.
        </p>
      </div>
    );
  }

  const ga4 = data.ga4;
  const gsc = data.gsc;
  const dash = <span className="text-neutral-300">—</span>;
  const country = ga4?.topCountry?.country || (gsc?.topCountry ? gsc.topCountry.country : null);

  return (
    <div>
      <div className="flex items-baseline justify-between flex-wrap gap-2 mb-3">
        <p className="text-[11px] text-neutral-500">
          Last {data.rangeDays} days · GA4 + Search Console · updated {relativeTime(data.updatedAt)}
        </p>
        {gsc?.ok && (
          <p className="text-[11px] text-neutral-500">
            Search: <strong className="text-black">{num(gsc.clicks)}</strong> clicks · <strong className="text-black">{num(gsc.impressions)}</strong> impr · {gsc.ctrPct}% CTR · pos {gsc.position}
          </p>
        )}
      </div>

      {ga4 && !ga4.ok && (
        <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2 mb-3">GA4: {ga4.error || 'unavailable'}</p>
      )}

      <div className="grid grid-cols-3 gap-2">
        <AcqTile label="Organic search" value={ga4?.ok ? num(ga4.organicSearch) : dash} sub="sessions" />
        <AcqTile label="Direct" value={ga4?.ok ? num(ga4.direct) : dash} sub="sessions" />
        <AcqTile label="Social" value={ga4?.ok ? num(ga4.social) : dash} sub="sessions" />
        <AcqTile label="Bounce rate" value={ga4?.ok && ga4.bounceRatePct !== null ? `${ga4.bounceRatePct}%` : dash} sub={ga4?.ok ? `${num(ga4.totalSessions)} total sessions` : undefined} />
        <AcqTile label="Top entry page" value={ga4?.topLandingPage ? ga4.topLandingPage.path : dash} title={ga4?.topLandingPage?.path} sub={ga4?.topLandingPage ? `${num(ga4.topLandingPage.sessions)} sessions` : undefined} />
        <AcqTile label="Top country" value={country || dash} sub={ga4?.topCountry ? `${num(ga4.topCountry.sessions)} sessions` : undefined} />
      </div>

      {/* AI Assistant — GA4's LLM-referral channel; the GEO leading indicator. */}
      <div className="mt-2 bg-white border border-[#DAD2C3] border-l-2 border-l-[#0047AB] p-3 flex items-center justify-between gap-4">
        <div>
          <p className="text-[9px] tracking-[0.22em] uppercase text-neutral-500 font-bold mb-0.5">AI Assistant · LLM referrals</p>
          <p className="text-[10px] text-neutral-500">ChatGPT · Perplexity · Copilot — your GEO leading indicator</p>
        </div>
        <p className="font-serif text-[22px] text-black whitespace-nowrap">
          {ga4?.ok ? num(ga4.aiAssistant) : dash} <span className="text-[11px] text-neutral-500">sessions</span>
        </p>
      </div>

      <div className="mt-3 bg-white border border-[#DAD2C3] p-4">
        <p className="text-[9px] tracking-[0.22em] uppercase text-neutral-500 font-bold mb-2">Top search queries · Google (28d)</p>
        {!gsc?.ok ? (
          <p className="text-xs text-neutral-500 italic">Search Console: {gsc?.error || 'unavailable'}</p>
        ) : gsc.topQueries.length === 0 ? (
          <p className="text-xs text-neutral-500 italic">No query impressions in range.</p>
        ) : (
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="text-left px-1.5 py-1.5 text-[9px] tracking-[0.22em] uppercase text-neutral-500 font-bold border-b border-[#DAD2C3]">Query</th>
                <th className="text-right px-1.5 py-1.5 text-[9px] tracking-[0.22em] uppercase text-neutral-500 font-bold border-b border-[#DAD2C3]">Clicks</th>
                <th className="text-right px-1.5 py-1.5 text-[9px] tracking-[0.22em] uppercase text-neutral-500 font-bold border-b border-[#DAD2C3]">Impr</th>
              </tr>
            </thead>
            <tbody>
              {gsc.topQueries.map((q, i) => (
                <tr key={`${q.query}-${i}`} className="border-b border-[#DAD2C3] last:border-b-0">
                  <td className="px-1.5 py-1.5 text-neutral-700 truncate max-w-[420px]" title={q.query}>{q.query}</td>
                  <td className="px-1.5 py-1.5 text-right text-neutral-700 tabular-nums">{num(q.clicks)}</td>
                  <td className="px-1.5 py-1.5 text-right text-neutral-700 tabular-nums">{num(q.impressions)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const IncidentBody: React.FC<{ rows: SerperLogEntry[]; status: UsageResponse['shoppingStatus']; serperBalance: UsageResponse['serperBalance'] }> = ({ rows, status, serperBalance }) => {
  const pillClass = status.disabled ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-800';
  const pillText = status.disabled
    ? status.code === 'disabled'
      ? 'offline · kill switch on'
      : 'offline · daily budget exceeded'
    : `online · ${status.todayCount} / ${status.dailyBudget} today`;
  return (
    <div className="bg-white border border-[#DAD2C3] p-6">
      {serperBalance && (
        <div className="mb-3.5 flex items-center justify-between bg-[#F4EFE7] border border-[#DAD2C3] px-4 py-2.5">
          <span className="text-[10px] tracking-[0.22em] uppercase text-neutral-500 font-bold">Serper credits remaining</span>
          <span className="font-serif text-[22px] text-black tabular-nums">{serperBalance.balance.toLocaleString('en-US')}</span>
        </div>
      )}
      <div className="flex justify-between items-center mb-3.5">
        <span className="text-xs text-neutral-500">
          Today: <strong className="text-black">{status.todayCount}</strong> / <strong className="text-black">{status.dailyBudget}</strong> credits used
          <span className="text-neutral-400"> · prepaid, depletes on use (no monthly reset)</span>
        </span>
        <span className={`text-[9px] tracking-[0.22em] uppercase font-bold py-1 px-2.5 ${pillClass}`}>{pillText}</span>
      </div>
      {rows.length === 0 ? (
        <div className="text-center py-6 text-neutral-500 text-xs">
          No Serper calls recorded. {status.disabled && status.code === 'disabled' && 'Shopping List currently disabled — flip SHOPPING_DISABLED=false to re-enable.'}
        </div>
      ) : (
        <div className="max-h-[400px] overflow-y-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="text-left px-1.5 py-2 text-[9px] tracking-[0.22em] uppercase text-neutral-500 font-bold border-b border-[#DAD2C3]">Time</th>
                <th className="text-left px-1.5 py-2 text-[9px] tracking-[0.22em] uppercase text-neutral-500 font-bold border-b border-[#DAD2C3]">User</th>
                <th className="text-left px-1.5 py-2 text-[9px] tracking-[0.22em] uppercase text-neutral-500 font-bold border-b border-[#DAD2C3]">Query</th>
                <th className="text-right px-1.5 py-2 text-[9px] tracking-[0.22em] uppercase text-neutral-500 font-bold border-b border-[#DAD2C3]">Cr.</th>
                <th className="text-left px-1.5 py-2 text-[9px] tracking-[0.22em] uppercase text-neutral-500 font-bold border-b border-[#DAD2C3]">Source</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.ts}-${i}`} className="border-b border-[#DAD2C3] last:border-b-0">
                  <td className="px-1.5 py-2 text-neutral-700">{relativeTime(r.ts)}</td>
                  <td className="px-1.5 py-2 text-neutral-700 font-mono text-[10px]">{r.userEmail}</td>
                  <td className="px-1.5 py-2 text-neutral-700 truncate max-w-[400px] font-mono text-[10px]" title={r.query}>{r.query}</td>
                  <td className="px-1.5 py-2 text-right text-neutral-700 tabular-nums">{r.count}</td>
                  <td className="px-1.5 py-2 text-neutral-500 font-mono text-[10px]">{r.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ── Main page ──────────────────────────────────────────────────────────────

const AdminPage: React.FC = () => {
  const me = useAdminMe();
  const navigate = useNavigate();
  const [data, setData] = useState<UsageResponse | null>(null);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  useEffect(() => {
    if (!me?.authed) return;
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch('/api/admin/usage', { credentials: 'include' });
        if (cancelled) return;
        if (res.status === 401) { navigate('/admin/login', { replace: true }); return; }
        if (!res.ok) { setError(`Fetch failed (${res.status})`); return; }
        setData(await res.json());
        setError(null);
        setLastFetched(new Date());
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Fetch failed');
      }
    };

    void load();
    // The glance strip's waitlist / comments / feedback numbers come from counts.
    fetch('/api/admin/counts', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d) setCounts(d); })
      .catch(() => {});

    const id = window.setInterval(load, POLL_MS);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [me?.authed, navigate]);

  if (me === null) return null;
  if (!me.authed) return <Navigate to="/admin/login" replace />;

  const liveFunnels = (data?.funnels || []).filter((f) => f.status === 'live' && f.started > 0);
  const avgFunnelPct = liveFunnels.length === 0
    ? null
    : Math.round(liveFunnels.reduce((acc, f) => acc + f.pct, 0) / liveFunnels.length);

  return (
    <AdminShell
      active="overview"
      title="Dashboard"
      rightSlot={
        <>
          <span className="inline-flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
            Live · polling {Math.round(POLL_MS / 1000)}s
          </span>
          {lastFetched && <span>Updated {relativeTime(lastFetched.toISOString())}</span>}
        </>
      }
    >
      {error && (
        <div className="px-8 mt-6">
          <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm">
            <strong>Fetch failed:</strong> {error}
            {data && <span className="ml-2 text-red-600 italic">(showing stale data)</span>}
          </div>
        </div>
      )}

      {/* AT-A-GLANCE — reordered around the owner's daily questions */}
      {data && (
        <section className="bg-[#F4EFE7] border-b border-[#DAD2C3] py-7 px-8">
          <div className="grid grid-cols-6 gap-3.5">
            <GlanceTile label="New signups · 7d" value={data.users.signups7d} delta={data.users.signups7d > 0 ? `+${data.users.signups7d} this week` : 'flat'} deltaTone={data.users.signups7d > 0 ? 'up' : 'flat'} />
            <GlanceTile label="Waitlist" value={counts ? counts.waitlist : '—'} delta="wants paid tools" deltaTone="alert" />
            <GlanceTile label="Comments" value={counts ? counts.comments : '—'} delta={counts && counts.comments > 0 ? 'pending review' : 'none pending'} deltaTone={counts && counts.comments > 0 ? 'alert' : 'flat'} />
            <GlanceTile label="Feedback" value={counts ? counts.feedback : '—'} delta={counts && counts.feedback > 0 ? 'unread' : 'none new'} deltaTone={counts && counts.feedback > 0 ? 'alert' : 'flat'} />
            <GlanceTile label="Total users" value={data.users.total} delta={`MAU ${data.retention.mau}`} deltaTone="flat" />
            <GlanceTile label="API spend · MTD" value={fmtUsd(data.cost.mtdSpendEst)} delta={data.cost.costPerActiveUserEst === null ? '—' : `${fmtUsd(data.cost.costPerActiveUserEst)}/user`} deltaTone="flat" />
          </div>
          {lastFetched && (
            <p className="mt-4 text-[10px] tracking-[0.22em] uppercase text-neutral-500 font-semibold">
              Updated {relativeTime(lastFetched.toISOString())}
            </p>
          )}
        </section>
      )}

      {!data && !error && (
        <p className="px-8 py-8 text-sm text-neutral-500 italic">Loading…</p>
      )}

      {data && (
        <>
          <CollapsibleSection title="Activation" sub="How visitors become users" storageKey="activation" defaultOpen>
            <ActivationBody data={data.activation} counters={data.counters} />
          </CollapsibleSection>

          <CollapsibleSection title="Retention" sub="Do users come back?" storageKey="retention" defaultOpen>
            <RetentionBody data={data.retention} />
          </CollapsibleSection>

          <CollapsibleSection title="AI Studio funnels" sub="Last 7 days · started → completed" storageKey="funnels" defaultOpen>
            <FunnelsBody rows={data.funnels} />
          </CollapsibleSection>

          <CollapsibleSection title="Newsletter & waitlist" sub={<>Google Sheet · <a href="/admin/waitlist" className="text-[#0047AB] hover:underline">see all →</a></>} storageKey="newsletter" defaultOpen>
            <NewsletterBody data={data.newsletter} />
          </CollapsibleSection>

          <CollapsibleSection title="Cost & API health" sub="Per-provider usage vs free-tier ceiling · est." storageKey="cost" defaultOpen={false}>
            <CostBody data={data.cost} />
          </CollapsibleSection>

          <CollapsibleSection title="Shopping incident view" sub="Last 100 Serper calls · forensic trail" storageKey="incident" defaultOpen={false}>
            <IncidentBody rows={data.serperLog} status={data.shoppingStatus} serperBalance={data.serperBalance} />
          </CollapsibleSection>
        </>
      )}
    </AdminShell>
  );
};

export default AdminPage;
