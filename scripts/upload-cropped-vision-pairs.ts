/**
 * One-off uploader for the AI-023 manually-cropped before/after pairs.
 *
 * Reads each .png/.jpg from C:\Users\User\Downloads\AI_2026-05-12_07_17\ and
 * uploads it to Cloudinary into folder "AI" with a `_square` suffix on the
 * existing public_id stem (so we don't overwrite the original uncropped IDs).
 *
 * Example:   before_1_fnbjlt.jpg  →  AI/before_1_fnbjlt_square
 *
 * Run from worktree root:
 *   npx tsx scripts/upload-cropped-vision-pairs.ts
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';

const ENV_PATH = process.env.DOTENV_PATH || 'E:/Secrets/Website/.env';
dotenv.config({ path: ENV_PATH });

const SRC_DIR = 'C:/Users/User/Downloads/AI_2026-05-12_07_17';
const FOLDER = 'AI';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function main() {
  if (!process.env.CLOUDINARY_API_SECRET) {
    throw new Error(`Cloudinary env not loaded (looked at ${ENV_PATH}). Aborting.`);
  }
  const files = await fs.readdir(SRC_DIR);
  const pairs = files.filter(f => /\.(jpg|jpeg|png)$/i.test(f));
  console.log(`Found ${pairs.length} images in ${SRC_DIR}`);

  const results: Array<{ file: string; publicId: string; secureUrl: string }> = [];
  for (const file of pairs) {
    const stem = file.replace(/\.[^.]+$/, ''); // strip extension
    const publicId = `${FOLDER}/${stem}_square`;
    const absPath = path.join(SRC_DIR, file);
    process.stdout.write(`→ Uploading ${file} as ${publicId} ... `);
    const res = await cloudinary.uploader.upload(absPath, {
      public_id: publicId,
      overwrite: false, // safety: refuse to clobber if already there
      resource_type: 'image',
    });
    console.log(`✓  (${res.width}×${res.height}, ${(res.bytes / 1024).toFixed(0)} KB)`);
    results.push({ file, publicId: res.public_id, secureUrl: res.secure_url });
  }

  console.log('\n── Upload summary ─────────────────────────────────────');
  for (const r of results) console.log(`  ${r.publicId}`);
  console.log('───────────────────────────────────────────────────────');
  console.log(`✅ ${results.length} files uploaded to Cloudinary folder "${FOLDER}".`);
}

main().catch(err => {
  console.error('Upload failed:', err);
  process.exit(1);
});
