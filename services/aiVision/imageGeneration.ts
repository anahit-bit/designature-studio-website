/**
 * Step 2 of the AI Vision pipeline — concept image generation.
 *
 * Takes the room photo and the style brief from Step 1 (or from a preset),
 * calls the Gemini image model (fallback engine since 2026-09-14; GPT Image is
 * the default — see generateConcept.ts), and returns the generated image as a base64
 * data URL string (data:image/png;base64,…).
 */

import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import type { RoomType } from "./stylePresets.js";
import { buildGenerationPrompt, type pickAccent } from "./promptTemplates.js";
import type { RoomStructure } from "./spatialAnalysis.js";
import { verifyStructure } from "./structureVerify.js";

export interface ImageGenerationInput {
  /** Base64 data (without prefix) and MIME type of the room photo. */
  roomPhoto: { data: string; mimeType: string };
  /** Style brief from Step 1 or from STYLE_BRIEFS. */
  styleBrief: string;
  /** Optional room type label for the prompt; omit for auto-detect. */
  roomType?: RoomType;
  /** Increment each time "Generate Variation" is clicked in the session. */
  variationSeed?: number;
  /**
   * AI-029 — pre-rendered coordinate-grounded architecture constraints from
   * spatialAnalysis. Omit/empty when unavailable (prompt falls back cleanly).
   */
  spatialConstraints?: string;
  /**
   * AI-029 Phase 2b — the measured source structure. When present, the output
   * is re-analyzed and, if the room was widened past tolerance (window shrank
   * as a share of the frame), one corrective retry is attempted. Omit to skip
   * verification entirely.
   */
  sourceStructure?: RoomStructure | null;
  /**
   * The single palette colour (or 2026 paint) emphasised in this concept.
   * Chosen once per request in server.ts so the same colour is reported back to
   * the client and reused on a corrective retry.
   */
  accent?: ReturnType<typeof pickAccent>;
  /**
   * Gemini image model id. Defaults to GEMINI_IMAGE_MODEL, then
   * gemini-3.1-flash-image (Nano Banana 2). The original gemini-2.5-flash-image
   * shuts down on 2026-10-02; gemini-3-pro-image is the dearer Pro tier.
   * Benchmarks pass it per call so several models can run side by side.
   */
  model?: string;
  /** Benchmark-only: skip the post-generation structure check. */
  skipVerify?: boolean;
}

export const DEFAULT_GEMINI_IMAGE_MODEL = "gemini-3.1-flash-image";
export function geminiImageModel(override?: string): string {
  return (override || process.env.GEMINI_IMAGE_MODEL || "").trim() || DEFAULT_GEMINI_IMAGE_MODEL;
}

/**
 * Calls the Gemini image model with the room photo and style brief.
 * Returns the generated concept as a data URL string.
 *
 * Retries up to 2 times on quota errors with exponential back-off.
 */
