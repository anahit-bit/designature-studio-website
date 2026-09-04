/**
 * AI-029 — Spatial grounding (Step 1.5 of the AI Vision pipeline).
 *
 * Before generating the concept, measure the source room's fixed architecture
 * so the image model can be told to preserve each element AT ITS EXACT POSITION,
 * rather than relying on weak negative rules ("don't move the windows").
 *
 * Crucially, this also reports which walls/surfaces are OUT OF FRAME so the
 * generator does not invent side walls that the original photo never showed
 * (the head-on single-wall bedroom failure mode).
 *
 * The analysis depends only on the room photo, so results are cached by photo
 * hash and reused across variations.
 */

import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import type { RoomType } from "./stylePresets.js";
import { ROOM_TYPE_LABELS } from "./stylePresets.js";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** A wall/surface identifier the model may reference. */
export type Surface = "back" | "left" | "right" | "ceiling" | "floor";

/** Normalized bounding box [x0, y0, x1, y1], each in 0..1 (top-left origin). */
export type Box = [number, number, number, number];

export interface RoomStructure {
  /** Short phrase, e.g. "head-on, facing the back wall". */
  cameraView: string;
  /** Walls/surfaces actually visible in the photo. */
  visibleWalls: Surface[];
  /** Walls/surfaces NOT visible — the generator must NOT invent these. */
  outOfFrameWalls: Surface[];
  windows: Array<{
    wall: Surface;
    /** e.g. "rectangular", "arched", "floor-to-ceiling". */
    shape: string;
    box: Box;
    note?: string;
  }>;
  doors: Array<{ wall: Surface; box: Box; note?: string }>;
  /** Fixed non-wall architecture: radiators, columns, niches, fireplaces, beams. */
  fixedFeatures: Array<{ label: string; box: Box }>;
  /**
   * What the photograph appears to be a room OF. The analysis is already looking
   * at the pixels, so this rides along for free — and without it, leaving the
   * room chip blank fell through to `living_room`, which put a sofa in a
   * bathroom. Null when the model would not commit.
   */
  detectedRoom: RoomType | null;
  /** One-paragraph plain-language preservation instruction. */
  summary: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Prompt
// ─────────────────────────────────────────────────────────────────────────────

export const SPATIAL_ANALYSIS_PROMPT = `You are an architectural analyst preparing a preservation brief for an AI image editor that will restyle this exact room. Your job is to map the room's FIXED architecture so the editor keeps every wall, window and door exactly where it is.

Report ONLY what is actually visible in this photo. NEVER guess at walls, corners, or surfaces that are outside the frame or that you cannot clearly see — those must be listed as out-of-frame so the editor does not invent them.

Coordinates are normalized: (0,0) is the top-left corner of the image, (1,1) is the bottom-right. Every box is [x0, y0, x1, y1].

Return STRICT JSON only (no prose, no markdown fences) matching exactly this shape:
{
  "cameraView": "short phrase, e.g. head-on facing the back wall, or angled showing two walls",
  "visibleWalls": ["subset of: back, left, right, ceiling, floor"],
  "outOfFrameWalls": ["walls/surfaces from the same set that are NOT visible and must NOT be added"],
  "windows": [{ "wall": "back|left|right", "shape": "rectangular|arched|floor-to-ceiling|...", "box": [x0,y0,x1,y1], "note": "optional" }],
  "doors": [{ "wall": "back|left|right", "box": [x0,y0,x1,y1], "note": "optional" }],
  "fixedFeatures": [{ "label": "radiator|column|niche|fireplace|beam|...", "box": [x0,y0,x1,y1] }],
  "detectedRoom": "exactly one of: living_room, dining_room, living_dining, bedroom, kitchen, bathroom, home_office, kids_room, outdoor, hallway — or null if genuinely unclear",
  "summary": "one paragraph telling the editor which walls, windows and proportions to preserve and which surfaces are out of frame and must not be invented"
}

Critical rules:
- If only one wall is visible (a head-on shot), put just that wall in visibleWalls and list "left" and "right" in outOfFrameWalls. A head-on photo of a single wall must NOT be turned into an enclosed box with side walls.
- A doorway, archway, cased opening or open passage counts as a DOOR whether or not a door leaf is hanging in it. An empty room with no opening in frame must report an empty doors array — do not infer a doorway you cannot see.
- Judge detectedRoom from what the room is EQUIPPED for, not from what it could become. An empty or half-empty room with a bed frame in it is a bedroom; a corridor-shaped space with no fixtures is a hallway. Use null rather than guessing.
- Measure each window and door box as precisely as you can from the pixels.
- Preserve the real spacing between windows and the wall edges beside them — note it in the summary if a window sits close to or far from a corner.
- Include only fixed architecture. Do NOT include furniture, rugs, or decor.
- If a field has nothing to report, use an empty array. Output ONLY the JSON object.`;

// ─────────────────────────────────────────────────────────────────────────────
// Analysis
// ─────────────────────────────────────────────────────────────────────────────

const VALID_SURFACES: readonly Surface[] = [
  "back",
  "left",
  "right",
  "ceiling",
  "floor",
];

function coerceSurface(v: unknown): Surface | null {
  if (typeof v !== "string") return null;
  const s = v.toLowerCase().trim();
  return (VALID_SURFACES as readonly string[]).includes(s)
    ? (s as Surface)
    : null;
}

function coerceSurfaceList(v: unknown): Surface[] {
  if (!Array.isArray(v)) return [];
  const out: Surface[] = [];
  for (const item of v) {
    const s = coerceSurface(item);
    if (s && !out.includes(s)) out.push(s);
  }
  return out;
}

/**
 * Accept a detected room only if it is one of the room types the product
 * actually has a programme for. Anything else — "studio", "garage", "cafe" —
 * becomes null, so the caller asks the user instead of guessing. RD20 keeps
 * commercial spaces out of scope, and silently mapping one onto the nearest
 * residential programme is exactly how a cafe gets told to build a dining room.
 */
function coerceRoomType(v: unknown): RoomType | null {
  if (typeof v !== "string") return null;
  const s = v.toLowerCase().trim().replace(/[\s-]+/g, "_");
  return s in ROOM_TYPE_LABELS ? (s as RoomType) : null;
}

function coerceBox(v: unknown): Box | null {
  if (!Array.isArray(v) || v.length !== 4) return null;
  const nums = v.map((n) => (typeof n === "number" ? n : Number(n)));
  if (nums.some((n) => !Number.isFinite(n))) return null;
  // Clamp into 0..1 so a stray value can't produce a nonsense constraint.
  const clamped = nums.map((n) => Math.min(1, Math.max(0, n))) as Box;
  return clamped;
}

/**
 * Parse the model's JSON (tolerant of ```json fences and surrounding prose)
 * into a validated RoomStructure. Returns null if nothing usable was found.
 */
export function parseRoomStructure(raw: string): RoomStructure | null {
  if (!raw || !raw.trim()) return null;

  // Strip markdown fences and isolate the first {...} block.
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }
  text = text.slice(firstBrace, lastBrace + 1);

