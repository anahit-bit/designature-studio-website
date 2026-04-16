/**
 * Step 1 of the AI Vision pipeline — style brief extraction.
 *
 * Given reference images, calls gemini-2.5-flash (text model) and returns
 * a structured style brief as plain text.  If no reference images are
 * provided, returns the hardcoded brief for the given preset (no API call).
 */

import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
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

  // ── Preprocess reference images: resize large files before sending to Gemini ──
  const processedRefs = await Promise.all(
    input.referenceImageData.map(async ({ data, mimeType }, idx) => {
      const rawBuffer = Buffer.from(data, "base64");
      if (rawBuffer.length <= 1_500_000) {
        return { data, mimeType };
      }
      const resized = await sharp(rawBuffer)
        .rotate()
        .resize({ width: 1536, height: 1536, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
      console.log(`Reference ${idx + 1} resized: ${rawBuffer.length} -> ${resized.length} bytes`);
      return { data: resized.toString("base64"), mimeType: "image/jpeg" };
    })
  );
  // ─────────────────────────────────────────────────────────────────────────

  const imageParts = processedRefs.map(({ data, mimeType }) => ({
    inlineData: { mimeType, data },
  }));

  const generationConfig = { temperature: 0.4, maxOutputTokens: 2000 };

  console.log("[ai-vision-debug] About to call Gemini for style extraction");
  console.log("[ai-vision-debug] Model:", "gemini-2.5-flash");
  console.log("[ai-vision-debug] Image parts count:", imageParts.length);
  console.log("[ai-vision-debug] Image parts sizes:", imageParts.map(p => p.inlineData?.data?.length ?? 0));
  console.log("[ai-vision-debug] generationConfig:", JSON.stringify(generationConfig));
  console.log("[ai-vision-debug] Prompt length:", STYLE_EXTRACTION_PROMPT.length);

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: {
      parts: [...imageParts, { text: STYLE_EXTRACTION_PROMPT }],
    },
    config: generationConfig as any,
  });

  console.log("[ai-vision-debug] Raw response type:", typeof response);
  console.log("[ai-vision-debug] Has candidates:", !!response?.candidates);
  console.log("[ai-vision-debug] Candidates count:", response?.candidates?.length ?? 0);
  console.log("[ai-vision-debug] Parts count:", response?.candidates?.[0]?.content?.parts?.length ?? 0);
  console.log("[ai-vision-debug] Parts texts:", response?.candidates?.[0]?.content?.parts?.map((p: any) => (p.text ?? "").length) ?? []);
  console.log("[ai-vision-debug] response.text length:", (typeof (response as any).text === "string") ? (response as any).text.length : "not a string");
  console.log("[ai-vision-debug] finishReason:", (response as any)?.candidates?.[0]?.finishReason ?? "unknown");

  // Extract text — join ALL parts in case the SDK splits the response
  const text: string =
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

  const briefText = text.trim();

  console.log("[ai-vision] Brief extracted, length:", briefText.length);

  if (briefText.length < 800) {
    console.error("[ai-vision] CRITICAL: Brief too short (" + briefText.length + " chars) — aborting to prevent weak Step 2 output");
    console.error("[ai-vision] Full brief:", briefText);
    throw new Error("Style extraction produced an incomplete brief. Please try again.");
  }

  if (briefText.length < 1500) {
    console.warn("[ai-vision] WARNING: Brief shorter than expected (" + briefText.length + " chars). Output may be less specific than usual.");
  }

  return briefText;
}
