
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { fetchPosts } from '../lib/sanity';
import type { BlogPost } from '../types';
import PostCard from './journal/PostCard';

/**
 * Homepage "Journal" teaser. Pulls the three most-recent published posts from
 * Sanity and links into /journal (index) + /journal/:slug (articles). Renders
 * nothing until at least one post exists, so the homepage never shows an empty
 * blog band when the CMS is empty or unreachable.
 */
const Blog: React.FC = () => {
  const { t } = useLanguage();
  const [posts, setPosts] = useState<BlogPost[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchPosts()
      .then((p) => {
        if (!cancelled) setPosts(p.slice(0, 3));
      })
      .catch(() => {
        if (!cancelled) setPosts([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (posts.length === 0) return null;

  return (
    <section id="blog" className="pt-20 md:pt-32 pb-0 bg-white border-t border-black/5 font-body">
      <div className="max-w-[1800px] mx-auto px-8 md:px-16">
        <div className="grid lg:grid-cols-12 gap-12 items-end mb-16 md:mb-24">
          <div className="lg:col-span-8">
            <h2 className="text-sm md:text-base font-bold uppercase tracking-[0.6em] text-black/65 mb-8">{t('blog.title')}</h2>
            <h3 className="text-4xl md:text-6xl lg:text-7xl font-bold font-display tracking-architectural leading-[0.95]">
              {t('blog.heading')}
            </h3>
          </div>
          <div className="lg:col-span-4 lg:text-right">
            <Link
              to="/journal"
              className="group inline-flex items-center gap-4 text-sm md:text-base font-bold uppercase tracking-[0.4em] border-b border-black/10 pb-2 hover:border-black transition-all"
            >
              {t('btn.allInsights')}
              <ArrowUpRight className="w-4 h-4 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-12 md:gap-16">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Blog;
