/**
 * AI-029 — In-memory cache for spatial room analysis.
 * Keyed by SHA-256 of the room photo's base64 data. TTL: 1 hour.
 *
 * The analysis depends only on the room photo, so every "Generate Variation"
 * in the same session reuses the cached structure and skips the extra
 * gemini-2.5-flash call. Mirrors styleCache.ts intentionally.
 */

import crypto from "crypto";
import { analyzeRoomStructureConsensus, type RoomStructure } from "./spatialAnalysis.js";

type CacheEntry = { structure: RoomStructure; createdAt: number };

const cache = new Map<string, CacheEntry>();

/**
 * Analyses in flight, keyed like the cache. The app measures a photo on upload,
 * again on room-type change and again on generate; on 2026-09-15 all three
 * requests landed inside six seconds, before the first result was cached, so
 * each ran its own analysis and the three readings disagreed (one saw the
 * door, one invented a basin) — and the generate route used the worst one.
 * A second caller for the same photo now awaits the first call's promise.
 */
const pending = new Map<string, Promise<RoomStructure | null>>();

export type Analyzer = (photo: { data: string; mimeType: string }) => Promise<RoomStructure | null>;

/**
 * The one way the server should measure a room: cache hit → pending analysis
 * → fresh (consensus) analysis. `fresh` is true only when this call started
 * the analysis, so the caller can bill it exactly once.
 */
export async function getOrAnalyzeStructure(
  photo: { data: string; mimeType: string },
  analyzer: Analyzer = analyzeRoomStructureConsensus,
): Promise<{ structure: RoomStructure | null; fresh: boolean }> {
  const key = getSpatialCacheKey(photo.data);
  const cached = getCachedStructure(key);
  if (cached) return { structure: cached, fresh: false };
  const inFlight = pending.get(key);
  if (inFlight) return { structure: await inFlight, fresh: false };

  const run = (async () => {
    try {
      const structure = await analyzer(photo);
      if (structure) setCachedStructure(key, structure);
      return structure;
    } finally {
      pending.delete(key);
    }
  })();
  pending.set(key, run);
  return { structure: await run, fresh: true };
}

/** Test hook. */
export function _resetSpatialCacheForTests(): void {
  cache.clear();
  pending.clear();
}
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
