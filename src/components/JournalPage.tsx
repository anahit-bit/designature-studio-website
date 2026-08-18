/**
 * /journal — Journal index, styled as an editorial "front page".
 *
 * A nameplate masthead (dateline + serif nameplate) replaces the old photo hero,
 * then a left-aligned category text sub-nav (fetchCategories, ordered by `order`)
 * + tag chips + a client-side search box that filters the already-loaded posts by
 * title + excerpt + tags + category. All three filters are reflected in the URL
 * (/journal?category=how-to&tag=lighting&q=rug) so the back button and shared
 * links restore the same view.
 *
 * When no filter is active the page renders a FRONT PAGE: the earliest post is the
 * pinned lead, then the rest tile into repeating bands — a large "secondary" story
 * beside a small image-card column ("In this issue"), then a row of standard
 * stories — with hairline column rules for a newspaper feel. Every card carries an
 * image. Any filtered/search view falls back to a clean uniform grid.
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
import { cld, cldSrcSet, DEFAULT_WIDTHS, CARD_WIDTHS, THUMB_WIDTHS } from '../lib/cld';
import type { BlogPost, Category } from '../types';

const DOUBLE_RULE: React.CSSProperties = { borderBottom: '3px double #141414' };
const RULE = 'rgba(0,0,0,0.16)';

const postHref = (p: BlogPost) => `/journal/${encodeURIComponent(p.slug)}`;
const catHref = (p: BlogPost) =>
  p.category ? `/journal/category/${encodeURIComponent(p.category.slug)}` : undefined;

/** Small terracotta category kicker. */
const Kick: React.FC<{ post: BlogPost }> = ({ post }) =>
  post.category ? (
    <span className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-[#9E5E41]">
      {post.category.title}
    </span>
  ) : null;

/** The pinned front-page lead — image left, editorial body right. */
const FeaturedLead: React.FC<{ post: BlogPost }> = ({ post }) => (
  <Link
    to={postHref(post)}
    className="group grid md:grid-cols-[1.35fr_1fr] gap-8 md:gap-10 pb-8"
    style={DOUBLE_RULE}
  >
    <div className="aspect-[16/10] overflow-hidden bg-[#f0ece4]">
      {post.coverImage ? (
        <img
          src={cld(post.coverImage, 1100, { crop: 'fill', aspectRatio: '16/10' })}
          srcSet={cldSrcSet(post.coverImage, DEFAULT_WIDTHS, { crop: 'fill', aspectRatio: '16/10' })}
          sizes="(min-width: 768px) 58vw, 100vw"
          alt={post.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-black/25 text-xs uppercase tracking-[0.3em]">
          Designature
        </div>
      )}
    </div>
    <div className="flex flex-col justify-center">
      <span
        className="w-fit text-[10px] font-bold uppercase tracking-[0.2em] text-black/45 py-1.5 mb-4"
        style={{ borderTop: '2px solid #141414', borderBottom: `1px solid ${RULE}` }}
      >
        Featured{post.category ? ` · ${post.category.title}` : ''}
      </span>
      <h2 className="font-display font-bold text-[clamp(30px,4.6vw,56px)] leading-[1.0] mb-4 group-hover:text-black/70 transition-colors">
        {post.title}
      </h2>
      {post.excerpt && (
        <p className="text-[15px] md:text-base text-black/65 leading-relaxed max-w-[46ch]">
          {post.excerpt}
        </p>
      )}
      <span className="mt-5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#0047AB]">
        Read the story →
      </span>
    </div>
  </Link>
);

/** A large secondary story — image top, deck below. */
const SecondaryCard: React.FC<{ post: BlogPost }> = ({ post }) => (
  <Link to={postHref(post)} className="group block md:pr-10">
    <div className="aspect-[16/9] overflow-hidden bg-[#f0ece4] mb-4">
      {post.coverImage && (
        <img
          src={cld(post.coverImage, 900, { crop: 'fill', aspectRatio: '16/9' })}
          srcSet={cldSrcSet(post.coverImage, DEFAULT_WIDTHS, { crop: 'fill', aspectRatio: '16/9' })}
          sizes="(min-width: 768px) 40vw, 100vw"
          alt={post.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
        />
      )}
    </div>
    <Kick post={post} />
    <h3 className="mt-1.5 font-display font-bold text-[clamp(24px,3vw,34px)] leading-[1.05] mb-2.5 group-hover:text-black/70 transition-colors">
      {post.title}
    </h3>
    {post.excerpt && (
      <p className="text-[14.5px] text-black/62 leading-relaxed max-w-[52ch]">{post.excerpt}</p>
    )}
    {post.publishedAt && (
      <p className="mt-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-black/40">
        {formatPostDate(post.publishedAt)}
      </p>
    )}
  </Link>
);

/** A compact image card for the "In this issue" column. */
const MiniCard: React.FC<{ post: BlogPost; last?: boolean }> = ({ post, last }) => (
  <Link
    to={postHref(post)}
    className="group grid grid-cols-[88px_1fr] gap-4 items-center py-[18px]"
    style={last ? undefined : { borderBottom: `1px solid ${RULE}` }}
  >
    <div className="aspect-square overflow-hidden bg-[#f0ece4]">
      {post.coverImage && (
        <img
          src={cld(post.coverImage, 240, { crop: 'fill', aspectRatio: '1/1' })}
          srcSet={cldSrcSet(post.coverImage, THUMB_WIDTHS, { crop: 'fill', aspectRatio: '1/1' })}
          sizes="88px"
          alt={post.title}
          className="w-full h-full object-cover"
        />
      )}
    </div>
    <div>
      <Kick post={post} />
      <h4 className="mt-0.5 font-display font-semibold text-[19px] leading-[1.1] group-hover:text-black/60 transition-colors">
        {post.title}
      </h4>
      {post.publishedAt && (
        <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-black/40">
          {formatPostDate(post.publishedAt)}
        </p>
      )}
    </div>
  </Link>
);

/** A standard front-page story — image top, serif title, short deck. */
const StandardCard: React.FC<{ post: BlogPost }> = ({ post }) => (
  <Link to={postHref(post)} className="group block">
    <div className="aspect-[5/4] overflow-hidden bg-[#f0ece4] mb-3.5">
      {post.coverImage && (
        <img
          src={cld(post.coverImage, 640, { crop: 'fill', aspectRatio: '5/4' })}
          srcSet={cldSrcSet(post.coverImage, CARD_WIDTHS, { crop: 'fill', aspectRatio: '5/4' })}
          sizes="(min-width: 768px) 33vw, 100vw"
          alt={post.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
        />
      )}
    </div>
    <Kick post={post} />
    <h3 className="mt-1.5 font-display font-bold text-[22px] leading-[1.08] mb-2 group-hover:text-black/70 transition-colors">
      {post.title}
    </h3>
    {post.excerpt && (
      <p className="text-[13px] text-black/60 leading-relaxed line-clamp-3">{post.excerpt}</p>
    )}
    {post.publishedAt && (
      <p className="mt-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-black/40">
        {formatPostDate(post.publishedAt)}
      </p>
    )}
  </Link>
);

/** One "A" band: a big secondary story beside a small image-card column. */
type BandA = { type: 'A'; secondary: BlogPost; minis: BlogPost[] };
/** One "B" band: a row of up to three standard stories. */
type BandB = { type: 'B'; standards: BlogPost[] };
type Band = BandA | BandB;

/** Tile the remaining posts into alternating A / B bands (A first). */
function buildBands(pool: BlogPost[]): Band[] {
  const bands: Band[] = [];
  let i = 0;
  let type: 'A' | 'B' = 'A';
  while (i < pool.length) {
    if (type === 'A') {
      const secondary = pool[i];
      const minis = pool.slice(i + 1, i + 4);
      bands.push({ type: 'A', secondary, minis });
      i += 1 + minis.length;
      type = 'B';
    } else {
      const standards = pool.slice(i, i + 3);
      bands.push({ type: 'B', standards });
      i += standards.length;
      type = 'A';
    }
  }
  return bands;
}

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

  // The pinned lead is the FIRST blog (earliest published), so a newer post never
  // bumps it. Ask the owner before changing which post leads.
  const firstBlog = useMemo(() => {
    const dated = (posts ?? []).filter((p) => p.publishedAt);
    const pool = dated.length ? dated : (posts ?? []);
    if (pool.length === 0) return null;
    return pool.reduce((oldest, p) => {
      const t = p.publishedAt ? new Date(p.publishedAt).getTime() : Infinity;
      const o = oldest.publishedAt ? new Date(oldest.publishedAt).getTime() : Infinity;
      return t < o ? p : oldest;
    });
  }, [posts]);

  const hasFilters = !!(category || tag || q);
  // Front page only when unfiltered (a front-page layout only makes sense for the full index).
  const showFrontPage = !hasFilters && filtered.length > 0 && !!firstBlog;
  const lead = showFrontPage ? firstBlog : null;
  const pool = showFrontPage ? filtered.filter((p) => p.id !== lead!.id) : filtered;
  const bands = useMemo(() => (showFrontPage ? buildBands(pool) : []), [showFrontPage, pool]);

  const catLink =
    'text-[12px] font-bold uppercase tracking-[0.16em] pb-1 transition-colors';

  return (
    <div className="min-h-screen bg-[#FBFAF7] font-body">
      <Header />

      {/* Nameplate masthead — newspaper front page */}
      <section className="max-w-[1200px] mx-auto px-6 md:px-10 pt-28 md:pt-32 text-center">
        <div
          className="flex flex-wrap justify-center sm:justify-between gap-x-6 gap-y-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-black/50 pb-2"
          style={{ borderBottom: `1px solid ${RULE}` }}
        >
          <Link to="/" className="hover:text-black transition-colors">
            Designature Studio
          </Link>
          <span>Yerevan · Est. 2026</span>
          <span>Dispatches from the studio</span>
        </div>
        <div className="py-3.5 md:py-4" style={DOUBLE_RULE}>
          <h1 className="font-display font-bold text-[clamp(48px,9vw,110px)] leading-[0.9] tracking-[2px]">
            The Journal
          </h1>
          <p className="mt-2.5 text-[11px] font-semibold uppercase tracking-[0.34em] text-black/55">
            Design thinking · Real projects · Strong opinions
          </p>
        </div>
      </section>

      {/* Category text sub-nav */}
      {categories.length > 0 && (
        <div style={{ borderBottom: `1px solid ${RULE}` }}>
          <div className="max-w-[1200px] mx-auto px-6 md:px-10 py-4 flex flex-wrap gap-x-7 gap-y-3 justify-center">
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
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 pt-8">
        <div className="flex flex-col lg:flex-row lg:items-center gap-6 justify-between">
          <input
            type="search"
            value={q}
            onChange={(e) => setParam('q', e.target.value, true)}
            placeholder="Search the journal…"
            className="w-full lg:max-w-sm border border-black/15 px-4 py-3 text-sm text-black bg-white outline-none focus:border-black transition-colors"
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
        {hasFilters && (
          <button
            type="button"
            onClick={() => setSearchParams({}, { replace: false })}
            className="mt-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[#9E5E41] hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Front page (unfiltered) OR uniform grid (filtered) */}
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 pt-8 pb-16 md:pb-24">
        {posts === null ? (
          <p className="text-sm text-black/50 italic">Loading the journal…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-black/60">
            {posts.length === 0
              ? 'No articles yet — check back soon.'
              : 'No articles match your filters.'}
          </p>
        ) : showFrontPage ? (
          <>
            <FeaturedLead post={lead!} />
            {bands.map((band, bi) =>
              band.type === 'A' ? (
                <div
                  key={bi}
                  className="grid md:grid-cols-[1.5fr_1fr] mt-8 md:mt-9 pb-8"
                  style={{ borderBottom: `1px solid ${RULE}` }}
                >
                  <div className="md:border-r md:border-black/[0.16]">
                    <SecondaryCard post={band.secondary} />
                  </div>
                  {band.minis.length > 0 && (
                    <div className="md:pl-10 mt-8 md:mt-0">
                      <div
                        className="text-[10px] font-bold uppercase tracking-[0.2em] text-black pb-2"
                        style={{ borderBottom: '2px solid #141414' }}
                      >
                        In this issue
                      </div>
                      {band.minis.map((m, mi) => (
                        <MiniCard key={m.id} post={m} last={mi === band.minis.length - 1} />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div key={bi} className="grid md:grid-cols-3 gap-y-10 mt-8 md:mt-9">
                  {band.standards.map((s, si) => (
                    <div
                      key={s.id}
                      className={si === 0 ? 'md:px-7 md:pl-0' : 'md:px-7 md:border-l md:border-black/[0.16]'}
                    >
                      <StandardCard post={s} />
                    </div>
                  ))}
                </div>
              )
            )}
          </>
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
