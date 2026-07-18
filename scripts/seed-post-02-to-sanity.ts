/**
 * One-off seed script: upserts Journal post 2 ("Can AI Really Design a Room
 * From a Photo?") into Sanity as a DRAFT (schema field status = "draft", so the
 * live site — which filters status == "published" — never renders it).
 *
 * Source of truth for the BODY (with the [studio] + [gallery] markers) is read
 * verbatim from:
 *   E:/Business/Claude/_Plan/Website/journal-content/post-02-ai-design-from-photo.md
 * The structured front-matter fields are mapped explicitly below (straight
 * apostrophes, matching the source).
 *
 * Uses a deterministic, NON-dotted _id (post-...) so it is a normal document
 * (not a Sanity native draft) that the owner can later flip to status:"published"
 * in place — the markers only render once the gallery feature ships to prod.
 *
 * Idempotent (createOrReplace). Requires SANITY_WRITE_TOKEN (Editor) in
 * E:/Secrets/Website/.env.
 *
 * Usage:
 *   npx tsx scripts/seed-post-02-to-sanity.ts --dry-run   # preview, no write
 *   npx tsx scripts/seed-post-02-to-sanity.ts             # seed the draft
 */
import fs from 'node:fs'
import dotenv from 'dotenv'
import { createClient } from '@sanity/client'

dotenv.config({ path: 'E:/Secrets/Website/.env' })

const PROJECT_ID = '305mgeeu'
const DATASET = 'production'
const MD_PATH = 'E:/Business/Claude/_Plan/Website/journal-content/post-02-ai-design-from-photo.md'

const POST_ID = 'post-can-ai-design-a-room-from-a-photo'
const CATEGORY_ID = 'category-ai-interior-design'
const CATEGORY_SLUG = 'ai-interior-design'

const CLD = 'https://res.cloudinary.com/dys2k5muv/image/upload/journal/post-02-can-ai-design-a-room-from-a-photo'

const dryRun = process.argv.includes('--dry-run')

if (!dryRun && !process.env.SANITY_WRITE_TOKEN) {
  console.error('SANITY_WRITE_TOKEN is not set (looked in E:/Secrets/Website/.env).')
  console.error('   Add it and retry, or use --dry-run to preview.')
  process.exit(1)
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
})

// ── BODY (verbatim, incl. [studio] + [gallery] markers) ──────────────────────
function readBody(): string {
  const raw = fs.readFileSync(MD_PATH, 'utf8')
  const m = raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n([\s\S]*)$/)
  if (!m) throw new Error('Could not locate front-matter delimiters in the source .md')
  return m[1].replace(/^\r?\n+/, '').replace(/\s+$/, '') + '\n'
}

// ── Front-matter → structured fields (mapped from the source .md) ────────────
const styleGallery = [
  { label: 'Coastal', image: `${CLD}/coastal.png` },
  { label: 'Boho', image: `${CLD}/boho.png` },
  { label: 'Japandi', image: `${CLD}/japandi.png` },
  { label: 'Warm Minimalist', image: `${CLD}/warm-minimalist.png` },
  { label: 'Mid-century', image: `${CLD}/mid-century.png` },
  { label: 'Industrial', image: `${CLD}/industrial.png` },
].map((t, i) => ({ _type: 'tile', _key: `tile-${i}`, image: t.image, label: t.label }))

const faq = [
  {
    question: `Can AI design a room from just one photo?`,
    answer: `Yes. You upload one clear photo, pick a style, and AI interior tools generate a realistic redesign of that exact room in seconds — keeping the walls, windows, and layout while restyling the furniture, colour, and finishes. One good, well-lit photo is enough.`,
  },
  {
    question: `How accurate is AI interior design?`,
    answer: `Accurate for style, colour, and layout ideas; unreliable for exact measurements. AI designs the feeling of a room convincingly but doesn't know your real dimensions, so it can suggest furniture that looks right but wouldn't physically fit. Treat it as a confident visual direction, then verify sizes before buying.`,
  },
  {
    question: `Does AI keep my real room layout?`,
    answer: `The good tools do. They detect your walls, windows, and openings and design within them, so the redesign is recognisably your room — not a generic showroom. Weaker tools can distort the structure; a clear, straight-on photo helps the AI hold your layout.`,
  },
  {
    question: `Can AI redesign any room — kitchen, bathroom, bedroom?`,
    answer: `Yes. Living rooms, bedrooms, kitchens, bathrooms, home offices, and small or rented spaces all work. Rooms with lots of fixed elements (kitchens, bathrooms) are trickier because plumbing and cabinetry can't really move, so use the result for style and finishes rather than a new layout.`,
  },
  {
    question: `Is AI room design free?`,
    answer: `Partly. Most tools — including Designature — let you try a first visualization and style discovery for free; multiple concepts, a real shopping list, or a human review are usually paid. You can see your room redesigned before spending anything.`,
  },
].map((f, i) => ({ _type: 'qa', _key: `faq-${i}`, question: f.question, answer: f.answer }))

