/**
 * Things in a room whose size is fixed, so the person does not have to measure
 * anything at all — they just tell us which one it is.
 *
 * The vision pass NAMES what it sees (which it is good at). Matching those names
 * to a standard is done HERE, by string, so the model never gets to assert a
 * dimension. Anything unmatched simply asks the person for its size.
 *
 * Each entry is a RECTANGLE seen face-on, because that is what the calibration
 * needs: four corners and two real lengths.
 */

/** Which flat surface the object lies in. Only things on the SAME surface can
 *  be measured from one calibration. */
/**
 * "raised" is a flat horizontal top that is NOT the floor — a table, a desk, a
 * bench. Calibrating on it and then measuring the floor reads every distance at
 * the wrong scale, so it measures only things on that same top.
 */
export type Plane = "wall" | "floor" | "ceiling" | "raised";

/**
 * One thing the vision pass named. Lives here rather than in `identify.ts` so
 * the browser can import the type without pulling `sharp` into the bundle.
 */
export interface FoundItem {
  /** What exactly to put the pins on, when we know. */
  trace?: string;
  /** What the model called it. */
  name: string;
  /** Which flat surface it lies in. */
  plane: Plane;
  /** True when all four of its corners are inside the photograph. */
  wholeInFrame: boolean;
  /** Set when we know its size without asking. */
  knownId?: string;
  knownLabel?: string;
  widthMm?: number;
  heightMm?: number;
  note?: string;
}

export interface KnownObject {
  id: string;
  label: string;
  plane: Plane;
  widthMm: number;
  heightMm: number;
  /** Shown to the person so they can disagree. */
  note: string;
  /**
   * A REPEATING element — a tile, a grid panel. There is always a whole one
   * somewhere, so "cut off" is never a reason to refuse it: the person just
   * traces a different one.
   */
  repeating?: boolean;
  /** What exactly to put the four corners on. The commonest mistake is tracing
   *  a different part of the object from the one whose size was given. */
  trace?: string;
  /** Lower-case words the vision pass might use for it. */
  aliases: string[];
  /**
   * Words that VETO this entry even when an alias matched. English compounds are
   * head-final, so "oven door" and "microwave door" both contain "door" — and a
   * room-door standard applied to an oven is a 2.5x error that looks plausible.
   */
  disqualifiers?: string[];
}

/** Things that have doors but are not doorways. */
const APPLIANCE_WORDS = [
  "oven", "microwave", "fridge", "refrigerator", "freezer", "dishwasher",
  "washing machine", "cabinet", "cupboard", "wardrobe", "shower", "car",
  "range", "cooker",
];

