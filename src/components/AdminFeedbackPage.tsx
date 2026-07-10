/**
 * /admin/feedback — readable feedback inbox (2026-07-10).
 *
 * Feedback used to be only a hidden activity-log counter; the message bodies now
 * persist durably (server writes each submission to db.feedback, mirrored to the
 * Google Sheet for archive). This page reads /api/admin/feedback and lets the
 * owner mark items read (one or all).
 */
import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminMe } from '../lib/adminAuth';
import AdminShell from './admin/AdminShell';

interface FeedbackItem {
  ts: string;
  name: string;
  email: string;
  country?: string;
  type: string;
  message: string;
  rating?: number | null;
  projectType?: string;
  status: 'new' | 'read';
}

type TypeFilter = 'all' | 'bug' | 'feature' | 'general' | 'testimonial';

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '—';
  return `${d.toISOString().slice(0, 10)} · ${d.toISOString().slice(11, 16)}`;
}

const TYPE_STYLE: Record<string, string> = {
  bug: 'bg-red-50 text-red-700',
  feature: 'bg-[#eaf0fb] text-[#0047AB]',
  general: 'bg-neutral-100 text-neutral-600',
  testimonial: 'bg-green-50 text-green-700',
};

const AdminFeedbackPage: React.FC = () => {
  const me = useAdminMe();
  const [items, setItems] = useState<FeedbackItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<TypeFilter>('all');

  async function load() {
    try {
      const r = await fetch('/api/admin/feedback', { credentials: 'include' });
      if (!r.ok) throw new Error(`Fetch failed (${r.status})`);
      const d = await r.json();
      setItems(d.items || []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fetch failed');
    }
  }

  useEffect(() => {
    if (!me?.authed) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.authed]);

  async function markRead(ts?: string) {
    await fetch('/api/admin/feedback/read', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ts ? { ts } : { all: true }),
    }).catch(() => {});
    void load();
  }

  if (me === null) return null;
  if (!me.authed) return <Navigate to="/admin/login" replace />;

  const shown = (items || []).filter((f) => filter === 'all' || f.type === filter);
  const newCount = (items || []).filter((f) => f.status === 'new').length;

  return (
    <AdminShell active="feedback" title="Feedback">
      <section className="bg-[#F4EFE7] border-b border-[#DAD2C3] py-6 px-8 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {(['all', 'bug', 'feature', 'general', 'testimonial'] as TypeFilter[]).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`text-[11px] tracking-[0.08em] uppercase font-bold px-3 py-2 border ${
                filter === t ? 'bg-[#0047AB] text-white border-[#0047AB]' : 'bg-white text-neutral-600 border-[#DAD2C3] hover:border-[#0047AB]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] tracking-[0.22em] uppercase text-neutral-500 font-bold">{newCount} unread</span>
          {newCount > 0 && (
            <button onClick={() => markRead()} className="text-[11px] tracking-[0.08em] uppercase font-bold text-[#0047AB] hover:underline">
              Mark all read
            </button>
          )}
        </div>
      </section>

      <div className="px-8 py-7">
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
        )}
        {items === null && !error && <p className="text-sm text-neutral-500 italic">Loading…</p>}
        {items && shown.length === 0 && !error && (
          <div className="bg-white border border-[#DAD2C3] px-5 py-10 text-center text-sm text-neutral-500 italic">
            No feedback{filter !== 'all' ? ` of type "${filter}"` : ''} yet.
          </div>
        )}
        {shown.map((f, i) => (
          <div
            key={`${f.ts}-${i}`}
            className={`bg-white border px-5 py-4 mb-2.5 ${f.status === 'new' ? 'border-[#0047AB]/40' : 'border-[#DAD2C3]'}`}
          >
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className={`text-[9px] tracking-[0.14em] uppercase font-bold px-2 py-0.5 rounded ${TYPE_STYLE[f.type] || 'bg-neutral-100 text-neutral-600'}`}>{f.type}</span>
                <span className="text-[13px] font-semibold text-black">{f.name || f.email || 'Anonymous'}</span>
                {f.email && f.name && <span className="text-[11px] text-neutral-500">{f.email}</span>}
                {f.rating ? <span className="text-[11px] text-amber-600">{'★'.repeat(f.rating)}</span> : null}
                {f.status === 'new' && <span className="text-[9px] tracking-[0.16em] uppercase font-bold text-[#0047AB] bg-[#eaf0fb] px-2 py-0.5 rounded-full">new</span>}
              </div>
              <span className="text-[11px] text-neutral-500 whitespace-nowrap">{fmtDateTime(f.ts)}</span>
            </div>
            <p className="text-[13px] text-neutral-800 leading-[1.55]">{f.message}</p>
            {(f.country || f.projectType) && (
              <p className="mt-2 text-[11px] text-neutral-400">{[f.projectType, f.country].filter(Boolean).join(' · ')}</p>
            )}
            {f.status === 'new' && (
              <div className="mt-3">
                <button onClick={() => markRead(f.ts)} className="text-[11px] tracking-[0.08em] uppercase font-bold text-neutral-500 border border-[#DAD2C3] px-3 py-1.5 hover:border-[#0047AB] hover:text-[#0047AB]">
                  Mark read
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </AdminShell>
  );
};

export default AdminFeedbackPage;
