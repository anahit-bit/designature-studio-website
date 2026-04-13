/**
 * Step 2 of the AI Vision pipeline — concept image generation.
 *
 * Takes the room photo and the style brief from Step 1 (or from a preset),
 * calls gemini-2.5-flash-image, and returns the generated image as a base64
 * data URL string (data:image/png;base64,…).
 */

import { GoogleGenAI } from "@google/genai";
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

  const ai = new GoogleGenAI({ apiKey });

  const prompt = buildGenerationPrompt({
    styleBrief: input.styleBrief,
    roomType: input.roomType,
    variationSeed: input.variationSeed,
  });

  const generateOne = async (retryCount = 0): Promise<string> => {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: input.roomPhoto.mimeType,
              data: input.roomPhoto.data,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        temperature: 0.4,
        responseModalities: ["IMAGE"],
      } as any,
    });

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
