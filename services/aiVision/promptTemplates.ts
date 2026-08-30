/**
 * Prompt templates for the two-step AI Vision pipeline.
 *
 * Step 1 — STYLE_EXTRACTION_PROMPT: fed to the text model with reference images.
 * Step 2 — buildGenerationPrompt: fed to the image model with the room photo.
 *
 * The constraint text, the room programs and the palettes are NOT written here.
 * They are compiled from _Plan\Website\AI-Vision-Rulebook.xlsx into
 * rulebook.generated.ts. Edit the workbook, re-run
 * scripts/aivision/compile-rulebook.py.
 */

import type { RoomType } from "./stylePresets.js";
import { ROOM_TYPE_LABELS } from "./stylePresets.js";
import {
  GEMINI_RULES_BLOCK,
  STYLE_PALETTES,
  PAINT_MODIFIERS,
  ROOM_PROGRAM_RULES as COMPILED_PROGRAMS,
  type PaletteColour,
} from "./rulebook.generated.js";

// ─────────────────────────────────────────────────────────────────────────────
// ROOM PROGRAM RULES (room-appropriate furniture enforcement)
//
// Style briefs describe furniture through examples that are almost always
// framed as a living room. When a client picks a non-living-room type, those
// examples overpower the "DINING ROOM" label and the model renders the wrong
// room. This per-room-type block is prepended to the generation/staging prompt
// as an AUTHORITATIVE override: it fixes the room's furniture program up front,
// so the style brief only supplies the *look*, not the room's function.
//
// Owner-edited on the "Room Programs" sheet of the workbook.
// ─────────────────────────────────────────────────────────────────────────────
export const ROOM_PROGRAM_RULES = COMPILED_PROGRAMS as Record<RoomType, string>;

// ─────────────────────────────────────────────────────────────────────────────
// ACCENT COLOUR — one per generation.
//
// Without this every generation of a style reached for the same two or three
// colours, so fifteen styles produced rooms that felt related. Each style has a
// nine-colour palette card on the "Palettes" sheet; the accent-role colours are
// a pool, and exactly ONE is chosen per generation. The style stays
// recognisable, individual concepts differ.
//
// Selection is deterministic in the seed so "Generate variation" walks the pool
// instead of re-rolling onto the colour you just rejected. With no seed the
// first pick is random, so two people choosing the same style do not get the
// same room.
// ─────────────────────────────────────────────────────────────────────────────
export function pickAccent(
  preset: string | undefined,
  variationSeed?: number,
  paintModifierId?: string,
): (PaletteColour & { instruction?: string; brand?: string }) | null {
  // A 2026 Colour of the Year outranks the palette: the whole point of choosing
  // one is that it shows up whatever style is in play.
  if (paintModifierId) {
    const paint = PAINT_MODIFIERS.find((p) => p.id === paintModifierId);
    if (paint) {
      return {
        name: paint.name,
        hex: paint.hex,
        role: paint.role as PaletteColour["role"],
        instruction: paint.instruction,
        brand: paint.brand,
      };
    }
  }
  if (!preset) return null;
  const accents = (STYLE_PALETTES[preset] ?? []).filter((c) => c.role === "accent");
  if (!accents.length) return null;
  const i = typeof variationSeed === "number"
    ? variationSeed % accents.length
    : Math.floor(Math.random() * accents.length);
  return accents[i];
}

