/**
 * Seed script — copies the bundled FALLBACK_ARMENIAN_RETAILERS from
 * src/data/armenianRetailers.ts into Sanity as `armenianRetailer` documents
 * (the retail.designature.studio directory). Mirrors
 * migrate-retailers-to-sanity.ts.
 *
 * Idempotent — createOrReplace keyed on `armenian-retailer-<slug>`, so
 * re-running overwrites rather than duplicating. Requires SANITY_WRITE_TOKEN
 * in the env (E:/Secrets/Website/.env), Editor permission.
 *
 * Usage:
 *   npx tsx scripts/migrate-armenian-retailers-to-sanity.ts            # seed
 *   npx tsx scripts/migrate-armenian-retailers-to-sanity.ts --dry-run  # preview
 */
import { existsSync } from 'fs'
import dotenv from 'dotenv'
import { createClient } from '@sanity/client'
import { FALLBACK_ARMENIAN_RETAILERS } from '../src/data/armenianRetailers'

// Same env resolution as server.ts: prefer a repo-local .env, else the
// out-of-tree secrets file at E:/Secrets/Website/.env.
const FALLBACK_ENV_PATH = 'E:/Secrets/Website/.env'
dotenv.config({ path: existsSync('.env') ? '.env' : FALLBACK_ENV_PATH })

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

async function main() {
  if (dryRun) console.log('🟡 DRY RUN — no documents will be written.\n')
  console.log(`Found ${FALLBACK_ARMENIAN_RETAILERS.length} retailer(s) to seed:\n`)

  for (const r of FALLBACK_ARMENIAN_RETAILERS) {
    const doc: Record<string, unknown> = {
      _id: `armenian-retailer-${r.slug}`,
      _type: 'armenianRetailer',
      nameEN: r.nameEN,
      slug: { _type: 'slug', current: r.slug },
      category: r.category,
      tags: r.tags ?? [],
      status: r.status,
      order: r.order,
      featured: r.featured ?? false,
    }
    // Optional fields — only set when present so we don't write empty keys.
    if (r.nameAM) doc.nameAM = r.nameAM
    if (r.budget) doc.budget = r.budget
    if (r.collabClass) doc.collabClass = r.collabClass
    if (r.description) doc.description = r.description
    if (r.deal) doc.deal = r.deal
    if (r.notes) doc.notes = r.notes
    if (r.website) doc.website = r.website
    if (r.instagram) doc.instagram = r.instagram
    if (r.facebook) doc.facebook = r.facebook
    if (r.contact) doc.contact = r.contact
    if (r.phone) doc.phone = r.phone
    if (r.email) doc.email = r.email
    if (r.address) doc.address = r.address
    if (r.verifiedAt) doc.verifiedAt = r.verifiedAt

    console.log(`  · ${r.nameEN}  (${r.category} · ${r.status})  →  ${doc._id}`)
    if (!dryRun) {
      await client.createOrReplace(doc as never)
      console.log(`    ✅ wrote ${doc._id}`)
    }
  }

  if (dryRun) {
    console.log('\n🟢 Dry-run complete. Remove --dry-run to seed.')
  } else {
    console.log(`\n🟢 Seeded ${FALLBACK_ARMENIAN_RETAILERS.length} retailer(s).`)
    console.log('   Studio: cd ../../../../Portfolio/studio && npm run dev → http://localhost:3333')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
