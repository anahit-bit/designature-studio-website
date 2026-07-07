/**
 * /journal/:slug — a single article.
 *
 * Photo hero (cover, or afterImage as a fallback) with the title + meta overlaid,
 * then the article: lead · "The transformation" (before/after) · versionImage ·
 * AI-disclosure banner · markdown body · "From my studio" notes · Shop-this-room ·
 * tags · FAQ (post.seo.faq) · two CTA cards · comments · "More from the Journal".
 *
 * An unknown/unpublished slug (after load) bounces to the Journal index.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import Header from './Header';
import Footer from './Footer';
import AIDisclosureBanner from './journal/AIDisclosureBanner';
import Comments from './journal/Comments';
import PostCard, { formatPostDate } from './journal/PostCard';
import { fetchPost, fetchPosts } from '../lib/sanity';
import { cld, cldSrcSet, DEFAULT_WIDTHS, CARD_WIDTHS } from '../lib/cld';
import type { BlogPost } from '../types';

// Markdown element styling (no typography plugin in this project — map by hand).
const MD_COMPONENTS = {
  h2: (props: any) => (
    <h2 className="text-2xl md:text-3xl font-bold font-display tracking-tight mt-12 mb-4" {...props} />
  ),
  h3: (props: any) => (
    <h3 className="text-xl md:text-2xl font-bold font-display tracking-tight mt-10 mb-3" {...props} />
  ),
  p: (props: any) => <p className="text-[15px] md:text-base text-black/80 leading-[1.8] mb-6" {...props} />,
  ul: (props: any) => <ul className="list-disc pl-6 mb-6 flex flex-col gap-2 text-black/80" {...props} />,
  ol: (props: any) => <ol className="list-decimal pl-6 mb-6 flex flex-col gap-2 text-black/80" {...props} />,
  li: (props: any) => <li className="text-[15px] md:text-base leading-[1.7]" {...props} />,
  a: (props: any) => <a className="text-[#0047AB] underline underline-offset-2 hover:text-[#003d99]" {...props} />,
  blockquote: (props: any) => (
    <blockquote className="border-l-2 border-[#9E5E41] pl-6 my-8 italic text-black/70" {...props} />
  ),
  img: (props: any) => <img className="w-full my-8" loading="lazy" {...props} />,
  code: (props: any) => <code className="bg-black/5 px-1.5 py-0.5 text-[13px]" {...props} />,
  hr: () => <hr className="my-10 border-black/10" />,
};

const JournalArticlePage: React.FC = () => {
  const { slug = '' } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [allPosts, setAllPosts] = useState<BlogPost[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    fetchPost(slug)
      .then((p) => {
        if (cancelled) return;
        setPost(p);
        setLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setPost(null);
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // All posts (cached fetcher) for the "More from the Journal" rail.
  useEffect(() => {
    let cancelled = false;
    fetchPosts()
      .then((p) => {
        if (!cancelled) setAllPosts(p);
      })
      .catch(() => {
        if (!cancelled) setAllPosts([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const date = formatPostDate(post?.publishedAt);
  const faq = post?.seo?.faq ?? [];

  // Read time from the body word count (~200 wpm).
  const readMin = useMemo(() => {
    const words = (post?.body || '').trim().split(/\s+/).filter(Boolean).length;
    return words ? Math.max(1, Math.round(words / 200)) : 0;
  }, [post?.body]);

  // Up to 3 related: same category first, then newest — always excluding this post.
  const related = useMemo(() => {
    if (!post) return [];
    const others = allPosts.filter((p) => p.slug !== post.slug);
    const sameCat = others.filter(
      (p) => post.category?.slug && p.category?.slug === post.category.slug,
    );
    const rest = others.filter((p) => !sameCat.includes(p));
    return [...sameCat, ...rest].slice(0, 3);
  }, [post, allPosts]);

  if (loaded && !post) return <Navigate to="/journal" replace />;

  const heroImg = post?.coverImage || post?.afterImage;
  const authorInitial = (post?.author || 'D').charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-white font-body">
      <Header onDark />

      {!loaded || !post ? (
        // Dark placeholder so the white (onDark) header stays legible while loading.
        <section className="w-full h-[52vh] min-h-[380px] bg-[#0B2240] flex items-center justify-center">
          <p className="text-white/60 text-sm italic">Loading…</p>
        </section>
      ) : (
        <>
          {/* Photo hero */}
          <section className="relative w-full h-[60vh] md:h-[68vh] min-h-[440px] max-h-[720px] overflow-hidden bg-black">
            {heroImg && (
              <img
                src={cld(heroImg, 1600)}
                srcSet={cldSrcSet(heroImg, DEFAULT_WIDTHS)}
                sizes="100vw"
                alt={post.title}
                loading="eager"
                className="absolute inset-0 w-full h-full object-cover"
                draggable={false}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/15 to-black/70" />
            <div className="relative z-10 h-full max-w-[900px] mx-auto px-8 md:px-10 w-full flex flex-col justify-between pt-28 pb-12 md:pb-14">
              <Link
                to="/journal"
                className="text-[11px] font-bold uppercase tracking-[0.35em] text-white/75 hover:text-white transition-colors flex items-center gap-2 w-fit"
              >
                ← The Journal
              </Link>
              <div>
                {post.category && (
                  <Link
                    to={`/journal/category/${encodeURIComponent(post.category.slug)}`}
                    className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#9E5E41] hover:text-white transition-colors"
                  >
                    {post.category.title}
                  </Link>
                )}
                <h1 className="mt-3 text-3xl md:text-5xl lg:text-6xl font-bold font-display text-white tracking-architectural leading-[1.02]">
                  {post.title}
                </h1>
                <div className="mt-5 flex flex-wrap items-center gap-3 text-[12px] tracking-[0.05em] text-white/80">
                  <span className="w-8 h-8 rounded-full bg-[#0047AB] text-white inline-flex items-center justify-center text-[11px] font-bold">
                    {authorInitial}
                  </span>
                  {post.author && <span className="font-medium">{post.author}</span>}
                  {post.author && date && <span className="text-white/40">·</span>}
                  {date && <span>{date}</span>}
                  {readMin > 0 && <span className="text-white/40">·</span>}
                  {readMin > 0 && <span>{readMin} min read</span>}
                </div>
              </div>
            </div>
          </section>

          <article className="max-w-[820px] mx-auto px-6 md:px-8 pt-12 md:pt-16 pb-20">
            {/* Lead paragraph */}
            {(post.intro || post.excerpt) && (
              <p className="text-lg md:text-xl text-black/70 font-light leading-relaxed">
                {post.intro || post.excerpt}
              </p>
            )}

            {/* The transformation — the signature Before/After module */}
            {post.beforeImage && post.afterImage && (
              <figure className="mt-12">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.24em] text-black/50 mb-5">
                  The transformation
                </h2>
                <div className="grid grid-cols-2 gap-2 md:gap-3">
                  {[
                    { url: post.beforeImage, label: 'Before', cls: 'bg-[#4A4038]' },
                    { url: post.afterImage, label: 'After · AI', cls: 'bg-[#9E5E41]' },
                  ].map((c) => (
                    <div key={c.label} className="relative aspect-[4/3] overflow-hidden bg-neutral-100">
                      <span
                        className={`absolute top-2.5 left-2.5 z-10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-white ${c.cls}`}
                      >
                        {c.label}
                      </span>
                      <img
                        src={cld(c.url, 640, { crop: 'fill', aspectRatio: '4/3' })}
                        srcSet={cldSrcSet(c.url, CARD_WIDTHS, { crop: 'fill', aspectRatio: '4/3' })}
                        sizes="(min-width: 820px) 410px, 50vw"
                        alt={`${post.title} — ${c.label}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
                {post.beforeAfterCaption && (
                  <figcaption className="mt-3 text-center text-[12px] text-black/50">
                    {post.beforeAfterCaption}
                  </figcaption>
                )}
              </figure>
            )}

            {/* Alternate version of the same room */}
            {post.versionImage && (
              <figure className="mt-4">
                <img
                  src={cld(post.versionImage, 1024, { crop: 'limit' })}
                  srcSet={cldSrcSet(post.versionImage, DEFAULT_WIDTHS, { crop: 'limit' })}
                  sizes="(min-width: 820px) 820px, 100vw"
                  alt={`${post.title} — alternate version`}
                  className="w-full"
                  loading="lazy"
                />
                <figcaption className="mt-3 text-center text-[12px] text-black/50">
                  Same room, a warmer alternative — from the same photo.
                </figcaption>
              </figure>
            )}

            {post.aiDisclosure && (
              <div className="mt-10">
                <AIDisclosureBanner />
              </div>
            )}

            {/* Body */}
            <div className="mt-10">
              {post.body ? (
                <ReactMarkdown components={MD_COMPONENTS}>{post.body}</ReactMarkdown>
              ) : (
                <p className="text-sm text-black/50 italic">This article has no content yet.</p>
              )}
            </div>

            {/* “From my studio” personal notes */}
            {(post.personalNotes ?? []).length > 0 && (
              <div className="mt-6 flex flex-col gap-4">
                {(post.personalNotes ?? []).map((quote, i) => (
                  <blockquote
                    key={i}
                    className="relative border border-[#9E5E41]/60 bg-white px-6 py-5 shadow-[0_6px_20px_rgba(158,94,65,0.08)]"
                  >
                    <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-[#9E5E41]">
                      From my studio
                    </span>
                    <p className="font-display text-lg md:text-xl italic leading-snug text-[#0B2240]">“{quote}”</p>
                  </blockquote>
                ))}
              </div>
            )}

            {/* Shop this room */}
            {(post.shoppingItems ?? []).length > 0 && (
              <div className="mt-12 overflow-hidden border border-black/10">
                {post.shoppingImage && (
                  <img
                    src={cld(post.shoppingImage, 1024, { crop: 'limit' })}
                    srcSet={cldSrcSet(post.shoppingImage, DEFAULT_WIDTHS, { crop: 'limit' })}
                    sizes="(min-width: 820px) 820px, 100vw"
                    alt="Shop this room"
                    className="w-full"
                    loading="lazy"
                  />
                )}
                <div className="flex items-center justify-between gap-2 bg-[#0B2240] px-5 py-3.5 text-white">
                  <span className="font-display text-xl">Shop this room</span>
                  <span className="bg-[#9E5E41] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em]">
                    Auto-generated list
                  </span>
                </div>
                <ul>
                  {(post.shoppingItems ?? []).map((it, i) => (
                    <li key={i} className="flex items-baseline gap-2 border-t border-black/8 px-5 py-3">
                      {it.url ? (
                        <a
                          href={it.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="border-b border-[#0047AB]/30 text-[15px] font-semibold text-[#0047AB] hover:border-[#0047AB]"
                        >
                          {it.name}
                        </a>
                      ) : (
                        <span className="text-[15px] font-semibold text-[#0B2240]">{it.name}</span>
                      )}
                      {it.retailer && <span className="text-[12.5px] text-black/50">{it.retailer}</span>}
                      {it.price && (
                        <span className="ml-auto whitespace-nowrap text-[13.5px] font-semibold text-black/80">
                          {it.price}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                <div className="border-t border-black/8 bg-[#FAFAFA] px-5 py-4">
                  <p className="mb-2 text-[11.5px] italic text-black/50">
                    Example matches — the live Shopping List builds an exact, shoppable list for your own room &amp; region.
                  </p>
                  <Link to="/ai-vision" className="text-[14px] font-semibold text-[#0B2240]">
                    Want a list like this for your space?{' '}
                    <span className="border-b border-[#0047AB]/30 text-[#0047AB]">Generate your shopping list →</span>
                  </Link>
                </div>
              </div>
            )}

            {/* Tags */}
            {(post.tags ?? []).length > 0 && (
              <div className="mt-10 flex flex-wrap gap-2">
                {(post.tags ?? []).map((t) => (
                  <Link
                    key={t}
                    to={`/journal?tag=${encodeURIComponent(t)}`}
                    className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] border border-black/15 text-black/60 hover:border-[#9E5E41] hover:text-[#9E5E41] transition-colors"
                  >
                    #{t}
                  </Link>
                ))}
              </div>
            )}

            {/* FAQ */}
            {faq.length > 0 && (
              <section className="mt-16 pt-12 border-t border-black/10">
                <h2 className="text-2xl md:text-3xl font-bold font-display tracking-tight mb-8">
                  Frequently asked questions
                </h2>
                <div className="flex flex-col divide-y divide-black/8">
                  {faq.map((item, i) => (
                    <div key={i} className="py-5">
                      <h3 className="text-base font-bold text-black mb-2">{item.question}</h3>
                      <p className="text-[15px] text-black/75 leading-relaxed">{item.answer}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* CTAs */}
            <section className="mt-16 grid sm:grid-cols-2 gap-4">
              <Link
                to="/ai-vision"
                className="group flex flex-col justify-between gap-6 border border-black/10 bg-[#FAFAFA] p-8 hover:border-black transition-colors"
              >
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#9E5E41] mb-3">
                    Free AI tool
                  </p>
                  <p className="text-xl font-bold font-display tracking-tight">
                    See your room reimagined
                  </p>
                </div>
                <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-black group-hover:text-[#9E5E41] transition-colors">
                  Try AI Vision free →
                </span>
              </Link>
              <Link
                to="/consultation"
                className="group flex flex-col justify-between gap-6 border border-black/10 bg-black text-white p-8 hover:bg-[#111] transition-colors"
              >
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/60 mb-3">
                    Work with us
                  </p>
                  <p className="text-xl font-bold font-display tracking-tight">
                    Bring your space to life
                  </p>
                </div>
                <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-white group-hover:text-[#9E5E41] transition-colors">
                  Book a consultation →
                </span>
              </Link>
            </section>

            {/* Comments */}
            <Comments slug={post.slug} />
          </article>

          {/* More from the Journal */}
          {related.length > 0 && (
            <section className="bg-[#FAFAFA] border-t border-black/5 py-16 md:py-20">
              <div className="max-w-[1180px] mx-auto px-8 md:px-16">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.24em] text-black/50 mb-10">
                  More from the Journal
                </h2>
                <div className="grid md:grid-cols-3 gap-10 md:gap-x-10 md:gap-y-12">
                  {related.map((p) => (
                    <PostCard key={p.id} post={p} />
                  ))}
                </div>
              </div>
            </section>
          )}
        </>
      )}

      <Footer />
    </div>
  );
};

export default JournalArticlePage;
