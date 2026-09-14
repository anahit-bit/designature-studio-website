/**
 * AI Vision — OpenAI GPT Image concept engine. THE DEFAULT since 2026-09-14.
 *
 * Chosen over Gemini (Nano Banana 1/2/Pro) and fal virtual-staging on a
 * ten-room side-by-side the owner reviewed image by image — see the note in
 * generateConcept.ts and _Plan/Website/aivision-bench/engine-compare/.
 * Measured cost at quality=high, ~1536 px long edge: $0.078/image with the
 * full prompt (20-image average). Gemini remains the fallback.
 *
 * Endpoint: POST https://api.openai.com/v1/images/edits (multipart). The room
 * photo goes in as the reference image, the prompt is the same full production
 * prompt Gemini gets (measured architecture, RD rules, programme, style brief,
 * accent), and the model returns base64 PNG. Native fetch + FormData (Node ≥ 20)
 * — no SDK dependency for one call.
 *
 * After generation the output is re-measured and, on an invented fixture /
 * rebuilt ceiling / invented opening / widened room, ONE corrective retry is
 * made with the shared correction note (structureVerify.ts) — the same guard
 * the Gemini path has.
 *
 * Knobs (env, all optional):
 *   OPENAI_IMAGE_MODEL            default gpt-image-2.5-sunburst ("editing
 *                                 precision" variant; flare = faster/cheaper)
 *   OPENAI_IMAGE_QUALITY          low | medium | high (default) | xhigh | max
 *   OPENAI_IMAGE_INPUT_FIDELITY   "high" to send input_fidelity=high (gpt-image-1.x
 *                                 accepts it; newer models may reject it — the
 *                                 call retries without it automatically)
 *   OPENAI_IMAGE_PROMPT           full (default) | short — the ~110-word edit
 *                                 instruction; slightly more literal, less styled
 *
 * Drop-in with the Gemini engine: same input shape, returns a data URL, throws
 * on any failure so the orchestrator can fall back.
 */

import sharp from "sharp";
import type { RoomType } from "./stylePresets.js";
import {
  buildGenerationPrompt,
  buildStagingPrompt,
  type pickAccent,
} from "./promptTemplates.js";
import type { RoomStructure } from "./spatialAnalysis.js";
import { verifyStructure } from "./structureVerify.js";

export interface OpenAIImageInput {
  /** Base64 data (without prefix) and MIME type of the room photo. */
  roomPhoto: { data: string; mimeType: string };
  styleBrief: string;
  roomType?: RoomType;
  /** Increment per "Generate Variation" click — drives the variation hint. */
  variationSeed?: number;
  /** AI-029 coordinate-grounded constraints; only used by the `full` prompt. */
  spatialConstraints?: string;
  /** Measured source structure; only used by the `full` prompt (RD26 note). */
  sourceStructure?: RoomStructure | null;
  /** The single palette colour (or 2026 paint) emphasised in this concept. */
  accent?: ReturnType<typeof pickAccent>;
  /** Overrides OPENAI_IMAGE_PROMPT for this call (benchmarks run both side by side). */
  promptMode?: "short" | "full";
  /**
   * Benchmark-only: skip the post-generation structure check so the page shows
   * raw engine behaviour. Production never sets it.
   */
  skipVerify?: boolean;
}

const EDIT_URL = "https://api.openai.com/v1/images/edits";
const DEFAULT_MODEL = "gpt-image-2.5-sunburst";
const MAX_INPUT_LONG_EDGE = 1536; // what we upload; the API accepts far larger
const OUTPUT_LONG_EDGE = 1536; // what we ask for; upscaled to TARGET below
const TARGET_LONG_EDGE = 1800; // matches the Gemini path
const REQUEST_TIMEOUT_MS = 180_000; // docs: complex prompts may take ~2 min

// Published token rates (gpt-image-2.5, per 1M tokens) — used only to log an
// estimated cost per call. Update when the pricing page changes.
const RATE_TEXT_IN = 5;
const RATE_IMAGE_IN = 8;
const RATE_IMAGE_OUT = 30;

export function isOpenAIImageAvailable(): boolean {
  return !!(process.env.OPENAI_API_KEY || "").trim();
}

export function openAIImageModel(): string {
  return (process.env.OPENAI_IMAGE_MODEL || "").trim() || DEFAULT_MODEL;
}

