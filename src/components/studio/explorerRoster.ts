// ─── AI-021 EXPLORER roster ──────────────────────────────────────────────
// Single source of truth for the AI Studio explorer: the left rail cards AND
// the right-panel routing. Mirrors the confirmed mockup
// `_Mockups/Website/WEBSITE-PLAN-AI021-ai-studio-EXPLORER.html`.
//
// Naming (owner-locked 2026-07-25): verb "[Verb] My [thing]" names for ALL 16
// cards — including the 4 live tools — even though the header/home/Library keep
// the functional names ("AI Vision", etc.). Do NOT rename those other surfaces.
//
// The 4 LIVE tools carry a `liveTool` value = the monolith's `activeTool`
// ('quiz'|'vision'|'shopping'|'audit'). Selecting a live card drives the
// existing experience unchanged (chrome-swap only — locked decision #1). The
// other 12 render generic ComingSoon / Locked panels.

import type { StudioTool } from './StudioTabs';

/** Tier a tool belongs to — gates access when a paid tool is selected logged-out/under-tier. */
export type ToolLevel = 'free' | 'design' | 'studio';

/** Lifecycle: live = shipped experience; soon = planned; later = roadmap (video-gen etc.). */
export type ToolStatus = 'live' | 'soon' | 'later';

export interface ExplorerTool {
  /** Stable URL slug — also the rail card key and the /ai-concepts/:tool route (step 5). */
  id: string;
  /** Phase index into PHASES (0=Discover … 5=Anytime). */
  phase: number;
  /** Verb display name shown on the card + panel title. */
  name: string;
  /** One-line "what it does" under the name. */
  tagline: string;
  /** Give/Get two-row table on the card. */
  give: string;
  get: string;
  /** Display tier string on the card footer + panel (e.g. "Free · 3 / mo", "Design"). */
  tier: string;
  /** Access level for gating the panel. */
  lvl: ToolLevel;
  /** Lifecycle status. */
  status: ToolStatus;
  /** Featured accent (Redesign My Room). */
  featured?: boolean;
  /** Copy-only chaining hint ("Best after: X · Next: Y"). Plain text; bold at render. */
  chain: string;
  /** Placeholder gradient thumbnail until real imagery lands (content task). */
  vis: string;
  /**
   * For LIVE tools only — the monolith `activeTool` this card drives. Absent for
   * coming-soon tools (they render a generic panel, not a real experience).
   */
  liveTool?: StudioTool;
  /**
   * Real thumbnail for LIVE cards (Cloudinary). Coming-soon cards fall back to the
   * gradient placeholder `vis`. Deliberately-chosen representative images.
   */
  photo?: string;
}

/** Cloudinary thumbnail (square-cropped) for live-card photos. */
const CLD = (id: string): string =>
  `https://res.cloudinary.com/dys2k5muv/image/upload/w_180,h_180,c_fill,g_auto,f_auto,q_auto/${id}`;

export interface ExplorerPhase {
  /** Display number ("01".."05", "·" for Anytime). */
  num: string;
  name: string;
}

export const PHASES: ExplorerPhase[] = [
  { num: '01', name: 'Discover' },
  { num: '02', name: 'Plan' },
  { num: '03', name: 'Visualize' },
  { num: '04', name: 'Specify' },
  { num: '05', name: 'Realize' },
  { num: '·', name: 'Anytime' },
];

/** Monthly price per paid tier — used in Locked/Subscribe + coming-soon copy. */
export const PRICE: Record<Exclude<ToolLevel, 'free'>, string> = {
  design: '$19/mo',
  studio: '$49/mo',
};

/** Human plan name per tier. */
export const PLAN_NAME: Record<Exclude<ToolLevel, 'free'>, string> = {
  design: 'Design',
  studio: 'Studio',
};

/** Access-rank for gating: user tier must be >= tool tier. */
export const RANK: Record<ToolLevel, number> = { free: 0, design: 1, studio: 2 };

