/**
 * AI Vision — post-generation structure verification, shared by every engine.
 *
 * Re-measures the OUTPUT image with the same analyser used on the source and
 * compares: invented plumbing (RD27), rebuilt ceiling (RD5 via RD22), invented
 * openings (RD25), widened room (AI-029 Phase 2b). Returns the correction note
 * to append to the prompt for ONE corrective retry, or null when the output
 * passes. Prompt text alone does not enforce these rules — a count does.
 *
 * Lifted out of imageGeneration.ts (2026-09-14) so the OpenAI engine gets the
 * identical checks the Gemini engine has had since RD25/RD27 landed.
 */

import {
  analyzeRoomStructure,
  spatialMetrics,
  countOpenings,
  inventedPlumbing,
  inventedCeiling,
  type RoomStructure,
} from "./spatialAnalysis.js";

/** Absolute drop in window-width fraction that counts as "the room was widened". */
export const PROPORTION_TOLERANCE = 0.12;

export type StructureViolation = "plumbing" | "ceiling" | "openings" | "proportion";

export interface StructureVerdict {
  violation: StructureViolation;
  /** Human-readable summary for logs. */
  detail: string;
  /** Text to append to the prompt on the corrective retry. */
  note: string;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * Pure comparison of a measured output against the measured source. Exported
 * separately from the analysis call so it can be unit-tested without Gemini.
 */
export function compareStructures(
  source: RoomStructure,
  output: RoomStructure | null
): StructureVerdict | null {
  if (output === null) return null; // unmeasurable output — do not block on noise

  // RD27 — a plumbed fixture TYPE the photograph does not have. Checked first:
  // a toilet on a wall with no soil pipe is a bigger failure than a few points
  // of proportion drift. The note names ONLY the invented fixture and leaves
  // the rest of the design alone — the earlier wording ("render ONLY the
  // fixtures in the photo… bare wall is the correct answer") made the retry
  // flatten the whole redesign, which is what the owner saw on 2026-09-14.
  const added = inventedPlumbing(source, output);
  if (added.length > 0) {
    const names = added.map((a) => a.fixture.replace("_", " "));
    const what = names.join(" and ");
    const article = (n: string) => (/^[aeiou]/.test(n) ? `an ${n}` : `a ${n}`);
    return {
      violation: "plumbing",
      detail: added.map((a) => `${a.fixture.replace("_", " ")} (0 in the real room, ${a.to} in the output)`).join(", "),
      note: `\n\nPLUMBING CORRECTION: the previous attempt added ${names.map(article).join(" and ")} that the real room does not have. ${what.charAt(0).toUpperCase() + what.slice(1)} needs a waste pipe, and this photograph shows no drainage where it was placed. Remove it and leave that wall as a finished wall. Keep everything else from the previous attempt — the tiling, finishes, fittings, colours and styling were correct — and keep the fixtures the photograph does show in their existing positions.`,
    };
  }

  // RD5 via RD22 — the ceiling.
  const ceilingAdded = inventedCeiling(source, output);
  if (ceilingAdded.length > 0) {
    const named = ceilingAdded.map((f) => f.replace(/_/g, " ")).join(", ");
    return {
      violation: "ceiling",
      detail: named,
      note: `\n\nCRITICAL CEILING CORRECTION: the previous attempt rebuilt the ceiling — it added ${named}, which the real room does not have. The ceiling in this room is ONE FLAT PLANE at a single height. Render it flat and unbroken: no perimeter cove, no shadow gap, no concealed LED strip, no dropped or tray section, no bulkhead, no coffer, and no downlights sunk into it. Light the room with the fitting that hangs from or sits on that flat surface, and with wall lights. A plain ceiling is the correct answer.`,
    };
  }

  // RD25 — opening count. The SOURCE keeps its full count (an edge door in the
  // photo is still a door the output may show); the OUTPUT counts only
  // openings clear of the picture edge (an edge opening is read inconsistently
  // by the analyser, so it cannot be evidence of invention). Excluding the edge
  // on BOTH sides — the 2026-09-15 version — misfired the other way: a home
  // office whose four doors all touched the frame read as "0 doors", the
  // rendering drew two of them a few percent further in, and the check called
  // that two invented doorways and paid for a retry.
  const expected = countOpenings(source);
  const got = countOpenings(output, { excludeFrameEdge: true });
  if (got.windows > expected.windows || got.doors > expected.doors) {
    const extraWindows = got.windows - expected.windows;
    const extraDoors = got.doors - expected.doors;
    const addedText = [
      extraWindows > 0 ? plural(extraWindows, "window") : "",
      extraDoors > 0 ? plural(extraDoors, "doorway") : "",
    ]
      .filter(Boolean)
      .join(" and ");
    return {
      violation: "openings",
      detail: `source ${expected.windows}w/${expected.doors}d -> output ${got.windows}w/${got.doors}d`,
      note: `\n\nCRITICAL STRUCTURAL CORRECTION: the previous attempt INVENTED ${addedText} that the original photograph does not contain. The real room has exactly ${plural(expected.windows, "window")} and ${plural(expected.doors, "doorway")}. Every other wall is solid, unbroken masonry from floor to ceiling. Do NOT cut, imply, paint or light an opening, arch, doorway, passage or window anywhere. If the room reads as a closed box or a dead end, that is correct — leave it closed.`,
    };
  }

  // AI-029 Phase 2b — proportion. Positive drift = the window is a smaller
  // share of the frame than in the source ⇒ the room was widened.
  const expectedMetrics = spatialMetrics(source);
  const outMetrics = spatialMetrics(output);
  if (expectedMetrics && outMetrics && outMetrics.anchor === expectedMetrics.anchor) {
    const drift = expectedMetrics.windowWidthFrac - outMetrics.windowWidthFrac;
    if (drift > PROPORTION_TOLERANCE) {
      const src = (expectedMetrics.windowWidthFrac * 100).toFixed(0);
      const out = (outMetrics.windowWidthFrac * 100).toFixed(0);
      return {
        violation: "proportion",
        detail: `window ${src}% -> ${out}% (drift ${(drift * 100).toFixed(0)}pt)`,
        note: `\n\nCRITICAL PROPORTION CORRECTION: the previous attempt widened the room — the main window filled only ${out}% of the image width, but in the real room it fills about ${src}%. Do NOT widen the room, add extra wall beside the window, zoom out, or pull the camera back. Frame it tighter so the window fills ~${src}% of the width, exactly as in the original photo.`,
      };
    }
  }

  return null;
}

/**
 * Measure a generated image and compare it with the source structure. One
 * analysis call per invocation (the same price as the source measurement).
 */
export async function verifyStructure(
  output: { data: string; mimeType: string },
  source: RoomStructure | null | undefined,
  tag = "ai-vision"
): Promise<StructureVerdict | null> {
  if (!source) return null;
  const measured = await analyzeRoomStructure(output);
  const verdict = compareStructures(source, measured);
  if (verdict) {
    console.warn(`[${tag}] structure violation (${verdict.violation}): ${verdict.detail}`);
  } else {
    const o = countOpenings(measured, { excludeFrameEdge: true });
    const e = countOpenings(source);
    console.log(`[${tag}] structure check passed: ${e.windows}w/${e.doors}d -> ${o.windows}w/${o.doors}d`);
  }
  return verdict;
}
