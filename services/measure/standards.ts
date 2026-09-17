/**
 * The ruler catalogue — objects whose real size is fixed by manufacture or by
 * building convention, and which therefore turn a photograph into a measurement.
 *
 * Every entry carries a BAND, not just a nominal, and the band is the point: a
 * door leaf is 2000-2040 mm (±1%) and a bare "floor tile" could be 300 or 600
 * (±33%). The resolver propagates that band into the reported uncertainty, so a
 * wide ruler produces a wide answer instead of a confident-looking wrong one.
 *
 * TODO (owner-editable): this belongs in a workbook tab, generated the way
 * `scripts/build-furniture-catalog.py` generates the furniture catalogue, so a
 * correction is a spreadsheet row rather than a code change.
 */

export type Region = "eu" | "us" | "any";

/**
 * How the ruler is used geometrically.
 *  - `vertical`: stands on the floor, measured floor-to-top (Criminisi rung).
 *  - `planar`:   a rectangle lying in the floor or ceiling plane (homography rung).
 *  - `span`:     a horizontal run lying on the floor, of known length.
 */
export type RulerKind = "vertical" | "planar" | "span";

export interface Standard {
  id: string;
  label: string;
  kind: RulerKind;
  /** Best single value, in millimetres. For `planar`, the long side. */
  nominalMm: number;
  /** Plausible range in the wild. The resolver turns this into error bars. */
  loMm: number;
  hiMm: number;
  /** For `planar`, the short side and its band. */
  nominalMm2?: number;
  loMm2?: number;
  hiMm2?: number;
  region: Region;
  /** Why this is trustworthy, or where it bites. Shown in the register. */
  note: string;
}

