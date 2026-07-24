/**
 * One-off seed script: upserts Journal post 3 ("How to Shop Your Interior
 * Design: From AI Concept to Real Furniture") into Sanity as a DRAFT (schema
 * field status = "draft", so the live site — which filters status ==
 * "published" — never renders it).
 *
 * Source of truth for the BODY (with the two [studio] markers) is read verbatim
 * from:
 *   E:/Business/Claude/_Plan/Website/journal-content/post-03-shop-your-interior-design.md
 * The structured front-matter fields are mapped explicitly below (straight
 * apostrophes, matching the source). Post 3 has NO before/after and NO
 * styleGallery — it uses the shopping module + [studio] notes + the new
 * per-post CTA (ctaHeading / ctaLabel / ctaHref).
 *
 * Uses a deterministic, NON-dotted _id (post-...) so it is a normal document
 * (not a Sanity native draft) that the owner can later flip to status:"published"
 * in place, once the per-post CTA feature ships to prod.
 *
 * Idempotent (createOrReplace). Requires SANITY_WRITE_TOKEN (Editor) in
 * E:/Secrets/Website/.env.
 *
 * Usage:
 *   npx tsx scripts/seed-post-03-to-sanity.ts --dry-run   # preview, no write
 *   npx tsx scripts/seed-post-03-to-sanity.ts             # seed the draft
 */
import fs from 'node:fs'
import dotenv from 'dotenv'
import { createClient } from '@sanity/client'

dotenv.config({ path: 'E:/Secrets/Website/.env' })

const PROJECT_ID = '305mgeeu'
const DATASET = 'production'
const MD_PATH = 'E:/Business/Claude/_Plan/Website/journal-content/post-03-shop-your-interior-design.md'

const POST_ID = 'post-how-to-shop-your-interior-design'
const CATEGORY_ID = 'category-sourcing'
const CATEGORY_SLUG = 'sourcing'

const HERO = 'https://res.cloudinary.com/dys2k5muv/image/upload/v1776778990/Portfolio/30/30-g0.jpg'
const SHOP_IMG =
  'https://res.cloudinary.com/dys2k5muv/image/upload/v1783604632/journal/post-03-how-to-shop-your-interior-design/shop-dining-concept.png'

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

// ── BODY (verbatim, incl. the two [studio] markers) ──────────────────────────
function readBody(): string {
  const raw = fs.readFileSync(MD_PATH, 'utf8')
  const m = raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n([\s\S]*)$/)
  if (!m) throw new Error('Could not locate front-matter delimiters in the source .md')
  return m[1].replace(/^\r?\n+/, '').replace(/\s+$/, '') + '\n'
}

// ── Front-matter → structured fields (mapped from the source .md) ────────────
const shoppingItems = [
  {
    name: 'Emman Glass Cabinet',
    retailer: 'West Elm',
    price: '',
    url: 'https://www.westelm.com/products/mp-emman-glass-cabinet-mp739/?pkey=cfurniture&sb=WE',
  },
  {
    name: 'Simone Linear 2-Light Chandelier',
    retailer: 'West Elm',
    price: '',
    url: 'https://www.westelm.com/products/simone-linear-2-light-chandelier-h13597/?pkey=sWE&sb=WE',
  },
  {
    name: 'Via Olive Green Velvet Walnut Wood Dining Chair',
    retailer: 'Crate & Barrel',
    price: '',
    url: 'https://www.crateandbarrel.com/via-olive-green-velvet-walnut-wood-dining-chair/s139291',
  },
  {
    name: 'The Dine & Unwind Bundle',
    retailer: 'Article',
    price: '',
    url: 'https://www.article.com/furniture-bundles/606/the-dine-and-unwind-bundle?queryID=21893ce1b0ab5dfc3940fdad0ff81025&index=production_product',
  },
].map((it, i) => ({ _type: 'item', _key: `item-${i}`, ...it }))

