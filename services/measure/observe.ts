/**
 * The perception half of room measurement: one Gemini call per photograph.
 *
 * The model is asked ONLY for what it is good at — what kind of image this is,
 * what it can see, and WHERE things sit in the frame. It is never asked for a
 * dimension. Every millimetre comes out of `resolve.ts`.
 *
 * Coordinates come back NORMALISED (0..1), never in pixels, for the reason
 * `visionExtract.ts` already documents: asking a model to count pixels invites
 * arithmetic it is bad at, while asking where a thing sits in the frame is
 * perception, which it is good at. Normalised also means the resize we do here
 * can never desynchronise from the coordinates we get back.
 */

import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import { STANDARDS } from "./standards.js";
import type { BoundaryKind, ImageKind, ObservedRuler, RoomObservation } from "./types.js";
import type { Pt, Segment } from "./projective.js";

export const OBSERVE_MODEL = "gemini-2.5-flash";
/** Long edge the model sees. Points, not small text, so 1280 is enough. */
export const OBSERVE_LONG_EDGE = 1280;

const RULER_MENU = STANDARDS.map((s) => {
  const size =
    s.kind === "planar"
      ? `${s.nominalMm}×${s.nominalMm2 ?? s.nominalMm} mm rectangle`
      : s.kind === "vertical"
        ? `${s.nominalMm} mm tall, standing on the floor`
        : `${s.nominalMm} mm long, lying on the floor`;
  return `  ${s.id} (${s.kind}) — ${s.label}: ${size}`;
}).join("\n");

