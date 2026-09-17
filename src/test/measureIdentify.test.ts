/**
 * The naming half: matching what the model called something to a size we know,
 * and refusing to invent one when we don't.
 */
import { describe, expect, it } from "vitest";
import { parseFound } from "../../services/measure/identify.js";
import { askHint, matchKnown, KNOWN_OBJECTS } from "../../services/measure/objects.js";

const json = (items: unknown) => JSON.stringify({ items });

describe("matching a name to a standard", () => {
  it("knows a suspended ceiling however it is described", () => {
    for (const s of ["ceiling tile", "suspended ceiling", "drop ceiling grid", "Ceiling Tiles"]) {
      expect(matchKnown(s)?.id).toBe("ceiling-tile-600");
    }
  });

  it("prefers the longest matching alias, so a front door is not just a door", () => {
    expect(matchKnown("front door")?.id).toBe("door-ext-us");
    expect(matchKnown("interior door")?.id).toBe("door-eu");
  });

  it("knows a regulation table tennis table", () => {
    const t = matchKnown("ping-pong table");
    expect(t?.widthMm).toBe(2740);
    expect(t?.heightMm).toBe(1525);
    // Its playing surface is 76 cm off the floor — it cannot measure the floor.
    expect(t?.plane).toBe("raised");
  });

  it("treats a table top as a raised surface, not the floor, and offers it last", () => {
    const items = parseFound(
      json([
        { name: "table top", plane: "floor", wholeInFrame: true },
        { name: "rug", plane: "floor", wholeInFrame: true },
      ]),
    );
    expect(items.find((i) => i.name === "table top")?.plane).toBe("raised");
    expect(items.find((i) => i.name === "rug")?.plane).toBe("floor");
    expect(items[0].name).toBe("rug");
  });

  it("does not read an appliance door as a room door", () => {
    // English compounds are head-final, so all of these contain "door". Calling
    // an oven door a 2 m room door is a 2.5x error that looks entirely plausible.
    expect(matchKnown("oven door")?.id).toBe("oven-front");
    expect(matchKnown("microwave door")?.id).toBe("microwave-front");
    // The compound names both appliances; the microwave is the object.
    expect(matchKnown("microwave oven door")?.id).toBe("microwave-front");
    // And a drawer front is not a door front — its height varies with the bank.
    expect(matchKnown("kitchen drawer front")).toBeNull();
    expect(matchKnown("cabinet door")?.id).toBe("kitchen-base-door");
    expect(matchKnown("fridge door")).toBeNull();
    expect(matchKnown("shower door")).toBeNull();
    // A real door still resolves.
    expect(matchKnown("interior door")?.id).toBe("door-eu");
  });

  it("returns null rather than guessing at things that vary", () => {
    for (const s of ["television", "sofa", "bean bag", "arcade machine", "rug"]) {
      expect(matchKnown(s)).toBeNull();
    }
  });

  it("offers a measuring hint for the common variable objects", () => {
    expect(askHint("television")).toMatch(/frame/i);
    expect(askHint("large window")).toMatch(/opening/i);
    // A foosball table has a top worth measuring, so the "table" hint applies.
    expect(askHint("foosball table")).toMatch(/top/i);
    // Something with no flat face and no standard gets nothing at all.
    expect(askHint("arcade machine")).toBeNull();
  });

  it("every standard carries both dimensions and an explanation", () => {
    for (const o of KNOWN_OBJECTS) {
      expect(o.widthMm).toBeGreaterThan(0);
      expect(o.heightMm).toBeGreaterThan(0);
      expect(o.note.length).toBeGreaterThan(10);
      expect(o.aliases.length).toBeGreaterThan(0);
    }
  });
});

describe("reading what the model returned", () => {
  it("fills in the size for anything it recognises", () => {
    const items = parseFound(
      json([{ name: "ceiling tile", plane: "ceiling", wholeInFrame: true }]),
    );
    expect(items[0].widthMm).toBe(600);
    expect(items[0].knownId).toBe("ceiling-tile-600");
  });

  it("leaves the size empty for anything it does not, and says how to measure it", () => {
    const items = parseFound(json([{ name: "television", plane: "wall", wholeInFrame: true }]));
    expect(items[0].widthMm).toBeUndefined();
    expect(items[0].note).toMatch(/frame/i);
  });

  it("never marks a REPEATING element cut off — trace a different tile", () => {
    // The floor is covered in tiles. If the one the model looked at is clipped,
    // the person traces another; refusing the whole category is obstruction.
    const items = parseFound(
      json([{ name: "floor tile", plane: "floor", wholeInFrame: false }]),
    );
    expect(items[0].wholeInFrame).toBe(true);
    expect(items[0].trace).toMatch(/one whole tile/i);
  });

  it("still marks a one-off object cut off when it is", () => {
    const items = parseFound(
      json([{ name: "interior door", plane: "wall", wholeInFrame: false }]),
    );
    expect(items[0].wholeInFrame).toBe(false);
  });

  it("says what to put the pins on", () => {
    const door = parseFound(json([{ name: "interior door", plane: "wall", wholeInFrame: true }]));
    expect(door[0].trace).toMatch(/leaf/i);
  });

  it("treats a missing wholeInFrame as NOT whole — the safe reading", () => {
    const items = parseFound(json([{ name: "window", plane: "wall" }]));
    expect(items[0].wholeInFrame).toBe(false);
  });

  it("puts things we can size ourselves first, then things fully in frame", () => {
    const items = parseFound(
      json([
        { name: "television", plane: "wall", wholeInFrame: false },
        { name: "sofa", plane: "floor", wholeInFrame: true },
        { name: "interior door", plane: "wall", wholeInFrame: true },
      ]),
    );
    expect(items[0].name).toBe("interior door");
    expect(items[1].name).toBe("sofa");
  });

  it("trusts the standard's own plane over the model's guess", () => {
    const items = parseFound(
      json([{ name: "ceiling tile", plane: "wall", wholeInFrame: true }]),
    );
    expect(items[0].plane).toBe("ceiling");
  });

  it("drops duplicates and unnamed entries", () => {
    const items = parseFound(
      json([
        { name: "window", plane: "wall", wholeInFrame: true },
        { name: "Window", plane: "wall", wholeInFrame: true },
        { name: "", plane: "wall", wholeInFrame: true },
        null,
      ]),
    );
    expect(items).toHaveLength(1);
  });

  it("survives a fenced or malformed reply instead of throwing", () => {
    expect(parseFound('```json\n{"items":[{"name":"door","plane":"wall","wholeInFrame":true}]}\n```'))
      .toHaveLength(1);
    expect(parseFound("not json at all")).toHaveLength(0);
    expect(parseFound('{"items":"nope"}')).toHaveLength(0);
  });
});
