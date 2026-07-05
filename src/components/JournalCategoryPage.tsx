/**
 * /journal/category/:slug — a single category's landing page.
 *
 * Shows the category title + description and its published posts (reusing the
 * PostCard grid). An unknown slug (after posts/categories have loaded) bounces
 * back to the Journal index. Sanity failure is graceful.
 */
import React, { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import PostCard from './journal/PostCard';
import { fetchPosts, fetchCategories } from '../lib/sanity';
import type { BlogPost, Category } from '../types';

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

  return (
    <div className="min-h-screen bg-white font-body">
      <Header />

      <div className="max-w-[1800px] mx-auto px-8 md:px-16 pt-28 md:pt-36 pb-10">
        <Link
          to="/journal"
          className="text-[11px] font-bold uppercase tracking-[0.25em] text-black/60 hover:text-black transition-colors"
        >
          ← The Journal
        </Link>
        <div className="max-w-3xl mt-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.5em] text-[#9E5E41] mb-6">
            Category
          </p>
          <h1 className="text-4xl md:text-6xl font-bold font-display tracking-architectural leading-[0.95] mb-6">
            {category?.title ?? '…'}
          </h1>
          {category?.description && (
            <p className="text-black/70 text-sm md:text-base font-light leading-relaxed">
              {category.description}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-8 md:px-16 py-12 md:py-16 border-t border-black/10">
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
