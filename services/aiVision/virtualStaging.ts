/**
 * AI-029 Phase 3 — virtual-staging concept engine (fal.ai · FLUX Apartment Staging).
 *
 * The winning approach from the spike. Unlike ControlNet (which regenerates the
 * room from an edge sketch and can invent doorways/windows in blank walls), this
 * LoRA is image-to-image: it keeps the ACTUAL room photo — walls, windows,
 * ceiling, floor, proportions — and only adds furniture and styling. So it
 * structurally cannot invent openings, preserves the real window + view, and
 * handles head-on single-wall shots (no invented side walls). Faster and cheaper
 * than ControlNet (~13–45s, $0.021/MP).
 *
 * Drop-in with the Gemini engine: same input shape, returns a data URL. Throws
 * on any failure so the orchestrator can fall back to Gemini.
 */

import { fal } from "@fal-ai/client";
import sharp from "sharp";
import type { RoomType } from "./stylePresets.js";
import { buildStagingPrompt, type pickAccent } from "./promptTemplates.js";

export interface StagingInput {
  /** Base64 data (without prefix) and MIME type of the room photo. */
  roomPhoto: { data: string; mimeType: string };
  styleBrief: string;
  roomType?: RoomType;
  /** Increment per "Generate Variation" click — drives a different seed. */
  variationSeed?: number;
  /** The single palette colour (or 2026 paint) emphasised in this concept. */
  accent?: ReturnType<typeof pickAccent>;
}

const FAL_MODEL = "fal-ai/flux-2-lora-gallery/apartment-staging";
const MAX_INPUT_LONG_EDGE = 1216; // input/output working size
const TARGET_LONG_EDGE = 1800; // upscale output for crisp hero, matches Gemini path

let configured = false;
function ensureConfigured(): void {
  const key = process.env.FAL_KEY || process.env.FAL_API_KEY || "";
  if (!key) throw new Error("FAL_KEY is not set.");
  if (!configured) {
    fal.config({ credentials: key });
    configured = true;
  }
}

/** True when a fal key is present, so the orchestrator can choose the engine. */
export function isStagingAvailable(): boolean {
  return !!(process.env.FAL_KEY || process.env.FAL_API_KEY);
}

/** Resize the source: long edge ≤ 1216, dims multiple of 16, as a data URI. */
async function toInputImage(
  data: string
): Promise<{ dataUri: string; width: number; height: number }> {
  const raw = Buffer.from(data, "base64");
  const md = await sharp(raw).metadata();
  let w = md.width ?? 1024;
  let h = md.height ?? 1024;
  if (md.orientation && md.orientation >= 5 && md.orientation <= 8) [w, h] = [h, w];
  const long = Math.max(w, h);
  const scale = long > MAX_INPUT_LONG_EDGE ? MAX_INPUT_LONG_EDGE / long : 1;
  const round16 = (n: number) => Math.max(512, Math.round((n * scale) / 16) * 16);
  const W = round16(w);
  const H = round16(h);
  const buf = await sharp(raw)
    .rotate()
    .resize({ width: W, height: H, fit: "fill" })
    .jpeg({ quality: 90 })
    .toBuffer();
  return { dataUri: `data:image/jpeg;base64,${buf.toString("base64")}`, width: W, height: H };
}

export async function generateConceptImageStaging(
  input: StagingInput
): Promise<string> {
  ensureConfigured();

  const prompt = buildStagingPrompt({
    styleBrief: input.styleBrief,
    roomType: input.roomType,
    variationSeed: input.variationSeed,
    accent: input.accent,
  });

  const src = await toInputImage(input.roomPhoto.data);

  const req: Record<string, any> = {
    image_urls: [src.dataUri],
    prompt,
    image_size: { width: src.width, height: src.height },
  };
  // Vary repeat "Generate Variation" clicks.
  if (input.variationSeed) req.seed = 1000 + input.variationSeed * 7;

  console.log(`[ai-vision] Staging (${FAL_MODEL}) ${src.width}x${src.height}`);

  const result: any = await fal.subscribe(FAL_MODEL, { input: req as any });
  const url: string | undefined = result?.data?.images?.[0]?.url;
  if (!url) {
    throw new Error(
      `Staging returned no image: ${JSON.stringify(result?.data ?? result).slice(0, 300)}`
    );
  }

  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Staging image fetch failed: ${resp.status}`);
  const outBuf = Buffer.from(await resp.arrayBuffer());

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
    console.warn(`[ai-vision] Staging upscale failed, returning original: ${err?.message}`);
  }

  return `data:image/png;base64,${outBuf.toString("base64")}`;
}
