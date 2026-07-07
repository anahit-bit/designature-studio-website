/**
 * /admin — owner-only observability dashboard (I-017 · rewritten I-021c).
 *
 * Surface 2 of the Phase C mockup. 9 sections in this order:
 *   1. At-a-glance      (6 tiles, deltas)
 *   2. AI Studio funnels (4 rows, cobalt bars)
 *   3. Activation       (3 stat cards w/ sparklines)
 *   4. Newsletter signups (stat card + recent-5 table)
 *   5. Retention        (3 cohort cards + DAU/WAU/MAU mini-row)
 *   6. Cost & API health (6 provider rows w/ status bars)
 *   7. Acquisition placeholder (awaiting I-007 / GA4)
 *   8. Platforms        (11 cards)
 *   9. Shopping incident view (status pill + last 100 Serper calls)
 *
 * Auth: admin_session HttpOnly cookie. Probes /api/admin/me on mount;
 * redirects to /admin/login if not authed. Polls /api/admin/usage every 30s.
 */
import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { useAdminMe, adminLogout } from '../lib/adminAuth';
import AdminTopBar from './admin/AdminTopBar';

const POLL_MS = 30_000;

// ── Types ──────────────────────────────────────────────────────────────────

interface ProviderCounter {
  daily: { date: string; count: number };
  weekly: { date: string; count: number };
  monthly: { date: string; count: number };
  history?: Array<{ date: string; count: number }>;
}

interface Platform {
  name: string;
  owner_email: string;
  monthly_cost: string;
  free_tier_quota: string | null;
  renewal_date: string | null;
  powers: string;
  criticality: number;
  annual_cost?: string | null;
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
  platforms: Platform[];
  serperLog: SerperLogEntry[];
  users: { total: number; signups7d: number; logins24h: number; paid: number; free: number };
  shoppingStatus:
    | { disabled: false; dailyBudget: number; todayCount: number }
    | { disabled: true; code: 'disabled'; dailyBudget: number; todayCount: number }
    | { disabled: true; code: 'daily_budget_exceeded'; dailyBudget: number; todayCount: number; resetAt: string };
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

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const t = Date.parse(dateStr);
  if (!Number.isFinite(t)) return null;
  return Math.ceil((t - Date.now()) / (24 * 60 * 60 * 1000));
}

