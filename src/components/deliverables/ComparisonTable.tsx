import React from 'react';

/**
 * S-014 — the "What AI ships. What a studio ships." comparison table.
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  ⚠ SYNC RULE — READ BEFORE EDITING
 *  Memory: C:\Users\User\.claude\projects\E--Business-Claude-Website\memory\
 *          feedback_deliverables_ai_vs_studio_sync.md
 *
 *  This table is the source of truth for the studio's differentiation story.
 *  EVERY time a new AI Studio card ships (any AI-XXX ticket that adds a real
 *  deliverable-producing tool), the impl session MUST, in the SAME PR:
 *    1. find the row this card now delivers,
 *    2. flip its `ai` flag false → true,
 *    3. or add a NEW row if the card delivers a category not listed here.
 *
 *  Do NOT reorder rows and do NOT flip a mark speculatively — the marks are
 *  the current, accurate diff. The whole section only becomes deletable if
 *  every row ends up identical in both columns (unlikely — studio-only rows
 *  such as site visits and contractor handoff will remain).
 * ══════════════════════════════════════════════════════════════════════════
 */
export interface ComparisonRow {
  label: string;
  /** Does the free AI Studio deliver this today? */
  ai: boolean;
  /** Does a paid studio project deliver this? */
  studio: boolean;
}

export const COMPARISON_ROWS: ComparisonRow[] = [
  { label: 'Style direction · moodboards', ai: true, studio: true },
  { label: 'Room concept previews (AI)', ai: true, studio: true },
  { label: 'Shopping list · furniture sourcing', ai: true, studio: true },
  { label: 'Written client brief · reviewed & signed', ai: false, studio: true },
  { label: 'Photoreal 3D renders · every room', ai: false, studio: true },
  { label: 'Dimensioned floor plans', ai: false, studio: true },
  { label: 'Electrical · plumbing · heating drawings', ai: false, studio: true },
  { label: 'Elevations · tiling · floor patterns', ai: false, studio: true },
  { label: 'Contractor-ready drawing set', ai: false, studio: true },
];

const Mark: React.FC<{ on: boolean; what: string }> = ({ on, what }) =>
  on ? (
    <span className="font-bold text-[#15803d]" aria-label={`Included: ${what}`}>
      ✓
    </span>
  ) : (
    <span className="text-[#6B6B6B]" aria-label={`Not included: ${what}`}>
      —
    </span>
  );

const ROW_GRID = 'grid grid-cols-[1.4fr_1fr_1fr] md:grid-cols-[2fr_1fr_1fr] items-center gap-2 md:gap-0';

const ComparisonTable: React.FC = () => (
  <div
    className="border border-[#DAD2C3] bg-white"
    data-testid="deliverables-comparison"
    role="table"
    aria-label="What the AI Studio ships versus what a studio project ships"
  >
    <div
      className={`${ROW_GRID} bg-[#FAFAFA] border-b border-[#DAD2C3] px-4 py-3.5 md:px-6 md:py-5 text-[11px] font-bold uppercase tracking-[0.24em] text-[#6B6B6B]`}
      role="row"
    >
      <div role="columnheader">Deliverable</div>
      <div className="text-center" role="columnheader">AI Studio (free)</div>
      <div className="text-center" role="columnheader">Studio project</div>
    </div>

    {COMPARISON_ROWS.map((row, i) => (
      <div
        key={row.label}
        data-testid="deliverables-comparison-row"
        role="row"
        className={`${ROW_GRID} px-4 py-3.5 md:px-6 md:py-5 ${
          i === COMPARISON_ROWS.length - 1 ? '' : 'border-b border-[#DAD2C3]'
        }`}
      >
        <div className="text-[13px] md:text-[14px] font-semibold text-[#0A0A0A]" role="cell">
          {row.label}
        </div>
        <div className="text-center text-[13px]" data-testid="cmp-ai" role="cell">
          <Mark on={row.ai} what={`${row.label} — AI Studio`} />
        </div>
        <div className="text-center text-[13px]" data-testid="cmp-studio" role="cell">
          <Mark on={row.studio} what={`${row.label} — studio project`} />
        </div>
      </div>
    ))}
  </div>
);

export default ComparisonTable;