// Placeholder gradient thumbs (mockup VIS palette). Swap for real imagery later.
const V = {
  v1: 'linear-gradient(135deg,#4a5a6a,#1c2530)',
  v2: 'linear-gradient(135deg,#7a6a8a,#2c2535)',
  v3: 'linear-gradient(135deg,#6a7a6a,#1f2a1f)',
  v4: 'linear-gradient(135deg,#8a7a5a,#2c2515)',
  v5: 'linear-gradient(135deg,#c5a880,#6b5d4a)',
  v6: 'linear-gradient(135deg,#5a6a7a,#1f2730)',
  v7: 'linear-gradient(135deg,#8b6f4e,#3a2d1e)',
  v8: 'linear-gradient(135deg,#6a8e7e,#243029)',
  v9: 'linear-gradient(135deg,#5a7080,#2a3540)',
  v10: 'linear-gradient(135deg,#b85f3a,#4a2316)',
  v11: 'linear-gradient(135deg,#4a5a4a,#1f2a1f)',
  v12: 'linear-gradient(135deg,#6a4a3a,#2a1f17)',
  v13: 'linear-gradient(135deg,#3a4a5a,#161f2a)',
  v14: 'linear-gradient(135deg,#7a5a6a,#2a1f25)',
  v15: 'linear-gradient(135deg,#5a5a4a,#22221a)',
} as const;

