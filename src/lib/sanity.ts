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
