/**
 * AI-029 — concept generation orchestrator.
 *
 * DEFAULT is the improved Gemini engine (owner decision 2026-07-14: AI-029
 * parked here). The fal virtual-staging engine remains on this branch but is
 * opt-in only — set AI_VISION_ENGINE=staging to route to it (it falls back to
 * Gemini on failure). Returns which engine actually produced the image.
 */

import { generateConceptImage, type ImageGenerationInput } from "./imageGeneration.js";
import { generateConceptImageStaging, isStagingAvailable } from "./virtualStaging.js";

export type ConceptEngine = "staging" | "gemini";
export interface GenerateConceptResult {
  url: string;
  engine: ConceptEngine;
}

export async function generateConcept(
  input: ImageGenerationInput
): Promise<GenerateConceptResult> {
  // AI-029 parked (2026-07-14): the improved Gemini engine is the DEFAULT.
  // The fal virtual-staging engine is kept on this branch but opt-in only —
  // set AI_VISION_ENGINE=staging to try it. Unset (default) = improved Gemini.
  const forcedEngine = (process.env.AI_VISION_ENGINE || "").trim().toLowerCase();
  const stagingRequested = forcedEngine === "staging";

  if (stagingRequested && isStagingAvailable()) {
    try {
      const url = await generateConceptImageStaging({
        roomPhoto: input.roomPhoto,
        styleBrief: input.styleBrief,
        roomType: input.roomType,
        variationSeed: input.variationSeed,
        accent: input.accent,
      });
      return { url, engine: "staging" };
    } catch (err: any) {
      console.warn(
        `[ai-vision] Staging failed — falling back to Gemini: ${err?.message ?? err}`
      );
    }
  }
  const url = await generateConceptImage(input);
  return { url, engine: "gemini" };
}
