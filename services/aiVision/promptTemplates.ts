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
// Step 2b (AI-029 Phase 3) — virtual-staging generation prompt.
//
// The staging engine keeps the real room (img2img) and adds furniture, so this
// prompt describes the furnished, styled room. We restate the structural
// guardrails ("add no doorways/windows, keep windows glazed") as belt-and-
// suspenders even though the engine preserves architecture by design.
// ─────────────────────────────────────────────────────────────────────────────
export function buildStagingPrompt(args: {
  styleBrief: string;
  roomType?: RoomType;
  variationSeed?: number;
}): string {
  const roomLabel = (
    args.roomType ? ROOM_TYPE_LABELS[args.roomType] : "LIVING ROOM"
  ).toLowerCase();

  const variationHint = args.variationSeed
    ? " Vary the furniture arrangement, lighting choices, and accent styling from previous versions, keeping the same architecture and target style."
    : "";

  return `${args.styleBrief}

Photorealistic interior photograph of a fully furnished, fully styled ${roomLabel} decorated in this exact style — professional real-estate photography, natural daylight, sharp focus, realistic materials and textures, high detail. The room is completely furnished and decorated: furniture, lighting, rugs, art, plants and styling appropriate to a ${roomLabel}.

Preserve the room's existing architecture exactly: keep every wall flat and in its current position, keep the ceiling as one flat plane, keep the floor, and keep every window as a real glazed window with daylight and the outdoor view coming through it. Do NOT add or remove walls, doorways, openings, beams, columns, soffits or partitions, and do NOT widen the room.${variationHint}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — Generation prompt builder (verbatim from pipeline spec)
// ─────────────────────────────────────────────────────────────────────────────
export function buildGenerationPrompt(args: {
  styleBrief: string;
  roomType?: RoomType;
  variationSeed?: number;
  /**
   * AI-029 — coordinate-grounded architecture block from spatialAnalysis.
   * When present, injected as positive "preserve THIS at THESE coordinates"
   * constraints. Empty string when spatial analysis was unavailable.
   */
  spatialConstraints?: string;
}): string {
  const roomTypeLabel = args.roomType
    ? ROOM_TYPE_LABELS[args.roomType]
    : "LIVING ROOM"; // safe fallback when auto-detect is selected

  const variationHint = args.variationSeed
    ? `\n\nThis is variation #${args.variationSeed}. Use a different furniture arrangement, lighting fixture choice, and accent details than previous variations, while maintaining the same target style and the same architectural constraints.`
    : "";

  const spatialBlock =
    args.spatialConstraints && args.spatialConstraints.trim()
      ? `\n\n${args.spatialConstraints.trim()}`
      : "";

  return `Edit this room photograph to show how the same exact room would look after a complete interior renovation. This is a photorealistic "after" visualization for an interior design client. The room will be renovated into a ${roomTypeLabel} in the style described below.${spatialBlock}

CRITICAL ARCHITECTURAL CONSTRAINTS — these must be preserved EXACTLY as they appear in the original photo. This is a re-styling of the existing room, not a new room:
- Keep every window in its exact current position, size, shape, and proportion
- Keep every door in its exact current position
- Preserve the exact spacing and distance between each window and the walls beside it. Do NOT widen, deepen, stretch, or enlarge the room. The gap between a window and any adjacent wall must look identical to the original — do not push the walls further from the window.
- Keep the room's exact proportions, ceiling height, wall angles, and footprint. Every wall must stay in the same position relative to the windows, floor, and ceiling as in the original.
- Keep the same camera angle, perspective, framing, and viewing direction — the photo must look like it was taken from the same spot with the same lens. Do NOT zoom out, pan, or reveal more of the room than the original photo shows.
- Only restyle the surfaces that are actually visible in the original frame. If a side wall, corner, or room boundary is NOT visible in the original photo, do NOT invent one — leave it out of frame exactly as in the original. Never add side walls, corners, or enclosures that the original photo does not already show.
- Do NOT place any furniture, cabinetry, console, plant, or large object in front of any window
- Do NOT block, cover, or obstruct any window in any way — natural light must come through them
- Do NOT add ANY new architectural elements. Specifically: no ceiling beams, bulkheads, soffits, coffers, or tray/dropped-ceiling sections; no columns, pilasters, or posts; no arches, archways, or doorways; no room dividers, partition walls, or glazed/Crittall/metal-framed partitions; no recessed wall niches or built-in boxes that break the flat wall plane. Keep the ceiling as ONE flat, continuous plane at the original height, and keep every wall a single flat plane.
- Cabinets, shelving, and furniture must sit flush against the existing flat walls as freestanding or surface-mounted pieces. They must NOT be framed by new bulkheads, soffits, or recesses, and must NOT alter the wall or ceiling planes.
- If the target style suggests screens, slatted panels, shoji, or dividers, render them ONLY as freestanding furniture — never as built-in architecture that changes the walls or ceiling.
- Do NOT invent additional rooms, hallways, or openings that aren't visible in the original

WHAT TO TRANSFORM:
- Repair and finish any damaged walls into smooth, finished walls in the target style's palette
- Replace worn or damaged flooring with new flooring appropriate to the target style
- Keep the ceiling as one flat, continuous plane at the original height — no beams, soffits, bulkheads, coffers, tray/dropped sections, or heavy crown moldings unless the original photo already has them
- Remove or conceal radiators and utility fixtures (the windows themselves stay exactly where they are)
- Furnish the room as a complete ${roomTypeLabel.toLowerCase()} with all appropriate furniture, lighting, cabinetry, and styling — all in the target style
- Add appropriate decor, plants, and styling
- Lighting in the final image should feel cohesive with the target style's mood, layered with natural daylight from the preserved windows

TARGET STYLE:

${args.styleBrief}${variationHint}

Generate the edited photograph now. The result must look like the same room shown in the input photo, photographed from the same angle, after this renovation is complete. Every window and wall must stay in exactly the same position, and at the same distance from one another, as in the input photo — do not move the windows, widen the room, or add walls the original does not show. Photorealistic, high detail, professional interior photography quality.`;
}
