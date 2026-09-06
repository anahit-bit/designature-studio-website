/**
  * Style preset wiring for AI Vision — the type unions and the display-name maps.
 *
 * The CONTENT (briefs, palettes, room programmes) is not here: it is compiled
 * from _Plan\Website\AI-Vision-Rulebook.xlsx into rulebook.generated.ts. This
 * file is the code side of that contract — which presets exist, and which chip
 * label resolves to which one.
 */

import { STYLE_BRIEFS as COMPILED_BRIEFS } from "./rulebook.generated.js";

export type StylePreset =
  | "art_deco"
  | "bohemian"
  | "coastal"
  | "industrial"
  | "japandi"
  | "mid_century"
  | "modern"
  | "rustic"
  | "transitional"
  | "warm_contemporary"
  | "minimalist"
  | "maximalist"
  | "biophilic"
  | "dopamine"
  | "trend_2026";

export type RoomType =
  | "living_room"
  | "dining_room"
  | "bedroom"
  | "kitchen"
  | "bathroom"
  | "home_office"
  | "kids_room"
  | "outdoor"
  | "hallway"
  | "living_dining";

// ─────────────────────────────────────────────────────────────────────────────
// Style briefs — the seven-section description behind every style chip.
//
// NOT written here any more. The owner edits them on the "Style Briefs" sheet of
// _Plan\Website\AI-Vision-Rulebook.xlsx and `scripts/aivision/compile-rulebook.py`
// generates rulebook.generated.ts. Using a preset costs no API call: the text
// below goes to the image model verbatim.
//
// The cast is checked at runtime by the wiring tests — every StylePreset must
// have a brief, and every brief must belong to a chip.
// ─────────────────────────────────────────────────────────────────────────────
export const STYLE_BRIEFS = COMPILED_BRIEFS as Record<StylePreset, string>;

// ─────────────────────────────────────────────────────────────────────────────
// Room type display labels used in the generation prompt
// ─────────────────────────────────────────────────────────────────────────────
export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  living_room: "LIVING ROOM",
  dining_room:  "DINING ROOM",
  bedroom:      "BEDROOM",
  kitchen:      "KITCHEN",
  bathroom:     "BATHROOM",
  home_office:  "HOME OFFICE",
  kids_room:    "KIDS ROOM",
  outdoor:      "OUTDOOR SPACE",
  hallway:      "HALLWAY",
  living_dining: "OPEN-PLAN LIVING + DINING ROOM",
};

// ─────────────────────────────────────────────────────────────────────────────
// Mapping helpers (frontend display names -> canonical keys)
// ─────────────────────────────────────────────────────────────────────────────

export const STYLE_NAME_TO_PRESET: Record<string, StylePreset> = {
  "Japandi":      "japandi",
  "Warm Contemporary": "warm_contemporary",
  "Trend 2026":   "trend_2026",
  "Transitional": "transitional",
  "Modern":       "modern",
  "Mid-Century":  "mid_century",
  "Bohemian":     "bohemian",
  "Rustic":       "rustic",
  "Art Deco":     "art_deco",
  "Industrial":   "industrial",
  "Coastal":      "coastal",
  "Minimalist":   "minimalist",
  "Maximalist":   "maximalist",
  "Biophilic":    "biophilic",
  "Dopamine":     "dopamine",
};

// Maps every room-picker label the frontend can send to a canonical RoomType.
// Two label conventions exist and BOTH must resolve, or the server silently
// falls back to `living_room` (wrong-room bug):
//   • VisionExperience.tsx `ROOM_TYPES_FULL` — the LIVE chips — uses the short
//     forms "Living" and "Dining" (the rest already match the full forms).
//   • AIConceptsPage `ROOM_TYPES` (legacy) uses the full forms "Living Room" /
//     "Dining Room".
// Keep this in sync with ROOM_TYPES_FULL — stylePresets.test asserts it, both ways.
export const ROOM_NAME_TO_TYPE: Record<string, RoomType> = {
  // Full forms (legacy AIConceptsPage chips)
  "Living Room": "living_room",
  "Dining Room": "dining_room",
  // Short forms (live VisionExperience chips)
  "Living":      "living_room",
  "Dining":      "dining_room",
  // Open-plan combo — one room holding both zones, never two rooms.
  "Living + Dining": "living_dining",
  // Identical in both conventions
  "Bedroom":     "bedroom",
  "Kitchen":     "kitchen",
  "Bathroom":    "bathroom",
  "Home Office": "home_office",
  "Kids Room":   "kids_room",
  "Outdoor":     "outdoor",
  "Hallway":     "hallway",
};
