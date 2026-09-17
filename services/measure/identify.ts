/**
 * "We found these things in your room."
 *
 * One Gemini call that does ONLY what the bench showed it is good at: NAMING
 * what is in the picture. It is never asked where anything is — its coordinates
 * were wrong on every object it named — and never asked how big anything is.
 * Sizes come from `objects.ts` by string match, or from the person.
 */

import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import { askHint, matchKnown, type FoundItem, type Plane } from "./objects.js";

export type { FoundItem };

const PROMPT = `You are looking at ONE photograph of an interior.

List the objects in it that are FLAT RECTANGLES seen face-on — the kind of thing
someone could trace with four corners. Doors, windows, televisions, mirrors, pictures,
radiators, wardrobe and cabinet fronts, rugs, table tops, a suspended ceiling tile,
a tiled floor.

For each one give:
  name           plain words, singular ("television", "table tennis table", "ceiling tile",
                 "window", "interior door", "rug", "bookcase")
  plane          "wall" if it is on/against a wall, "floor" if it lies on the floor,
                 "ceiling" if it is part of the ceiling
  wholeInFrame   true ONLY if all four of its corners are inside the photograph. If any
                 part of it is cut off by the edge of the picture, or hidden behind
                 furniture or a curtain, say false. Be strict — this decides whether it
                 can be used at all.

Rules:
  - Do NOT give coordinates or positions. You are not asked where anything is.
  - Do NOT give any dimension or size. You are not asked how big anything is.
  - List the LARGEST and most clearly visible things first.
  - One entry per distinct object. If there are many of a repeating thing (ceiling
    tiles, floor tiles), list it ONCE.
  - 3 to 10 entries.

Return ONLY JSON: {"items":[{"name":"...","plane":"wall","wholeInFrame":true}]}`;

const PLANES: Plane[] = ["wall", "floor", "ceiling"];

/** Horizontal tops that sit above the floor. */
const RAISED_SURFACE = /\b(table|desk|counter|worktop|workbench|bench|shelf|bed)/;

export function parseFound(text: string): FoundItem[] {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  let raw: unknown;
  try {
    raw = JSON.parse(cleaned);
  } catch {
    const s = cleaned.indexOf("{");
    const e = cleaned.lastIndexOf("}");
    if (s < 0 || e <= s) return [];
    try {
      raw = JSON.parse(cleaned.slice(s, e + 1));
    } catch {
      return [];
    }
  }
  const list = (raw as { items?: unknown }).items;
  if (!Array.isArray(list)) return [];

  const out: FoundItem[] = [];
  const seen = new Set<string>();
  for (const entry of list) {
    if (!entry || typeof entry !== "object") continue;
    const r = entry as Record<string, unknown>;
    const name = String(r.name ?? "").trim().slice(0, 60);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const known = matchKnown(name);
    const item: FoundItem = {
      name,
      plane: PLANES.includes(r.plane as Plane) ? (r.plane as Plane) : known?.plane ?? "wall",
      // Absent means "not confirmed whole", which is the safe reading.
      wholeInFrame: r.wholeInFrame === true,
    };
    if (known) {
      // A repeating element is never "cut off" in any useful sense — the floor
      // is covered in tiles, so if the one the model looked at is clipped, the
      // person simply traces another. Refusing here was pure obstruction.
      if (known.repeating) item.wholeInFrame = true;
      item.trace = known.trace;
      item.knownId = known.id;
      item.knownLabel = known.label;
      item.widthMm = known.widthMm;
      item.heightMm = known.heightMm;
      item.note = known.note;
      // A standard's own plane is more reliable than the model's guess.
      item.plane = known.plane;
    } else {
      const hint = askHint(name);
      if (hint) item.note = hint;
    }
    // A table top is flat and horizontal, but it is not the floor.
    if (item.plane === "floor" && RAISED_SURFACE.test(key)) item.plane = "raised";
    out.push(item);
  }
  // Things we can size ourselves are the ones worth offering first.
  return out.sort((a, b) => {
    if (!!b.knownId !== !!a.knownId) return b.knownId ? 1 : -1;
    if (b.wholeInFrame !== a.wholeInFrame) return b.wholeInFrame ? 1 : -1;
    // A raised top cannot measure the room, so it goes after anything that can.
    if ((a.plane === "raised") !== (b.plane === "raised")) return a.plane === "raised" ? 1 : -1;
    return 0;
  });
}

export async function identifyMeasurables(
  buffer: Buffer,
  apiKey: string,
): Promise<{ items: FoundItem[] } | { error: string }> {
  let jpeg: Buffer;
  try {
    jpeg = await sharp(buffer)
      .rotate()
      .resize({ width: 1100, height: 1100, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
  } catch (e) {
    return { error: `could not read that image: ${(e as Error).message}` };
  }
  try {
    const ai = new GoogleGenAI({ apiKey });
    const res = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: "image/jpeg", data: jpeg.toString("base64") } },
            { text: PROMPT },
          ],
        },
      ],
      config: {
        temperature: 0,
        responseMimeType: "application/json",
        // Gemini 2.5 thinks before answering unless given a budget, and that
        // thinking WAS the whole wait: 8-24 s per photo, which read on screen as
        // "stuck on Reading the photo…". Benched over four real rooms
        // (scripts/measure-latency.ts): 512 tokens answers in ~4 s and named the
        // same things or more — it found the door and cabinet the default missed.
        // Zero is faster still (~1.5 s) but starts losing doors and cabinet fronts.
        thinkingConfig: { thinkingBudget: 512 },
      },
    });
    return { items: parseFound(res.text ?? "") };
  } catch (e) {
    return { error: `identify failed: ${(e as Error).message}` };
  }
}
