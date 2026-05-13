/**
 * Re-upload the higher-quality square crops for the 3 AFTER images.
 *
 * Replaces the existing AI/after_<N>_<id>_square public_ids in place
 * (overwrite: true + invalidate: true so CDN edge caches get purged).
 *
 * Run from worktree root:
 *   npx tsx scripts/reupload-square-afters.ts
 */

import path from 'node:path';
import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';

dotenv.config({ path: process.env.DOTENV_PATH || 'E:/Secrets/Website/.env' });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const SRC_DIR = 'C:/Users/User/Downloads';
const FILES = [
  'after_2_kzpr3p_square.png',
  'after_4_xgalms_square.png',
  'after_7_i66inr_square.png',
];

async function main() {
  if (!process.env.CLOUDINARY_API_SECRET) throw new Error('Cloudinary env not loaded');
  for (const file of FILES) {
    const stem = file.replace(/\.[^.]+$/, '');
    const publicId = `AI/${stem}`;
    const absPath = path.join(SRC_DIR, file);
    process.stdout.write(`→ Replacing ${publicId} from ${file} ... `);
    const res = await cloudinary.uploader.upload(absPath, {
      public_id: publicId,
      overwrite: true,
      invalidate: true,           // purge CDN cache so /upload/.../<id> serves the new bytes
      resource_type: 'image',
    });
    console.log(`✓  (${res.width}×${res.height}, ${(res.bytes / 1024).toFixed(0)} KB, v${res.version})`);
  }
  console.log('\n✅ 3 AFTER images replaced.');
}

main().catch(err => { console.error(err); process.exit(1); });
