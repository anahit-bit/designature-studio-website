/**
 * /admin/waitlist — everyone who asked to be notified about paid features
 * (the "Notify me" / newsletter list), newest first. Durable source = the
 * newsletter Google Sheet; read live via /api/admin/waitlist. (2026-07-10)
 */
import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminMe } from '../lib/adminAuth';
import AdminShell from './admin/AdminShell';

interface Row { email: string; signupDate: string; source: string; }

function fmtDate(s: string): string {
  if (!s) return '—';
  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return s;
  return d.toISOString().slice(0, 10);
}

function readableSource(slug: string): string {
  if (!slug) return 'Newsletter';
  return slug.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const AdminWaitlistPage: React.FC = () => {
  const me = useAdminMe();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [count, setCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!me?.authed) return;
    let cancelled = false;
    fetch('/api/admin/waitlist', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Fetch failed (${r.status})`))))
      .then((d) => { if (!cancelled) { setRows(d.items || []); setCount(d.count || 0); setError(d.error || null); } })
      .catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [me?.authed]);

  if (me === null) return null;
  if (!me.authed) return <Navigate to="/admin/login" replace />;

  return (
    <AdminShell active="waitlist" title="Waitlist">
      <section className="bg-[#F4EFE7] border-b border-[#DAD2C3] py-6 px-8">
        <p className="text-[13px] text-neutral-700 max-w-[720px]">
          Everyone who clicked <strong>Notify me</strong> on a paid tool or the pricing page — your warm list for when
          subscriptions launch. Lives durably in the newsletter sheet.
        </p>
        <p className="mt-3 text-[10px] tracking-[0.22em] uppercase text-neutral-500 font-bold">{count} on the list</p>
      </section>

      <div className="px-8 py-7">
        {error && (
          <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm">
            Sheet read failed: {error}
          </div>
        )}
        {rows === null && !error && <p className="text-sm text-neutral-500 italic">Loading…</p>}
        {rows && rows.length === 0 && !error && (
          <div className="bg-white border border-[#DAD2C3] px-5 py-10 text-center text-sm text-neutral-500 italic">
            No one on the waitlist yet.
          </div>
        )}
        {rows && rows.length > 0 && (
          <table className="w-full border border-[#DAD2C3] bg-white">
            <thead>
              <tr>
                <th className="text-left px-4 py-3 text-[9px] tracking-[0.22em] uppercase text-neutral-500 font-bold border-b border-[#DAD2C3]">Email</th>
                <th className="text-left px-4 py-3 text-[9px] tracking-[0.22em] uppercase text-neutral-500 font-bold border-b border-[#DAD2C3]">Wanted / source</th>
                <th className="text-left px-4 py-3 text-[9px] tracking-[0.22em] uppercase text-neutral-500 font-bold border-b border-[#DAD2C3]">Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.email}-${i}`} className="border-b border-[#DAD2C3] last:border-b-0">
                  <td className="px-4 py-3 text-[13px] text-black font-semibold">{r.email}</td>
                  <td className="px-4 py-3 text-[13px] text-neutral-600">{readableSource(r.source)}</td>
                  <td className="px-4 py-3 text-[13px] text-neutral-700 tabular-nums">{fmtDate(r.signupDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  );
};

export default AdminWaitlistPage;