/**
 * Pick the output size for a given source aspect (width/height).
 *
 * Custom sizes: width and height multiples of 16, aspect between 1:3 and 3:1,
 * total pixels between 655,360 and 8,294,400. We keep the long edge at
 * OUTPUT_LONG_EDGE and derive the short edge from the source aspect so the
 * result is the same orientation AND proportion as the photo — no letterboxing,
 * no cropping the room. `preset: true` returns the nearest of the three fixed
 * sizes instead, for the retry path if a model rejects custom dimensions.
 */
export function pickOpenAISize(aspect: number, preset = false): string {
  const a = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  if (preset) {
    if (a >= 1.25) return "1536x1024";
    if (a <= 0.8) return "1024x1536";
    return "1024x1024";
  }
  const clamped = Math.min(3, Math.max(1 / 3, a));
  const round16 = (n: number) => Math.max(448, Math.round(n / 16) * 16);
  if (clamped >= 1) {
    return `${OUTPUT_LONG_EDGE}x${round16(OUTPUT_LONG_EDGE / clamped)}`;
  }
  return `${round16(OUTPUT_LONG_EDGE * clamped)}x${OUTPUT_LONG_EDGE}`;
}

/** Downscale + orient the source for upload; returns JPEG bytes and the aspect. */
async function prepareInput(
  data: string
): Promise<{ buffer: Buffer; aspect: number }> {
  const raw = Buffer.from(data, "base64");
  const md = await sharp(raw).metadata();
  let w = md.width ?? 1024;
  let h = md.height ?? 1024;
  if (md.orientation && md.orientation >= 5 && md.orientation <= 8) [w, h] = [h, w];
  const buffer = await sharp(raw)
    .rotate()
    .resize({
      width: MAX_INPUT_LONG_EDGE,
      height: MAX_INPUT_LONG_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 92 })
    .toBuffer();
  return { buffer, aspect: w > 0 && h > 0 ? w / h : 1 };
}

/**
 * Two prompt shapes, selectable per run:
 *   full  — the production generation prompt: full style brief + coordinate
 *           constraints + rulebook + room programme. ~2,300 words. DEFAULT —
 *           the owner picked its output on every one of the ten rooms.
 *   short — the ~110-word edit instruction ("furnish this exact room…").
 *           Slightly more literal to the photo, noticeably less styled.
 */
export function buildOpenAIPrompt(input: OpenAIImageInput): string {
  const mode = (input.promptMode || process.env.OPENAI_IMAGE_PROMPT || "full").trim().toLowerCase();
  if (mode !== "short" && mode !== "staging") {
    return buildGenerationPrompt({
      styleBrief: input.styleBrief,
      roomType: input.roomType,
      variationSeed: input.variationSeed,
      spatialConstraints: input.spatialConstraints,
      accent: input.accent,
      structure: input.sourceStructure,
    });
  }
  return buildStagingPrompt({
    styleBrief: input.styleBrief,
    roomType: input.roomType,
    variationSeed: input.variationSeed,
    accent: input.accent,
  });
}

interface EditResponse {
  data?: Array<{ b64_json?: string; url?: string }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
    input_tokens_details?: { image_tokens?: number; text_tokens?: number };
  };
  error?: { message?: string; type?: string; param?: string };
}

function estimateCostUsd(usage: EditResponse["usage"]): number | null {
  if (!usage) return null;
  const imgIn = usage.input_tokens_details?.image_tokens ?? 0;
  const txtIn = usage.input_tokens_details?.text_tokens ?? Math.max(0, (usage.input_tokens ?? 0) - imgIn);
  const out = usage.output_tokens ?? 0;
  return (txtIn * RATE_TEXT_IN + imgIn * RATE_IMAGE_IN + out * RATE_IMAGE_OUT) / 1_000_000;
}