function readableSource(slug: string): string {
  if (!slug) return '—';
  return slug.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Humanize signup-source slugs for display (C-followup).
 * snake_case → Title Case; first word capitalised, rest lowercased
 * (e.g. "home_ai_section" → "Home ai section"). The "unknown" sentinel
 * (used when a signup arrived without a stamped slug) gets a clearer label.
 */
function humanizeSignupSource(slug: string): string {
  if (!slug) return 'Unknown / pre-attribution';
  if (slug === 'unknown') return 'Unknown / pre-attribution';
  const words = slug.split(/[_\s-]+/).filter(Boolean).map((w) => w.toLowerCase());
  if (words.length === 0) return slug;
  return words[0].charAt(0).toUpperCase() + words[0].slice(1) + (words.length > 1 ? ' ' + words.slice(1).join(' ') : '');
}

const ANON = 'anonymous';

// ── Sparkline (inline divs, no library) ────────────────────────────────────

const Sparkline: React.FC<{ history?: Array<{ date: string; count: number }>; days?: number }> = ({ history, days = 7 }) => {
  const slice = (history || []).slice(-days);
  if (slice.length === 0) {
    return <div className="h-8 flex items-end gap-[3px]"><div className="flex-1 bg-neutral-200 min-h-[4px]" /></div>;
  }
  const max = Math.max(...slice.map((h) => h.count), 1);
  // Pad with leading empty bars if we have fewer days than the window
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

// ── Sections ───────────────────────────────────────────────────────────────

const GlanceTile: React.FC<{ label: string; value: React.ReactNode; delta?: React.ReactNode; deltaTone?: 'up' | 'down' | 'flat' }> = ({ label, value, delta, deltaTone = 'up' }) => (
  <div className="bg-white border border-[#DAD2C3] px-4 py-4 flex flex-col gap-1.5">
    <span className="text-[9px] tracking-[0.28em] uppercase text-neutral-500 font-bold">{label}</span>
    <span className="font-serif text-[32px] leading-none text-black">{value}</span>
    {delta && (
      <span className={`text-[11px] font-semibold ${
        deltaTone === 'up' ? 'text-green-700' : deltaTone === 'down' ? 'text-red-700' : 'text-neutral-500'
      }`}>{delta}</span>
    )}
  </div>
);

const SectionHead: React.FC<{ title: string; sub: React.ReactNode }> = ({ title, sub }) => (
  <div className="mb-6 flex items-baseline justify-between gap-6">
    <h2 className="font-serif text-2xl leading-[1.1] text-black">{title}</h2>
    <span className="text-[11px] tracking-[0.22em] uppercase text-neutral-500 font-semibold">{sub}</span>
  </div>
);

const FunnelsSection: React.FC<{ rows: FunnelRow[] }> = ({ rows }) => (
  <section className="py-12 border-b border-[#DAD2C3]">
    <div className="max-w-[1440px] mx-auto px-12">
      <SectionHead title="AI Studio funnels" sub="Last 7 days · started → completed" />
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
    </div>
  </section>
);

const ActivationSection: React.FC<{ data: UsageResponse['activation']; counters: Record<string, ProviderCounter> }> = ({ data, counters }) => {
  // Use Gemini history as a proxy "activity sparkline" since we don't yet
  // bucket signups per day in the response. Cheap visual cue.
  const geminiHistory = counters.gemini?.history;
  return (
    <section className="py-12 border-b border-[#DAD2C3]">
      <div className="max-w-[1440px] mx-auto px-12">
        <SectionHead title="Activation" sub="How visitors become users" />
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
      </div>
    </section>
  );
};

const NewsletterSection: React.FC<{ data: UsageResponse['newsletter'] }> = ({ data }) => (
  <section className="py-12 border-b border-[#DAD2C3]">
    <div className="max-w-[1440px] mx-auto px-12">
      <SectionHead
        title="Newsletter signups"
        sub={
          <>
            Stored in Google Sheets ·{' '}
            <a
              href="https://docs.google.com/spreadsheets/d/1ADcawOqI2VElxwPSSuL-PGX3OjHehacod_ApDPRqFo4"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0047AB] hover:underline"
            >
              open full list →
            </a>
          </>
        }
      />
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
        Last {data.recent.length} of {data.count} · Full list stays in Google Sheets — open the link above to export, filter, or send a campaign.
      </p>
    </div>
  </section>
);

const RetentionSection: React.FC<{ data: UsageResponse['retention'] }> = ({ data }) => (
  <section className="py-12 border-b border-[#DAD2C3]">
    <div className="max-w-[1440px] mx-auto px-12">
      <SectionHead title="Retention" sub="Do users come back?" />
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
    </div>
  </section>
);

const COST_PROVIDER_LABELS: Record<string, string> = {
  gemini:     'AI concept gen, room audit, item ID',
  cloudinary: 'Image CDN + transforms',
  serper:     'Shopping API',
  sheets:     'Newsletter / testimonials / user tracking',
  ipapi:      'Geo lookup for Serper region',
  emailjs:    'Contact form delivery',
};

const CostSection: React.FC<{ data: UsageResponse['cost']; counters: Record<string, ProviderCounter> }> = ({ data, counters }) => (
  <section className="py-12 border-b border-[#DAD2C3]">
    <div className="max-w-[1440px] mx-auto px-12">
      <SectionHead title="Cost & API health" sub="Per-provider usage vs free-tier ceiling · est." />
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
    </div>
  </section>
);

const AcquisitionPlaceholder: React.FC = () => (
  <section className="py-12 border-b border-[#DAD2C3]">
    <div className="max-w-[1440px] mx-auto px-12">
      <SectionHead title="Acquisition" sub="Where do visitors come from?" />
      <div className="bg-[#FAFAFA] border border-dashed border-[#DAD2C3] p-7 flex items-center gap-6 flex-wrap">
        <div className="flex-1 min-w-[280px]">
          <p className="text-[9px] tracking-[0.32em] uppercase text-[#0047AB] font-bold mb-2">Awaiting I-007 · GA4 + Search Console</p>
          <h3 className="font-serif text-[22px] leading-[1.15] text-black mb-1.5">Traffic sources, bounce rate, geographic distribution</h3>
          <p className="text-[13px] text-neutral-500 leading-[1.55]">
            These require Google Analytics 4 and Search Console integration (ticket I-007 on the backlog). When that
            ships, this section comes alive — organic vs direct vs social traffic, top entry pages, where visitors
            are coming from, which keywords brought them.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 flex-1 min-w-[360px] opacity-50">
          {['Organic search', 'Direct', 'Social', 'Bounce rate', 'Top entry page', 'Top country'].map((l) => (
            <div key={l} className="bg-white border border-[#DAD2C3] p-3">
              <p className="text-[9px] tracking-[0.22em] uppercase text-neutral-500 font-bold mb-1">{l}</p>
              <p className="font-serif text-[22px] text-black">—</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

const PlatformsSection: React.FC<{ items: Platform[] }> = ({ items }) => (
  <section className="py-12 border-b border-[#DAD2C3]">
    <div className="max-w-[1440px] mx-auto px-12">
      <SectionHead title="Platforms" sub={`${items.length} services · ownership · renewals`} />
      <div className="grid grid-cols-3 gap-3.5">
        {items.map((p) => {
          const days = daysUntil(p.renewal_date);
          const renewClass = days !== null && days < 60 ? 'soon' : '';
          return (
            <div key={p.name} className="bg-white border border-[#DAD2C3] p-[18px] flex flex-col gap-2.5">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-sm font-bold text-black tracking-[0.02em]">{p.name}</div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">{p.powers}</div>
                </div>
                <div className="flex gap-[3px]" title={`Criticality ${p.criticality}/5`}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span key={n} className={`inline-block w-1.5 h-1.5 rounded-full ${n <= p.criticality ? 'bg-[#0047AB]' : 'bg-[#DAD2C3]'}`} />
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-[80px_1fr] gap-y-1 gap-x-3 text-[11px]">
                <span className="text-[9px] font-bold tracking-[0.18em] uppercase text-neutral-500">Cost/mo</span>
                <span className="text-black font-medium">{p.monthly_cost}</span>
                {p.annual_cost && (<>
                  <span className="text-[9px] font-bold tracking-[0.18em] uppercase text-neutral-500">Cost/yr</span>
                  <span className="text-black font-medium">{p.annual_cost}</span>
                </>)}
                {p.free_tier_quota && (<>
                  <span className="text-[9px] font-bold tracking-[0.18em] uppercase text-neutral-500">Free tier</span>
                  <span className="text-black font-medium">{p.free_tier_quota}</span>
                </>)}
                <span className="text-[9px] font-bold tracking-[0.18em] uppercase text-neutral-500">Owner</span>
                <span className="text-black font-medium font-mono text-[10px]">{p.owner_email}</span>
              </div>
              <div className={`mt-1 pt-2.5 border-t border-[#DAD2C3] text-[10px] text-neutral-500 tracking-[0.04em] ${renewClass === 'soon' ? '' : ''}`}>
                {p.renewal_date ? (
                  <>Renews <strong className={renewClass === 'soon' ? 'text-amber-700' : 'text-black'}>{days} days</strong> · {p.renewal_date}</>
                ) : (
                  <span>Pay-as-you-go / no fixed renewal</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </section>
);

const IncidentSection: React.FC<{ rows: SerperLogEntry[]; status: UsageResponse['shoppingStatus'] }> = ({ rows, status }) => {
  const pillClass = status.disabled
    ? 'bg-green-50 text-green-700'
    : 'bg-amber-50 text-amber-800';
  const pillText = status.disabled
    ? status.code === 'disabled'
      ? 'offline · kill switch on'
      : 'offline · daily budget exceeded'
    : `online · ${status.todayCount} / ${status.dailyBudget} today`;
  return (
    <section className="py-12">
      <div className="max-w-[1440px] mx-auto px-12">
        <SectionHead title="Shopping incident view" sub="Last 100 Serper calls · forensic trail" />
        <div className="bg-white border border-[#DAD2C3] p-6">
          <div className="flex justify-between items-center mb-3.5">
            <span className="text-xs text-neutral-500">
              Today: <strong className="text-black">{status.todayCount}</strong> / <strong className="text-black">{status.dailyBudget}</strong> credits used
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
      </div>
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
    if (!me?.authed) return;
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch('/api/admin/usage', { credentials: 'include' });
        if (cancelled) return;
        if (res.status === 401) {
          navigate('/admin/login', { replace: true });
          return;
        }
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
    const id = window.setInterval(load, POLL_MS);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [me?.authed, navigate]);

  if (me === null) return null;
  if (!me.authed) return <Navigate to="/admin/login" replace />;

  // Funnel snapshot → average across "live" funnels with at least one start.
  const liveFunnels = (data?.funnels || []).filter((f) => f.status === 'live' && f.started > 0);
  const avgFunnelPct = liveFunnels.length === 0
    ? null
    : Math.round(liveFunnels.reduce((acc, f) => acc + f.pct, 0) / liveFunnels.length);

  return (
    <div className="min-h-screen bg-white font-body">
      <AdminTopBar
        product="Admin dashboard"
        rightSlot={
          <>
            <span className="inline-flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
              Live · polling {Math.round(POLL_MS / 1000)}s
            </span>
            <Link to="/admin/users" className="text-[#0047AB] hover:underline">View users →</Link>
            <Link to="/admin/orders" className="text-[#0047AB] hover:underline">View orders →</Link>
            <Link to="/admin/comments" className="text-[#0047AB] hover:underline">View comments →</Link>
          </>
        }
      />

      {error && (
        <div className="max-w-[1440px] mx-auto px-12 mt-6">
          <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm">
            <strong>Fetch failed:</strong> {error}
            {data && <span className="ml-2 text-red-600 italic">(showing stale data)</span>}
          </div>
        </div>
      )}

      {/* 1. AT-A-GLANCE */}
      {data && (
        <section className="bg-[#F4EFE7] border-b border-[#DAD2C3] py-7">
          <div className="max-w-[1440px] mx-auto px-12">
            <div className="grid grid-cols-6 gap-3.5">
              <GlanceTile label="Total users" value={data.users.total} delta={`+${data.users.signups7d} this week`} />
              <GlanceTile label="Active · 7d" value={data.retention.wau} delta={`MAU ${data.retention.mau}`} deltaTone="flat" />
              <GlanceTile label="Signups · 7d" value={data.users.signups7d} delta={data.users.signups7d > 0 ? `${data.users.signups7d} new` : 'flat'} deltaTone={data.users.signups7d > 0 ? 'up' : 'flat'} />
              <GlanceTile
                label="Calendly · 7d"
                value={data.activity.filter((e) => e.action === 'calendly_click' && Date.now() - Date.parse(e.ts) < 7 * 86400000).length}
                delta="last 7d clicks"
                deltaTone="flat"
              />
              <GlanceTile label="Funnel snapshot" value={avgFunnelPct === null ? '—' : `${avgFunnelPct}%`} delta={liveFunnels.length > 0 ? `avg of ${liveFunnels.length} funnels` : 'no data yet'} deltaTone="flat" />
              <GlanceTile label="API spend · MTD" value={fmtUsd(data.cost.mtdSpendEst)} delta={data.cost.costPerActiveUserEst === null ? '—' : `${fmtUsd(data.cost.costPerActiveUserEst)}/user`} deltaTone="flat" />
            </div>
            {lastFetched && (
              <p className="mt-4 text-[10px] tracking-[0.22em] uppercase text-neutral-500 font-semibold">
                Updated {relativeTime(lastFetched.toISOString())}
              </p>
            )}
          </div>
        </section>
      )}

      {!data && !error && (
        <p className="max-w-[1440px] mx-auto px-12 py-8 text-sm text-neutral-500 italic">Loading…</p>
      )}

      {data && (
        <>
          {/* 2. FUNNELS */}
          <FunnelsSection rows={data.funnels} />
          {/* 3. ACTIVATION */}
          <ActivationSection data={data.activation} counters={data.counters} />
          {/* 4. NEWSLETTER */}
          <NewsletterSection data={data.newsletter} />
          {/* 5. RETENTION */}
          <RetentionSection data={data.retention} />
          {/* 6. COST */}
          <CostSection data={data.cost} counters={data.counters} />
          {/* 7. ACQUISITION (placeholder) */}
          <AcquisitionPlaceholder />
          {/* 8. PLATFORMS */}
          <PlatformsSection items={data.platforms} />
          {/* 9. SHOPPING INCIDENT */}
          <IncidentSection rows={data.serperLog} status={data.shoppingStatus} />
        </>
      )}
    </div>
  );
};

export default AdminPage;
