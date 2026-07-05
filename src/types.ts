import React from 'react';

export interface Project {
  id: string;
  title: string;
  category: string;
  imageUrl: string;
  description: string;
  area?: string;
  date?: string;
  location?: string;
  gallery?: string[];
}

export interface Service {
  id: string;
  title: string;
  description: string;
  renderIcon: () => React.ReactNode;
}

export interface HeroSlide {
  id: number;
  title: string;
  subtitle: string;
  imageUrl: string;
}

export interface Message {
  role: 'user' | 'model';
  text: string;
  image?: string;
}

/** A single FAQ pair authored on a post's `seo.faq[]` (drives the on-page FAQ + FAQPage JSON-LD). */
export interface BlogFaq {
  question: string;
  answer: string;
}

/** SEO overrides authored on a post (`post.seo`). All optional — fall back to derived values. */
export interface BlogSeo {
  metaTitle?: string;
  metaDescription?: string;
  faq?: BlogFaq[];
}

/** Lightweight category reference dereferenced onto a post (`category->{title, slug}`). */
export interface CategoryRef {
  title: string;
  slug: string;
}

/** A Journal category (`category` doc type in Sanity). */
export interface Category {
  title: string;
  slug: string;
  description?: string;
  order?: number;
}

/**
 * A Journal post (`post` doc type in Sanity). `body` + `seo` are only populated by
 * the single-post fetch (`fetchPost`); list fetches (`fetchPosts`) omit them for weight.
 */
export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  body?: string; // markdown
  coverImage?: string;
  category?: CategoryRef;
  tags?: string[];
  author?: string;
  publishedAt?: string;
  aiDisclosure?: boolean;
  seo?: BlogSeo;
}

