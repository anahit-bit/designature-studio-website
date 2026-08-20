// S-014 — uploader for the four /deliverables phase cover thumbnails.
//
// Each cover is a render of page 1 of the matching sample PDF (the studio's
// branded title page). Rendered by scratchpad/build_covers.py, uploaded here as
// `image` resource type so Cloudinary can resize/format them per breakpoint.
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
  || 'C:/Users/User/AppData/Local/Temp/claude/E--Business-Claude-Website--claude-worktrees-confident-maxwell-841ac0/892cf53a-7409-4d96-ac5c-13ea099ac7e8/scratchpad/covers';
const FOLDER = 'Deliverables Samples';

const FILES = [
  ['phase-1-2-p1.jpg', 'deliverables-cover-phase-1-2'],
  ['phase-3-ai-concept-p1.jpg', 'deliverables-cover-phase-3-ai-concept'],
  ['phase-3-renders-p1.jpg', 'deliverables-cover-phase-3-renders'],
  ['phase-4-technical-p1.jpg', 'deliverables-cover-phase-4-technical'],
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
