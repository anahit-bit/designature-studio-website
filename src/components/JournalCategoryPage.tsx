/**
 * /journal/category/:slug — a single category's landing page.
 *
 * Photo hero (top-page grammar) with the category title + post count, then the
 * category's published posts in the shared PostCard grid. An unknown slug (after
 * posts/categories have loaded) bounces back to the Journal index. Sanity failure
 * is graceful.
 */
import React, { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import PostCard from './journal/PostCard';
import { fetchPosts, fetchCategories } from '../lib/sanity';
import { cld, cldSrcSet, DEFAULT_WIDTHS } from '../lib/cld';
import type { BlogPost, Category } from '../types';

const JOURNAL_HERO_FALLBACK =
  'https://res.cloudinary.com/dys2k5muv/image/upload/v1783339019/journal/blog01-after-light.jpg';

const JournalCategoryPage: React.FC = () => {
  const { slug = '' } = useParams<{ slug: string }>();
  const [posts, setPosts] = useState<BlogPost[] | null>(null);
  const [categories, setCategories] = useState<Category[] | null>(null);

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

  // Wait for load before deciding anything.
  const loading = posts === null || categories === null;
  const category = categories?.find((c) => c.slug === slug) ?? null;

  // Unknown category once data is in → back to the index.
  if (!loading && !category) return <Navigate to="/journal" replace />;

  const categoryPosts = (posts ?? []).filter((p) => p.category?.slug === slug);
  const heroImg = categoryPosts[0]?.coverImage || JOURNAL_HERO_FALLBACK;
  const count = categoryPosts.length;

  return (
    <div className="min-h-screen bg-white font-body">
      <Header onDark />

      {/* Photo hero — top-page grammar */}
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
              to="/journal"
              className="text-[11px] font-bold uppercase tracking-[0.35em] text-white/75 mb-10 hover:text-white transition-colors flex items-center gap-2 w-fit"
            >
              ← The Journal
            </Link>
            <h1 className="text-3xl md:text-5xl lg:text-[5.5vw] font-bold font-display text-white tracking-architectural leading-[0.85] uppercase mb-8 animate-in fade-in slide-in-from-bottom duration-1000">
              {category?.title ?? '…'}
            </h1>
            <p className="text-white/80 text-base md:text-xl font-light leading-relaxed max-w-xl animate-in fade-in slide-in-from-bottom duration-1000 delay-300">
              {count} article{count === 1 ? '' : 's'}
            </p>
          </div>
        </div>
      </section>

      {/* Grid */}
      <div className="max-w-[1180px] mx-auto px-8 md:px-16 py-14 md:py-20">
        {loading ? (
          <p className="text-sm text-black/50 italic">Loading…</p>
        ) : categoryPosts.length === 0 ? (
          <p className="text-sm text-black/60">No articles in this category yet.</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12 md:gap-x-12 md:gap-y-16">
            {categoryPosts.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default JournalCategoryPage;
