/**
 * /journal/:slug — a single article.
 *
 * Cover · title · (category · date · author) · optional AI-disclosure banner ·
 * markdown body (react-markdown) · tag chips · FAQ (from post.seo.faq) · two CTAs
 * (Try AI Vision free / Book a consultation) · moderated comments.
 *
 * An unknown/unpublished slug (after load) bounces to the Journal index.
 */
import React, { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import Header from './Header';
import Footer from './Footer';
import AIDisclosureBanner from './journal/AIDisclosureBanner';
import Comments from './journal/Comments';
import { formatPostDate } from './journal/PostCard';
import { fetchPost } from '../lib/sanity';
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

  if (loaded && !post) return <Navigate to="/journal" replace />;

  const date = formatPostDate(post?.publishedAt);
  const faq = post?.seo?.faq ?? [];

  return (
    <div className="min-h-screen bg-white font-body">
      <Header />

      <article className="max-w-[820px] mx-auto px-6 md:px-8 pt-28 md:pt-36 pb-20">
        {!loaded || !post ? (
          <p className="text-sm text-black/50 italic">Loading…</p>
        ) : (
          <>
            <Link
              to="/journal"
              className="text-[11px] font-bold uppercase tracking-[0.25em] text-black/60 hover:text-black transition-colors"
            >
              ← The Journal
            </Link>

            {/* Meta line */}
            <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold uppercase tracking-[0.2em] text-black/55">
              {post.category && (
                <Link
                  to={`/journal/category/${encodeURIComponent(post.category.slug)}`}
                  className="text-[#9E5E41] hover:underline"
                >
                  {post.category.title}
                </Link>
              )}
              {post.category && date && <span className="text-black/25">·</span>}
              {date && <span>{date}</span>}
              {post.author && <span className="text-black/25">·</span>}
              {post.author && <span className="normal-case tracking-normal font-medium text-black/60">{post.author}</span>}
            </div>

            <h1 className="mt-5 text-3xl md:text-5xl font-bold font-display tracking-architectural leading-[1.05]">
              {post.title}
            </h1>

            {/* Lead — the little intro before the hero image */}
            {(post.intro || post.excerpt) && (
              <p className="mt-6 text-lg text-black/70 font-light leading-relaxed">{post.intro || post.excerpt}</p>
            )}

            {/* Before / After — the signature module (falls back to a plain cover) */}
            {post.beforeImage && post.afterImage ? (
              <figure className="mt-10">
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
            ) : post.coverImage ? (
              <div className="mt-10 aspect-[16/9] overflow-hidden bg-neutral-100">
                <img
                  src={cld(post.coverImage, 1024, { crop: 'fill', aspectRatio: '16/9' })}
                  srcSet={cldSrcSet(post.coverImage, DEFAULT_WIDTHS, { crop: 'fill', aspectRatio: '16/9' })}
                  sizes="(min-width: 820px) 820px, 100vw"
                  alt={post.title}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : null}

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
                {(post.personalNotes ?? []).map((q, i) => (
                  <blockquote
                    key={i}
                    className="relative rounded-xl border border-[#9E5E41]/60 bg-white px-6 py-5 shadow-[0_6px_20px_rgba(158,94,65,0.08)]"
                  >
                    <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-[#9E5E41]">
                      From my studio
                    </span>
                    <p className="font-display text-lg md:text-xl italic leading-snug text-[#0B2240]">“{q}”</p>
                  </blockquote>
                ))}
              </div>
            )}

            {/* Shop this room */}
            {(post.shoppingItems ?? []).length > 0 && (
              <div className="mt-12 overflow-hidden rounded-2xl border border-black/10">
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
                  <span className="rounded-full bg-[#9E5E41] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em]">
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
                <div className="border-t border-black/8 bg-[#FAF7F2] px-5 py-4">
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
                <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-white group-hover:text-[#C79A6A] transition-colors">
                  Book a consultation →
                </span>
              </Link>
            </section>

            {/* Comments */}
            <Comments slug={post.slug} />
          </>
        )}
      </article>

      <Footer />
    </div>
  );
};

export default JournalArticlePage;