export const EXPLORER_TOOLS: ExplorerTool[] = [
  // ── Phase 1 · Discover ──────────────────────────────────────────────────
  {
    id: 'find-style', phase: 0, name: 'Find My Style', vis: V.v1,
    photo: CLD('v1773055155/1_fbuajl.jpg'), // portfolio: Memphis House

    tier: 'Free · Unlimited', lvl: 'free', status: 'live', liveTool: 'quiz',
    tagline: 'A short visual quiz that returns your interior style DNA — the starting point for the rest of the studio.',
    give: 'Pick the rooms you love — 8 quick taps.',
    get: 'Your named style profile + palette leaning.',
    chain: 'Next: Redesign My Room',
  },
  {
    id: 'score-room', phase: 0, name: 'Score My Room', vis: V.v8,
    photo: CLD('v1772532381/1_h9ofqr.jpg'), // portfolio: Two Story Living Room

    tier: 'Design', lvl: 'design', status: 'live', liveTool: 'audit',
    tagline: 'An honest design critique of the room you have right now — a great first read on your space.',
    give: 'A photo of your room.',
    get: 'A professional critique — what works, what to fix, where the wins are.',
    chain: 'Next: Redesign My Room',
  },
  {
    id: 'localize', phase: 0, name: 'Localize My Style', vis: V.v2,
    tier: 'Studio', lvl: 'studio', status: 'soon',
    tagline: 'Your style read against local context — materials, climate, palette and traditions of your region.',
    give: 'Your heritage / region + the room.',
    get: 'Directions that honor local materials, motifs & color meaning.',
    chain: 'Best after: Find My Style',
  },

  // ── Phase 2 · Plan ──────────────────────────────────────────────────────
  {
    id: 'plan-room', phase: 1, name: 'Plan My Room', vis: V.v3,
    tier: 'Design', lvl: 'design', status: 'soon',
    tagline: 'A furniture layout that actually fits — drawn to scale with clear circulation.',
    give: 'Room dimensions (or a sketch) + what the room must do.',
    get: 'A to-scale furniture layout with circulation mapped.',
    chain: 'Next: Light My Room',
  },
  {
    id: 'plan-home', phase: 1, name: 'Plan My Home', vis: V.v4,
    tier: 'Studio', lvl: 'studio', status: 'soon',
    tagline: 'Zone a whole apartment — structural-aware suggestions across every room.',
    give: 'Whole-apartment dimensions or your plan + needs.',
    get: 'A full-floor layout with zoning & wall suggestions.',
    chain: 'Next: Wire My Room',
  },
  {
    id: 'light-room', phase: 1, name: 'Light My Room', vis: V.v5,
    tier: 'Design', lvl: 'design', status: 'soon',
    tagline: 'A layered lighting scheme — the warmth and atmosphere, not the wiring.',
    give: 'A room photo or floorplan + the mood you want.',
    get: 'Fixtures, placement & ambient/task/accent layers.',
    chain: 'Best after: Plan My Room',
  },
  {
    id: 'wire-room', phase: 1, name: 'Wire My Room', vis: V.v6,
    tier: 'Studio', lvl: 'studio', status: 'soon',
    tagline: 'The electrical side — outlets, switches and circuits a contractor can build from.',
    give: 'Your floorplan + appliance & outlet needs.',
    get: 'A contractor-ready electrical plan with load notes.',
    chain: 'Best after: Light My Room',
  },

  // ── Phase 3 · Visualize ─────────────────────────────────────────────────
  {
    id: 'redesign', phase: 2, name: 'Redesign My Room', vis: V.v7,
    photo: CLD('v1773054125/1_ecqvsk.jpg'), // portfolio: Glass House

    tier: 'Free · 3 / mo', lvl: 'free', status: 'live', liveTool: 'vision', featured: true,
    tagline: 'Upload a photo, pick a style — see your actual room reimagined, walls and windows kept intact.',
    give: 'A photo of your room + a style + room type.',
    get: 'A photorealistic redesign — structure preserved.',
    chain: 'Best after: Find My Style · Next: Shop My Room',
  },
  {
    id: 'palette', phase: 2, name: 'Pick My Palette', vis: V.v8,
    tier: 'Free / Design', lvl: 'free', status: 'soon',
    tagline: 'A coordinated color scheme pulled from your space or an image you love.',
    give: 'A room photo or an inspiration image.',
    get: 'A coordinated palette — walls, trim, accents — with codes.',
    chain: 'Best after: Find My Style',
  },
  {
    id: 'moodboard', phase: 2, name: 'Build My Moodboard', vis: V.v9,
    tier: 'Design', lvl: 'design', status: 'soon',
    tagline: 'A curated board of real materials — floors, counters, fabrics, textures.',
    give: 'Your style + room + palette.',
    get: 'A board of real materials & finishes for the space.',
    chain: 'Best after: Pick My Palette',
  },

  // ── Phase 4 · Specify ───────────────────────────────────────────────────
  {
    id: 'shop', phase: 3, name: 'Shop My Room', vis: V.v10,
    photo: CLD('v1773056804/1_obyrnh.jpg'), // portfolio: Boutique Hotel Lobby

    tier: 'Free · 3 / mo', lvl: 'free', status: 'live', liveTool: 'shopping',
    tagline: 'Turn a look into a real, buyable list — matched products with links and prices.',
    give: 'A room photo (or your concept) + your country.',
    get: 'Real buyable products — links, prices, PDF.',
    chain: 'Best after: Redesign My Room · Next: Cost My Project',
  },
  {
    id: 'cost', phase: 3, name: 'Cost My Project', vis: V.v11,
    tier: 'Free', lvl: 'free', status: 'soon',
    tagline: 'A realistic ballpark before you commit — broken down where the money goes.',
    give: 'Room size + scope + your city.',
    get: 'A ballpark budget range broken down by category.',
    chain: 'Best after: Shop My Room',
  },

  // ── Phase 5 · Realize ───────────────────────────────────────────────────
  {
    id: 'phase-reno', phase: 4, name: 'Phase My Reno', vis: V.v12,
    tier: 'Studio', lvl: 'studio', status: 'soon',
    tagline: 'Do things in the right order — so you don’t tile before you wire.',
    give: 'Your scope — what you’re changing.',
    get: 'The correct order of works + a realistic timeline.',
    chain: 'Next: Guide My Install',
  },
  {
    id: 'guide-install', phase: 4, name: 'Guide My Install', vis: V.v13,
    tier: 'Studio', lvl: 'studio', status: 'soon',
    tagline: 'Plain-language install guides for the things you’re putting in yourself.',
    give: 'The items you’re installing (or pull from your list).',
    get: 'Step-by-step booklets — curtains, planks, bulbs…',
    chain: 'Best after: Shop My Room',
  },
  {
    id: 'walk-room', phase: 4, name: 'Walk My Room', vis: V.v14,
    tier: 'Studio', lvl: 'studio', status: 'later',
    tagline: 'Move through the finished space before a single thing is built.',
    give: 'Your concept or floorplan.',
    get: 'A video walkthrough of the finished space.',
    chain: 'On the roadmap',
  },

  // ── Anytime ─────────────────────────────────────────────────────────────
  {
    id: 'write-brief', phase: 5, name: 'Write My Brief', vis: V.v15,
    tier: 'Design', lvl: 'design', status: 'soon',
    tagline: 'Everything you’ve made, packaged into one brief to hand off.',
    give: 'Nothing new — it gathers everything you’ve made.',
    get: 'One shareable brief for a contractor or our studio.',
    chain: 'Pulls from every tool',
  },
];

/** The default tool the panel opens on (owner-locked: Redesign My Room / AI Vision). */
export const DEFAULT_TOOL_ID = 'redesign';

/** Lookup by slug. */
export const toolById = (id: string): ExplorerTool | undefined =>
  EXPLORER_TOOLS.find((t) => t.id === id);

/** Map an old deep-link hash (quiz/vision/shopping/audit) to the new explorer slug. */
export const LIVE_HASH_TO_ID: Record<StudioTool, string> = {
  quiz: 'find-style',
  vision: 'redesign',
  shopping: 'shop',
  audit: 'score-room',
};
