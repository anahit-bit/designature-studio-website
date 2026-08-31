/**
 * /admin/reviews — the Designer Check queue (AI-038).
 *
 * A check is WRITTEN NOTES against one saved artifact, not a call — so this is
 * the whole delivery surface. Whatever gets typed here IS what the customer
 * bought; there is no follow-up conversation to carry a thin answer.
 *
 * Oldest waiting first, deliberately: a newest-first queue lets the hardest
 * request sink to the bottom and rot, and the person who waited longest is the
 * one most likely to give up on the studio.
 *
 * Data:    GET  /api/admin/reviews?status=open|answered
 * Actions: POST /api/admin/reviews/:id  { claim: true }
 *          POST /api/admin/reviews/:id  { verdict, note }
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminMe } from '../lib/adminAuth';
import AdminShell from './admin/AdminShell';

type Verdict = 'go' | 'fix' | 'wont_work';

interface ReviewRow {
  id: string;
  itemId: string | null;
  tool: string;
  nextTool: string | null;
  scenario: string | null;
  ask: string | null;
  status: 'requested' | 'in_review' | 'answered';
  verdict: Verdict | null;
  note: string | null;
  createdAt: string;
  answeredAt: string | null;
  assignee: string | null;
  userEmail: string | null;
  itemTitle: string | null;
  itemThumb: string | null;
}

/** Only three. Anything richer than this is a design project, not a check. */
const VERDICTS: { id: Verdict; label: string; hint: string; cls: string }[] = [
  { id: 'go', label: 'Good to go', hint: 'It holds up. Say why in a line.', cls: 'border-[#15803d] text-[#15803d]' },
  { id: 'fix', label: 'Change this first', hint: 'Two or three specific fixes.', cls: 'border-[#9E5E41] text-[#9E5E41]' },
  { id: 'wont_work', label: "This won't work", hint: 'Why, and what the real path is.', cls: 'border-[#b3261e] text-[#b3261e]' },
];

function fmt(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '—';
  return `${d.toISOString().slice(0, 10)} · ${d.toISOString().slice(11, 16)}`;
}

