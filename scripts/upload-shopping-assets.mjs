// One-off, idempotent uploader for the Shopping List (03) redesign assets.
// - 4 sample room renders + 16 product thumbnails (from the source worktree) → asset_folder "Tool 03 Example"
// - retailer logos (fetched from clearbit) → asset_folder "Retailers"
// Prints a public_id → secure_url map. Re-running skips assets that already exist (overwrite:false).
// Usage: node scripts/upload-shopping-assets.mjs
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

const SRC = 'E:/Business/Claude/Website/.claude/worktrees/interesting-nightingale-21be5f/public/shopping-examples';
const ROOMS = ['living', 'patio', 'bedroom', 'dining'];
const RETAILERS = [
  ['westelm', 'westelm.com'], ['crateandbarrel', 'crateandbarrel.com'], ['article', 'article.com'],
  ['kavehome', 'kavehome.com'], ['bludot', 'bludot.com'], ['allmodern', 'allmodern.com'],
  ['cb2', 'cb2.com'], ['potterybarn', 'potterybarn.com'], ['ikea', 'ikea.com'],
  ['wayfair', 'wayfair.com'], ['desenio', 'desenio.com'], ['society6', 'society6.com'],
];

async function up(fileOrUrl, public_id, asset_folder) {
  try {
    const r = await cloudinary.uploader.upload(fileOrUrl, {
      public_id, asset_folder, overwrite: false, unique_filename: false, use_filename: false, resource_type: 'image',
    });
    return { public_id, url: `${r.secure_url}`, version: r.version, status: 'ok' };
  } catch (e) {
    return { public_id, url: null, status: 'ERR: ' + (e?.message || e?.error?.message || String(e)) };
  }
}

const out = { rooms: {}, products: {}, logos: {} };

for (const room of ROOMS) {
  const r = await up(path.join(SRC, `${room}.webp`), `shopping-room-${room}`, 'Tool 03 Example');
  out.rooms[room] = r;
  console.error(`[room]    ${room.padEnd(8)} ${r.status === 'ok' ? r.url : r.status}`);
  for (let i = 1; i <= 4; i++) {
    const p = await up(path.join(SRC, 'products', `${room}-${i}.webp`), `shopping-${room}-${i}`, 'Tool 03 Example');
    out.products[`${room}-${i}`] = p;
    console.error(`[product] ${room}-${i}     ${p.status === 'ok' ? p.url : p.status}`);
  }
}

// Clearbit's logo API was discontinued (DNS fails). Self-host Google's favicon
// (sz=256 where available) on Cloudinary instead — drops the live Google dependency.
// Quality varies per retailer (32px–256px); low-res marks can be swapped for
// licensed SVGs later (owner follow-up). Text fallback covers any miss.
for (const [slug, domain] of RETAILERS) {
  const l = await up(`https://www.google.com/s2/favicons?domain=${domain}&sz=256`, `retailer-${slug}`, 'Retailers');
  out.logos[slug] = l;
  console.error(`[logo]    ${slug.padEnd(14)} ${l.status === 'ok' ? l.url : l.status}`);
}

// Machine-readable map last (stdout) so a follow-up read is clean.
console.log('\n===JSON===');
console.log(JSON.stringify(out, null, 2));