async function ensureCategory() {
  const existing = await client.fetch<{ _id: string } | null>(
    '*[_type == "category" && slug.current == $slug][0]{_id}',
    { slug: CATEGORY_SLUG },
  )
  if (existing?._id) {
    console.log(`  category "${CATEGORY_SLUG}" exists -> ${existing._id}`)
    return existing._id
  }
  const doc = {
    _id: CATEGORY_ID,
    _type: 'category',
    title: 'AI Interior Design',
    slug: { _type: 'slug', current: CATEGORY_SLUG },
    order: 10,
  }
  if (dryRun) {
    console.log(`  would create category -> ${CATEGORY_ID}`)
    return CATEGORY_ID
  }
  await client.createOrReplace(doc)
  console.log(`  created category -> ${CATEGORY_ID}`)
  return CATEGORY_ID
}

async function main() {
  if (dryRun) console.log('DRY RUN — no documents will be written.\n')

  const categoryId = await ensureCategory()
  const body = readBody()

  const post = {
    _id: POST_ID,
    _type: 'post',
    status: 'draft', // schema status → live site (status=="published") won't render it
    // publishedAt intentionally omitted (empty until publish)
    title: 'Can AI Really Design a Room From a Photo? An Honest Test',
    slug: { _type: 'slug', current: 'can-ai-design-a-room-from-a-photo' },
    category: { _type: 'reference', _ref: categoryId },
    tags: ['ai-tools', 'accuracy', 'ai-vision', 'before-after'],
    author: 'Anahit, Designature Studio',
    aiDisclosure: true,
    coverImage: `${CLD}/coastal.png`,
    beforeImage: `${CLD}/before-raw.jpg`,
    afterImage: `${CLD}/contemporary.png`,
    beforeAfterCaption: `One bare, unfinished room in — a full AI concept out. Same walls, window, and proportions; everything inside restyled.`,
    versionImage: `${CLD}/boho.png`,
    styleGallery,
    excerpt: `Yes — AI can redesign your room from a single photo in seconds. Here's an honest test from a design studio: what it gets right, where it still gets things wrong, and how to get a result you can actually trust.`,
    intro: `It sounds too good to be true: upload one phone photo and get your room redesigned in seconds. So does it actually work? We put it to an honest test — the impressive parts, the parts that still trip it up, and how to get a result you'd genuinely act on.`,
    seo: {
      metaTitle: `Can AI Really Design a Room From a Photo? (Honest Test, 2026)`,
      metaDescription: `Yes — AI redesigns your room from one photo in seconds, keeping your real layout. An honest studio test: what it gets right, where it's wrong, and how to get a realistic result.`,
      faq,
    },
    body,
  }

  console.log(`\n  post _id      : ${post._id}`)
  console.log(`  status        : ${post.status}`)
  console.log(`  slug          : ${post.slug.current}`)
  console.log(`  category ref  : ${categoryId}`)
  console.log(`  styleGallery  : ${styleGallery.length} tiles`)
  console.log(`  seo.faq       : ${faq.length} pairs`)
  console.log(`  body length   : ${body.length} chars`)
  console.log(`  body markers  : [studio]=${/\[studio\]/.test(body)}  [gallery]=${/\[gallery\]/.test(body)}`)

  if (dryRun) {
    console.log('\nDry-run complete. Remove --dry-run to seed the draft.')
    return
  }

  await client.createOrReplace(post)
  console.log(`\nSeeded DRAFT post -> ${post._id} (status="draft", not visible on the live site).`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
