/**
 * Keyword-volume orchestrator for the GEO watchlist. Merges whichever free
 * sources are configured — Google Keyword Planner (authoritative) and/or Bing
 * Webmaster (fast to set up, Bing-scaled) — into one per-phrase shape. Neither
 * configured → { configured:false }, and the UI shows a "connect a source" hint.
 */
import { googleAdsConfigured, googleAdsVolumes } from "./googleAdsKeywords.js";
import { bingConfigured, bingVolumes } from "./bingKeywords.js";

export interface PhraseVolume { google: number | null; bing: number | null; }
export interface KeywordVolumeResult {
  configured: boolean;
  sources: string[]; // e.g. ["google","bing"]
  byPhrase: Record<string, PhraseVolume>;
}

export async function getKeywordVolumes(phrases: string[]): Promise<KeywordVolumeResult> {
  const sources: string[] = [];
  if (googleAdsConfigured()) sources.push("google");
  if (bingConfigured()) sources.push("bing");

  const byPhrase: Record<string, PhraseVolume> = {};
  for (const p of phrases) byPhrase[p.trim().toLowerCase()] = { google: null, bing: null };

  if (sources.length === 0) return { configured: false, sources, byPhrase };

  const [g, b] = await Promise.all([
    googleAdsConfigured() ? googleAdsVolumes(phrases).catch(() => ({} as Record<string, number | null>)) : Promise.resolve({} as Record<string, number | null>),
    bingConfigured() ? bingVolumes(phrases).catch(() => ({} as Record<string, number | null>)) : Promise.resolve({} as Record<string, number | null>),
  ]);
  for (const [k, v] of Object.entries(g)) if (byPhrase[k]) byPhrase[k].google = v;
  for (const [k, v] of Object.entries(b)) if (byPhrase[k]) byPhrase[k].bing = v;

  return { configured: true, sources, byPhrase };
}
