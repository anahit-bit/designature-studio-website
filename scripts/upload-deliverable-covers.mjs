// S-014 — uploader for the four /deliverables phase cover thumbnails.
//
// Sources (owner-picked), all pre-cropped to 4:5 at 1200x1500 by
// scratchpad/build_covers_final.py so they fill the cover frame exactly:
//   phase 1-2         Phase 1 - Phase 2.pdf        p21  concept + moodboard collage
//   phase 3 ai        Phase 3 AI Concept.pdf       p6   the kitchen render
//   phase 3 renders   Renders/Final/10 (2).jpg     bedroom render
//   phase 4 technical AllinOne Sample Project.pdf  p14  floorplan only (no title block)
// Uploaded as `image` resource type so Cloudinary resizes/formats per breakpoint.
//
// Re-running overwrites in place and invalidates the CDN copy.
//
// Usage: node scripts/upload-deliverable-covers.mjs
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

const SRC = process.env.COVERS_DIR
  || 'C:/Users/User/AppData/Local/Temp/claude/E--Business-Claude-Website--claude-worktrees-confident-maxwell-841ac0/892cf53a-7409-4d96-ac5c-13ea099ac7e8/scratchpad/covers_final';
const FOLDER = 'Deliverables Samples';

const FILES = [
  ['deliverables-cover-phase-1-2.jpg', 'deliverables-cover-phase-1-2'],
  ['deliverables-cover-phase-3-ai-concept.jpg', 'deliverables-cover-phase-3-ai-concept'],
  ['deliverables-cover-phase-3-renders.jpg', 'deliverables-cover-phase-3-renders'],
  ['deliverables-cover-phase-4-technical.jpg', 'deliverables-cover-phase-4-technical'],
];

const out = {};
for (const [file, public_id] of FILES) {
  const abs = path.join(SRC, file);
  try {
    const r = await cloudinary.uploader.upload(abs, {
      public_id,
      asset_folder: FOLDER,
      resource_type: 'image',
      overwrite: true,
      invalidate: true,
      unique_filename: false,
      use_filename: false,
    });
    out[public_id] = {
      url: r.secure_url,
      version: `v${r.version}`,
      dims: `${r.width}x${r.height}`,
      bytes: r.bytes,
      status: 'ok',
    };
  } catch (e) {
    out[public_id] = { url: null, status: 'ERR: ' + (e?.message || e?.error?.message || String(e)) };
  }
}

console.log(JSON.stringify(out, null, 2));
