/**
 * In-memory style-brief cache for the AI Vision pipeline.
 * Keyed by SHA-256 hash of reference image data + preset name.
 * TTL: 1 hour. Soft cap: 500 entries (oldest purged first).
 *
 * This is intentionally simple — no Redis, no DB.  Entries survive for
 * the lifetime of the server process, so variations in the same session
 * reuse the cached brief and skip the text-extraction call.
 */

import crypto from "crypto";
import type { StylePreset } from "./stylePresets.js";

type CacheEntry = { brief: string; createdAt: number };

const cache = new Map<string, CacheEntry>();
const TTL_MS = 1000 * 60 * 60; // 1 hour
const SOFT_CAP = 500;

/**
 * Build the cache key from reference image base64 strings + optional preset.
 * We hash the raw data so the key is always a fixed-length hex string.
 */
export function getCacheKey(input: {
  referenceImageData: string[];   // base64 strings (not full data URLs)
  preset?: StylePreset;
}): string {
  const hash = crypto.createHash("sha256");
  for (const data of input.referenceImageData) hash.update(data);
  if (input.preset) hash.update(input.preset);
  return hash.digest("hex");
}

export function getCachedBrief(key: string): string | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.brief;
}

export function setCachedBrief(key: string, brief: string): void {
  cache.set(key, { brief, createdAt: Date.now() });

  // Soft cap — purge the single oldest entry if over limit
  if (cache.size > SOFT_CAP) {
    const oldest = [...cache.entries()].sort(
      (a, b) => a[1].createdAt - b[1].createdAt
    )[0];
    if (oldest) cache.delete(oldest[0]);
  }
}
