/**
 * AI Vision — concept generation orchestrator.
 *
 * DEFAULT is GPT Image (OpenAI, full production prompt) — see the owner-review
 * rationale below. Gemini is the automatic fallback and can be forced with
 * AI_VISION_ENGINE=gemini. Returns which engine actually ran so the cost lands
 * in the right bucket.
 *
 * TEMP OVERRIDE (2026-09-18): the OpenAI account has no funds, so every request
 * was paying for a failed OpenAI call before falling back to Gemini. DEFAULT_ENGINE
 * below is set to "gemini" until the account is funded again — set it back to
 * "openai", or set AI_VISION_ENGINE=openai to override without a code change.
 *
 * Why (2026-09-14). Seven engines were run on the same ten hard rooms — four
 * bathrooms including one where only the tub is visible, a raw-plaster shell,
 * a bare hallway, a head-on window, a brick fireplace, a dated kitchen and an
 * already-furnished living room — with identical style brief, measured
 * structure and accent colour:
 *
 *   _Plan\Website\aivision-bench\engine-compare\engines-01\compare-embedded.html
 *
 * GPT Image 2.5 with the full prompt was the most faithful of the seven: it kept
 * the exact tub, shower and rail; the hallway's door and switch; the brick
 * fireplace, both windows and the wall colour; the shell's dropped ceiling and
 * radiator. The owner reviewed every image and chose it. Measured cost $0.078
 * per image at quality=high, within a cent of Nano Banana 2 ($0.067), the only
 * Gemini image model that survives the October 2, 2026 shutdown of
 * gemini-2.5-flash-image.
 *
 * The fal virtual-staging engine (default from PR #102 to this change) was
 * removed: on the same rooms it pulled the camera back and invented a wall of
 * backlit glass cabinetry on six of ten, and it cannot take the full prompt at
 * all (given it, it returns the source photo untouched). The 16-room grader
 * that had favoured it scores openings and walls only, so invented joinery and
 * camera drift never registered. Grader ≠ eye.
 *
 * Harness: scripts/aivision-bench/{ingest,run,grade,compare-engines}.ts
 */

import { generateConceptImage, type ImageGenerationInput } from "./imageGeneration.js";
import { generateConceptImageOpenAI, isOpenAIImageAvailable } from "./openaiImage.js";

export type ConceptEngine = "openai" | "gemini";
export interface GenerateConceptResult {
  url: string;
  engine: ConceptEngine;
}

/** See the TEMP OVERRIDE note above — set back to "openai" once funded. */
const DEFAULT_ENGINE: ConceptEngine = "gemini";

export async function generateConcept(
  input: ImageGenerationInput
): Promise<GenerateConceptResult> {
  const forcedEngine = (process.env.AI_VISION_ENGINE || "").trim().toLowerCase();
  const engine: ConceptEngine =
    forcedEngine === "openai" ? "openai" : forcedEngine === "gemini" ? "gemini" : DEFAULT_ENGINE;
  const geminiForced = engine === "gemini";
  const openaiAvailable = isOpenAIImageAvailable();

  if (!geminiForced && !openaiAvailable) {
    // Loud on purpose: without OPENAI_API_KEY every request silently runs on
    // the fallback engine and nothing in the response would say so.
    console.warn(
      "[ai-vision] OPENAI_API_KEY is not set — GPT Image is unavailable and " +
        "every generation is falling back to Gemini. Set OPENAI_API_KEY to " +
        "restore the default engine."
    );
  }

  if (!geminiForced && openaiAvailable) {
    try {
      const url = await generateConceptImageOpenAI({
        roomPhoto: input.roomPhoto,
        styleBrief: input.styleBrief,
        roomType: input.roomType,
        variationSeed: input.variationSeed,
        spatialConstraints: input.spatialConstraints,
        sourceStructure: input.sourceStructure,
        accent: input.accent,
        dimensions: input.dimensions,
      });
      return { url, engine: "openai" };
    } catch (err: any) {
      console.warn(
        `[ai-vision] GPT Image failed — falling back to Gemini: ${err?.message ?? err}`
      );
    }
  }

  const url = await generateConceptImage(input);
  return { url, engine: "gemini" };
}
