/**
 * Build-time sitemap generator.
 *
 * Reads public/sitemap.xml (the static base with all non-dynamic routes),
 * appends one <url> entry per portfolio project from src/constants.tsx, and
 * writes the result back. Wired into `npm run build` ahead of `vite build`.
 *
 * Project IDs come from the bundled PROJECTS_LIST. We deliberately do NOT
 * call Sanity here — keeping the build hermetic and offline-safe matters
 * more than capturing newly-added projects in the sitemap on every build.
 * Anahit can re-run the build whenever new projects ship.
 *
 * Run manually: `npx tsx scripts/build-sitemap.ts`
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROJECTS_LIST } from '../src/constants.tsx';

const __filename = fileURLToPath(import.meta.url);
const ROOT = resolve(__filename, '..', '..');
const SITEMAP_PATH = resolve(ROOT, 'public', 'sitemap.xml');
const ORIGIN = 'https://www.designature.studio';

function buildProjectEntries(): string {
  return PROJECTS_LIST.map(
    (p) =>
      `  <url><loc>${ORIGIN}/portfolio/${p.id}</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>`,
  ).join('\n');
}

function main() {
  const base = readFileSync(SITEMAP_PATH, 'utf-8');
  const projectEntries = buildProjectEntries();

  // Strip any previously-appended project entries (idempotent rebuild) and
  // re-insert before </urlset>. We use the marker comment from the static
  // file as the boundary.
  const markerRe =
    /(<!-- \/portfolio\/:id entries appended at build time[^>]*-->)([\s\S]*?)(<\/urlset>)/;

  if (!markerRe.test(base)) {
    throw new Error(
      'build-sitemap: could not find marker comment in public/sitemap.xml',
    );
  }

  const next = base.replace(
    markerRe,
    (_match, marker, _existing, closeTag) =>
      `${marker}\n${projectEntries}\n${closeTag}`,
  );

  writeFileSync(SITEMAP_PATH, next, 'utf-8');
  // eslint-disable-next-line no-console
  console.log(
    `[build-sitemap] wrote ${PROJECTS_LIST.length} project entries to public/sitemap.xml`,
  );
}

main();
