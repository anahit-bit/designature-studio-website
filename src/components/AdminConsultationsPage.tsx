/**
 * /admin/consultations — Calendly booking tracker (2026-07-24).
 *
 * Two tables — free "Quick Conversation" and paid "Paid Consultation" — each row
 * showing when the call is, who booked (name + email), when they booked, the
 * status, and whether the contact was synced to HubSpot. Data from
 * GET /api/admin/consultations, which live-reads Calendly (when a token is set)
 * and merges the durable webhook-captured store.
 */
import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminMe } from '../lib/adminAuth';
import AdminShell from './admin/AdminShell';

interface Booking {
  inviteeUri: string;
  kind: 'free' | 'paid';
  eventName: string;
  startTime: string;
  status: 'active' | 'canceled';
  email: string;
  name: string;
  createdAt: string;
  source: 'calendly_api' | 'webhook';
  hubspot?: { synced: boolean; at?: string; error?: string };
}

interface Payload {
  configured: boolean;
  orgWide: boolean;
  freeVisible: boolean;
  hubspotConfigured: boolean;
  liveError: string | null;
  free: Booking[];
  paid: Booking[];
}

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const TH: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <th className="text-left px-4 py-3 text-[9px] tracking-[0.22em] uppercase text-neutral-500 font-bold border-b border-[#DAD2C3]">
    {children}
  </th>
);

const HubspotCell: React.FC<{ b: Booking; hubspotConfigured: boolean }> = ({ b, hubspotConfigured }) => {
  if (!hubspotConfigured) return <span className="text-[11px] text-neutral-400">—</span>;
  if (b.hubspot?.synced) return <span className="text-[11px] text-green-700 font-semibold">Synced ✓</span>;
  if (b.hubspot && !b.hubspot.synced) {
    return <span className="text-[11px] text-red-600 font-semibold" title={b.hubspot.error || ''}>Failed</span>;
  }
  return <span className="text-[11px] text-neutral-400" title="Synced going forward via webhook">not yet</span>;
};

const BookingTable: React.FC<{ rows: Booking[]; hubspotConfigured: boolean; emptyLabel: string }> = ({ rows, hubspotConfigured, emptyLabel }) => {
  if (rows.length === 0) {
    return (
      <div className="bg-white border border-[#DAD2C3] px-5 py-8 text-center text-sm text-neutral-500 italic">
        {emptyLabel}
      </div>
    );
  }
  return (
    <div className="overflow-x-auto border border-[#DAD2C3] bg-white">
      <table className="w-full min-w-[820px]">
        <thead>
          <tr>
            <TH>When</TH>
            <TH>Name</TH>
            <TH>Email</TH>
            <TH>Booked</TH>
            <TH>Status</TH>
            <TH>HubSpot</TH>
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => {
            const canceled = b.status === 'canceled';
            return (
              <tr key={b.inviteeUri} className={`border-b border-[#DAD2C3] last:border-b-0 ${canceled ? 'opacity-55' : ''}`}>
                <td className="px-4 py-3 text-[13px] text-black font-semibold whitespace-nowrap">{fmtWhen(b.startTime)}</td>
                <td className="px-4 py-3 text-[13px] text-neutral-700 whitespace-nowrap">{b.name || '—'}</td>
                <td className="px-4 py-3 text-[12px] text-neutral-700 font-mono">{b.email}</td>
                <td className="px-4 py-3 text-[12px] text-neutral-500 whitespace-nowrap">{fmtDate(b.createdAt)}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`text-[9px] tracking-[0.18em] uppercase font-bold py-1 px-2 ${
                    canceled ? 'bg-black/[0.06] text-neutral-500' : 'bg-green-100 text-green-700'
                  }`}>{b.status}</span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap"><HubspotCell b={b} hubspotConfigured={hubspotConfigured} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const Section: React.FC<{ title: string; sub: string; rows: Booking[]; hubspotConfigured: boolean; empty: string }> = ({ title, sub, rows, hubspotConfigured, empty }) => {
  const active = rows.filter((r) => r.status === 'active').length;
  return (
    <div className="mb-9">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="font-serif text-[20px] text-black">{title}</h2>
        <span className="text-[11px] text-neutral-500">{active} upcoming/active · {rows.length} total · {sub}</span>
      </div>
      <BookingTable rows={rows} hubspotConfigured={hubspotConfigured} emptyLabel={empty} />
    </div>
  );
};

const AdminConsultationsPage: React.FC = () => {
  const me = useAdminMe();
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!me?.authed) return;
    let cancelled = false;
    fetch('/api/admin/consultations', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Fetch failed (${r.status})`))))
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [me?.authed]);

  if (me === null) return null;
  if (!me.authed) return <Navigate to="/admin/login" replace />;

  return (
    <AdminShell active="consultations" title="Consultations">
      <section className="bg-[#F4EFE7] border-b border-[#DAD2C3] py-6 px-8">
        <p className="text-[13px] text-neutral-700 max-w-[760px]">
          Everyone who booked a call — <strong>free Quick Conversations and paid Consultations</strong>, with who they are and when.
          New bookings sync to HubSpot automatically (tagged free vs paid).
        </p>
      </section>

      <div className="px-8 py-7">
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
        )}
        {!data && !error && <p className="text-sm text-neutral-500 italic">Loading…</p>}

        {data && !data.configured && (
          <div className="bg-[#FAFAFA] border border-dashed border-[#DAD2C3] p-7 mb-6">
            <p className="text-[9px] tracking-[0.32em] uppercase text-[#0047AB] font-bold mb-2">Not configured</p>
            <p className="text-[13px] text-neutral-600 leading-[1.6]">
              Add <code className="font-mono text-[12px]">CALENDLY_ADMIN_TOKEN</code> (a Calendly Personal Access Token) to read bookings,
              and <code className="font-mono text-[12px]">HUBSPOT_ACCESS_TOKEN</code> to auto-sync contacts. See the setup notes in memory.
            </p>
          </div>
        )}

        {data && data.configured && (
          <>
            {data.liveError && (
              <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                Live Calendly read failed: {data.liveError} — showing stored bookings.
              </div>
            )}
            {!data.freeVisible && (
              <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 text-amber-800 text-[13px]">
                The current token only sees the <strong>paid</strong> account. To include free "Quick Conversation" bookings, set{' '}
                <code className="font-mono text-[12px]">CALENDLY_ADMIN_TOKEN</code> to an org-wide Personal Access Token that covers both events.
                (Webhook-captured free bookings will still appear here once the webhook is live.)
              </div>
            )}
            {!data.hubspotConfigured && (
              <div className="mb-6 px-4 py-3 bg-[#F4EFE7] border border-[#DAD2C3] text-neutral-600 text-[13px]">
                HubSpot sync is off — add <code className="font-mono text-[12px]">HUBSPOT_ACCESS_TOKEN</code> to start tagging new bookers as contacts.
              </div>
            )}

            <Section
              title="Free · Quick Conversation"
              sub="15-min intro calls"
              rows={data.free}
              hubspotConfigured={data.hubspotConfigured}
              empty={data.freeVisible ? 'No free bookings yet.' : 'Free bookings not visible with the current token.'}
            />
            <Section
              title="Paid · Consultation"
              sub="paid sessions"
              rows={data.paid}
              hubspotConfigured={data.hubspotConfigured}
              empty="No paid bookings yet."
            />
          </>
        )}
      </div>
    </AdminShell>
  );
};

export default AdminConsultationsPage;
