/**
 * AI-029 — In-memory cache for spatial room analysis.
 * Keyed by SHA-256 of the room photo's base64 data. TTL: 1 hour.
 *
 * The analysis depends only on the room photo, so every "Generate Variation"
 * in the same session reuses the cached structure and skips the extra
 * gemini-2.5-flash call. Mirrors styleCache.ts intentionally.
 */

import crypto from "crypto";
import type { RoomStructure } from "./spatialAnalysis.js";

type CacheEntry = { structure: RoomStructure; createdAt: number };

const cache = new Map<string, CacheEntry>();
const TTL_MS = 1000 * 60 * 60; // 1 hour
const SOFT_CAP = 500;

/** Build the cache key from the room photo's base64 data (not the full data URL). */
export function getSpatialCacheKey(roomPhotoData: string): string {
  return crypto.createHash("sha256").update(roomPhotoData).digest("hex");
}

export function getCachedStructure(key: string): RoomStructure | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.structure;
}

export function setCachedStructure(key: string, structure: RoomStructure): void {
  cache.set(key, { structure, createdAt: Date.now() });

  // Soft cap — purge the single oldest entry if over limit.
  if (cache.size > SOFT_CAP) {
    const oldest = [...cache.entries()].sort(
      (a, b) => a[1].createdAt - b[1].createdAt
    )[0];
    if (oldest) cache.delete(oldest[0]);
  }
}