  let obj: any;
  try {
    obj = JSON.parse(text);
  } catch {
    return null;
  }
  if (!obj || typeof obj !== "object") return null;

  const windows = Array.isArray(obj.windows)
    ? obj.windows
        .map((w: any) => {
          const box = coerceBox(w?.box);
          const wall = coerceSurface(w?.wall);
          if (!box || !wall) return null;
          return {
            wall,
            shape: typeof w?.shape === "string" ? w.shape : "rectangular",
            box,
            note: typeof w?.note === "string" ? w.note : undefined,
          };
        })
        .filter(Boolean)
    : [];

  const doors = Array.isArray(obj.doors)
    ? obj.doors
        .map((d: any) => {
          const box = coerceBox(d?.box);
          const wall = coerceSurface(d?.wall);
          if (!box || !wall) return null;
          return {
            wall,
            box,
            note: typeof d?.note === "string" ? d.note : undefined,
          };
        })
        .filter(Boolean)
    : [];

  const fixedFeatures = Array.isArray(obj.fixedFeatures)
    ? obj.fixedFeatures
        .map((f: any) => {
          const box = coerceBox(f?.box);
          if (!box || typeof f?.label !== "string") return null;
          return { label: f.label, box };
        })
        .filter(Boolean)
    : [];

  const structure: RoomStructure = {
    cameraView:
      typeof obj.cameraView === "string" && obj.cameraView.trim()
        ? obj.cameraView.trim()
        : "unknown",
    visibleWalls: coerceSurfaceList(obj.visibleWalls),
    outOfFrameWalls: coerceSurfaceList(obj.outOfFrameWalls),
    windows: windows as RoomStructure["windows"],
    doors: doors as RoomStructure["doors"],
    fixedFeatures: fixedFeatures as RoomStructure["fixedFeatures"],
    detectedRoom: coerceRoomType(obj.detectedRoom),
    summary: typeof obj.summary === "string" ? obj.summary.trim() : "",
  };

