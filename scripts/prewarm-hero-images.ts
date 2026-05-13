/**
 * Eager-cache the logged-out hero variants on Cloudinary's edge.
 *
 * After a deploy that changes the hero transforms (q_auto:best, e_sharpen:60,
 * c_fill/g_auto/aspectRatio 1/1, etc.), Cloudinary needs to generate each
 * (width, height, format) variant the first time it's requested. That first
 * request pays a 500–1500 ms penalty while the variant is built.
 *
 * Run this script against the prod CDN immediately after the deploy lands so
 * the next real visitor gets cached bytes. It hits every (variant × width)
 * URL once with f_auto so the WebP / AVIF / JPEG forks all warm up.
 *
 * Usage:
 *   npx tsx scripts/prewarm-hero-images.ts
 *   # or:
 *   npm run prewarm:heroes
 */

const CLD = 'https://res.cloudinary.com/dys2k5muv/image/upload';

const HERO_WIDTHS_VISION = [800, 1280, 1600, 1920, 2400];
const HERO_WIDTHS_QUIZ   = [640, 960, 1280, 1920];

// AI Vision logged-out hero — featured pair 7 (Minimalism) shows first, but
// the card row can swap any of {1, 2, 4} in so warm them all.
const VISION_PAIRS = [
  { before: 'AI/before_1_fnbjlt_square', after: 'AI/after_1_khwg9g_square' },
  { before: 'AI/before_2_k7jvg3_square', after: 'AI/after_2_kzpr3p_square' },
  { before: 'AI/before_4_vpepte_square', after: 'AI/after_4_xgalms_square' },
  { before: 'AI/before_7_bwczrl_square', after: 'AI/after_7_i66inr_square' },
];

const QUIZ_HERO_ID = 'v1774949502/5_sqgqmb.jpg';

function visionUrl(publicId: string, width: number): string {
  return `${CLD}/f_auto,q_auto:best,c_fill,g_auto,w_${width},h_${width},e_sharpen:60/${publicId}`;
}
function visionLqipUrl(publicId: string): string {
  return `${CLD}/f_auto,q_auto:eco,c_fill,g_auto,w_50,h_50,e_blur:1000/${publicId}`;
}

const urls: string[] = [];
for (const pair of VISION_PAIRS) {
  for (const w of HERO_WIDTHS_VISION) {
    urls.push(visionUrl(pair.before, w));
    urls.push(visionUrl(pair.after, w));
  }
  urls.push(visionLqipUrl(pair.before));
  urls.push(visionLqipUrl(pair.after));
}
for (const w of HERO_WIDTHS_QUIZ) {
  urls.push(`${CLD}/f_auto,q_auto:best,c_fill,g_auto,w_${w},h_${w},e_sharpen:60/${QUIZ_HERO_ID}`);
}
urls.push(`${CLD}/f_auto,q_auto:eco,c_fill,g_auto,w_50,h_50,e_blur:1000/${QUIZ_HERO_ID}`);

async function main() {
  console.log(`Pre-warming ${urls.length} Cloudinary variants…\n`);
  const start = Date.now();
  let ok = 0;
  let firstHit = 0;
  let cached = 0;
  let failed = 0;
  for (const url of urls) {
    const t0 = Date.now();
    try {
      const r = await fetch(url, { method: 'HEAD' });
      const elapsed = Date.now() - t0;
      // Cloudinary returns `x-cld-stratus: cached` / `dynamic` on most edges,
      // but the simpler heuristic is elapsed-time: <200 ms ≈ already cached.
      if (!r.ok) {
        failed++;
        console.log(`  ✗ ${r.status} ${url.replace(CLD + '/', '')}`);
      } else {
        ok++;
        if (elapsed < 200) cached++;
        else firstHit++;
        const tail = url.split('/').pop();
        process.stdout.write(`  ${elapsed < 200 ? '·' : '✓'} ${elapsed.toString().padStart(4)} ms  ${url.match(/w_(\d+)/)?.[0] || 'lqip'.padEnd(7)}  ${tail}\n`);
      }
    } catch (e: any) {
      failed++;
      console.log(`  ✗ ${e.message} ${url}`);
    }
  }
  const total = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n✅ ${ok}/${urls.length} warmed in ${total}s — ${firstHit} first-hits (built), ${cached} already cached, ${failed} failed.`);
}

main().catch(err => { console.error(err); process.exit(1); });
