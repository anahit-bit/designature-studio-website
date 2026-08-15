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
// NOTE: reads the PUBLIC dataset anonymously (no token). Sanity only serves
// documents whose _id has NO dot to anonymous readers (dotted ids are treated
// like drafts — token-only). All content docs therefore use hyphen ids
// (project-*, retailer-*, post-*, category-*), never dots.
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

// ── Armenian Retailers (retail.designature.studio) ───────────────────────────
// The collaboration/partner directory. Distinct from the Shopping `retailer`
// type above — these are the studio's real Armenian supplier collaborations.
// The website reads only status == "active" (verified operating) docs. The
// bundled FALLBACK_ARMENIAN_RETAILERS is the offline fallback.
import type { ArmenianRetailer } from '../data/armenianRetailers'
import { FALLBACK_ARMENIAN_RETAILERS } from '../data/armenianRetailers'

const ARMENIAN_RETAILERS_QUERY = `*[_type == "armenianRetailer" && status == "active"]
  | order(featured desc, order asc, nameEN asc) {
  "id": _id,
  nameEN,
  nameAM,
  "slug": slug.current,
  category,
  tags,
  budget,
  collabClass,
  description,
  deal,
  notes,
  website,
  instagram,
  facebook,
  contact,
  phone,
  email,
  address,
  "logo": logo.asset->url,
  status,
  verifiedAt,
  featured,
  order
}`

let armRetailerCache: ArmenianRetailer[] | null = null
let armRetailerInflight: Promise<ArmenianRetailer[]> | null = null

/**
 * Fetches active Armenian retailers from Sanity. Falls back to the bundled
 * seed if the query errors or returns nothing (e.g. before the import runs).
 * Deduped + cached at module level, same pattern as fetchRetailers().
 */
export async function fetchArmenianRetailers(): Promise<ArmenianRetailer[]> {
  if (armRetailerCache) return armRetailerCache
  if (armRetailerInflight) return armRetailerInflight
  armRetailerInflight = (async () => {
    try {
      const docs = await sanityClient.fetch<ArmenianRetailer[]>(ARMENIAN_RETAILERS_QUERY)
      const list = (docs ?? []).map((d) => ({
        ...d,
        tags: d.tags ?? [],
        order: typeof d.order === 'number' ? d.order : 100,
      }))
      // Offline fallback shows only verified-active shops, matching the GROQ filter.
      const activeFallback = FALLBACK_ARMENIAN_RETAILERS.filter((r) => r.status === 'active')
      const result = list.length ? list : activeFallback
      armRetailerCache = result
      return result
    } catch {
      const activeFallback = FALLBACK_ARMENIAN_RETAILERS.filter((r) => r.status === 'active')
      armRetailerCache = activeFallback
      return activeFallback
    }
  })()
  try {
    return await armRetailerInflight
  } finally {
    armRetailerInflight = null // allow retry if it failed
  }
}

/** Cached synchronous peek — returns null until the first fetch resolves. */
export function getCachedArmenianRetailers(): ArmenianRetailer[] | null {
  return armRetailerCache
}

// ── Journal / Blog (Phase 2) ─────────────────────────────────────────────────
// The Journal reads `post` + `category` documents from Sanity. GROQ returns only
// `status == "published"` posts, newest first, with the referenced category
// dereferenced to {title, slug}. `coverImage` is stored as a plain Cloudinary URL
// string (the studio convention, same as project coverImages); we defensively also
// dereference an image asset so an image-type field still resolves.
//
// Deduped like fetchProjects()/fetchRetailers(), but with a SHORT time-based TTL
// (JOURNAL_CACHE_TTL_MS) instead of cache-forever — see the ttlCached() note
// below. Posts change often, so a permanent cache would hide a just-published
// post until a server restart.

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
  intro,
  body,
  beforeImage,
  afterImage,
  beforeAfterCaption,
  versionImage,
  "styleGallery": styleGallery[]{image, label},
  shoppingImage,
  "shoppingItems": shoppingItems[]{name, retailer, price, url},
  "personalNotes": personalNotes[].quote,
  ctaHeading,
  ctaLabel,
  ctaHref,
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
  intro?: string
  body?: string
  coverImage?: unknown
  coverImageAsset?: string | null
  beforeImage?: string
  afterImage?: string
  beforeAfterCaption?: string
  versionImage?: string
  styleGallery?: Array<{ image?: string; label?: string }> | null
  shoppingImage?: string
  shoppingItems?: Array<{ name?: string; retailer?: string; price?: string; url?: string }> | null
  personalNotes?: Array<string | null> | null
  category?: { title?: string; slug?: string } | null
  tags?: string[] | null
  author?: string
  publishedAt?: string
  aiDisclosure?: boolean
  ctaHeading?: string
  ctaLabel?: string
  ctaHref?: string
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
  const shoppingItems = (doc.shoppingItems ?? [])
    .filter((i): i is { name: string; retailer?: string; price?: string; url?: string } => !!i && !!i.name)
    .map((i) => ({
      name: i.name,
      retailer: i.retailer ?? undefined,
      price: i.price ?? undefined,
      url: i.url ?? undefined,
    }))
  const personalNotes = (doc.personalNotes ?? []).filter((q): q is string => !!q)
  const styleGallery = (doc.styleGallery ?? [])
    .filter((t): t is { image: string; label?: string } => !!t && !!t.image)
    .map((t) => ({ image: t.image, label: t.label ?? '' }))
  return {
    id: doc.id,
    title: doc.title,
    slug: doc.slug,
    excerpt: doc.excerpt ?? undefined,
    intro: doc.intro ?? undefined,
    body: doc.body ?? undefined,
    coverImage: cover,
    beforeImage: doc.beforeImage ?? undefined,
    afterImage: doc.afterImage ?? undefined,
    beforeAfterCaption: doc.beforeAfterCaption ?? undefined,
    versionImage: doc.versionImage ?? undefined,
    styleGallery: styleGallery.length ? styleGallery : undefined,
    shoppingImage: doc.shoppingImage ?? undefined,
    shoppingItems: shoppingItems.length ? shoppingItems : undefined,
    personalNotes: personalNotes.length ? personalNotes : undefined,
    category,
    tags: doc.tags ?? [],
    author: doc.author ?? undefined,
    publishedAt: doc.publishedAt ?? undefined,
    aiDisclosure: doc.aiDisclosure ?? false,
    ctaHeading: doc.ctaHeading ?? undefined,
    ctaLabel: doc.ctaLabel ?? undefined,
    ctaHref: doc.ctaHref ?? undefined,
    seo: doc.seo
      ? {
          metaTitle: doc.seo.metaTitle ?? undefined,
          metaDescription: doc.seo.metaDescription ?? undefined,
          faq: faq.length ? faq : undefined,
        }
      : undefined,
  }
}