/** How long someone has been waiting. The number that should drive the queue. */
function waitedFor(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

const MIN_NOTE = 10;

const AdminReviewsPage: React.FC = () => {
  const me = useAdminMe();
  const [rows, setRows] = useState<ReviewRow[] | null>(null);
  const [openCount, setOpenCount] = useState(0);
  const [tab, setTab] = useState<'open' | 'answered'>('open');
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Draft state per row, so switching between requests never loses typing.
  const [drafts, setDrafts] = useState<Record<string, { verdict: Verdict | null; note: string }>>({});
  const draft = (id: string) => drafts[id] ?? { verdict: null, note: '' };
  const setDraft = (id: string, patch: Partial<{ verdict: Verdict | null; note: string }>) =>
    setDrafts((d) => ({ ...d, [id]: { ...draft(id), ...patch } }));

  const fetchQueue = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/reviews?status=${tab}`, { credentials: 'include' });
      if (!r.ok) {
        setError(`Fetch failed (${r.status})`);
        return;
      }
      const json = await r.json();
      setRows(json.reviews || []);
      setOpenCount(json.openCount ?? 0);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fetch failed');
    }
  }, [tab]);

  useEffect(() => {
    if (!me?.authed) return;
    void fetchQueue();
  }, [me?.authed, fetchQueue]);

  async function post(id: string, body: Record<string, unknown>) {
    setBusyId(id);
    try {
      const r = await fetch(`/api/admin/reviews/${encodeURIComponent(id)}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(data?.error || `Action failed (${r.status})`);
        return false;
      }
      setError(null);
      await fetchQueue();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
      return false;
    } finally {
      setBusyId(null);
    }
  }

  if (me === null) return null;
  if (!me.authed) return <Navigate to="/admin/login" replace />;

  return (
    <AdminShell active="reviews" title="Designer checks">
      <section className="bg-[#F4EFE7] border-b border-[#DAD2C3] py-6">
        <div className="max-w-[1440px] mx-auto px-12 flex items-center gap-3.5 flex-wrap">
          {(['open', 'answered'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setTab(s)}
              className={`px-3.5 py-2.5 text-[11px] font-semibold border ${
                tab === s
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-black border-[#DAD2C3] hover:border-black/40'
              }`}
            >
              {s === 'open' ? 'Waiting' : 'Answered'}
            </button>
          ))}
          <span className="text-[11px] text-neutral-600 ml-2">
            <strong className="text-black">{openCount}</strong> waiting
          </span>
          <span className="text-[10px] tracking-[0.18em] uppercase text-neutral-500 ml-auto">
            Oldest first
          </span>
        </div>
      </section>

      <div className="max-w-[1440px] mx-auto px-12 py-8">
        {error && (
          <p className="mb-5 border border-[#b3261e]/40 bg-[#b3261e]/[0.06] text-[#b3261e] px-4 py-3 text-[13px]">
            {error}
          </p>
        )}

        {rows === null && <p className="text-[13px] text-neutral-500">Loading…</p>}

        {rows?.length === 0 && (
          <p className="text-[13px] text-neutral-500">
            {tab === 'open' ? 'Nothing waiting. ' : 'Nothing answered yet. '}
            {tab === 'open' && 'The queue is clear.'}
          </p>
        )}

        <div className="flex flex-col gap-5">
          {rows?.map((r) => {
            const d = draft(r.id);
            const noteTooShort = d.note.trim().length < MIN_NOTE;
            const answered = r.status === 'answered';
            return (
              <article key={r.id} className="border border-[#DAD2C3] bg-white">
                <header className="flex flex-wrap items-start gap-4 px-5 py-4 border-b border-[#DAD2C3]">
                  {r.itemThumb && (
                    <img
                      src={r.itemThumb}
                      alt=""
                      className="w-[76px] h-[76px] object-cover shrink-0"
                      loading="lazy"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-serif text-[20px] leading-tight text-black">
                      {r.itemTitle || 'Untitled'}
                    </p>
                    <p className="text-[11px] text-neutral-500 mt-1">
                      {r.userEmail || 'unknown'} · asked {fmt(r.createdAt)}
                      {r.nextTool && <> · before <strong className="text-black/70">{r.nextTool}</strong></>}
                      {r.scenario && <> · {r.scenario}</>}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {!answered ? (
                      <span
                        className={`inline-block px-2 py-0.5 text-[9px] tracking-[0.18em] uppercase font-bold ${
                          waitedFor(r.createdAt).endsWith('d')
                            ? 'bg-[#b3261e] text-white'
                            : 'bg-black/[0.06] text-neutral-600'
                        }`}
                      >
                        waiting {waitedFor(r.createdAt)}
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 text-[9px] tracking-[0.18em] uppercase font-bold bg-[#15803d] text-white">
                        answered
                      </span>
                    )}
                    {r.assignee && (
                      <p className="text-[10px] text-neutral-500 mt-1.5">{r.assignee}</p>
                    )}
                  </div>
                </header>

                {r.ask && (
                  <p className="px-5 py-3 text-[13.5px] text-black/75 leading-relaxed bg-[#FAFAFA] border-b border-[#DAD2C3]">
                    <span className="text-[10px] tracking-[0.18em] uppercase text-neutral-500 block mb-1">
                      They asked
                    </span>
                    {r.ask}
                  </p>
                )}

                {answered ? (
                  <div className="px-5 py-4">
                    <p className="text-[10px] tracking-[0.18em] uppercase text-neutral-500">
                      {VERDICTS.find((v) => v.id === r.verdict)?.label ?? r.verdict} ·{' '}
                      {fmt(r.answeredAt)}
                    </p>
                    <p className="text-[14px] text-black/80 leading-relaxed mt-2 whitespace-pre-wrap">
                      {r.note}
                    </p>
                  </div>
                ) : (
                  <div className="px-5 py-4">
                    <div className="flex flex-wrap gap-2.5">
                      {VERDICTS.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setDraft(r.id, { verdict: v.id })}
                          className={`px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] border ${
                            d.verdict === v.id ? `${v.cls} bg-black/[0.03]` : 'border-[#DAD2C3] text-neutral-600 hover:border-black/40'
                          }`}
                        >
                          {v.label}
                        </button>
                      ))}
                    </div>

                    {d.verdict && (
                      <p className="text-[11.5px] text-neutral-500 mt-2.5">
                        {VERDICTS.find((v) => v.id === d.verdict)?.hint}
                      </p>
                    )}

                    <textarea
                      value={d.note}
                      onChange={(e) => setDraft(r.id, { note: e.target.value })}
                      rows={4}
                      placeholder="What they should do. This is the whole deliverable — there is no call to soften it."
                      className="w-full mt-3 border border-[#DAD2C3] px-3.5 py-3 text-[13.5px] leading-relaxed focus:outline-none focus:border-[#0047AB]"
                    />

                    <div className="flex flex-wrap items-center gap-4 mt-2">
                      {r.status === 'requested' && (
                        <button
                          type="button"
                          disabled={busyId === r.id}
                          onClick={() => void post(r.id, { claim: true })}
                          className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500 hover:text-black disabled:opacity-50"
                        >
                          I'm looking at this
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={busyId === r.id || !d.verdict || noteTooShort}
                        onClick={() => void post(r.id, { verdict: d.verdict, note: d.note.trim() })}
                        className="ml-auto bg-black text-white px-6 py-3 text-[11px] font-bold uppercase tracking-[0.16em] disabled:opacity-40"
                      >
                        {busyId === r.id ? 'Sending…' : 'Send the notes'}
                      </button>
                    </div>

                    {/* A verdict with no note is not a deliverable — even "good
                        to go" needs a sentence, or they have bought nothing. */}
                    {d.verdict && noteTooShort && (
                      <p className="text-[11.5px] text-neutral-500 mt-2 text-right">
                        Add a note — it is what they are actually getting.
                      </p>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </AdminShell>
  );
};

export default AdminReviewsPage;
