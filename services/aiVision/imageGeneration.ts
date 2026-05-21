/**
 * Step 2 of the AI Vision pipeline — concept image generation.
 *
 * Takes the room photo and the style brief from Step 1 (or from a preset),
 * calls gemini-2.5-flash-image, and returns the generated image as a base64
 * data URL string (data:image/png;base64,…).
 */

import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import type { RoomType } from "./stylePresets.js";
import { buildGenerationPrompt } from "./promptTemplates.js";

export interface ImageGenerationInput {
  /** Base64 data (without prefix) and MIME type of the room photo. */
  roomPhoto: { data: string; mimeType: string };
  /** Style brief from Step 1 or from STYLE_BRIEFS. */
  styleBrief: string;
  /** Optional room type label for the prompt; omit for auto-detect. */
  roomType?: RoomType;
  /** Increment each time "Generate Variation" is clicked in the session. */
  variationSeed?: number;
}

/**
 * Calls gemini-2.5-flash-image with the room photo and style brief.
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

  const prompt = buildGenerationPrompt({
    styleBrief: input.styleBrief,
    roomType: input.roomType,
    variationSeed: input.variationSeed,
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

  const generateOne = async (retryCount = 0): Promise<string> => {
    let response: any;
    try {
      const config: any = {
        temperature: 0.4,
        responseModalities: ["IMAGE"],
      };
      if (useImageConfig) {
        config.imageConfig = { aspectRatio: chosenAspect };
      }
      response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: roomPhotoMime,
                data: roomPhotoData,
              },
            },
            { text: prompt },
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
        return generateOne(retryCount);
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
        return `data:${mime};base64,${part.inlineData.data}`;
      }
    }

    // If no image part found, retry on transient failures
    if (retryCount < 2) {
      await delay(2000 * (retryCount + 1));
      return generateOne(retryCount + 1);
    }

    throw new Error(
      "gemini-2.5-flash-image returned no image data after retries."
    );
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
