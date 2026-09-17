/**
 * The contract between the vision pass and the arithmetic.
 *
 * The model is asked ONLY for things it is good at: what kind of image this is,
 * what it can see, and WHERE things are in the frame. It is never asked for a
 * dimension — every millimetre in `RoomMeasurement` is computed in
 * `services/measure/resolve.ts` from these points plus the ruler catalogue.
 *
 * The one exception is `modelEstimate`, which is kept deliberately separate and
 * labelled as an estimate, so it can be scored against the geometric answer
 * rather than quietly substituted for one.
 */

import type { Pt, Segment } from "./projective.js";

/**
 * `corner`   two walls actually meet here — a measurable end.
 * `frame`    the floor line simply leaves the picture here. NOT an end.
 * `occluded` furniture hides the junction; the wall continues behind it.
 */
export type BoundaryKind = "corner" | "frame" | "occluded";

export type ImageKind =
  | "photograph"
  | "ai_generated"
  | "3d_render"
  | "screenshot_of_photo"
  | "not_a_room";

/** A ruler the model claims to see, located in the frame. */
export interface ObservedRuler {
  /** Must name an entry in `STANDARDS`. Anything else is dropped. */
  standardId: string;
  /** What the model actually saw, in its own words. Shown to the owner. */
  what: string;
  /** For a `planar` standard: which plane the rectangle lies in. */
  plane?: "floor" | "ceiling";
  /**
   * For a `planar` standard: the four corners, in cyclic order, of a rectangular
   * BLOCK of whole modules — not necessarily a single tile. A block spanning the
   * room is worth far more than one tile in the corner of it, because homography
   * error grows with how far you extrapolate from the rectangle you know.
   */
  quad?: [Pt, Pt, Pt, Pt];
  /** Modules along edge quad[0]→quad[1]. Defaults to 1. */
  cols?: number;
  /** Modules along edge quad[1]→quad[2]. Defaults to 1. */
  rows?: number;
  /** True when edge quad[0]→quad[1] runs along the standard's LONG side. */
  longEdgeFirst?: boolean;
  /** For a `vertical` standard: foot on the floor and top. */
  vertical?: { base: Pt; top: Pt };
  /** For a `span` standard: both ends, lying on the floor. */
  span?: { a: Pt; b: Pt };
  /** The model's own confidence that this really is that object, 0..1. */
  confidence: number;
}

export interface RoomObservation {
  imageKind: ImageKind;
  /** Why the model called it that — the audit trail for a refusal. */
  imageKindReason: string;
  roomType: string;
  /** Anyone recognisable in frame. A hard stop before anything is shown or stored. */
  peopleInFrame: boolean;
  floorVisible: boolean;
  ceilingVisible: boolean;
  /** Count of full floor-to-ceiling wall corners in frame. 0 means head-on. */
  wallCornersVisible: number;
  /** Metric or imperial building conventions, which selects the ruler set. */
  region: "eu" | "us" | "unknown";

  /** Lines running AWAY from the camera along the floor or ceiling. */
  depthLines: Segment[];
  /** Lines running ACROSS the view along the floor or ceiling. */
  widthLines: Segment[];
  /** True verticals: wall corners, door jambs. */
  verticalLines: Segment[];

  /** Where wall meets floor, in order along the visible extent. */
  floorBoundary: Pt[];
  /**
   * What each `floorBoundary` point IS, same length and order.
   *
   * This is the field that answers "the wall is cut off at that angle".
   * A run is only a measurement when BOTH its ends are real corners; a run
   * that dies at the edge of the photograph has no length, and asking the
   * visitor how long it is cannot help — they cannot see its end either.
   */
  boundaryKinds: BoundaryKind[];
  /** Where wall meets ceiling, in order. Used when the floor is obstructed. */
  ceilingBoundary: Pt[];

  /**
   * ONE full floor-to-ceiling wall corner: the only vertical that measures the
   * ceiling. Asked for separately because "the longest vertical line" is usually
   * a door jamb, and measuring a door and calling it a ceiling is how you get a
   * 2.01 m room.
   */
  ceilingCorner: { base: Pt; top: Pt } | null;

  rulers: ObservedRuler[];

  /**
   * The model's holistic guess. NOT used by the geometry — carried alongside so
   * the two can be scored against each other and against the owner's real numbers.
   */
  modelEstimate: {
    widthMm: number | null;
    lengthMm: number | null;
    ceilingMm: number | null;
    note: string;
  };
}

/** One rung of the ladder, having produced (or failed to produce) an answer. */
export interface RungResult {
  method: "H-FLOOR" | "H-CEIL" | "C-VP" | "VERT" | "MODEL";
  label: string;
  /** Which ruler carried it. */
  via: string;
  widthMm: number | null;
  lengthMm: number | null;
  ceilingMm: number | null;
  /**
   * Every straight wall run traced by the boundary, in millimetres. This is the
   * honest primary output: a photograph shows the walls it shows, and a wall run
   * is exactly what a fit check needs ("your 2.1 m sofa on this 3.6 m wall").
   */
  wallRunsMm: number[];
  /**
   * True when the boundary does not wrap far enough to bound the room — the
   * camera stands in the missing wall, so the extent is of the VISIBLE FLOOR,
   * not of the room. Never present such a number as a room size.
   */
  extentPartial: boolean;
  /** Relative uncertainty, 0..1 — the ruler's own band plus a geometry term. */
  band: number;
  /** Set when the rung was attempted and could not produce a number. */
  failed?: string;
}

export interface RoomMeasurement {
  /** Populated when nothing may be measured at all, with the reason. */
  refusal: string | null;
  rungs: RungResult[];
  /** Tightest rung that produced plan dimensions. */
  best: RungResult | null;
  /** Longest defensible straight wall run across all rungs, in mm. */
  longestRunMm: number | null;
  /**
   * True when every wall in frame runs off the edge of the photograph, so no
   * run has two measurable ends. The room may still be styled; it cannot be
   * measured, and no two-point tap can rescue it.
   */
  wallsCut: boolean;
  /** Ceiling height from whichever rung produced one, tightest first. */
  ceilingMm: number | null;
  /**
   * Max relative disagreement between independent rungs on the same quantity.
   * Above ~0.05 the rungs are telling different stories and the honest move is
   * to ask rather than to average.
   */
  disagreement: number | null;
  /** What to put in front of the visitor, and whether they must answer. */
  confirm: {
    required: boolean;
    reason: string;
    /** The two-point tap we would ask for, when the frame supports one. */
    tapPrompt: string | null;
  };
  modelEstimate: RoomObservation["modelEstimate"];
}
