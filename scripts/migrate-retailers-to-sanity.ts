/**
 * One-off seed script (I-026): copies the bundled FREE_TIER_RETAILERS from
 * src/data/retailers.ts into Sanity as `retailer` documents. After this runs,
 * Anahit fills the empty category/budget/region fields by hand in Studio.
 *
 * Idempotent — uses createOrReplace keyed on a slugified domain, so re-running
 * overwrites rather than duplicating. Requires SANITY_WRITE_TOKEN in the env
 * (E:/Secrets/Website/.env). Create the token at:
 *   https://www.sanity.io/manage/project/305mgeeu/api
 *   → "Add API token" → Permissions: Editor
 *
 * Usage:
 *   npx tsx scripts/migrate-retailers-to-sanity.ts            # seeds 10 retailers
 *   npx tsx scripts/migrate-retailers-to-sanity.ts --dry-run  # preview, no write
 */
import 'dotenv/config'
import { createClient } from '@sanity/client'
import { FREE_TIER_RETAILERS } from '../src/data/retailers'

const PROJECT_ID = '305mgeeu'
const DATASET = 'production'

const dryRun = process.argv.includes('--dry-run')

if (!dryRun && !process.env.SANITY_WRITE_TOKEN) {
  console.error('❌ SANITY_WRITE_TOKEN is not set in env.')
  console.error('   Add it to E:/Secrets/Website/.env and retry, or use --dry-run to preview.')
  process.exit(1)
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
})

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function main() {
  if (dryRun) {
    console.log('🟡 DRY RUN — no documents will be written.\n')
  }

  console.log(`Found ${FREE_TIER_RETAILERS.length} retailers in FREE_TIER_RETAILERS:\n`)

  for (const [i, r] of FREE_TIER_RETAILERS.entries()) {
    const doc = {
      _id: `retailer-${slugify(r.domain)}`,
      _type: 'retailer',
      name: r.name,
      domain: r.domain,
      categories: [] as string[],
      budget: '',
      tier: 'free',
      regions: ['US'],
      active: true,
      order: i * 100,
      notes: '',
    }

    console.log(`  ${i + 1}. ${r.name}  ·  ${r.domain}  →  ${doc._id}`)

    if (!dryRun) {
      await client.createOrReplace(doc)
      console.log(`     ✅ wrote ${doc._id}`)
    }
  }

  if (dryRun) {
    console.log('\n🟢 Dry-run complete. Remove --dry-run to seed.')
  } else {
    console.log(`\n🟢 Seeded ${FREE_TIER_RETAILERS.length} retailers. Open the Studio to fill categories/budget/regions:`)
    console.log('   cd ../Portfolio/studio && npm run dev → http://localhost:3333')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