const PROMPT = `You are a surveyor's assistant looking at ONE photograph of an interior.

Your job is to LOCATE things in the frame. You must NOT estimate any room dimension in the
geometry fields — the measurement is computed from your points by separate software. Report
positions only.

All coordinates are NORMALISED to the image: x from 0 (left edge) to 1 (right edge), y from
0 (top edge) to 1 (bottom edge). Give 4 decimal places. Be as precise as you can; a point
placed 1% off makes the final measurement 1% wrong.

STEP 1 — What kind of image is this?
  photograph          a real camera photograph of a real room
  ai_generated        generated or heavily inpainted by an image model (look for melted
                      geometry, impossible joinery, invented reflections, over-clean surfaces,
                      text that is not text)
  3d_render           a CAD/3D visualisation — perfect edges, no sensor noise, clean shadows
  screenshot_of_photo a photo of/screenshot of a listing or another screen
  not_a_room          a construction site with no enclosure, a close-up detail, an exterior,
                      or anything where no room can be read
Say briefly WHY in imageKindReason. Being wrong here is expensive: an AI-generated image has
no real dimensions, so it must never be measured.

STEP 2 — What is visible?
  roomType            living room / bedroom / kitchen / bathroom / office / hall / shell …
  peopleInFrame       true if any person is visible, even partly
  floorVisible        is any floor surface in frame
  ceilingVisible      is any ceiling surface in frame
  wallCornersVisible  how many FULL floor-to-ceiling wall corners are in frame (0-4)
  region              "eu" for metric building conventions, "us" for imperial, else "unknown".
                      Clues: socket and switch shapes, door proportions, radiator type,
                      suspended ceilings and drywall (US), plaster and panel radiators (EU).

STEP 3 — Straight lines, for perspective. Give the ENDPOINTS of real straight edges you can
see. Longer edges are far better than short ones. Do not invent edges you cannot see.
  depthLines      3-6 edges running AWAY from the camera and parallel to each other in reality:
                  the floor/wall junction along a side wall, the ceiling/wall junction above it,
                  the top and bottom of a long cabinet run, floorboard joints.
  widthLines      3-6 edges running ACROSS the view, perpendicular to the depth lines in
                  reality: the foot of the far wall, the ceiling line above it, a worktop front.
  verticalLines   2-4 true verticals: wall corners, door jambs, window jambs. Give each from
                  its BOTTOM point to its TOP point.

STEP 4 — Boundaries. These trace the WALLS, and they are the main measurement.
  floorBoundary   Walk the line where the walls meet the floor, from one edge of the frame to
                  the other, and give a point at every CORNER plus a point where the line
                  leaves the frame at each end. Follow it all the way down the side walls
                  toward the camera — do not stop at the back wall. A room photographed from
                  inside usually gives a U: near-left edge, left corner, right corner,
                  near-right edge. 2-8 points, in order. Empty if no floor is visible.
                  Do NOT invent the wall behind the camera.
  boundaryKinds   one label per floorBoundary point, SAME length and order. This is the most
                  important judgement you make:
                    "corner"   two walls genuinely meet at this point and you can see the join
                    "frame"    the floor line just runs off the edge of the photograph here
                    "occluded" a sofa, cabinet or box hides the junction; the wall continues
                  Be strict. If the wall continues past the edge of the picture, it is "frame",
                  never "corner" — a wall with no visible end cannot be measured by anyone,
                  including the person who took the photo.
  ceilingBoundary the same where the walls meet the ceiling, in the same order. Empty if not
                  visible.
  ceilingCorner   ONE vertical wall corner that runs the FULL height, floor to ceiling:
                  {"base":[x,y],"top":[x,y]} with base on the floor. This is the only thing
                  that measures ceiling height, so pick a true room corner — never a door
                  jamb, a cupboard edge or a window reveal. null if no full corner is in frame.

STEP 5 — Rulers. This is the important step. Find every object in frame whose real size is
fixed by manufacture or building convention, and locate it. Choose standardId ONLY from this
list — anything else is discarded:

${RULER_MENU}

For each ruler:
  standardId    from the list above
  what          what you actually see, in your own words ("grey 600 porcelain tile, mid-floor")
  confidence    0..1, how sure you are it is that exact object
  plane         for a planar standard: "floor" or "ceiling"
  quad          for a planar standard: the four corners, in cyclic order starting nearest the
                camera, of the LARGEST rectangular BLOCK OF WHOLE MODULES you can see clearly
                — e.g. the corners of a 6-tiles-by-4-tiles patch of floor, not one tile. This
                matters more than anything else you report: error from a single small tile is
                multiplied by how far the room extends beyond it, so a block spanning most of
                the floor is worth ten times a tile in the corner. Use whole modules only, and
                only ones you can actually see the edges of.
  cols          how many whole modules the block spans from quad[0] to quad[1]. 1 for a single tile.
  rows          how many whole modules the block spans from quad[1] to quad[2]. 1 for a single tile.
  longEdgeFirst for a planar standard: true if the edge from quad[0] to quad[1] runs along the
                LONG side of the module. For a square tile, true.
  vertical      for a vertical standard: {base, top} — base is where it meets the FLOOR, top
                is its top. For a door leaf, base = floor at the threshold, top = top of the leaf.
  span          for a span standard: {a, b} — both ends, both lying on the floor.

Prefer rulers that are LARGE in the frame and face the camera. Report several if you can —
independent rulers are cross-checked against each other, and disagreement is useful.
If you are not sure which module a tile is, use floor_tile_unknown rather than guessing 600.

STEP 6 — Separately, your own holistic guess at the room, in millimetres: widthMm, lengthMm,
ceilingMm. This is NOT used for the measurement; it is recorded so it can be scored against
the geometry. Use null if you truly cannot guess.

Return ONLY JSON:
{"imageKind":"...","imageKindReason":"...","roomType":"...","peopleInFrame":false,
 "floorVisible":true,"ceilingVisible":true,"wallCornersVisible":2,"region":"eu",
 "depthLines":[{"a":[0.1,0.9],"b":[0.4,0.6]}],
 "widthLines":[{"a":[0.4,0.6],"b":[0.8,0.62]}],
 "verticalLines":[{"a":[0.4,0.6],"b":[0.4,0.2]}],
 "floorBoundary":[[0.05,0.95],[0.4,0.6],[0.9,0.7]],
 "boundaryKinds":["frame","corner","frame"],
 "ceilingBoundary":[[0.05,0.1],[0.4,0.2],[0.9,0.12]],
 "ceilingCorner":{"base":[0.4,0.6],"top":[0.4,0.2]},
 "rulers":[{"standardId":"floor_tile_600","what":"...","confidence":0.9,"plane":"floor",
            "quad":[[0.15,0.95],[0.85,0.92],[0.72,0.62],[0.3,0.63]],"cols":6,"rows":4,
            "longEdgeFirst":true}],
 "modelEstimate":{"widthMm":4000,"lengthMm":3200,"ceilingMm":2700,"note":"..."}}`;