  // Require at least *some* usable spatial signal, else treat as a miss so the
  // caller falls back to the plain prompt rather than injecting an empty block.
  const hasSignal =
    structure.visibleWalls.length > 0 ||
    structure.windows.length > 0 ||
    structure.summary.length > 0;
  return hasSignal ? structure : null;
}

/**
 * Measure the source room's fixed architecture with gemini-2.5-flash.
 * Returns null on any failure so the caller can fall back to the plain prompt —
 * spatial grounding is an enhancement, never a hard dependency of generation.
 */
export async function analyzeRoomStructure(roomPhoto: {
  data: string;
  mimeType: string;
}): Promise<RoomStructure | null> {
  const apiKey = process.env.GEMINI_API_KEY ?? "";
  if (!apiKey) {
    console.warn("[ai-vision] Spatial analysis skipped — GEMINI_API_KEY not set.");
    return null;
  }

  try {
    // Downscale for analysis. Box measurement needs more detail than the 512px
    // style pass, but full res is wasteful — 1024px on the long edge is plenty.
    let data = roomPhoto.data;
    let mimeType = roomPhoto.mimeType;
    try {
      const buf = Buffer.from(roomPhoto.data, "base64");
      const resized = await sharp(buf)
        .rotate()
        .resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
      data = resized.toString("base64");
      mimeType = "image/jpeg";
    } catch (err: any) {
      console.warn(`[ai-vision] Spatial analysis resize failed, using original: ${err?.message}`);
    }

    const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: 60000 } });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          { inlineData: { mimeType, data } },
          { text: SPATIAL_ANALYSIS_PROMPT },
        ],
      },
      config: {
        temperature: 0.1,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 512 },
      } as any,
    });

    const text: string =
      (response as any).text ??
      response?.candidates?.[0]?.content?.parts
        ?.map((p: any) => p.text ?? "")
        .join("") ??
      "";

    const structure = parseRoomStructure(text);
    if (!structure) {
      console.warn("[ai-vision] Spatial analysis returned no usable structure — falling back to plain prompt.");
      return null;
    }
    console.log(
      `[ai-vision] Spatial analysis: view="${structure.cameraView}", visible=[${structure.visibleWalls.join(",")}], outOfFrame=[${structure.outOfFrameWalls.join(",")}], windows=${structure.windows.length}, doors=${structure.doors.length}, room=${structure.detectedRoom ?? "unknown"}`
    );
    return structure;
  } catch (err: any) {
    console.warn(`[ai-vision] Spatial analysis failed (non-fatal): ${err?.message ?? err}`);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Render → prompt constraints
// ─────────────────────────────────────────────────────────────────────────────

const SURFACE_LABEL: Record<Surface, string> = {
  back: "back wall",
  left: "left wall",
  right: "right wall",
  ceiling: "ceiling",
  floor: "floor",
};

function fmtBox(b: Box): string {
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  return `x:${pct(b[0])}–${pct(b[2])}, y:${pct(b[1])}–${pct(b[3])}`;
}

/** Framing metrics derived from the primary (largest) opening, all frame-normalized. */
export interface SpatialMetrics {
  /**
   * Primary opening width ÷ frame width. Shrinks when the room is widened.
   * Named for the window because that is the usual anchor; a windowless room
   * anchors on its largest door instead (see `anchor`).
   */
  windowWidthFrac: number;
  windowHeightFrac: number;
  /** Frame fraction to the left of / right of the primary opening. */
  leftMarginFrac: number;
  rightMarginFrac: number;
  /** What the numbers above were measured from. */
  anchor: "window" | "door";
}

/**
 * AI-029 Phase 1.5 — "single-wall shot" detector for the soft upload warning.
 *
 * True when the back wall is shown but neither side wall is visible — the
 * head-on framing where the room's real width/depth simply isn't in the photo,
 * so the generator has to invent side walls and can't hold the true
 * proportions. We warn the user (softly) to step back and capture the sides.
 *
 * Pure; conservative — returns false on missing/ambiguous data so we never
 * nag on a photo we couldn't confidently classify.
 */
export function isSingleWallShot(s: RoomStructure | null): boolean {
  if (!s || !Array.isArray(s.visibleWalls)) return false;
  const visible = new Set(s.visibleWalls);
  return visible.has("back") && !visible.has("left") && !visible.has("right");
}

/** Windows + doors: everything whose count must survive generation (RD1/RD2/RD7). */
export function countOpenings(s: RoomStructure | null | undefined): {
  windows: number;
  doors: number;
  total: number;
} {
  const windows = s?.windows?.length ?? 0;
  const doors = s?.doors?.length ?? 0;
  return { windows, doors, total: windows + doors };
}

const boxArea = (b: Box) => (b[2] - b[0]) * (b[3] - b[1]);

/**
 * Compute framing metrics from the largest opening in the room. Pure. Used both
 * to enrich the prompt (Phase 2a) and to verify the generated output against the
 * source (Phase 2b).
 *
 * Windows first — a window is the most reliably measured thing in an interior
 * photo. Falling back to the largest DOOR matters more than it sounds: anchoring
 * only on windows meant a windowless room produced no metrics, which switched
 * off both the FRAMING & SCALE line and the entire verify-and-retry, so hallways,
 * alcoves and interior bathrooms ran on a single unchecked generation. Returns
 * null only when the room has neither, and RD25's opening count still covers that
 * case.
 */
export function spatialMetrics(s: RoomStructure | null): SpatialMetrics | null {
  if (!s) return null;
  const pool: Array<{ box: Box; anchor: "window" | "door" }> = s.windows.length
    ? s.windows.map((w) => ({ box: w.box, anchor: "window" as const }))
    : s.doors.map((d) => ({ box: d.box, anchor: "door" as const }));
  if (!pool.length) return null;
  const primary = pool.reduce((a, b) => (boxArea(b.box) > boxArea(a.box) ? b : a));
  const [x0, y0, x1, y1] = primary.box;
  return {
    windowWidthFrac: x1 - x0,
    windowHeightFrac: y1 - y0,
    leftMarginFrac: x0,
    rightMarginFrac: 1 - x1,
    anchor: primary.anchor,
  };
}

/**
 * Turn a measured RoomStructure into a positive, coordinate-grounded
 * constraints block for the generation prompt. Pure and deterministic.
 * Returns "" for a null/empty structure so the caller can skip the block.
 */
export function renderSpatialConstraints(
  structure: RoomStructure | null
): string {
  if (!structure) return "";

  const lines: string[] = [];
  lines.push(
    "MEASURED ARCHITECTURE OF THIS EXACT ROOM — reproduce these fixed elements at these exact normalized positions (0% = left/top edge of the frame, 100% = right/bottom edge). This is the real geometry of the room in the photo; the renovated image must match it:"
  );

  if (structure.cameraView && structure.cameraView !== "unknown") {
    lines.push(`- Camera view: ${structure.cameraView}. Keep this exact viewpoint.`);
  }

  if (structure.visibleWalls.length > 0) {
    lines.push(
      `- Visible surfaces (keep them at the same positions): ${structure.visibleWalls
        .map((w) => SURFACE_LABEL[w])
        .join(", ")}.`
    );
  }

  if (structure.outOfFrameWalls.length > 0) {
    lines.push(
      `- OUT OF FRAME — do NOT add, reveal, or invent these; the original photo does not show them and the renovated image must not either: ${structure.outOfFrameWalls
        .map((w) => SURFACE_LABEL[w])
        .join(
          ", "
        )}. Do not enclose the room or build side walls that are not in the original.`
    );
  }

  for (const w of structure.windows) {
    const noteStr = w.note ? ` (${w.note})` : "";
    lines.push(
      `- ${w.shape} window on the ${SURFACE_LABEL[w.wall]} at ${fmtBox(
        w.box
      )}. Keep it exactly here — same position, size, and shape. Preserve the wall spacing around it; do not shift it or widen the wall beside it.${noteStr}`
    );
  }

  for (const d of structure.doors) {
    const noteStr = d.note ? ` (${d.note})` : "";
    lines.push(
      `- Door on the ${SURFACE_LABEL[d.wall]} at ${fmtBox(
        d.box
      )}. Keep it at this exact position.${noteStr}`
    );
  }

  for (const f of structure.fixedFeatures) {
    lines.push(
      `- ${f.label} at ${fmtBox(
        f.box
      )} — keep the window/wall geometry around it; you may restyle or conceal the fixture itself.`
    );
  }

  // Phase 2a — framing/scale lock. The dominant failure is the room being
  // "widened" (camera pulled back), which shrinks the window's share of the
  // frame and inflates the wall margins. Pin those fractions explicitly.
  const m = spatialMetrics(structure);
  if (m) {
    const pct = (n: number) => Math.round(n * 100);
    const what = m.anchor === "window" ? "main window" : "main doorway";
    lines.push(
      `- FRAMING & SCALE (critical — do not change): the ${what} fills about ${pct(
        m.windowWidthFrac
      )}% of the image width and ${pct(
        m.windowHeightFrac
      )}% of its height, with roughly ${pct(
        m.leftMarginFrac
      )}% of the frame to its left and ${pct(
        m.rightMarginFrac
      )}% to its right. Keep these exact proportions. Do NOT widen the room, zoom out, or pull the camera back — the ${what} and the walls must occupy the same share of the image as in the original photo, at the same field of view. If in doubt, keep the room tighter, never wider.`
    );
  }

  // RD25, stated up front as a count the model can check itself against. A
  // number is harder to argue with than "do not add a door".
  const openings = countOpenings(structure);
  lines.push(
    `- OPENING COUNT (critical): this room has exactly ${openings.windows} window${
      openings.windows === 1 ? "" : "s"
    } and ${openings.doors} doorway${
      openings.doors === 1 ? "" : "s"
    } in frame. The renovated image must show exactly the same numbers — ${
      openings.total === 0
        ? "no window and no doorway at all. Every wall in view stays solid and unbroken."
        : "no extra window, doorway, arch or opening, and none of the existing ones removed."
    }`
  );

  if (structure.summary) {
    lines.push(`- Preservation summary: ${structure.summary}`);
  }

  return lines.join("\n");
}