// ── Short-TTL cache (journal fetchers only) ─────────────────────────────────
// fetchProjects()/fetchRetailers() cache for the whole process lifetime because
// the portfolio + retailer list change rarely. The journal fetchers instead use
// a SHORT time-based TTL: on the long-lived server a cache-forever entry would
// hide a newly published/edited post until a Railway restart, so a 60s TTL lets
// published content show up on its own within ~a minute. In-flight dedup is kept
// so concurrent calls still share a single request.
export const JOURNAL_CACHE_TTL_MS = 60_000

interface TtlSlot<T> {
  value: T
  ts: number
}

/**
 * Wrap a per-key async fetcher with a short TTL cache + in-flight dedup. A cached
 * value is reused while `now - ts <= JOURNAL_CACHE_TTL_MS`; once stale the next
 * call refetches. Concurrent calls for the same key share one in-flight promise.
 * Time is read via Date.now() so tests can drive it with fake timers.
 */
function ttlCached<T>(fetcher: (key: string) => Promise<T>): (key: string) => Promise<T> {
  const cache = new Map<string, TtlSlot<T>>()
  const inflight = new Map<string, Promise<T>>()
  return async (key: string): Promise<T> => {
    const hit = cache.get(key)
    if (hit && Date.now() - hit.ts <= JOURNAL_CACHE_TTL_MS) return hit.value
    const existing = inflight.get(key)
    if (existing) return existing
    const p = (async () => {
      const value = await fetcher(key)
      cache.set(key, { value, ts: Date.now() })
      return value
    })()
    inflight.set(key, p)
    try {
      return await p
    } finally {
      inflight.delete(key) // allow retry after failure + refetch after TTL
    }
  }
}

// Single-value fetchers (posts list, categories) key on a constant.
const ALL_KEY = '__all__'

const postsCached = ttlCached<BlogPost[]>(async () => {
  const docs = await sanityClient.fetch<SanityPost[]>(POSTS_QUERY)
  return (docs ?? []).map(toBlogPost)
})

/**
 * Fetches all published posts (card shape — no body/seo). Short-TTL cached +
 * in-flight deduped, so a newly published post appears within ~60s (no restart).
 */
export async function fetchPosts(): Promise<BlogPost[]> {
  return postsCached(ALL_KEY)
}

const postCached = ttlCached<BlogPost | null>(async (slug: string) => {
  const doc = await sanityClient.fetch<SanityPost | null>(POST_QUERY, { slug })
  return doc ? toBlogPost(doc) : null
})

/**
 * Fetches a single published post by slug (full body + seo). Returns null when no
 * published post matches. Short-TTL cached + in-flight deduped per slug.
 */
export async function fetchPost(slug: string): Promise<BlogPost | null> {
  return postCached(slug)
}

const categoriesCached = ttlCached<Category[]>(async () => {
  const docs = await sanityClient.fetch<Category[]>(CATEGORIES_QUERY)
  return (docs ?? []).map((c) => ({
    title: c.title,
    slug: c.slug,
    description: c.description ?? undefined,
    order: typeof c.order === 'number' ? c.order : undefined,
  }))
})

/**
 * Fetches all categories ordered by their manual `order` field. Short-TTL cached
 * + in-flight deduped.
 */
export async function fetchCategories(): Promise<Category[]> {
  return categoriesCached(ALL_KEY)
}