export const STANDARDS: readonly Standard[] = [
  // ── Planar grids: the strongest rulers, because they span the whole room ──
  {
    id: "ceiling_tile_600",
    label: "Suspended ceiling tile 600×600",
    kind: "planar",
    nominalMm: 600, loMm: 595, hiMm: 605,
    nominalMm2: 600, loMm2: 595, hiMm2: 605,
    region: "eu",
    note: "Metric grid. Fixed by the manufactured tee-bar, not by trade practice.",
  },
  {
    id: "ceiling_tile_2x2",
    label: "Suspended ceiling tile 2'×2'",
    kind: "planar",
    nominalMm: 610, loMm: 605, hiMm: 613,
    nominalMm2: 610, loMm2: 605, hiMm2: 613,
    region: "us",
    note: "Imperial grid, 24 in. Only 10 mm from the metric tile, so mistaking the two costs 1.6%.",
  },
  {
    id: "ceiling_tile_2x4",
    label: "Suspended ceiling tile 2'×4'",
    kind: "planar",
    nominalMm: 1219, loMm: 1210, hiMm: 1225,
    nominalMm2: 610, loMm2: 605, hiMm2: 613,
    region: "us",
    note: "The common troffer-bay tile. Long axis runs with the lights.",
  },
  {
    id: "carpet_tile_500",
    label: "Carpet tile 500×500",
    kind: "planar",
    nominalMm: 500, loMm: 495, hiMm: 505,
    nominalMm2: 500, loMm2: 495, hiMm2: 505,
    region: "any",
    note: "Carpet is not always ruler-less — tiled carpet carries a grid.",
  },
  {
    id: "floor_tile_600",
    label: "Floor tile 600×600",
    kind: "planar",
    nominalMm: 600, loMm: 595, hiMm: 605,
    nominalMm2: 600, loMm2: 595, hiMm2: 605,
    region: "eu",
    note: "The default large-format tile in Armenian work.",
  },
  {
    id: "floor_tile_300",
    label: "Floor tile 300×300",
    kind: "planar",
    nominalMm: 300, loMm: 297, hiMm: 303,
    nominalMm2: 300, loMm2: 297, hiMm2: 303,
    region: "eu",
    note: "Older stock and wet rooms.",
  },
  {
    id: "floor_tile_450",
    label: "Floor tile 450×450",
    kind: "planar",
    nominalMm: 450, loMm: 445, hiMm: 455,
    nominalMm2: 450, loMm2: 445, hiMm2: 455,
    region: "eu",
    note: "",
  },
  {
    id: "floor_tile_unknown",
    label: "Floor tile, module not identified",
    kind: "planar",
    nominalMm: 450, loMm: 300, hiMm: 600,
    nominalMm2: 450, loMm2: 300, hiMm2: 600,
    region: "any",
    note: "A tile grid whose module was not read. The ±33% band is the honest cost of not knowing.",
  },
  {
    id: "parquet_block_herringbone",
    label: "Herringbone parquet block",
    kind: "planar",
    nominalMm: 350, loMm: 280, hiMm: 420,
    nominalMm2: 70, loMm2: 60, hiMm2: 90,
    region: "eu",
    note: "Blocks are cut 5:1. Useful mainly as a cross-check on a stronger ruler.",
  },
  {
    id: "plasterboard_sheet",
    label: "Plasterboard sheet 1200×2500",
    kind: "planar",
    nominalMm: 2500, loMm: 2400, hiMm: 2600,
    nominalMm2: 1200, loMm2: 1200, hiMm2: 1220,
    region: "eu",
    note: "On a shell site the stacked boards are often the only manufactured object in frame.",
  },

  // ── Verticals: stand on the floor, so they carry ceiling height too ──
  {
    id: "door_leaf_eu",
    label: "Interior door leaf (EU)",
    kind: "vertical",
    nominalMm: 2000, loMm: 1970, hiMm: 2050,
    region: "eu",
    note: "2000 is standard; 2040 appears in newer stock. ±2%.",
  },
  {
    id: "door_leaf_us",
    label: "Interior door leaf (US 6'8\")",
    kind: "vertical",
    nominalMm: 2032, loMm: 2020, hiMm: 2045,
    region: "us",
    note: "6'8\" is near-universal in US residential. The single best ruler in an empty room.",
  },
  {
    id: "door_opening",
    label: "Structural door opening",
    kind: "vertical",
    nominalMm: 2100, loMm: 2050, hiMm: 2150,
    region: "any",
    note: "Leaf plus frame and clearance. Wider band than the leaf itself.",
  },
  {
    id: "worktop_height",
    label: "Kitchen worktop height",
    kind: "vertical",
    nominalMm: 900, loMm: 890, hiMm: 920,
    region: "any",
    note: "900 metric / 914 (36 in) US. A fitted kitchen is a dimensioned catalogue bolted to a wall.",
  },
  {
    id: "upper_cabinet_underside",
    label: "Wall-cabinet underside above floor",
    kind: "vertical",
    nominalMm: 1500, loMm: 1440, hiMm: 1560,
    region: "any",
    note: "Worktop plus a 500-600 splashback. Design choice, so a soft ruler.",
  },
  {
    id: "radiator_panel_500",
    label: "Panel radiator, 500 high",
    kind: "vertical",
    nominalMm: 500, loMm: 490, hiMm: 510,
    region: "eu",
    note: "Panel radiators come in fixed heights; 500 dominates Armenian residential.",
  },
  {
    id: "radiator_panel_600",
    label: "Panel radiator, 600 high",
    kind: "vertical",
    nominalMm: 600, loMm: 590, hiMm: 610,
    region: "eu",
    note: "",
  },
  {
    id: "wc_pan_height",
    label: "WC pan rim height",
    kind: "vertical",
    nominalMm: 410, loMm: 390, hiMm: 430,
    region: "any",
    note: "Wall-hung pans are set to this by regulation-ish convention.",
  },
  {
    id: "basin_height",
    label: "Basin / vanity top",
    kind: "vertical",
    nominalMm: 850, loMm: 800, hiMm: 900,
    region: "any",
    note: "",
  },
  {
    id: "socket_height",
    label: "Socket centre above floor",
    kind: "vertical",
    nominalMm: 300, loMm: 250, hiMm: 400,
    region: "any",
    note: "Wide band and a small object — a last resort, and never a primary.",
  },
  {
    id: "switch_height",
    label: "Light switch centre above floor",
    kind: "vertical",
    nominalMm: 1050, loMm: 900, hiMm: 1250,
    region: "any",
    note: "Convention only. Weak.",
  },
  {
    id: "skirting_height",
    label: "Skirting / baseboard",
    kind: "vertical",
    nominalMm: 100, loMm: 70, hiMm: 150,
    region: "any",
    note: "Too small to measure a room with, but a good sanity check on scale.",
  },
  {
    id: "step_riser",
    label: "Stair riser",
    kind: "vertical",
    nominalMm: 175, loMm: 150, hiMm: 200,
    region: "any",
    note: "",
  },

  // ── Spans: horizontal runs on the floor ──
  {
    id: "bath_1700",
    label: "Bath, 1700 long",
    kind: "span",
    nominalMm: 1700, loMm: 1690, hiMm: 1710,
    region: "eu",
    note: "1700 is the European default; a bath fixes a whole bathroom wall.",
  },
  {
    id: "bath_us_60",
    label: "Bath, 60 in",
    kind: "span",
    nominalMm: 1524, loMm: 1515, hiMm: 1535,
    region: "us",
    note: "The US alcove tub. Fits the stud bay, so it is genuinely fixed.",
  },
  {
    id: "door_width_eu",
    label: "Interior door width (EU)",
    kind: "span",
    nominalMm: 800, loMm: 700, hiMm: 900,
    region: "eu",
    note: "700/800/900 all common — read the leaf height instead where possible.",
  },
  {
    id: "door_width_us",
    label: "Interior door width (US 30 in)",
    kind: "span",
    nominalMm: 762, loMm: 700, hiMm: 815,
    region: "us",
    note: "24-32 in in practice.",
  },
  {
    id: "kitchen_base_depth",
    label: "Kitchen base unit depth",
    kind: "span",
    nominalMm: 600, loMm: 590, hiMm: 620,
    region: "any",
    note: "600 metric / 610 (24 in) US. Rigid.",
  },
  {
    id: "kitchen_module_600",
    label: "Kitchen cabinet module 600 wide",
    kind: "span",
    nominalMm: 600, loMm: 595, hiMm: 605,
    region: "eu",
    note: "Count the doors along a run and you have measured the wall.",
  },
  {
    id: "range_762",
    label: "Freestanding range, 30 in",
    kind: "span",
    nominalMm: 762, loMm: 755, hiMm: 770,
    region: "us",
    note: "30 in is the US default and dictates the cabinet gap around it.",
  },
  {
    id: "otr_microwave",
    label: "Over-the-range microwave, 30 in",
    kind: "span",
    nominalMm: 762, loMm: 755, hiMm: 770,
    region: "us",
    note: "Sized to the range beneath it.",
  },
  {
    id: "cmu_block",
    label: "Concrete block course",
    kind: "span",
    nominalMm: 406, loMm: 395, hiMm: 410,
    region: "any",
    note: "US 8×16 nominal = 406 with joint; the Armenian block is 390-400. Course counting is very robust.",
  },
  {
    id: "brick_course_3",
    label: "Three brick courses",
    kind: "vertical",
    nominalMm: 203, loMm: 195, hiMm: 230,
    region: "any",
    note: "US modular brick: 3 courses = 8 in exactly. EU is 75 mm per course, so 225.",
  },
];

const BY_ID = new Map(STANDARDS.map((s) => [s.id, s]));

export const standardById = (id: string): Standard | undefined => BY_ID.get(id);

/**
 * Half-width of the band as a FRACTION of the nominal — the relative uncertainty
 * this ruler contributes before any geometry error is added.
 */
export function relativeBand(s: Standard): number {
  return (s.hiMm - s.loMm) / 2 / s.nominalMm;
}

/** Rulers ordered by how tightly they are specified: the ladder's own order. */
export const RULERS_BY_TIGHTNESS: readonly Standard[] = [...STANDARDS].sort(
  (a, b) => relativeBand(a) - relativeBand(b),
);