export const KNOWN_OBJECTS: readonly KnownObject[] = [
  {
    id: "ceiling-tile-600",
    trace: "Trace ONE whole tile — the four corners of the tee-bar around it.",
    repeating: true,
    label: "Ceiling tile",
    plane: "ceiling",
    widthMm: 600,
    heightMm: 600,
    note: "Suspended ceiling tiles are 600 × 600 mm. Trace ONE tile — or a block of them, and say how many.",
    aliases: [
      "ceiling tile",
      "suspended ceiling",
      "drop ceiling",
      "ceiling grid",
      "acoustic ceiling",
      "tiled ceiling",
    ],
  },
  {
    id: "table-tennis",
    trace: "Trace the four corners of the PLAYING SURFACE, not the frame or the legs.",
    label: "Table tennis table",
    plane: "raised",
    widthMm: 2740,
    heightMm: 1525,
    note: "Regulation tables are 274 × 152.5 cm. Trace the playing surface.",
    aliases: ["table tennis", "ping pong", "ping-pong", "table-tennis table"],
  },
  {
    id: "door-eu",
    trace: "Trace the door LEAF — the four corners of the panel, inside the frame.",
    disqualifiers: APPLIANCE_WORDS,
    label: "Interior door",
    plane: "wall",
    widthMm: 800,
    heightMm: 2000,
    note: "European standard leaf, 80 × 200 cm.",
    aliases: ["door", "interior door", "internal door", "room door"],
  },
  {
    id: "door-us",
    trace: "Trace the door LEAF — the four corners of the panel, inside the frame.",
    disqualifiers: APPLIANCE_WORDS,
    label: "Interior door (US)",
    plane: "wall",
    widthMm: 813,
    heightMm: 2032,
    note: "32 × 80 in — the common US bedroom door.",
    aliases: ["us door", "bedroom door"],
  },
  {
    id: "door-ext-us",
    trace: "Trace the door LEAF — the four corners of the panel, inside the frame.",
    disqualifiers: APPLIANCE_WORDS,
    label: "Front or back door (US)",
    plane: "wall",
    widthMm: 914,
    heightMm: 2032,
    note: "36 × 80 in — exterior doors are wider.",
    aliases: ["front door", "back door", "exterior door", "entrance door"],
  },
  {
    id: "floor-tile-600",
    trace: "Trace ONE whole tile — pick one near the middle of the floor, not against a wall.",
    repeating: true,
    label: "Floor tile, 60 cm",
    plane: "floor",
    widthMm: 600,
    heightMm: 600,
    note: "Large-format floor tiles are usually 60 × 60 cm. Trace ONE whole tile — count the grout lines to be sure which it is.",
    aliases: ["floor tile", "tiled floor", "floor tiles", "porcelain tile", "ceramic floor"],
  },
  {
    id: "floor-tile-300",
    trace: "Trace ONE whole tile — pick one near the middle of the floor.",
    repeating: true,
    label: "Floor tile, 30 cm",
    plane: "floor",
    widthMm: 300,
    heightMm: 300,
    note: "The older small format, 30 × 30 cm. Check against a foot: a 30 cm tile is about one shoe long.",
    aliases: ["small floor tile"],
  },
  {
    id: "kitchen-base-door",
    trace: "Trace ONE door front — its four corners. Not the whole run of units.",
    label: "Kitchen cabinet door",
    plane: "wall",
    widthMm: 597,
    heightMm: 715,
    note: "The door front of a standard 60 cm base unit. Trace ONE door, not the whole run.",
    aliases: [
      "kitchen cabinet",
      "cabinet door",
      "base unit",
      "base cabinet",
      "cupboard door",
      "kitchen unit",
      "cabinet",
      "cupboard",
    ],
  },
  {
    id: "dishwasher-front",
    trace: "Trace the front panel — the four corners of the door itself.",
    label: "Dishwasher front",
    plane: "wall",
    widthMm: 598,
    heightMm: 815,
    note: "Full-size dishwashers are 60 cm wide by 82 cm to the worktop.",
    aliases: ["dishwasher"],
  },
  {
    id: "oven-front",
    trace: "Trace the oven door — the four corners of its front face.",
    label: "Built-in oven front",
    plane: "wall",
    widthMm: 595,
    heightMm: 595,
    note: "Built-in ovens are a 60 cm square opening.",
    // "microwave oven door" is a microwave, not an oven, and the two differ by
    // 20 cm in height — so the oven entry stands down whenever it is named.
    disqualifiers: ["microwave"],
    aliases: ["oven", "built-in oven", "wall oven", "oven door"],
  },
  {
    id: "microwave-front",
    trace: "Trace the microwave door — the four corners of its front face.",
    label: "Built-in microwave front",
    plane: "wall",
    widthMm: 595,
    heightMm: 390,
    note: "A built-in microwave sits in the same 60 cm opening, about 39 cm tall.",
    aliases: ["microwave", "microwave door", "microwave oven", "microwave oven door"],
  },
  {
    id: "a4",
    trace: "Trace the four corners of the sheet.",
    label: "A4 sheet of paper",
    plane: "wall",
    widthMm: 297,
    heightMm: 210,
    note: "Tape one to the wall if nothing else in the room is standard.",
    aliases: ["a4", "sheet of paper", "paper"],
  },
];

