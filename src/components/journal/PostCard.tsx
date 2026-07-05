/**
 * Journal post card — shared by the Journal index and category pages.
 *
 * Design mirrors the homepage teaser (Blog.tsx): 16:10 cover, a category chip
 * top-left, date, title, and a hairline underline that grows on hover. The whole
 * cover + title link to the article; the category chip is a *sibling* link (not a
 * nested anchor) so it can route to the category page independently.
 *
 * Cover sizing goes through src/lib/cld.ts (Cloudinary f_auto/q_auto + fill crop).
 */
import React from 'react';
import { Link } from 'react-router-dom';
import type { BlogPost } from '../../types';
import { cld, cldSrcSet, CARD_WIDTHS } from '../../lib/cld';

/** ISO date → e.g. "MAR 24, 2024" (uppercased, matches the site's editorial style). */
export function formatPostDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    .toUpperCase();
}

const COVER_OPTS = { crop: 'fill' as const, aspectRatio: '16/10', quality: 'good' as const };

const PostCard: React.FC<{ post: BlogPost }> = ({ post }) => {
  const href = `/journal/${encodeURIComponent(post.slug)}`;
  const date = formatPostDate(post.publishedAt);

  return (
    <article className="group">
      <div className="relative">
        <Link to={href} className="block aspect-[16/10] overflow-hidden bg-neutral-100">
          {post.coverImage ? (
            <img
              src={cld(post.coverImage, 640, COVER_OPTS)}
              srcSet={cldSrcSet(post.coverImage, CARD_WIDTHS, COVER_OPTS)}
              sizes="(min-width: 768px) 33vw, 100vw"
              alt={post.title}
              loading="lazy"
              className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-black/30 text-xs uppercase tracking-[0.3em]">
              Designature
            </div>
          )}
        </Link>
        {post.category && (
          <Link
            to={`/journal/category/${encodeURIComponent(post.category.slug)}`}
            className="absolute top-6 left-6 bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-black hover:bg-[#9E5E41] hover:text-white transition-colors"
          >
            {post.category.title}
          </Link>
        )}
      </div>

      {date && (
        <p className="mt-8 text-[11px] font-bold uppercase tracking-[0.3em] text-black/55">{date}</p>
      )}
      <Link to={href} className="block mt-4">
        <h3 className="text-xl md:text-2xl font-bold font-display tracking-tight leading-snug group-hover:text-neutral-500 transition-colors">
          {post.title}
        </h3>
      </Link>
      {post.excerpt && (
        <p className="mt-3 text-sm text-black/65 font-light leading-relaxed line-clamp-3">
          {post.excerpt}
        </p>
      )}
      <div className="mt-6 w-8 h-[1px] bg-black group-hover:w-full transition-all duration-700" />
    </article>
  );
};

export default PostCard;
