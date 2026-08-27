/**
 * Validate the Google Ads Editor import files in docs/marketing/google-ads/.
 *
 * Google silently truncates or rejects over-length assets at upload time, and
 * Ads Editor's error list is not fun to read. This checks the limits locally
 * before anything is imported, and also catches the two mistakes that cost real
 * money rather than just a rejection:
 *
 *   - a final URL pointing at a path this site does not serve (an ad that
 *     lands on the SPA's catch-all redirect burns the click and the Quality
 *     Score), and
 *   - the Airbnb trademark appearing in ad TEXT. Bidding on the term as a
 *     keyword is fine under Google's trademark policy; putting it in a headline
 *     or description is what draws a complaint. See README.md, "Compliance".
 *
 * Usage:  node scripts/validate-google-ads-assets.mjs
 * Exits non-zero on any violation, so it can gate a commit or a CI step.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'marketing', 'google-ads');

/** Google Ads asset limits, by column-name prefix. */
const LIMITS = [
  [/^Headline \d+$/, 30],
  [/^Description \d+$/, 90],
  [/^Path [12]$/, 15],
  [/^Sitelink Text$/, 25],
  [/^Description Line [12]$/, 35],
];

/** Every path the site actually serves that an ad may point at. */
const VALID_PATHS = new Set([
  '/', '/listing-photos', '/ai-concepts', '/ai-vision', '/pricing', '/portfolio',
  '/services', '/studio', '/faq', '/journal', '/consultation', '/deliverables',
]);

/** Terms that must never appear in ad text (trademark), checked case-insensitively. */
const TEXT_BANNED = [/\bairbnb\b/i];

/** Minimal RFC-4180 CSV parser — enough for the files we generate. */
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((cell) => cell !== ''));
}

const problems = [];

for (const file of readdirSync(DIR).filter((f) => f.endsWith('.csv')).sort()) {
  const rows = parseCsv(readFileSync(join(DIR, file), 'utf8'));
  const [header, ...body] = rows;
  const at = (name) => header.indexOf(name);

  body.forEach((cells, i) => {
    const line = i + 2; // 1-indexed, plus the header row
    header.forEach((col, c) => {
      const value = cells[c] ?? '';
      if (!value) return;

      for (const [pattern, limit] of LIMITS) {
        if (pattern.test(col) && value.length > limit) {
          problems.push(`${file}:${line} ${col} is ${value.length}/${limit} chars — "${value}"`);
        }
      }

      const isAdText = /^(Headline|Description) \d+$/.test(col)
        || col === 'Sitelink Text' || /^Description Line [12]$/.test(col)
        || (col === 'Value' && cells[at('Asset Type')] !== undefined);
      if (isAdText) {
        for (const banned of TEXT_BANNED) {
          if (banned.test(value)) {
            problems.push(`${file}:${line} ${col} uses a trademarked term in ad text — "${value}"`);
          }
        }
      }

      if (col === 'Final URL') {
        let path;
        try {
          path = new URL(value).pathname.replace(/\/$/, '') || '/';
        } catch {
          problems.push(`${file}:${line} Final URL is not a URL — "${value}"`);
          return;
        }
        if (!VALID_PATHS.has(path)) {
          problems.push(`${file}:${line} Final URL points at an unserved path "${path}" — "${value}"`);
        }
      }
    });
  });
}

if (problems.length) {
  console.error(`✗ ${problems.length} problem(s) in docs/marketing/google-ads:\n`);
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
console.log('✓ Google Ads assets: lengths, final URLs and ad-text trademarks all clean.');