/** The accent block appended to a prompt. Empty string when there is no accent. */
export function renderAccent(accent: ReturnType<typeof pickAccent>): string {
  if (!accent) return "";
  const named = accent.brand ? `${accent.name} (${accent.brand})` : accent.name;
  const how = accent.instruction
    ? accent.instruction
    : accent.role === "field"
      ? "Use it across the walls or the largest surfaces, so the room clearly reads in this colour."
      : "Use it as the single strongest colour note in the room — on one feature wall, the main upholstered piece, the joinery, or the largest textile. It should be the colour a viewer names first.";
  return `

ACCENT COLOUR FOR THIS CONCEPT — ${named}, approximately ${accent.hex}:
${how} Keep every other instruction in the style brief intact — same materials, same furniture character, same lighting, same mood. Only this one colour is emphasised. Do NOT spread it over every surface, and do NOT introduce other saturated colours alongside it that the style brief does not name.`;
}

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
  /** The one palette colour (or 2026 paint) emphasised in this concept. */
  accent?: ReturnType<typeof pickAccent>;
}): string {
  const roomTypeKey: RoomType = args.roomType ?? "living_room";
  const roomLabel = ROOM_TYPE_LABELS[roomTypeKey].toLowerCase();

  const variationHint = args.variationSeed
    ? " Vary the furniture arrangement, lighting choices, and accent styling from previous versions, keeping the same architecture and target style."
    : "";

  return `${args.styleBrief}

Photorealistic interior photograph of a fully furnished, fully styled ${roomLabel} decorated in this exact style — professional real-estate photography, natural daylight, sharp focus, realistic materials and textures, high detail. The room is completely furnished and decorated: furniture, lighting, rugs, art, plants and styling appropriate to a ${roomLabel}.

ROOM PROGRAM (this rule overrides any furniture examples in the style brief above):
${ROOM_PROGRAM_RULES[roomTypeKey]}

Preserve the room's existing architecture exactly: keep every wall flat and in its current position, keep the ceiling as one flat plane, keep the floor, and keep every window as a real glazed window with daylight and the outdoor view coming through it. Do NOT add or remove walls, doorways, openings, beams, columns, soffits or partitions, and do NOT widen the room.${renderAccent(args.accent ?? null)}${variationHint}`;
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
  /** The one palette colour (or 2026 paint) emphasised in this concept. */
  accent?: ReturnType<typeof pickAccent>;
}): string {
  const roomTypeKey: RoomType = args.roomType ?? "living_room"; // safe fallback when auto-detect is selected
  const roomTypeLabel = ROOM_TYPE_LABELS[roomTypeKey];

  const variationHint = args.variationSeed
    ? `

This is variation #${args.variationSeed}. Use a different furniture arrangement, lighting fixture choice, and accent details than previous variations, while maintaining the same target style and the same architectural constraints.`
    : "";

  const spatialBlock =
    args.spatialConstraints && args.spatialConstraints.trim()
      ? `

${args.spatialConstraints.trim()}`
      : "";

  return `Edit this room photograph to show how the same exact room would look after a complete interior renovation. This is a photorealistic "after" visualization for an interior design client. The room will be renovated into a ${roomTypeLabel} in the style described below.${spatialBlock}

ROOM PROGRAM (this rule overrides any furniture examples in the style brief below):
${ROOM_PROGRAM_RULES[roomTypeKey]}

CRITICAL ARCHITECTURAL CONSTRAINTS — every one of these is non-negotiable. This is a re-styling of the room in the photograph, not a new room. Each rule carries its id from the studio rulebook:

${GEMINI_RULES_BLOCK}

WHAT TO TRANSFORM:
- Repair and finish any damaged walls into smooth, finished walls in the target style's palette
- Replace worn or damaged flooring with new flooring appropriate to the target style
- Remove or conceal radiators and utility fixtures (the windows themselves stay exactly where they are)
- Furnish the room as a complete ${roomTypeLabel.toLowerCase()} with all appropriate furniture, lighting, cabinetry, and styling — all in the target style
- Add appropriate decor, plants, and styling
- Lighting in the final image should feel cohesive with the target style's mood, layered with natural daylight from the preserved windows

TARGET STYLE:

${args.styleBrief}${renderAccent(args.accent ?? null)}${variationHint}

Generate the edited photograph now. The result must look like the same room shown in the input photo, photographed from the same angle, after this renovation is complete. Every window and wall must stay in exactly the same position, and at the same distance from one another, as in the input photo — do not move the windows, widen the room, or add walls the original does not show. Photorealistic, high detail, professional interior photography quality.`;
}
