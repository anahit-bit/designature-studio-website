/**
 * Sanity client + projects fetcher.
 *
 * The website reads portfolio data from Sanity's public CDN (no auth token
 * needed — dataset is public). Sanity stores content in a simpler
 * English-only shape; this module maps it back to the existing `ProjectData`
 * shape the components already consume, so the UI code barely changes.
 *
 * Edits in Sanity Studio propagate to the public CDN within seconds.
 */
import { createClient } from '@sanity/client'
import type { ProjectData } from '../constants'
import type { BlogPost, Category } from '../types'

// ── Client ──────────────────────────────────────────────────────────────────
export const sanityClient = createClient({
  projectId: '305mgeeu',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: true, // CDN = fast + cheap; eventually-consistent (< 1s lag)
})

// ── Types (shape returned by the GROQ query below) ─────────────────────────
interface SanityProject {
  _id: string
  title: string
  category: 'Residential' | 'Commercial'
  order?: number
  featured?: boolean
  coverImage: string
  description: string
  area?: string
  date?: string
  location?: string
  gallery?: Array<{ url: string; alt?: string; slot?: string }>
}

// ── Hard-coded AM translations for category enum ───────────────────────────
// Other bilingual fields (title, description, location) fall back to EN
// until the i18n plugin is enabled in Sanity.
const CATEGORY_AM: Record<'Residential' | 'Commercial', 'Բնակելի' | 'Կոմերցիոն'> = {
  Residential: 'Բնակելի',
  Commercial: 'Կոմերցիոն',
}

// ── Mapper: Sanity doc → ProjectData ───────────────────────────────────────
function toProjectData(doc: SanityProject): ProjectData {
  return {
    id: doc._id.replace(/^project-/, ''),
    titleEN: doc.title,
    titleAM: doc.title, // EN fallback until i18n is enabled
    categoryEN: doc.category,
    categoryAM: CATEGORY_AM[doc.category],
    imageUrl: doc.coverImage,
    descriptionEN: doc.description,
    descriptionAM: doc.description,
    area: doc.area ?? '',
    date: doc.date ?? '',
    locationEN: doc.location ?? '',
    locationAM: doc.location ?? '',
    gallery: (doc.gallery ?? []).map((g) => g.url),
  }
}

// ── GROQ query ─────────────────────────────────────────────────────────────
// Sorted by the manual `order` field first, then _id for stability.
const PROJECTS_QUERY = `*[_type == "project"] | order(order asc, _id) {
  _id,
  title,
  category,
  order,
  featured,
  coverImage,
  description,
  area,
  date,
  location,
  gallery[]{url, alt, slot}
}`

// ── Public API ─────────────────────────────────────────────────────────────
let cache: ProjectData[] | null = null
let inflight: Promise<ProjectData[]> | null = null

/**
 * Fetches all projects from Sanity. Deduped at module level so calling it
 * from multiple components / mount points only triggers one network request.
 * Results are cached for the lifetime of the page.
 */
export async function fetchProjects(): Promise<ProjectData[]> {
  if (cache) return cache
  if (inflight) return inflight
  inflight = (async () => {
    const docs = await sanityClient.fetch<SanityProject[]>(PROJECTS_QUERY)
    const projects = docs.map(toProjectData)
    cache = projects
    return projects
  })()
  try {
    return await inflight
  } finally {
    inflight = null // allow retry if it failed
  }
}

/** Cached synchronous peek — returns null until the first fetch resolves. */
export function getCachedProjects(): ProjectData[] | null {
  return cache
}

// ── Retailers (I-026) ───────────────────────────────────────────────────────
// The curated Shopping List catalog lives in Sanity as `retailer` documents,
// editable in Studio. The website reads only active retailers. The bundled
// FREE_TIER_RETAILERS in src/data/retailers.ts is the offline fallback.

export interface Retailer {
  name: string
  domain: string
  categories: string[]
  budget: string
  tier: 'free' | 'design' | 'studio'
  regions: string[]
  order: number
  notes?: string
}

const RETAILERS_QUERY = `*[_type == "retailer" && active == true] | order(order asc, name asc) {
  name,
  domain,
  categories,
  budget,
  tier,
  regions,
  order,
  notes
}`

let retailerCache: Retailer[] | null = null
let retailerInflight: Promise<Retailer[]> | null = null

/**
 * Fetches active retailers from Sanity. Deduped + cached at module level, same
 * pattern as fetchProjects() — one network request per page lifetime.
 */
export async function fetchRetailers(): Promise<Retailer[]> {
  if (retailerCache) return retailerCache
  if (retailerInflight) return retailerInflight
  retailerInflight = (async () => {
    const docs = await sanityClient.fetch<Retailer[]>(RETAILERS_QUERY)
    // Normalize optional array fields so consumers never hit undefined.
    const retailers = docs.map((d) => ({
      ...d,
      categories: d.categories ?? [],
      regions: d.regions ?? [],
      budget: d.budget ?? '',
      tier: d.tier ?? 'free',
    }))
    retailerCache = retailers
    return retailers
  })()
  try {
    return await retailerInflight
  } finally {
    retailerInflight = null // allow retry if it failed
  }
}

/** Cached synchronous peek — returns null until the first fetch resolves. */
export function getCachedRetailers(): Retailer[] | null {
  return retailerCache
}

// ── Journal / Blog (Phase 2) ─────────────────────────────────────────────────
// The Journal reads `post` + `category` documents from Sanity. GROQ returns only
// `status == "published"` posts, newest first, with the referenced category
// dereferenced to {title, slug}. `coverImage` is stored as a plain Cloudinary URL
// string (the studio convention, same as project coverImages); we defensively also
// dereference an image asset so an image-type field still resolves.
//
// Same cached/deduped module-level pattern as fetchProjects()/fetchRetailers():
// one network request per page lifetime (per-slug for the single-post fetch).