// ─────────────────────────────────────────────────────────────────────────────
// Tolerant parsing — the model's output is data, never trusted structure
// ─────────────────────────────────────────────────────────────────────────────

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

function asPoint(v: unknown): Pt | null {
  if (!Array.isArray(v) || v.length < 2) return null;
  const x = Number(v[0]);
  const y = Number(v[1]);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return [clamp01(x), clamp01(y)];
}

function asPoints(v: unknown): Pt[] {
  if (!Array.isArray(v)) return [];
  return v.map(asPoint).filter((p): p is Pt => p !== null);
}

function asSegments(v: unknown): Segment[] {
  if (!Array.isArray(v)) return [];
  const out: Segment[] = [];
  for (const s of v) {
    if (!s || typeof s !== "object") continue;
    const a = asPoint((s as Record<string, unknown>).a);
    const b = asPoint((s as Record<string, unknown>).b);
    // A zero-length "segment" carries no direction; dropping it here keeps the
    // vanishing-point solver from being handed a line it cannot form.
    if (a && b && (a[0] !== b[0] || a[1] !== b[1])) out.push({ a, b });
  }
  return out;
}

const VALID_IDS = new Set(STANDARDS.map((s) => s.id));
const KINDS: ImageKind[] = [
  "photograph",
  "ai_generated",
  "3d_render",
  "screenshot_of_photo",
  "not_a_room",
];

function asRulers(v: unknown): ObservedRuler[] {
  if (!Array.isArray(v)) return [];
  const out: ObservedRuler[] = [];
  for (const raw of v) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const standardId = String(r.standardId ?? "");
    if (!VALID_IDS.has(standardId)) continue;
    const quadPts = asPoints(r.quad);
    const vertical = r.vertical as Record<string, unknown> | undefined;
    const span = r.span as Record<string, unknown> | undefined;
    const vBase = vertical ? asPoint(vertical.base) : null;
    const vTop = vertical ? asPoint(vertical.top) : null;
    const sA = span ? asPoint(span.a) : null;
    const sB = span ? asPoint(span.b) : null;
    const ruler: ObservedRuler = {
      standardId,
      what: String(r.what ?? "").slice(0, 200),
      confidence: Number.isFinite(Number(r.confidence)) ? clamp01(Number(r.confidence)) : 0.5,
    };
    if (r.plane === "floor" || r.plane === "ceiling") ruler.plane = r.plane;
    if (quadPts.length === 4) {
      ruler.quad = [quadPts[0], quadPts[1], quadPts[2], quadPts[3]];
      ruler.longEdgeFirst = r.longEdgeFirst !== false;
      // A module count of 0 or 40 is a misread, not a bigger block.
      const count = (v: unknown) => {
        const n = Math.round(Number(v));
        return Number.isFinite(n) && n >= 1 && n <= 30 ? n : 1;
      };
      ruler.cols = count(r.cols);
      ruler.rows = count(r.rows);
    }
    if (vBase && vTop) ruler.vertical = { base: vBase, top: vTop };
    if (sA && sB) ruler.span = { a: sA, b: sB };
    // A ruler with no geometry is a claim, not an observation.
    if (!ruler.quad && !ruler.vertical && !ruler.span) continue;
    out.push(ruler);
  }
  return out;
}

/**
 * One label per boundary point. A missing or short list is padded with "frame",
 * the conservative reading: an unlabelled point is not a corner, so it cannot
 * close a measurable run.
 */