/** Objects worth pointing out even though their size varies — the person types it. */
export const ASKABLE_HINTS: Readonly<Record<string, string>> = {
  television: "Measure the screen's frame, corner to corner.",
  window: "Measure the opening, inside the frame.",
  radiator: "Measure the panel, not the pipework.",
  rug: "Rugs come in standard sizes — check the label.",
  wardrobe: "Measure the front face.",
  bookcase: "Measure the front face.",
  mirror: "Measure the glass.",
  painting: "Measure the frame.",
  "picture frame": "Measure the frame.",
  fridge: "Measure the door front — width and height.",
  refrigerator: "Measure the door front — width and height.",
  "bar stool": "Not a flat rectangle — pick something else if you can.",
  island: "Measure the end panel, or the worktop if you can see it flat on.",
  worktop: "Measure the visible face of the counter.",
  countertop: "Measure the visible face of the counter.",
  splashback: "Measure one tile, or the whole panel.",
  backsplash: "Measure one tile, or the whole panel.",
  table: "Measure the top — length and width. A table top only measures things on the table; for the room, a floor tile or a door works better.",
  drawer: "Drawer fronts vary a lot — 14, 28, 35 or 71 cm tall. Measure the one you trace.",
};

const normalise = (s: string) => s.toLowerCase().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();

/**
 * Match a name the vision pass produced to a standard, or null when we do not
 * know its size. Longest alias wins, so "front door" beats "door".
 */
export function matchKnown(name: string): KnownObject | null {
  const n = normalise(name);
  let best: { obj: KnownObject; len: number } | null = null;
  for (const obj of KNOWN_OBJECTS) {
    if (obj.disqualifiers?.some((d) => n.includes(d))) continue;
    for (const a of obj.aliases) {
      if (n.includes(a) && (!best || a.length > best.len)) best = { obj, len: a.length };
    }
  }
  return best?.obj ?? null;
}

/** A hint for something we cannot size ourselves. */
export function askHint(name: string): string | null {
  const n = normalise(name);
  for (const [k, v] of Object.entries(ASKABLE_HINTS)) {
    if (n.includes(k)) return v;
  }
  return null;
}

/** Plain words for what a calibration on this plane lets you measure. */
/**
 * What to ask for once the calibration exists.
 *
 * "Tap two points to measure anything else" left people asking what "anything
 * else" meant, and whether it had something to do with the object they had just
 * traced. Name the ONE measurement that matters on this plane, say what the
 * traced object was for, and only then offer the rest.
 */
export const PLANE_ASK: Readonly<Record<Plane, { surface: string; ask: string; more: string }>> = {
  wall: {
    surface: "that wall",
    ask: "Ceiling height: tap the floor, then the ceiling straight above it.",
    more: "Also on that wall: how long it is, or a gap a sofa has to fit.",
  },
  floor: {
    surface: "the floor",
    ask: "Room length: tap one corner of the floor, then the next one along.",
    more: "Also on the floor: the width, or a gap a sofa has to fit.",
  },
  ceiling: {
    surface: "the ceiling",
    ask: "Room length: tap one corner of the ceiling, then the next one along.",
    more: "Tap right round the ceiling and you have the whole room.",
  },
  raised: {
    surface: "that top",
    ask: "Tap the two ends of the top.",
    more: "This top sits above the floor, so it cannot measure the room.",
  },
};

export const PLANE_REACH: Readonly<Record<Plane, string>> = {
  wall: "anything else on that same wall — the ceiling height, a run of wall, where furniture can go against it",
  floor:
    "anything else on the floor — how long a wall is, how much clear space you have, whether a sofa fits",
  ceiling:
    "anything else on the ceiling — and because walls are vertical, the ceiling's outline is the room's outline, so this gives you the whole room",
  raised:
    "only things lying on that same top. It sits higher than the floor, so it cannot measure the floor or the room — for that, trace a floor tile or a door instead",
};
