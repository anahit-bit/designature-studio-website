/**
 * /journal — Journal index.
 *
 * Photo hero (top-page grammar) + a left-aligned category text sub-nav
 * (fetchCategories, ordered by `order`) + tag chips + a client-side search box
 * that filters the already-loaded posts by title + excerpt + tags + category.
 * All three filters are reflected in the URL
 * (/journal?category=how-to&tag=lighting&q=rug) so the back button and shared
 * links restore the same view. When no filter is active the newest post is
 * promoted to a featured split-card above the grid.
 *
 * Sanity/DB failure is graceful — an empty grid with a friendly message, never a
 * crash. Header/Footer are included so the route is a full page (like ServicesPage).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import PostCard, { formatPostDate } from './journal/PostCard';
import { fetchPosts, fetchCategories } from '../lib/sanity';
import { cld, cldSrcSet, DEFAULT_WIDTHS, CARD_WIDTHS } from '../lib/cld';
import type { BlogPost, Category } from '../types';

// Shared fallback hero used until (or when) no post cover is available.
const JOURNAL_HERO_FALLBACK =
  'https://res.cloudinary.com/dys2k5muv/image/upload/v1783339019/journal/blog01-after-light.jpg';

/** Featured split-card (image left, editorial body right) — links to the post. */
const FeaturedCard: React.FC<{ post: BlogPost }> = ({ post }) => (
  <Link
    to={`/journal/${encodeURIComponent(post.slug)}`}
    className="group grid md:grid-cols-[1.25fr_1fr] border border-black/10 hover:border-black/25 transition-colors"
  >
    <div className="aspect-[16/11] overflow-hidden bg-[#FAFAFA]">
      {post.coverImage ? (
        <img
          src={cld(post.coverImage, 900, { crop: 'fill', aspectRatio: '16/11' })}
          srcSet={cldSrcSet(post.coverImage, DEFAULT_WIDTHS, { crop: 'fill', aspectRatio: '16/11' })}
          sizes="(min-width: 768px) 55vw, 100vw"
          alt={post.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-black/25 text-xs uppercase tracking-[0.3em]">
          Designature
        </div>
      )}
    </div>
    <div className="p-8 md:p-12 flex flex-col justify-center">
      <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-black/45 mb-2">
        Featured
      </span>
      {post.category && (
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9E5E41] mb-3">
          {post.category.title}
        </span>
      )}
      <h2 className="text-3xl md:text-4xl font-bold font-display tracking-tight leading-[1.05] mb-4 group-hover:text-black/70 transition-colors">
        {post.title}
      </h2>
      {post.excerpt && (
        <p className="text-sm md:text-[15px] text-black/65 leading-relaxed mb-4 line-clamp-3">
          {post.excerpt}
        </p>
      )}
      {post.publishedAt && (
        <span className="text-[12px] tracking-[0.04em] text-black/45">
          {formatPostDate(post.publishedAt)}
        </span>
      )}
      <span className="mt-6 text-[11px] font-bold uppercase tracking-[0.22em] text-[#0047AB]">
        Read the story →
      </span>
    </div>
  </Link>
);

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

  // Featured split-card only when no filter is active (never disturbs the filtered set).
  const hasFilters = !!(category || tag || q);
  const showFeatured = !hasFilters && filtered.length > 0;
  const featured = showFeatured ? filtered[0] : null;
  const gridPosts = showFeatured ? filtered.slice(1) : filtered;

  const heroImg = posts?.[0]?.coverImage || JOURNAL_HERO_FALLBACK;

  const catLink =
    'text-[12px] font-bold uppercase tracking-[0.16em] pb-1 transition-colors';

  return (
    <div className="min-h-screen bg-white font-body">
      <Header onDark />

      {/* Photo hero — top-page grammar (Services/Studio/Pricing) */}
      <section className="relative w-full h-[60vh] md:h-[68vh] min-h-[440px] max-h-[720px] overflow-hidden bg-black">
        <img
          src={cld(heroImg, 1600)}
          srcSet={cldSrcSet(heroImg, DEFAULT_WIDTHS)}
          sizes="100vw"
          alt=""
          loading="eager"
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/5 to-black/60" />
        <div className="relative z-10 h-full max-w-[1800px] mx-auto px-8 md:px-16 flex flex-col justify-center pb-10">
          <div className="max-w-4xl pt-20">
            <Link
              to="/"
              className="text-[11px] font-bold uppercase tracking-[0.35em] text-white/75 mb-10 hover:text-white transition-colors flex items-center gap-2 w-fit"
            >
              ← Back to home
            </Link>
            <h1 className="text-3xl md:text-5xl lg:text-[5.5vw] font-bold font-display text-white tracking-architectural leading-[0.85] uppercase mb-8">
              The Journal
            </h1>
            <p className="text-white/80 text-base md:text-xl font-light leading-relaxed max-w-xl">
              Design thinking, real projects, and the occasional strong opinion — from the studio to
              your space.
            </p>
          </div>
        </div>
      </section>

      {/* Category text sub-nav */}
      {categories.length > 0 && (
        <div className="border-b border-[#DAD2C3]">
          <div className="max-w-[1180px] mx-auto px-8 md:px-16 py-5 flex flex-wrap gap-x-7 gap-y-3">
            <button
              type="button"
              onClick={() => setParam('category', '')}
              className={`${catLink} ${
                !category ? 'text-black border-b-2 border-[#9E5E41]' : 'text-black/55 hover:text-black'
              }`}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => setParam('category', category === c.slug ? '' : c.slug)}
                className={`${catLink} ${
                  category === c.slug
                    ? 'text-black border-b-2 border-[#9E5E41]'
                    : 'text-black/55 hover:text-black'
                }`}
              >
                {c.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search + tag chips */}
      <div className="max-w-[1180px] mx-auto px-8 md:px-16 pt-10">
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

      {/* Featured + grid */}
      <div className="max-w-[1180px] mx-auto px-8 md:px-16 pt-10 pb-16 md:pb-20">
        {posts === null ? (
          <p className="text-sm text-black/50 italic">Loading the journal…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-black/60">
            {posts.length === 0
              ? 'No articles yet — check back soon.'
              : 'No articles match your filters.'}
          </p>
        ) : (
          <>
            {featured && (
              <div className="mb-16 md:mb-20">
                <FeaturedCard post={featured} />
              </div>
            )}
            {gridPosts.length > 0 && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12 md:gap-x-12 md:gap-y-16">
                {gridPosts.map((p) => (
                  <PostCard key={p.id} post={p} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default JournalPage;
