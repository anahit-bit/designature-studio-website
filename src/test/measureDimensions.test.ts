/**
 * The measured room, from the wire to the prompt.
 *
 * Two things matter here. Nothing malformed may reach the prompt as a size — a
 * redesign built on a number nobody measured is worse than one built on none.
 * And when sizes ARE present they must reach the model as furniture guidance,
 * never as permission to rebuild the room to fit the furniture.
 */
import { describe, expect, it } from "vitest";
import {
  describeDimensions,
  parseDimensions,
  type RoomDimensions,
} from "../../services/measure/dimensions.js";
import { buildGenerationPrompt } from "../../services/aiVision/promptTemplates.js";

const MEASURED: RoomDimensions = {
  items: [
    { label: "Ceiling height", mm: 2800 },
    { label: "Wall width", mm: 4100 },
  ],
  bandPct: 12,
  ruler: "television",
};

describe("dimensions off the wire", () => {
  it("takes what the measuring step sends", () => {
    const d = parseDimensions({ items: [{ label: "Ceiling height", mm: 2800 }], bandPct: 12 });
    expect(d).toEqual({ items: [{ label: "Ceiling height", mm: 2800 }], bandPct: 12, ruler: undefined });
  });

  it("refuses anything that is not a measurement", () => {
    expect(parseDimensions(undefined)).toBeNull();
    expect(parseDimensions({})).toBeNull();
    expect(parseDimensions({ items: [] })).toBeNull();
    expect(parseDimensions({ items: [{ label: "Ceiling height" }] })).toBeNull();
    expect(parseDimensions({ items: [{ label: "", mm: 2800 }] })).toBeNull();
    // Not room distances: a 4 mm wall, or a 90 m one.
    expect(parseDimensions({ items: [{ label: "Wall", mm: 4 }] })).toBeNull();
    expect(parseDimensions({ items: [{ label: "Wall", mm: 90_000 }] })).toBeNull();
  });

  it("keeps the good numbers when one in a list is junk", () => {
    const d = parseDimensions({
      items: [{ label: "Ceiling height", mm: 2800 }, { label: "Wall", mm: "tall" }],
      bandPct: 9,
    });
    expect(d?.items).toHaveLength(1);
  });

  it("bands an unstated error rather than implying none", () => {
    expect(parseDimensions({ items: [{ label: "Wall", mm: 4100 }] })?.bandPct).toBe(20);
  });

  it("reads back in metres, because millimetres here are false precision", () => {
    expect(describeDimensions(MEASURED)).toBe("ceiling height 2.80 m · wall width 4.10 m");
  });
});

describe("the measured room in the generation prompt", () => {
  const withSizes = buildGenerationPrompt({
    styleBrief: "warm minimal",
    roomType: "living_room",
    dimensions: MEASURED,
  });
  const without = buildGenerationPrompt({ styleBrief: "warm minimal", roomType: "living_room" });

  it("states the sizes and where they came from", () => {
    expect(withSizes).toContain("ceiling height 2.80 m · wall width 4.10 m");
    expect(withSizes).toContain("±12%");
    expect(withSizes).toContain("television");
  });

  it("spends them on the furniture, not on the shell", () => {
    const block = withSizes.slice(withSizes.indexOf("MEASURED IN THE REAL ROOM"));
    expect(block).toMatch(/size and space every piece/i);
    expect(block).toMatch(/never a reason to move a wall/i);
  });

  it("changes nothing at all when the room was not measured", () => {
    expect(without).not.toContain("MEASURED IN THE REAL ROOM");
    expect(without.length).toBeLessThan(withSizes.length);
  });
});