function asKinds(v: unknown, n: number): BoundaryKind[] {
  const out: BoundaryKind[] = [];
  const arr = Array.isArray(v) ? v : [];
  for (let i = 0; i < n; i++) {
    const k = String(arr[i] ?? "");
    out.push(k === "corner" || k === "occluded" ? (k as BoundaryKind) : "frame");
  }
  return out;
}

function asCorner(v: unknown): { base: Pt; top: Pt } | null {
  if (!v || typeof v !== "object") return null;
  const base = asPoint((v as Record<string, unknown>).base);
  const top = asPoint((v as Record<string, unknown>).top);
  if (!base || !top) return null;
  // A "corner" whose ends coincide carries no height.
  if (Math.abs(base[1] - top[1]) < 1e-4) return null;
  return { base, top };
}

const asMm = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

export function parseObservation(text: string): RoomObservation | null {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    try {
      raw = JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  const kind = KINDS.includes(raw.imageKind as ImageKind)
    ? (raw.imageKind as ImageKind)
    : "photograph";
  const est = (raw.modelEstimate ?? {}) as Record<string, unknown>;
  const region = raw.region === "eu" || raw.region === "us" ? raw.region : "unknown";

  return {
    imageKind: kind,
    imageKindReason: String(raw.imageKindReason ?? "").slice(0, 400),
    roomType: String(raw.roomType ?? "unknown").slice(0, 80),
    peopleInFrame: raw.peopleInFrame === true,
    floorVisible: raw.floorVisible !== false,
    ceilingVisible: raw.ceilingVisible === true,
    wallCornersVisible: Math.max(0, Math.min(4, Number(raw.wallCornersVisible) || 0)),
    region,
    depthLines: asSegments(raw.depthLines),
    widthLines: asSegments(raw.widthLines),
    verticalLines: asSegments(raw.verticalLines),
    floorBoundary: asPoints(raw.floorBoundary),
    ceilingBoundary: asPoints(raw.ceilingBoundary),
    boundaryKinds: asKinds(raw.boundaryKinds, asPoints(raw.floorBoundary).length),
    ceilingCorner: asCorner(raw.ceilingCorner),
    rulers: asRulers(raw.rulers),
    modelEstimate: {
      widthMm: asMm(est.widthMm),
      lengthMm: asMm(est.lengthMm),
      ceilingMm: asMm(est.ceilingMm),
      note: String(est.note ?? "").slice(0, 300),
    },
  };
}

export interface ObserveResult {
  observation: RoomObservation;
  /** Size of the image the model actually saw, for the geometry's aspect ratio. */
  size: { w: number; h: number };
  raw: string;
}

/**
 * Run the vision pass on one image file. `sharp` applies EXIF orientation via
 * `.rotate()` — without it a fifth of real phone photos arrive sideways and every
 * "vertical" in the observation is a horizontal.
 */
export async function observeRoom(
  buffer: Buffer,
  apiKey: string,
): Promise<ObserveResult | { error: string }> {
  let resized: Buffer;
  let size: { w: number; h: number };
  try {
    const img = sharp(buffer).rotate();
    const out = await img
      .resize({ width: OBSERVE_LONG_EDGE, height: OBSERVE_LONG_EDGE, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 88 })
      .toBuffer({ resolveWithObject: true });
    resized = out.data;
    size = { w: out.info.width, h: out.info.height };
  } catch (e) {
    return { error: `image decode failed: ${(e as Error).message}` };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const res = await ai.models.generateContent({
      model: OBSERVE_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: "image/jpeg", data: resized.toString("base64") } },
            { text: PROMPT },
          ],
        },
      ],
      config: { temperature: 0, responseMimeType: "application/json" },
    });
    const text = res.text ?? "";
    const observation = parseObservation(text);
    if (!observation) return { error: "model returned unparseable JSON" };
    return { observation, size, raw: text };
  } catch (e) {
    return { error: `vision call failed: ${(e as Error).message}` };
  }
}
