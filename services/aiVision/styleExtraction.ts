/**
 * Step 1 of the AI Vision pipeline — style brief extraction.
 *
 * Given reference images, calls gemini-2.5-flash (text model) and returns
 * a structured style brief as plain text.  If no reference images are
 * provided, returns the hardcoded brief for the given preset (no API call).
 */

import { GoogleGenAI } from "@google/genai";
import type { StylePreset } from "./stylePresets.js";
import { STYLE_BRIEFS } from "./stylePresets.js";
import { STYLE_EXTRACTION_PROMPT } from "./promptTemplates.js";

export interface StyleExtractionInput {
  /** Base64-encoded image data strings (without the data:…;base64, prefix). */
  referenceImageData: Array<{ data: string; mimeType: string }>;
  /** Used only when referenceImageData is empty — returns the hardcoded brief. */
  fallbackPreset?: StylePreset;
}

/**
 * Returns a style brief as plain text.
 * - Preset only  → returns STYLE_BRIEFS[preset], no API call.
 * - References   → calls gemini-2.5-flash with STYLE_EXTRACTION_PROMPT.
 * - Neither      → throws (caller must validate before reaching here).
 */
export async function extractStyleBrief(
  input: StyleExtractionInput
): Promise<string> {
  if (input.referenceImageData.length === 0) {
    if (!input.fallbackPreset) {
      throw new Error(
        "extractStyleBrief: no reference images and no fallback preset provided."
      );
    }
    // Preset-only path — free, instant, no API call
    return STYLE_BRIEFS[input.fallbackPreset];
  }

  // Reference-based path — call the text model
  const apiKey = process.env.GEMINI_API_KEY ?? "";
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set.");

  const ai = new GoogleGenAI({ apiKey });

  const imageParts = input.referenceImageData.map(({ data, mimeType }) => ({
    inlineData: { mimeType, data },
  }));

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: {
      parts: [...imageParts, { text: STYLE_EXTRACTION_PROMPT }],
    },
    config: {
      temperature: 0.4,
      maxOutputTokens: 800,
    } as any,
  });

  // Extract text from the response
  const text =
    (response as any).text ??
    response?.candidates?.[0]?.content?.parts
      ?.map((p: any) => p.text ?? "")
      .join("") ??
    "";

  if (!text.trim()) {
    throw new Error(
      "Style extraction returned an empty response from the model."
    );
  }
  return text.trim();
}
