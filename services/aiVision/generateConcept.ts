/**
 * AI-029 Phase 3 — concept generation orchestrator.
 *
 * Routes to the virtual-staging engine (fal) when a fal key is present — it
 * keeps the real room and only adds furniture, so it never invents doorways or
 * windows — and falls back to the Gemini engine on any staging failure (or when
 * no fal key is configured), so a provider outage never blocks a user. Returns
 * which engine actually produced the image.
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
  if (isStagingAvailable()) {
    try {
      const url = await generateConceptImageStaging({
        roomPhoto: input.roomPhoto,
        styleBrief: input.styleBrief,
        roomType: input.roomType,
        variationSeed: input.variationSeed,
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
