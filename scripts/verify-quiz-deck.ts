/**
 * Headless verification for the Style-Quiz deck crop fix.
 *
 * Pulls the REAL library from the running dev server's /api/images (same source
 * the screen uses), runs every URL through the exact options the deck now ships,
 * and asserts the delivered asset is the full room padded to frame - never cropped.
 */
import { cld } from '../src/lib/cld';
import { QUIZ_DECK_RATIO, QUIZ_DECK_IMAGE_OPTS } from '../src/components/StyleQuizScreen';

const BASE = 'http://localhost:3000';
const STYLES = ['Japandi','Modern','Mid-Century','Bohemian','Rustic','Art-Deco','Industrial','Coastal','Transitional','Biophilic','Minimalist','Maximalist','Dopamine','Warm-Contemporary'];
const [RW, RH] = QUIZ_DECK_RATIO.split('/').map(Number);
const EXPECT_W = 1200, EXPECT_H = Math.round((1200 * RH) / RW);

/** Read intrinsic pixel size straight from the JPEG/PNG/WebP bytes. */
function dims(b: Buffer): { w: number; h: number } | null {
  if (b[0] === 0x89 && b[1] === 0x50) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length - 9) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc)
        return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  if (b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP') {
    const t = b.slice(12, 16).toString();
    if (t === 'VP8X') return { w: (b.readUIntLE(24, 3) & 0xffffff) + 1, h: (b.readUIntLE(27, 3) & 0xffffff) + 1 };
    if (t === 'VP8L') { const n = b.readUInt32LE(21); return { w: (n & 0x3fff) + 1, h: ((n >> 14) & 0x3fff) + 1 }; }
    if (t === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
  }
  return null;
}

const fails: string[] = [];
let checked = 0, squares = 0, native = 0, bytesMax = 0;

for (const style of STYLES) {
  const res = await fetch(`${BASE}/api/images?folder=${encodeURIComponent('Quiz/' + style)}`);
  if (!res.ok) { fails.push(`${style}: /api/images ${res.status}`); continue; }
  const list = (await res.json()) as any[];
  if (!Array.isArray(list) || !list.length) { fails.push(`${style}: empty folder`); continue; }

  for (const r of list) {
    const src = String(r.secure_url || r.url || '');
    if (!src) continue;
    const ar = r.width / r.height;
    if (Math.abs(ar - 1) < 0.02) squares++;
    if (Math.abs(ar - 1184 / 864) < 0.005) native++;

    const url = cld(src, 1200, QUIZ_DECK_IMAGE_OPTS);
    if (!url.includes('c_pad')) fails.push(`${style}/${r.public_id}: no c_pad`);
    if (url.includes('c_fill')) fails.push(`${style}/${r.public_id}: still c_fill`);

    const img = await fetch(url);
    if (!img.ok) { fails.push(`${style}/${r.public_id}: HTTP ${img.status}`); continue; }
    const buf = Buffer.from(await img.arrayBuffer());
    bytesMax = Math.max(bytesMax, buf.length);
    const d = dims(buf);
    if (!d) { fails.push(`${style}/${r.public_id}: unreadable header`); continue; }
    if (d.w !== EXPECT_W || d.h !== EXPECT_H)
      fails.push(`${style}/${r.public_id}: delivered ${d.w}x${d.h}, expected ${EXPECT_W}x${EXPECT_H}`);
    checked++;
  }
}

console.log(`frame            ${QUIZ_DECK_RATIO}  ->  ${EXPECT_W}x${EXPECT_H}`);
console.log(`images delivered ${checked}`);
console.log(`  legacy 1:1     ${squares}  (previously lost 31% of height)`);
console.log(`  native 1184x864 ${native}  (previously lost 5.8%)`);
console.log(`largest payload  ${(bytesMax / 1024).toFixed(0)} KB  (deck budget 254 KB)`);
console.log(fails.length ? `\nFAILURES (${fails.length}):\n` + fails.join('\n') : '\nOK - every room delivered whole, nothing cropped.');
process.exit(fails.length ? 1 : 0);
