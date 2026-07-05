/**
 * /journal — Journal index.
 *
 * Card grid + a category nav bar (fetchCategories, ordered by `order`) + tag chips
 * + a client-side search box that filters the already-loaded posts by
 * title + excerpt + tags + category. All three filters are reflected in the URL
 * (/journal?category=how-to&tag=lighting&q=rug) so the back button and shared
 * links restore the same view.
 *
 * Sanity/DB failure is graceful — an empty grid with a friendly message, never a
 * crash. Header/Footer are included so the route is a full page (like FAQPage).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import PostCard from './journal/PostCard';
import { fetchPosts, fetchCategories } from '../lib/sanity';
import type { BlogPost, Category } from '../types';

const JournalPage: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();

  const category = searchParams.get('category') || '';
  const tag = searchParams.get('tag') || '';
  const q = searchParams.get('q') || '';

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchPosts(), fetchCategories()])
      .then(([p, c]) => {
        if (cancelled) return;
        setPosts(p);
        setCategories(c);
      })
      .catch(() => {
        if (cancelled) return;
        setPosts([]);
        setCategories([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Update one query param; empty value removes it. `replace` avoids history spam while typing. */
  const setParam = (key: string, value: string, replace = false) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace });
  };

  // Union of all tags across loaded posts, alphabetical.
  const allTags = useMemo(() => {
    const s = new Set<string>();
    (posts ?? []).forEach((p) => (p.tags ?? []).forEach((t) => t && s.add(t)));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [posts]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (posts ?? []).filter((p) => {
      if (category && p.category?.slug !== category) return false;
      if (tag && !(p.tags ?? []).includes(tag)) return false;
      if (needle) {
        const haystack = [
          p.title,
          p.excerpt ?? '',
          (p.tags ?? []).join(' '),
          p.category?.title ?? '',
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [posts, category, tag, q]);

  const chipBase =
    'px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] border transition-colors';

  return (
    <div className="min-h-screen bg-white font-body">
      <Header />

      {/* Hero */}
      <div className="max-w-[1800px] mx-auto px-8 md:px-16 pt-28 md:pt-36 pb-10">
        <div className="max-w-3xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.5em] text-black/65 mb-6">
            The Journal
          </p>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold font-display tracking-architectural leading-[0.95] mb-6">
            Notes on design &amp; living well.
          </h1>
          <p className="text-black/70 text-sm md:text-base font-light leading-relaxed">
            Ideas, how-tos, and behind-the-scenes from the studio — on interior design, AI-assisted
            tools, and making a home that feels like you.
          </p>
        </div>
      </div>

      {/* Category nav bar */}
      {categories.length > 0 && (
        <div className="max-w-[1800px] mx-auto px-8 md:px-16">
          <div className="flex flex-wrap gap-2.5 border-y border-black/10 py-5">
            <button
              type="button"
              onClick={() => setParam('category', '')}
              className={`${chipBase} ${
                !category
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-black/70 border-black/15 hover:border-black'
              }`}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => setParam('category', category === c.slug ? '' : c.slug)}
                className={`${chipBase} ${
                  category === c.slug
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-black/70 border-black/15 hover:border-black'
                }`}
              >
                {c.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search + tag chips */}
      <div className="max-w-[1800px] mx-auto px-8 md:px-16 pt-8">
        <div className="flex flex-col lg:flex-row lg:items-center gap-6 justify-between">
          <input
            type="search"
            value={q}
            onChange={(e) => setParam('q', e.target.value, true)}
            placeholder="Search the journal…"
            className="w-full lg:max-w-sm border border-black/15 px-4 py-3 text-sm text-black outline-none focus:border-black transition-colors"
          />
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {allTags.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setParam('tag', tag === t ? '' : t)}
                  className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] border transition-colors ${
                    tag === t
                      ? 'bg-[#9E5E41] text-white border-[#9E5E41]'
                      : 'bg-white text-black/60 border-black/15 hover:border-[#9E5E41] hover:text-[#9E5E41]'
                  }`}
                >
                  #{t}
                </button>
              ))}
            </div>
          )}
        </div>
        {(category || tag || q) && (
          <button
            type="button"
            onClick={() => setSearchParams({}, { replace: false })}
            className="mt-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[#9E5E41] hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="max-w-[1800px] mx-auto px-8 md:px-16 py-16 md:py-20">
        {posts === null ? (
          <p className="text-sm text-black/50 italic">Loading the journal…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-black/60">
            {posts.length === 0
              ? 'No articles yet — check back soon.'
              : 'No articles match your filters.'}
          </p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12 md:gap-x-12 md:gap-y-16">
            {filtered.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default JournalPage;