export async function generateConceptImage(
  input: ImageGenerationInput
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY ?? "";
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set.");

  const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: 120000 } });
  const model = geminiImageModel(input.model);

  const prompt = buildGenerationPrompt({
    styleBrief: input.styleBrief,
    roomType: input.roomType,
    variationSeed: input.variationSeed,
    spatialConstraints: input.spatialConstraints,
    accent: input.accent,
    structure: input.sourceStructure, // RD26 — the photo-specific programme note
  });

  // ── Preprocess room photo: resize large images before sending to Gemini ──
  let roomPhotoData = input.roomPhoto.data;
  let roomPhotoMime = input.roomPhoto.mimeType;
  let inputAspect = 1.0;
  {
    const rawBuffer = Buffer.from(roomPhotoData, "base64");

    // AI-030: measure the input photo's true aspect (after EXIF orientation)
    // so we can ask Gemini to generate a concept in the same orientation.
    // Sharp's metadata() reports source dimensions; for orientation 5-8 the
    // image is logically rotated 90/270°, so width/height must be swapped.
    try {
      const md = await sharp(rawBuffer).metadata();
      let mw = md.width ?? 1;
      let mh = md.height ?? 1;
      if (md.orientation && md.orientation >= 5 && md.orientation <= 8) {
        [mw, mh] = [mh, mw];
      }
      if (mw > 0 && mh > 0) inputAspect = mw / mh;
    } catch (err: any) {
      console.warn(`[ai-vision] Could not read input aspect, defaulting to 1.0: ${err?.message}`);
    }

    if (rawBuffer.length > 1_500_000) {
      const resized = await sharp(rawBuffer)
        .rotate() // auto-apply EXIF orientation (portrait phone shots)
        .resize({ width: 1536, height: 1536, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
      console.log(`Room photo resized: ${rawBuffer.length} -> ${resized.length} bytes`);
      roomPhotoData = resized.toString("base64");
      roomPhotoMime = "image/jpeg";
    } else {
      console.log(`Room photo within limit (${rawBuffer.length} bytes), no resize needed`);
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  const chosenAspect = pickAspectRatio(inputAspect);
  console.log(`[ai-vision] Step 2 aspectRatio=${chosenAspect} (input=${inputAspect.toFixed(2)})`);

  // AI-030: if the SDK or API rejects imageConfig.aspectRatio, drop it and
  // retry once with the default config so generation isn't blocked.
  let useImageConfig = true;

  // AI-030g: server-side aspect guarantee. Gemini sometimes ignores
  // imageConfig.aspectRatio and returns landscape regardless. Up to two
  // retries with a stronger CRITICAL constraint appended to the prompt.
  // Outputs within ±15% of the input aspect are accepted as a match.
  const MAX_ASPECT_RETRIES = 2;
  const ASPECT_TOLERANCE = 0.15;

  // AI-030g: upscale Gemini outputs (typically ~1024–1280px) to ~1800px
  // on the longest edge so the hero stays crisp on high-DPR displays.
  const TARGET_LONG_EDGE = 1800;

  // Structure verification (RD25 / RD27 / RD5 / AI-029 proportion) — shared
  // with the OpenAI engine in structureVerify.ts. ONE corrective retry, to cap
  // cost and latency.
  const MAX_PROPORTION_RETRIES = 1;

  const generateOne = async (
    retryCount = 0,
    aspectRetryCount = 0,
    proportionRetryCount = 0,
    proportionNote = ""
  ): Promise<string> => {
    let response: any;
    try {
      // AI-030g: on aspect-retry, append a strong final constraint to the
      // prompt so Gemini knows the previous output was wrong-aspect and
      // the new attempt must respect chosenAspect.
      let effectivePrompt = prompt;
      if (aspectRetryCount > 0) {
        effectivePrompt += `\n\nCRITICAL FINAL CONSTRAINT: the output image MUST be ${chosenAspect} aspect ratio. The previous attempt produced the wrong aspect. Do NOT change the room's orientation. Output format: ${chosenAspect}.`;
      }
      if (proportionNote) {
        effectivePrompt += proportionNote;
      }

      const config: any = {
        temperature: 0.4,
        responseModalities: ["IMAGE"],
      };
      if (useImageConfig) {
        config.imageConfig = { aspectRatio: chosenAspect };
      }
      response = await ai.models.generateContent({
        model,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: roomPhotoMime,
                data: roomPhotoData,
              },
            },
            { text: effectivePrompt },
          ],
        },
        config,
      });
    } catch (err: any) {
      const msg: string = (err?.message ?? "").toLowerCase();
      // Distinguish "API rejected imageConfig" from transient/quota failures.
      if (
        useImageConfig &&
        (msg.includes("imageconfig") ||
          msg.includes("aspect_ratio") ||
          msg.includes("aspectratio") ||
          msg.includes("invalid argument") ||
          msg.includes("unknown field"))
      ) {
        console.warn(
          `[ai-vision] imageConfig.aspectRatio rejected — falling back to default aspect. Error: ${err?.message}`
        );
        useImageConfig = false;
        return generateOne(retryCount, aspectRetryCount, proportionRetryCount, proportionNote);
      }
      console.error("[ai-vision] Step 2 FAILED:", err?.message ?? err);
      console.error("[ai-vision] Step 2 error details:", JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
      throw err;
    }

    const parts: any[] =
      response?.candidates?.[0]?.content?.parts ?? [];

    for (const part of parts) {
      if (part?.inlineData?.data) {
        const mime = part.inlineData.mimeType ?? "image/png";
        const outputBuffer = Buffer.from(part.inlineData.data, "base64");

        // AI-030g: measure output aspect for the retry decision + upscale.
        // Gemini's PNGs usually have no EXIF, but we account for orientation
        // anyway in case a future model returns rotated metadata.
        let ow = 1;
        let oh = 1;
        let outputAspect = 1.0;
        try {
          const md = await sharp(outputBuffer).metadata();
          ow = md.width ?? 1;
          oh = md.height ?? 1;
          if (md.orientation && md.orientation >= 5 && md.orientation <= 8) {
            [ow, oh] = [oh, ow];
          }
          if (ow > 0 && oh > 0) outputAspect = ow / oh;
        } catch (err: any) {
          console.warn(`[ai-vision] Could not read output aspect: ${err?.message}`);
        }
        console.log(
          `[ai-vision] Step 2 output aspect=${outputAspect.toFixed(2)} (wanted ${inputAspect.toFixed(2)})`
        );

        const aspectMatches =
          Math.abs(outputAspect - inputAspect) / inputAspect <= ASPECT_TOLERANCE;
        if (!aspectMatches && aspectRetryCount < MAX_ASPECT_RETRIES) {
          console.warn(
            `[ai-vision] Output aspect ${outputAspect.toFixed(2)} != input ${inputAspect.toFixed(2)}, retrying (attempt ${aspectRetryCount + 1}/${MAX_ASPECT_RETRIES})`
          );
          return generateOne(retryCount, aspectRetryCount + 1, proportionRetryCount, proportionNote);
        }
        if (!aspectMatches) {
          console.warn(
            `[ai-vision] Aspect retry budget exhausted (${MAX_ASPECT_RETRIES}), accepting output aspect ${outputAspect.toFixed(2)}`
          );
        }

        // Structure verification — re-measure the output and retry once on an
        // invented fixture / rebuilt ceiling / invented opening / widened room.
        // Runs whenever a source structure was supplied, so windowless rooms
        // (hallway, alcove, interior bathroom) are checked too.
        if (!input.skipVerify && input.sourceStructure && proportionRetryCount < MAX_PROPORTION_RETRIES) {
          const verdict = await verifyStructure(
            { data: outputBuffer.toString("base64"), mimeType: mime },
            input.sourceStructure,
            "ai-vision/gemini"
          );
          if (verdict) {
            console.warn(
              `[ai-vision] ${verdict.violation} violation — retrying (attempt ${proportionRetryCount + 1}/${MAX_PROPORTION_RETRIES})`
            );
            return generateOne(retryCount, aspectRetryCount, proportionRetryCount + 1, verdict.note);
          }
        }

        // AI-030g: upscale to TARGET_LONG_EDGE for crisp hero rendering on
        // high-DPR displays. Lanczos3 gives a sharper resample than the
        // default bilinear; fit:'inside' preserves the actual output aspect.
        const longest = Math.max(ow, oh);
        if (longest > 0 && longest < TARGET_LONG_EDGE) {
          try {
            const upscaled = await sharp(outputBuffer)
              .resize({
                width: ow >= oh ? TARGET_LONG_EDGE : undefined,
                height: oh > ow ? TARGET_LONG_EDGE : undefined,
                kernel: "lanczos3",
                fit: "inside",
              })
              .png({ compressionLevel: 6 })
              .toBuffer();
            console.log(
              `[ai-vision] Upscaled output: ${outputBuffer.length} -> ${upscaled.length} bytes`
            );
            return `data:image/png;base64,${upscaled.toString("base64")}`;
          } catch (err: any) {
            console.warn(`[ai-vision] Upscale failed, returning original: ${err?.message}`);
          }
        }

        return `data:${mime};base64,${part.inlineData.data}`;
      }
    }

    // If no image part found, retry on transient failures
    if (retryCount < 2) {
      await delay(2000 * (retryCount + 1));
      return generateOne(retryCount + 1, aspectRetryCount, proportionRetryCount, proportionNote);
    }

    throw new Error(`${model} returned no image data after retries.`);
  };

  try {
    return await generateOne();
  } catch (err: any) {
    const msg: string = err?.message?.toLowerCase() ?? "";
    if (
      (msg.includes("quota") || msg.includes("rate")) &&
      /* already retried inside generateOne */ false
    ) {
      // outer catch kept for future wrapping if needed
    }
    throw err;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// AI-030: map a measured aspect ratio (width/height) to one of Gemini's
// supported aspect strings. Bands are chosen so common phone/camera ratios
// land on the closest supported aspect:
//   16:9  ≈ 1.78   ← wide DSLR landscape
//   4:3   ≈ 1.33   ← standard camera landscape
//   1:1   = 1.0    ← Instagram square
//   3:4   = 0.75   ← standard camera portrait
//   9:16  ≈ 0.56   ← phone portrait
// Square (>= 0.85 < 1.15) maps to 1:1 — the State 3 hero treats that
// as landscape (current 30/70 layout), which matches existing UX.
export function pickAspectRatio(a: number): string {
  if (a >= 1.65) return "16:9";
  if (a >= 1.15) return "4:3";
  if (a >= 0.85) return "1:1";
  if (a >= 0.6) return "3:4";
  return "9:16";
}
