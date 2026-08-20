// S-014 — uploader for the five /deliverables sample PDFs.
//
// Uploads the studio's sample package to Cloudinary under asset_folder
// "Deliverables Samples" with stable public_ids, so the site serves them from
// the CDN instead of committing ~57 MB of binaries into the repo.
//
// SOURCE = the compressed set, not the raw originals. Cloudinary's Free plan
// caps a single asset at 10 MB and four of the five originals are 11.7–13 MB,
// so they are re-encoded first (see scratchpad/build_samples.py):
//   * four files at 260 DPI / q88 — visually indistinguishable from source
//   * all-in-one at 125 DPI / q72 — it is 6.85 MiB of VECTOR linework that
//     compression cannot touch, so its rasters had to go further to fit
// Vector content (CAD linework, dimension text) is never re-encoded, so the
// technical drawings stay pixel-exact; extractable text is byte-identical.
//
// Re-running overwrites in place and invalidates the CDN copy.
//
// Usage: node scripts/upload-deliverable-samples.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { v2: cloudinary } = require('cloudinary');

const ENV = 'E:/Secrets/Website/.env';
const env = fs.readFileSync(ENV, 'utf8');
const get = (k) => {
  const m = env.match(new RegExp('^' + k + '=(.*)$', 'm'));
  return m ? m[1].trim() : null;
};
cloudinary.config({
  cloud_name: get('CLOUDINARY_CLOUD_NAME'),
  api_key: get('CLOUDINARY_API_KEY'),
  api_secret: get('CLOUDINARY_API_SECRET'),
});

const SRC = process.env.SAMPLES_DIR
  || 'C:/Users/User/AppData/Local/Temp/claude/E--Business-Claude-Website--claude-worktrees-confident-maxwell-841ac0/892cf53a-7409-4d96-ac5c-13ea099ac7e8/scratchpad/compressed';
const FOLDER = 'Deliverables Samples';
const CAP = 10_485_760; // Cloudinary Free plan per-asset limit

const FILES = [
  ['phase-1-2.pdf', 'deliverables-phase-1-2'],
  ['phase-3-ai-concept.pdf', 'deliverables-phase-3-ai-concept'],
  ['phase-3-renders.pdf', 'deliverables-phase-3-renders'],
  ['phase-4-technical.pdf', 'deliverables-phase-4-technical'],
  ['all-in-one.pdf', 'deliverables-all-in-one'],
];

const out = {};
for (const [file, public_id] of FILES) {
  const abs = path.join(SRC, file);
  const bytes = fs.statSync(abs).size;
  if (bytes >= CAP) {
    out[public_id] = { url: null, srcBytes: bytes, status: `SKIP: ${bytes} >= ${CAP} cap` };
    continue;
  }
  try {
    const r = await cloudinary.uploader.upload(abs, {
      public_id,
      asset_folder: FOLDER,
      // `raw` keeps the PDF a plain downloadable file — no image pipeline, no
      // PDF-delivery security gate, no page-count/size transformation limits.
      resource_type: 'raw',
      overwrite: true,
      invalidate: true,
      unique_filename: false,
      use_filename: false,
    });
    out[public_id] = { url: r.secure_url, bytes: r.bytes, srcBytes: bytes, status: 'ok' };
  } catch (e) {
    out[public_id] = {
      url: null,
      srcBytes: bytes,
      status: 'ERR: ' + (e?.message || e?.error?.message || String(e)),
    };
  }
}

console.log(JSON.stringify(out, null, 2));
