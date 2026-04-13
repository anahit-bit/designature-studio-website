/**
 * Prompt templates for the two-step AI Vision pipeline.
 *
 * Step 1 — STYLE_EXTRACTION_PROMPT: fed to the text model with reference images.
 * Step 2 — buildGenerationPrompt: fed to the image model with the room photo.
 */

import type { RoomType } from "./stylePresets.js";
import { ROOM_TYPE_LABELS } from "./stylePresets.js";

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 — Style extraction prompt (verbatim from pipeline spec)
// ─────────────────────────────────────────────────────────────────────────────
export const STYLE_EXTRACTION_PROMPT = `You are an interior design analyst. The images attached to this message are reference images showing an interior design style that will be recreated in another room.

Analyze all attached images together and produce a single detailed style description that captures what makes this style cohesive across all references. The description will be used as instructions for an AI image editor that will redesign a different room to match this style.

Your description must include:

1. COLOR PALETTE: list 5-7 dominant colors with approximate hex codes. Be specific (e.g. "warm taupe #B8A593" not "beige").

2. MATERIALS & FINISHES: list specific materials visible across the references (wood species and tone, stone types, metal finishes, fabric types, glass treatments).

3. FURNITURE CHARACTER: describe the silhouettes, proportions, and forms of the furniture. Not specific pieces — the language of the shapes.

4. LIGHTING: describe the lighting fixtures' character and the overall lighting mood (warm/cool, bright/moody, direction).

5. WALL & CEILING TREATMENT: describe how walls and ceilings are finished (paint, paneling, moldings, trim).

6. DECOR & STYLING: describe the decorative objects, plants, art, and how surfaces are styled.

7. OVERALL MOOD: 2-3 sentences capturing the atmosphere and feeling.

Be concrete and specific. Avoid generic words like "elegant" or "modern" unless paired with specifics. Aim for 200-300 words total. Do not mention the images or the analysis process — write the description as if it were a design brief.`;

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — Generation prompt builder (verbatim from pipeline spec)
// ─────────────────────────────────────────────────────────────────────────────
export function buildGenerationPrompt(args: {
  styleBrief: string;
  roomType?: RoomType;
  variationSeed?: number;
}): string {
  const roomTypeLabel = args.roomType
    ? ROOM_TYPE_LABELS[args.roomType]
    : "LIVING ROOM"; // safe fallback when auto-detect is selected

  const variationHint = args.variationSeed
    ? `\n\nThis is variation #${args.variationSeed}. Use a different furniture arrangement, lighting fixture choice, and accent details than previous variations, while maintaining the same target style and the same architectural constraints.`
    : "";

  return `Edit this room photograph to show how the same exact room would look after a complete interior renovation. This is a photorealistic "after" visualization for an interior design client. The room will be renovated into a ${roomTypeLabel} in the style described below.

CRITICAL ARCHITECTURAL CONSTRAINTS — these must be preserved exactly as they appear in the original photo:
- Keep all windows in their exact current positions, sizes, and proportions
- Keep all doors in their exact current positions
- Keep the room's exact proportions, ceiling height, wall angles, and overall footprint
- Keep the same camera angle, perspective, and viewing direction — the photo must look like it was taken from the same spot, with the same lens
- Do NOT place any furniture, cabinetry, console, plant, or large object in front of any window
- Do NOT block, cover, or obstruct any window in any way — natural light must come through them
- Do NOT add new architectural elements (no beams, arches, columns, archways, doorways, or wall changes)
- Do NOT change the room's footprint, shape, or wall positions — if a wall edge is unclear in the original photo, extrapolate it as a continuation of the visible plane, do not close the room in
- Do NOT invent additional rooms, hallways, or openings that aren't visible in the original

WHAT TO TRANSFORM:
- Repair and finish any damaged walls into smooth, finished walls in the target style's palette
- Replace worn or damaged flooring with new flooring appropriate to the target style
- Finish the ceiling cleanly with subtle architectural reveals only — no heavy crown moldings unless the original photo already has them
- Remove or conceal radiators and utility fixtures (the windows themselves stay exactly where they are)
- Furnish the room as a complete ${roomTypeLabel.toLowerCase()} with all appropriate furniture, lighting, cabinetry, and styling — all in the target style
- Add appropriate decor, plants, and styling
- Lighting in the final image should feel cohesive with the target style's mood, layered with natural daylight from the preserved windows

TARGET STYLE:

${args.styleBrief}${variationHint}

Generate the edited photograph now. The result must look like the same room shown in the input photo, photographed from the same angle, after this renovation is complete. Photorealistic, high detail, professional interior photography quality.`;
}
