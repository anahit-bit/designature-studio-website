/**
 * Article comments — own, moderated.
 *
 * GET  /api/journal/:slug/comments  → approved comments only (public).
 * POST /api/journal/:slug/comments  → creates a `pending` comment (validated,
 *   honeypot-guarded, rate-limited server-side). New comments are held for review
 *   before they appear, so after a successful submit we show a "pending review"
 *   confirmation rather than optimistically inserting the comment.
 */
import React, { useEffect, useState } from 'react';
import { formatPostDate } from './PostCard';

interface CommentRow {
  id: string;
  author_name: string;
  body: string;
  created_at: string;
}

const Comments: React.FC<{ slug: string }> = ({ slug }) => {
  const [comments, setComments] = useState<CommentRow[] | null>(null);
  const [name, setName] = useState('');
  const [body, setBody] = useState('');
  const [honeypot, setHoneypot] = useState(''); // hidden anti-bot field ("website")
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/journal/${encodeURIComponent(slug)}/comments`)
      .then((r) => (r.ok ? r.json() : { comments: [] }))
      .then((json) => {
        if (!cancelled) setComments(Array.isArray(json?.comments) ? json.comments : []);
      })
      .catch(() => {
        if (!cancelled) setComments([]);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === 'submitting') return;
    const nameTrim = name.trim();
    const bodyTrim = body.trim();
    if (!nameTrim || !bodyTrim) {
      setErrorMsg('Please add your name and a comment.');
      setStatus('error');
      return;
    }
    setStatus('submitting');
    setErrorMsg('');
    try {
      const res = await fetch(`/api/journal/${encodeURIComponent(slug)}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorName: nameTrim, body: bodyTrim, website: honeypot }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        setErrorMsg(data?.error || `Something went wrong (${res.status}).`);
        setStatus('error');
        return;
      }
      setName('');
      setBody('');
      setStatus('done');
    } catch {
      setErrorMsg('Network error — please try again.');
      setStatus('error');
    }
  }

  return (
    <section className="mt-16 pt-12 border-t border-black/10">
      <h2 className="text-2xl md:text-3xl font-bold font-display tracking-tight mb-8">
        Comments
      </h2>

      {/* Approved comments */}
      {comments === null ? (
        <p className="text-sm text-black/50 italic">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-black/55">Be the first to share your thoughts.</p>
      ) : (
        <ul className="flex flex-col gap-8">
          {comments.map((c) => (
            <li key={c.id} className="border-b border-black/5 pb-8 last:border-0">
              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-sm font-bold text-black">{c.author_name}</span>
                <span className="text-[11px] uppercase tracking-[0.2em] text-black/40">
                  {formatPostDate(c.created_at)}
                </span>
              </div>
              <p className="text-sm text-black/75 leading-relaxed whitespace-pre-wrap">{c.body}</p>
            </li>
          ))}
        </ul>
      )}

      {/* Submit form */}
      <div className="mt-12 max-w-2xl">
        <h3 className="text-sm font-bold uppercase tracking-[0.25em] text-black/70 mb-6">
          Leave a comment
        </h3>
        {status === 'done' ? (
          <div className="border border-[#E4DACd] bg-[#FAF6EF] px-5 py-4 text-sm text-black/75">
            Thanks — your comment has been submitted and will appear once it’s reviewed.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Honeypot: hidden from users, tempting to bots. */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              className="hidden"
              aria-hidden="true"
            />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              maxLength={80}
              className="w-full border border-black/15 px-4 py-3 text-sm text-black outline-none focus:border-black transition-colors"
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Your comment"
              rows={4}
              maxLength={3000}
              className="w-full border border-black/15 px-4 py-3 text-sm text-black outline-none focus:border-black transition-colors resize-y"
            />
            {status === 'error' && errorMsg && (
              <p className="text-sm text-red-600">{errorMsg}</p>
            )}
            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={status === 'submitting'}
                className="bg-black text-white px-8 py-3 text-[11px] font-bold uppercase tracking-[0.25em] hover:bg-[#9E5E41] transition-colors disabled:opacity-50"
              >
                {status === 'submitting' ? 'Submitting…' : 'Post comment'}
              </button>
              <span className="text-[11px] text-black/45">Comments are reviewed before appearing.</span>
            </div>
          </form>
        )}
      </div>
    </section>
  );
};

export default Comments;
