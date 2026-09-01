// Upload style-library renders into the Cloudinary folders the Style Quiz reads.
//
// The quiz fetches /api/images?folder=Quiz/<Style-With-Dashes> at runtime, so a
// style with no folder simply never appears — which is why six of the fifteen
// AI Vision styles could never be a quiz result.
//
// Usage:
//   node scripts/aivision/upload-quiz-images.mjs --dry-run
//   node scripts/aivision/upload-quiz-images.mjs                    # the 6 missing styles
//   node scripts/aivision/upload-quiz-images.mjs --styles "Biophilic"
//   node scripts/aivision/upload-quiz-images.mjs --all              # all 15 (replaces nothing)
//
// Re-uploads by default (overwrite:true). The first version used overwrite:false
// and that was wrong for this job: every time a style is re-rendered from the
// workbook, the copy on Cloudinary becomes stale, and a "skipped, already there"
// run would silently leave the OLD image serving the quiz. Pass --no-overwrite
// only if you deliberately want to add without replacing.
//
// FOLDER HYGIENE (hard rule): pass `folder`, never `asset_folder`. asset_folder
// is a UI-display field only and does NOT set the public_id path — an earlier
// script used it and dumped every asset at the account root.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { v2: cloudinary } = require('cloudinary');

const ENV = 'E:/Secrets/Website/.env';
const env = fs.readFileSync(ENV, 'utf8');
const get = (k) => { const m = env.match(new RegExp('^' + k + '=(.*)$', 'm')); return m ? m[1].trim() : null; };
cloudinary.config({
  cloud_name: get('CLOUDINARY_CLOUD_NAME'),
  api_key: get('CLOUDINARY_API_KEY'),
  api_secret: get('CLOUDINARY_API_SECRET'),
});

const SRC = 'E:/Business/Claude/_Inputs/style-quiz';

// The six AI Vision styles the quiz cannot currently return.
const MISSING_FROM_QUIZ = [
  'Biophilic', 'Minimalist', 'Maximalist', 'Dopamine', 'Trend 2026', 'Warm Contemporary',
];

const argv = process.argv.slice(2);
const flag = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };
const has = (n) => argv.includes(`--${n}`);
const dryRun = has('dry-run');
const overwrite = !has('no-overwrite');

const manifest = JSON.parse(fs.readFileSync(path.join(SRC, 'manifest.json'), 'utf8'));
const allStyles = [...new Set(manifest.images.map((i) => i.style))];

let styles;
if (flag('styles')) styles = flag('styles').split(',').map((s) => s.trim());
else if (has('all')) styles = allStyles;
else styles = MISSING_FROM_QUIZ;

const unknown = styles.filter((s) => !allStyles.includes(s));
if (unknown.length) {
  console.error('Not in the library:', unknown.join(', '));
  process.exit(1);
}

// Matches styleToCloudinaryFolderName() in StyleQuizScreen.tsx — spaces to dashes.
const folderFor = (style) => `Quiz/${style.trim().replace(/\s+/g, '-')}`;

const jobs = manifest.images
  .filter((i) => styles.includes(i.style))
  .map((i) => ({
    style: i.style,
    room: i.room,
    accent: i.accent,
    file: path.join(SRC, i.file),
    folder: folderFor(i.style),
    // Room slug as the public id: stable, readable, and it makes the weights
    // table legible ("Quiz/Biophilic/bedroom" beats a random Cloudinary suffix).
    publicId: path.basename(i.file, '.png'),
  }));

console.log(`Styles: ${styles.join(' · ')}`);
console.log(`Images: ${jobs.length}`);
console.log(`Mode:   ${overwrite ? 'OVERWRITE existing + invalidate CDN' : 'skip existing (--no-overwrite)'}`);
console.log(`Target: ${[...new Set(jobs.map((j) => j.folder))].join(', ')}`);

if (dryRun) {
  for (const j of jobs.slice(0, 10)) console.log(`  · ${j.folder}/${j.publicId}  <- ${j.room} (${j.accent})`);
  if (jobs.length > 10) console.log(`  · … and ${jobs.length - 10} more`);
  process.exit(0);
}

const missing = jobs.filter((j) => !fs.existsSync(j.file));
if (missing.length) {
  console.error('Missing source files:', missing.map((m) => m.file).join('\n  '));
  process.exit(1);
}

const results = [];
for (const j of jobs) {
  try {
    const r = await cloudinary.uploader.upload(j.file, {
      public_id: j.publicId,
      folder: j.folder,
      overwrite,
      invalidate: overwrite,   // bust the CDN cache, or the old render keeps serving
      unique_filename: false,
      use_filename: false,
      resource_type: 'image',
    });
    results.push({ ...j, url: r.secure_url, id: r.public_id, status: r.existing ? 'exists' : 'ok' });
    console.log(`  [${results.length}/${jobs.length}] ${r.public_id}`);
  } catch (e) {
    results.push({ ...j, url: null, status: 'ERR: ' + (e?.message || e?.error?.message || String(e)) });
    console.error(`  [FAIL] ${j.folder}/${j.publicId} — ${e?.message || e}`);
  }
}

const ok = results.filter((r) => r.url);
const out = path.join(SRC, 'cloudinary-quiz-upload.json');
fs.writeFileSync(out, JSON.stringify(results, null, 2));
console.log(`\n${ok.length}/${jobs.length} uploaded. Map written to ${out}`);
const failed = results.filter((r) => !r.url);
if (failed.length) for (const f of failed) console.log(`  FAILED ${f.folder}/${f.publicId}: ${f.status}`);
