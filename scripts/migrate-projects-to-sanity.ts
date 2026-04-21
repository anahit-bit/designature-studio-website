/**
 * One-off migration script: copies the hardcoded PROJECTS_LIST from
 * src/constants.tsx into Sanity as `project` documents.
 *
 * Runs from the repo root. Requires SANITY_WRITE_TOKEN in the env
 * (E:/Secrets/Website/.env). Create the token at:
 *   https://www.sanity.io/manage/project/305mgeeu/api
 *   → "Add API token" → Permissions: Editor
 *
 * Usage:
 *   npx tsx scripts/migrate-projects-to-sanity.ts          # dry-run (no write)
 *   npx tsx scripts/migrate-projects-to-sanity.ts --apply  # actually write
 */
import 'dotenv/config'
import { createClient } from '@sanity/client'
import { PROJECTS_LIST } from '../src/constants'

const PROJECT_ID = '305mgeeu'
const DATASET = 'production'

const apply = process.argv.includes('--apply')

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
})

/**
 * Inferred gallery slot layout — mirrors the comment header in constants.tsx.
 * Index → slot hint. Anything past 10 repeats pair/trio.
 */
function inferSlot(index: number): 'wide' | 'tall' | 'mid' | 'square' {
  const base: Array<'wide' | 'tall' | 'mid' | 'square'> = [
    'wide',   // 0
    'tall',   // 1
    'tall',   // 2
    'wide',   // 3
    'mid',    // 4
    'mid',    // 5
    'square', // 6
    'square', // 7
    'square', // 8
    'tall',   // 9
    'tall',   // 10
  ]
  if (index < base.length) return base[index]
  // Beyond slot 10: alternate pair (tall/tall) → trio (square/square/square)
  const cycle = ['tall', 'tall', 'square', 'square', 'square'] as const
  return cycle[(index - base.length) % cycle.length]
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function main() {
  if (!apply) {
    console.log('🟡 DRY RUN — no documents will be written. Re-run with --apply to migrate.\n')
  } else if (!process.env.SANITY_WRITE_TOKEN) {
    console.error('❌ SANITY_WRITE_TOKEN is not set in env.')
    console.error('   Add it to E:/Secrets/Website/.env and retry.')
    process.exit(1)
  }

  console.log(`Found ${PROJECTS_LIST.length} projects in PROJECTS_LIST:\n`)

  for (const [i, p] of PROJECTS_LIST.entries()) {
    const doc = {
      _id: `project-${p.id}`,
      _type: 'project',
      title: p.titleEN,
      slug: { _type: 'slug', current: slugify(p.titleEN) },
      category: p.categoryEN,
      order: (i + 1) * 10, // 10, 20, 30 — gaps for manual reorder
      featured: false,
      coverImage: p.imageUrl,
      description: p.descriptionEN,
      area: p.area,
      date: p.date,
      location: p.locationEN,
      gallery: p.gallery.map((url, idx) => ({
        _type: 'galleryImage',
        _key: `g${idx}`,
        url,
        slot: inferSlot(idx),
      })),
    }

    console.log(
      `  ${i + 1}. [${p.id}] ${p.titleEN}  ·  ${p.categoryEN}  ·  ${p.gallery.length} gallery images`
    )

    if (apply) {
      await client.createOrReplace(doc)
      console.log(`     ✅ wrote project-${p.id}`)
    }
  }

  if (!apply) {
    console.log('\n🟢 Dry-run complete. Add --apply to migrate.')
  } else {
    console.log('\n🟢 Migration complete. Open the Studio to review:')
    console.log('   cd ../Portfolio/studio && npm run dev → http://localhost:3333')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
