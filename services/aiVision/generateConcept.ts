/**
 * AI-029 — concept generation orchestrator.
 *
 * DEFAULT is the fal virtual-staging engine. It EDITS the uploaded photograph and
 * only adds furniture, so it cannot invent a window or a wall the way a
 * regenerative model can. Gemini remains as the automatic fallback (and can be
 * forced with AI_VISION_ENGINE=gemini). Returns which engine actually ran.
 *
 * Why this changed (2026-09-08). Benchmarked over 16 real client rooms — pack 1,
 * three runs per engine, same rooms and same styles each time — counting the six
 * architectural checks (windows, doors, walls, proportions, ceiling, invented
 * architecture):
 *
 *                      rooms clean /16      architectural damage
 *                                            all 16      residential only
 *     gemini            1, 5, 5              21.0 avg      9.7 avg  (9, 9, 11)
 *     staging           5, 6, 8              20.0 avg      4.0 avg  (6, 5, 1)
 *
 * Across all 16 it is a tie. On RESIDENTIAL rooms — the product's actual scope —
 * the ranges do not overlap: staging's worst run beats Gemini's best. The overall
 * tie is entirely explained by staging doing WORSE on the commercial and outdoor
 * cases (cafés, offices, open-air kiosks), which are out of scope and which the
 * app does not yet gate. If commercial support is ever built, re-run the
 * benchmark before assuming this default still holds.
 *
 * Note the earlier verdict (2026-07-14) that parked staging as "not working" was
 * made against a broken prompt: buildStagingPrompt led with the full style brief
 * and a scene description, which made the model ignore the reference photo
 * entirely (0/16 preserved). That is fixed; see the note in buildStagingPrompt,
 * and do not lengthen that prompt without re-running the benchmark.
 *
 * Harness: scripts/aivision-bench/{ingest,run,grade}.ts
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
  // Unset (the normal case) = staging. `AI_VISION_ENGINE=gemini` forces the old
  // engine, which is the escape hatch if staging ever regresses in production.
  const forcedEngine = (process.env.AI_VISION_ENGINE || "").trim().toLowerCase();
  const geminiForced = forcedEngine === "gemini";
  const stagingAvailable = isStagingAvailable();

  if (!geminiForced && !stagingAvailable) {
    // Loud on purpose: without FAL_KEY every request silently falls back to the
    // engine that does roughly twice the architectural damage on real rooms, and
    // nothing in the response would tell anyone that happened.
    console.warn(
      "[ai-vision] FAL_KEY is not set — the staging engine is unavailable and " +
        "every generation is falling back to Gemini. Set FAL_KEY to restore the " +
        "default engine."
    );
  }

  if (!geminiForced && stagingAvailable) {
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