const faq = [
  {
    question: `Can you actually buy the furniture in an AI design?`,
    answer: `Yes. The better AI tools return a shopping list of real, in-stock products that match the design's style, in your region and budget, with links. They match the look for you; the one step to add yourself is checking each piece's size fits your real room before you buy.`,
  },
  {
    question: `How do I find furniture that matches a design or photo?`,
    answer: `Use a tool that reads the design and searches real retailers for close matches by style, material, and colour — then do the one thing the tool can't: check the dimensions of the key pieces against your room before you buy. Match the look with the tool; match the measurements yourself.`,
  },
  {
    question: `How do I turn an AI room design into a shopping list?`,
    answer: `Lock the design, break the room into individual pieces, and match each to a real, in-stock product in your region and budget. Designature's Shopping List does that style-and-product matching automatically from your AI design — then you size-check the anchor pieces against your space before buying.`,
  },
  {
    question: `How do I shop a design on a budget?`,
    answer: `Set a budget per piece, not just a room total — that stops one splurge from eating the whole room. Decide where to invest (the sofa, the table you use daily) and where to save (accents, lighting), and shop value tiers for the save list.`,
  },
  {
    question: `Why doesn't the furniture I buy look like the render?`,
    answer: `Usually because pieces were matched by looks alone, ignoring scale, or bought across mismatched styles and finishes. Keep one material story, match proportions to your room, and buy pieces that share a consistent tone so the finished room reads like the design.`,
  },
].map((f, i) => ({ _type: 'qa', _key: `faq-${i}`, question: f.question, answer: f.answer }))

async function ensureCategory() {
  const existing = await client.fetch<{ _id: string; title?: string } | null>(
    '*[_type == "category" && slug.current == $slug][0]{_id, title}',
    { slug: CATEGORY_SLUG },
  )
  if (existing?._id) {
    console.log(`  category "${CATEGORY_SLUG}" exists -> ${existing._id} (${existing.title})`)
    return existing._id
  }
  const doc = {
    _id: CATEGORY_ID,
    _type: 'category',
    title: 'Shopping & Sourcing',
    slug: { _type: 'slug', current: CATEGORY_SLUG },
    order: 30,
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
    title: 'How to Shop Your Interior Design: From AI Concept to Real Furniture',
    slug: { _type: 'slug', current: 'how-to-shop-your-interior-design' },
    category: { _type: 'reference', _ref: categoryId },
    tags: ['shopping-list', 'sourcing', 'budget', 'ai-vision'],
    author: 'Anahit, Designature Studio',
    aiDisclosure: true,
    coverImage: HERO, // HERO — "Green Stripes" portfolio project
    // No before/after pair, no styleGallery, no versionImage for this post.
    shoppingImage: SHOP_IMG, // AI dining concept the 4 products below come from
    shoppingItems,
    // Per-post CTA (new feature). Deep-links straight to the Shopping tool.
    ctaHeading: 'Turn your design into a shopping list',
    ctaLabel: 'Try the Shopping List',
    ctaHref: '/ai-concepts#shopping',
    excerpt: `A beautiful design is only half the job — here's how to turn an AI interior concept into a real, buyable shopping list matched to your style, budget, and region, plus the one check that makes it actually fit.`,
    intro: `The hardest part of a redesign isn't the idea — it's buying it. You can generate a gorgeous room in seconds now, but a render you can't shop is just a nice picture. Here's how to go from an AI concept to a real, buyable furniture list, the way a designer does it.`,
    seo: {
      metaTitle: `How to Shop Your Interior Design: AI Concept to Real Furniture (2026)`,
      metaDescription: `Turn an AI interior design into a real shopping list. A designer's 5-step guide to matching a concept to buyable furniture in your style, budget, and region — plus the size-check that makes it actually fit.`,
      faq,
    },
    body,
  }

  console.log(`\n  post _id       : ${post._id}`)
  console.log(`  status         : ${post.status}`)
  console.log(`  slug           : ${post.slug.current}`)
  console.log(`  category ref   : ${categoryId}`)
  console.log(`  shoppingItems  : ${shoppingItems.length} rows`)
  console.log(`  seo.faq        : ${faq.length} pairs`)
  console.log(`  cta            : "${post.ctaHeading}" | "${post.ctaLabel}" -> ${post.ctaHref}`)
  console.log(`  body length    : ${body.length} chars`)
  console.log(`  body markers   : [studio]=${(body.match(/\[studio\]/g) || []).length}  [gallery]=${/\[gallery\]/.test(body)}`)

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