export async function generateConceptImageOpenAI(
  input: OpenAIImageInput
): Promise<string> {
  const apiKey = (process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set.");

  const model = openAIImageModel();
  const quality = (process.env.OPENAI_IMAGE_QUALITY || "high").trim().toLowerCase();
  let inputFidelity = (process.env.OPENAI_IMAGE_INPUT_FIDELITY || "").trim().toLowerCase();

  const prompt = buildOpenAIPrompt(input);
  const src = await prepareInput(input.roomPhoto.data);
  let size = pickOpenAISize(src.aspect);
  let usedPreset = false;

  console.log(
    `[ai-vision] OpenAI (${model}, ${quality}) size=${size} prompt=${input.promptMode || process.env.OPENAI_IMAGE_PROMPT || "full"} (${prompt.split(/\s+/).length}w)`
  );

  const call = async (correctionNote = ""): Promise<EditResponse> => {
    const form = new FormData();
    form.append("model", model);
    form.append("prompt", prompt + correctionNote);
    form.append("size", size);
    form.append("quality", quality);
    form.append("output_format", "png");
    form.append("n", "1");
    if (inputFidelity) form.append("input_fidelity", inputFidelity);
    form.append("image", new Blob([src.buffer], { type: "image/jpeg" }), "room.jpg");

    const resp = await fetch(EDIT_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const json = (await resp.json().catch(() => ({}))) as EditResponse;
    if (!resp.ok) {
      const msg = json?.error?.message || `HTTP ${resp.status}`;
      const err = new Error(`OpenAI image edit failed: ${msg}`);
      (err as any).param = json?.error?.param;
      (err as any).status = resp.status;
      throw err;
    }
    return json;
  };

  const MAX_STRUCTURE_RETRIES = 1;

  const generateOnce = async (correctionNote: string): Promise<EditResponse> => {
    try {
      return await call(correctionNote);
    } catch (err: any) {
      const msg = String(err?.message ?? "").toLowerCase();
      const param = String(err?.param ?? "").toLowerCase();
      // Parameter-shape rejections get ONE adaptive retry each; anything else
      // (auth, quota, moderation, timeout) propagates so the orchestrator can
      // fall back to Gemini.
      if (inputFidelity && (param === "input_fidelity" || msg.includes("input_fidelity"))) {
        console.warn(`[ai-vision] OpenAI rejected input_fidelity for ${model} — retrying without it`);
        inputFidelity = "";
        return call(correctionNote);
      }
      if (!usedPreset && (param === "size" || msg.includes("size"))) {
        const preset = pickOpenAISize(src.aspect, true);
        console.warn(`[ai-vision] OpenAI rejected custom size ${size} — retrying with preset ${preset}`);
        size = preset;
        usedPreset = true;
        return call(correctionNote);
      }
      throw err;
    }
  };

  let b64 = "";
  let correctionNote = "";
  for (let attempt = 0; attempt <= MAX_STRUCTURE_RETRIES; attempt++) {
    const json = await generateOnce(correctionNote);
    const got = json?.data?.[0]?.b64_json;
    if (!got) {
      throw new Error(
        `OpenAI image edit returned no image: ${JSON.stringify(json).slice(0, 300)}`
      );
    }
    b64 = got;
    const cost = estimateCostUsd(json.usage);
    if (json.usage) {
      console.log(
        `[ai-vision] OpenAI usage: in=${json.usage.input_tokens ?? "?"} (img ${json.usage.input_tokens_details?.image_tokens ?? "?"}) out=${json.usage.output_tokens ?? "?"} ≈ $${cost?.toFixed(3) ?? "?"}`
      );
    }

    // Structure check — same guard as the Gemini path, one corrective retry.
    if (input.skipVerify || !input.sourceStructure || attempt >= MAX_STRUCTURE_RETRIES) break;
    const verdict = await verifyStructure(
      { data: b64, mimeType: "image/png" },
      input.sourceStructure,
      "ai-vision/openai"
    );
    if (!verdict) break;
    console.warn(
      `[ai-vision] OpenAI ${verdict.violation} violation — retrying (attempt ${attempt + 1}/${MAX_STRUCTURE_RETRIES})`
    );
    correctionNote = verdict.note;
  }

  const outBuf = Buffer.from(b64, "base64");
  try {
    const md = await sharp(outBuf).metadata();
    const longest = Math.max(md.width ?? 0, md.height ?? 0);
    if (longest > 0 && longest < TARGET_LONG_EDGE) {
      const portrait = (md.height ?? 0) > (md.width ?? 0);
      const upscaled = await sharp(outBuf)
        .resize({
          width: portrait ? undefined : TARGET_LONG_EDGE,
          height: portrait ? TARGET_LONG_EDGE : undefined,
          kernel: "lanczos3",
          fit: "inside",
        })
        .png({ compressionLevel: 6 })
        .toBuffer();
      return `data:image/png;base64,${upscaled.toString("base64")}`;
    }
  } catch (err: any) {
    console.warn(`[ai-vision] OpenAI upscale failed, returning original: ${err?.message}`);
  }
  return `data:image/png;base64,${b64}`;
}