// Fields shared by list + single-post queries (excerpt/cards). Body + seo are
// heavy, so they are only pulled by the single-post query.
const POST_CARD_FIELDS = `
  "id": _id,
  title,
  "slug": slug.current,
  excerpt,
  coverImage,
  "coverImageAsset": coverImage.asset->url,
  "category": category->{title, "slug": slug.current},
  tags,
  author,
  publishedAt,
  aiDisclosure`

const POSTS_QUERY = `*[_type == "post" && status == "published" && defined(slug.current)]
  | order(publishedAt desc) {${POST_CARD_FIELDS}}`

const POST_QUERY = `*[_type == "post" && status == "published" && slug.current == $slug][0] {
  ${POST_CARD_FIELDS},
  body,
  "seo": {
    "metaTitle": seo.metaTitle,
    "metaDescription": seo.metaDescription,
    "faq": seo.faq[]{question, answer}
  }
}`

const CATEGORIES_QUERY = `*[_type == "category" && defined(slug.current)]
  | order(order asc, title asc) {
  title,
  "slug": slug.current,
  description,
  order
}`

// Raw shape returned by the GROQ queries above (before normalization).
interface SanityPost {
  id: string
  title: string
  slug: string
  excerpt?: string
  body?: string
  coverImage?: unknown
  coverImageAsset?: string | null
  category?: { title?: string; slug?: string } | null
  tags?: string[] | null
  author?: string
  publishedAt?: string
  aiDisclosure?: boolean
  seo?: {
    metaTitle?: string | null
    metaDescription?: string | null
    faq?: Array<{ question?: string; answer?: string }> | null
  } | null
}

function toBlogPost(doc: SanityPost): BlogPost {
  // coverImage is usually a plain string URL; fall back to the dereferenced asset
  // URL if the field turned out to be a Sanity image object.
  const cover =
    typeof doc.coverImage === 'string' ? doc.coverImage : doc.coverImageAsset ?? undefined
  const category =
    doc.category && doc.category.title && doc.category.slug
      ? { title: doc.category.title, slug: doc.category.slug }
      : undefined
  const faq = (doc.seo?.faq ?? [])
    .filter((f) => f && f.question && f.answer)
    .map((f) => ({ question: f.question as string, answer: f.answer as string }))
  return {
    id: doc.id,
    title: doc.title,
    slug: doc.slug,
    excerpt: doc.excerpt ?? undefined,
    body: doc.body ?? undefined,
    coverImage: cover,
    category,
    tags: doc.tags ?? [],
    author: doc.author ?? undefined,
    publishedAt: doc.publishedAt ?? undefined,
    aiDisclosure: doc.aiDisclosure ?? false,
    seo: doc.seo
      ? {
          metaTitle: doc.seo.metaTitle ?? undefined,
          metaDescription: doc.seo.metaDescription ?? undefined,
          faq: faq.length ? faq : undefined,
        }
      : undefined,
  }
}

let postsCache: BlogPost[] | null = null
let postsInflight: Promise<BlogPost[]> | null = null

/**
 * Fetches all published posts (card shape — no body/seo). Deduped + cached at
 * module level, same pattern as fetchProjects().
 */
export async function fetchPosts(): Promise<BlogPost[]> {
  if (postsCache) return postsCache
  if (postsInflight) return postsInflight
  postsInflight = (async () => {
    const docs = await sanityClient.fetch<SanityPost[]>(POSTS_QUERY)
    const posts = (docs ?? []).map(toBlogPost)
    postsCache = posts
    return posts
  })()
  try {
    return await postsInflight
  } finally {
    postsInflight = null // allow retry if it failed
  }
}

// Per-slug cache + inflight map so repeated single-post fetches dedupe.
const postCache = new Map<string, BlogPost | null>()
const postInflight = new Map<string, Promise<BlogPost | null>>()

/**
 * Fetches a single published post by slug (full body + seo). Returns null when
 * no published post matches. Deduped + cached per slug.
 */
export async function fetchPost(slug: string): Promise<BlogPost | null> {
  if (postCache.has(slug)) return postCache.get(slug) ?? null
  const existing = postInflight.get(slug)
  if (existing) return existing
  const p = (async () => {
    const doc = await sanityClient.fetch<SanityPost | null>(POST_QUERY, { slug })
    const post = doc ? toBlogPost(doc) : null
    postCache.set(slug, post)
    return post
  })()
  postInflight.set(slug, p)
  try {
    return await p
  } finally {
    postInflight.delete(slug)
  }
}

let categoriesCache: Category[] | null = null
let categoriesInflight: Promise<Category[]> | null = null

/**
 * Fetches all categories ordered by their manual `order` field. Deduped + cached.
 */
export async function fetchCategories(): Promise<Category[]> {
  if (categoriesCache) return categoriesCache
  if (categoriesInflight) return categoriesInflight
  categoriesInflight = (async () => {
    const docs = await sanityClient.fetch<Category[]>(CATEGORIES_QUERY)
    const categories = (docs ?? []).map((c) => ({
      title: c.title,
      slug: c.slug,
      description: c.description ?? undefined,
      order: typeof c.order === 'number' ? c.order : undefined,
    }))
    categoriesCache = categories
    return categories
  })()
  try {
    return await categoriesInflight
  } finally {
    categoriesInflight = null // allow retry if it failed
  }
}

/** Cached synchronous peeks — return null until the first fetch resolves. */
export function getCachedPosts(): BlogPost[] | null {
  return postsCache
}
export function getCachedCategories(): Category[] | null {
  return categoriesCache
}
