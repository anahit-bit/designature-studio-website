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
import type { RoomStructure } from "./spatialAnalysis.js";
import {
  GEMINI_RULE_SECTIONS,
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
// RD26 — the programme is issued against the measured photograph.
//
// A room programme is generic by construction: it cannot know that THIS hallway
// has no doorway, or that THIS bedroom's only wall carries the window. Left
// generic, the model fills the gap from its own prior — on 2026-09-04 a Hallway
// programme that asked for a through-view was handed a sealed dead-end alcove,
// and the model cut an arch with a staircase into the back wall to comply.
//
// Naming the absence beats forbidding the invention: "this photograph shows no
// doorway" is a fact about the input, which the model weighs far more heavily
// than one more "do not add" among a list of them.
// ─────────────────────────────────────────────────────────────────────────────

/** A conflict between what a room programme assumes and what the photo shows. */
export interface ProgrammeConflict {
  /** Stable id for logging and tests. */
  code: "hallway-dead-end" | "bed-wall-glazed" | "single-wall-kitchen" | "single-wall-room";
  /** Sentence appended to the room programme in the prompt. */
  note: string;
  /** Plain-English version for the upload screen. Empty when not worth saying. */
  userTip: string;
}

/** True for a head-on shot: a back wall, with neither side wall in frame. */
function isHeadOn(s: RoomStructure): boolean {
  return (
    s.visibleWalls.includes("back") &&
    !s.visibleWalls.includes("left") &&
    !s.visibleWalls.includes("right")
  );
}

/**
 * Compare a room programme's assumptions against the measured room. Pure.
 * Returns null when the photograph can carry the programme as written.
 */
export function detectProgrammeConflict(
  roomType: RoomType | undefined,
  structure: RoomStructure | null | undefined,
): ProgrammeConflict | null {
  if (!roomType || !structure) return null;

  // The failure this whole change exists for. A hallway programme wants the eye
  // to travel somewhere; a photo with no opening in it has nowhere to send it.
  if (roomType === "hallway" && structure.doors.length === 0) {
    return {
      code: "hallway-dead-end",
      note:
        "THIS PHOTOGRAPH IN PARTICULAR: it shows no doorway, no opening, no turn and no staircase. " +
        "This hallway ends at the wall you can see. Furnish it as a dead-end hallway and leave every " +
        "wall solid — do not cut, imply, paint or light an opening anywhere in it.",
      userTip:
        "This photo doesn't show a doorway or opening, so the concept will treat the hallway as ending at the wall you can see.",
    };
  }

  // RD15's hard case, stated as a fact about this room rather than a general rule.
  const bedRoom = roomType === "bedroom" || roomType === "kids_room";
  if (bedRoom && isHeadOn(structure) && structure.windows.some((w) => w.wall === "back")) {
    return {
      code: "bed-wall-glazed",
      note:
        "THIS PHOTOGRAPH IN PARTICULAR: the only wall in frame carries the glazing, and no side wall is " +
        "visible. Offset the bed to one side so the window stays completely clear. Do not move, shrink or " +
        "cover the window, and do not reveal a side wall to put the bed against.",
      userTip:
        "The only wall in this photo has the window in it, so the bed will sit to one side of the glazing.",
    };
  }

  // A single-wall kitchen has no floor area for an island, and inventing one
  // means inventing the floor to stand it on.
  if (roomType === "kitchen" && isHeadOn(structure)) {
    return {
      code: "single-wall-kitchen",
      note:
        "THIS PHOTOGRAPH IN PARTICULAR: only one wall is in frame. Run the kitchen along that wall and " +
        "leave the island out — there is no measured floor area to stand one in.",
      userTip: "",
    };
  }

  if (isHeadOn(structure)) {
    return {
      code: "single-wall-room",
      note:
        "THIS PHOTOGRAPH IN PARTICULAR: only one wall is in frame. Arrange the furniture against and in " +
        "front of that wall. Do not open the view out, and do not bring side walls into frame to hold a piece.",
      userTip: "",
    };
  }

  return null;
}

/** The RD26 note as it appears in the prompt, or "" when there is nothing to add. */
export function renderProgrammeNote(
  roomType: RoomType | undefined,
  structure: RoomStructure | null | undefined,
): string {
  const conflict = detectProgrammeConflict(roomType, structure);
  return conflict ? `\n\n${conflict.note}` : "";
}

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
  /**
   * RD26 — the measured room, used to append a photo-specific note to the room
   * programme ("this photograph shows no doorway"). Optional: without it the
   * programme is sent generic, exactly as before.
   */
  structure?: RoomStructure | null;
}): string {
  const roomTypeKey: RoomType = args.roomType ?? "living_room"; // safe fallback when auto-detect is selected
  const roomTypeLabel = ROOM_TYPE_LABELS[roomTypeKey];
  const programmeNote = renderProgrammeNote(args.roomType, args.structure);

  const variationHint = args.variationSeed
    ? `

This is variation #${args.variationSeed}. Use a different furniture arrangement, lighting fixture choice, and accent details than previous variations, while maintaining the same target style and the same architectural constraints.`
    : "";

  const spatialBlock =
    args.spatialConstraints && args.spatialConstraints.trim()
      ? `

${args.spatialConstraints.trim()}`
      : "";

  return `Edit this room photograph to show how the same exact room would look after a complete interior renovation. This is a photorealistic "after" visualization for an interior design client. The room will be renovated into a ${roomTypeLabel} in the style described below.

Work through it in four steps, in this order. Steps 1 and 2 decide what the room IS; steps 3 and 4 decide what it looks like. Each rule carries its id from the studio rulebook.${spatialBlock}

STEP 1 — CLEAR THE ROOM. Before anything else, take out what is standing in it:

${GEMINI_RULE_SECTIONS.clear}

STEP 2 — THE ARCHITECTURE IS FIXED. What is left after step 1 is the shell, and the shell does not change. Not one of these is negotiable:

${GEMINI_RULE_SECTIONS.architecture}

STEP 3 — FURNISH THE EMPTY SHELL as a ${roomTypeLabel}, from scratch, in the target style.

${GEMINI_RULE_SECTIONS.programme}

${ROOM_PROGRAM_RULES[roomTypeKey]}${programmeNote}

${GEMINI_RULE_SECTIONS.furnish}

STEP 4 — FINISHES AND LIGHTING:

${GEMINI_RULE_SECTIONS.finishes}
- Repair and finish any damaged walls into smooth, finished walls in the target style's palette
- Replace worn or damaged flooring with new flooring appropriate to the target style
- Remove or conceal radiators and utility fixtures (the windows themselves stay exactly where they are)
- Add appropriate decor, plants, and styling
- Lighting in the final image should feel cohesive with the target style's mood, layered with natural daylight from the preserved windows

TARGET STYLE:

${args.styleBrief}${renderAccent(args.accent ?? null)}${variationHint}

Generate the edited photograph now. Two things decide whether this is usable. First: NONE of the original furniture, rugs, curtains or clutter survives — every loose object in the result is a new piece you placed, not one you restyled where it stood. Second: the shell is untouched — the same walls in the same places, the same ceiling, the same number of windows and the same number of doors as the input photo, at the same distances from one another. Count the openings in the input and put exactly that many in the output: no new doorway, arch, opening or window, and no wall the original does not show. Photographed from the same spot with the same lens. Photorealistic, high detail, professional interior photography quality.`;
}
