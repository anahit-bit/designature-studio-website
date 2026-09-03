// ─── AI-032 v2 — the studio router ───────────────────────────────────────
// Single source of truth for "where do I start?" on /ai-studio.
//
// v1 scored tools and took the top few. v2 adds the layer above it: eleven
// NAMED SCENARIOS, each owning a hand-authored, designer-reviewed route.
//
//   Q1 × Q2 × Q3  →  the scenario   (lookup; Q4 only disambiguates a tie)
//   Q4            →  where the route STOPS
//
// Still ZERO model calls — v1's central decision is untouched and should not
// be reopened. The one place a model is allowed is the CUSTOM escape hatch,
// and even there its output goes through `validateCustomRoute` below, which
// can only ever return card ids that exist in `explorerRoster.ts`.
//
// Spec: _Plan/Website/AI-032v2-Scenario-Pipelines.md

import { EXPLORER_TOOLS, toolById, type ExplorerTool } from '../components/studio/explorerRoster';

// ── The four questions ─────────────────────────────────────────────────────

export type QuestionId = 'relationship' | 'state' | 'scope' | 'outcome';

export type Relationship = 'live' | 'moving' | 'letting' | 'selling' | 'business' | 'none';
export type SpaceState = 'empty' | 'plans' | 'lived-in' | 'mid-reno' | 'decided';
export type Scope = 'one-room' | 'wet-room' | 'whole' | 'unsure';
export type Outcome = 'picture' | 'layout' | 'buylist' | 'builder' | 'cost';

export interface RouterAnswers {
  relationship: Relationship;
  state: SpaceState;
  scope: Scope;
  outcome: Outcome;
}

export interface RouterOption {
  id: string;
  /** Chip copy — first person, because the visitor is describing themselves. */
  label: string;
}

export interface RouterQuestion {
  id: QuestionId;
  prompt: string;
  options: RouterOption[];
}

export const QUESTIONS: RouterQuestion[] = [
  {
    id: 'relationship',
    prompt: 'What is this place to you?',
    options: [
      { id: 'live', label: 'I live here' },
      { id: 'moving', label: "I'm moving in" },
      { id: 'letting', label: 'I let it out' },
      { id: 'selling', label: "I'm selling it" },
      { id: 'business', label: "It's a business space" },
      { id: 'none', label: 'No space yet — just looking' },
    ],
  },
  {
    id: 'state',
    prompt: 'What state is it in?',
    options: [
      { id: 'empty', label: 'Empty — I just got it' },
      { id: 'plans', label: 'Not built yet — I have the plans' },
      { id: 'lived-in', label: "Lived-in, but it doesn't work" },
      { id: 'mid-reno', label: 'Mid-renovation — walls are still moving' },
      { id: 'decided', label: "Everything's decided, I just need to buy it" },
    ],
  },
  {
    id: 'scope',
    prompt: 'How much of it are we working on?',
    options: [
      { id: 'one-room', label: 'Just one room' },
      // Its own answer, not a kind of "one room": a wet room is the only
      // route that cannot complete without plumbing.
      { id: 'wet-room', label: 'The kitchen or a bathroom' },
      { id: 'whole', label: 'The whole place' },
      { id: 'unsure', label: 'Not sure yet' },
    ],
  },
  {
    id: 'outcome',
    prompt: 'What do you need to walk away with?',
    options: [
      { id: 'picture', label: 'A picture I can show someone' },
      { id: 'layout', label: 'A layout that actually fits' },
      { id: 'buylist', label: 'A list I can buy from' },
      { id: 'builder', label: 'Something a builder can work from' },
      { id: 'cost', label: 'Tell me what it will cost' },
    ],
  },
];

// ── Designer checks — properties of the JOIN, not of the card ──────────────
// A check rides the arrow between two cards, never becomes a step of its own,
// and never blocks. Rule-based rather than hand-authored per scenario: loud
// where a mistake PROPAGATES downstream or where the next step SPENDS money,
// quiet everywhere else.
//
// Availability is UNIVERSAL — every join offers one. The tiering lives in how
// hard the reason argues and in the styling, never in the words: the same
// invitation with two weights, because two different phrasings read as two
// unrelated features rather than one thing you can ask for anywhere.

export type CheckLevel = 'high' | 'offer';

export interface JoinCheck {
  level: CheckLevel;
  /** Addressed to the visitor — this string is rendered in the panel. */
  why: string;
}

export function checkFor(fromId: string, toId: string): JoinCheck | null {
  const from = toolById(fromId);
  const to = toolById(toId);
  if (!from || !to) return null;

  // Owner decision 2026-08-30: a check is available after EVERY stage. An earlier
  // draft returned null for Discover joins and Shop → Cost on the theory that
  // nothing propagates from them — but "is this really my style?" and "is this
  // budget sane?" are both fair things to ask a designer, and a gap in the line
  // reads as "you cannot get help here" rather than "you probably don't need it".
  // So availability is universal; only the PROMPTING is tiered.

  if (from.phase === 1 && toId === 'redesign') {
    return {
      level: 'high',
      why: 'Your render gets built on this layout. If the plan is off, you get a convincing picture of a room nobody can build.',
    };
  }
  if (fromId === 'redesign' && (toId === 'shop' || toId === 'finishes')) {
    return {
      level: 'high',
      why: 'Before you spend anything — is what you are looking at actually buildable?',
    };
  }
  if (fromId === 'finishes' && toId === 'shop') {
    return {
      level: 'high',
      why: 'Quantities are where money goes missing. A 15% tile error is an invoice you actually pay.',
    };
  }
  if (fromId === 'plumb-room' || fromId === 'wire-room') {
    return {
      level: 'high',
      why: 'Get this wrong and you find out on site, which is the expensive way to find out.',
    };
  }
  return { level: 'offer', why: 'A second pair of eyes before you carry on.' };
}

// ── Scenarios ──────────────────────────────────────────────────────────────

/** `'*'` = this axis does not participate in matching for this scenario. */
type Axis<T extends string> = readonly T[] | '*';

export interface Scenario {
  id: string;
  /** Rail label — first person, the way the visitor would say it. */
  name: string;
  /** Studio-facing one-liner. Never rendered to the visitor. */
  who: string;
  /** Opening line of the result panel. Second person. */
  you: string;
  /** Ordered card ids. Every one must exist in EXPLORER_TOOLS. */
  route: readonly string[];
  /** The step that answers "what's actually stopping you". Never truncated away. */
  blocker: string;
  match: {
    relationship: Axis<Relationship>;
    state: Axis<SpaceState>;
    scope: Axis<Scope>;
    /** Q4 is normally the terminator; it participates in matching only to
     *  split two scenarios that are otherwise identical (staging vs refresh). */
    outcome?: Axis<Outcome>;
  };
  /**
   * Some answers are DECISIVE regardless of how many axes a rival scenario
   * constrains — "it's a business space" and "the kitchen or a bathroom" change
   * the route fundamentally, and must not lose to a scenario that merely pins
   * down more of the other questions. Higher wins; default 0.
   */
  priority?: number;
  /**
   * How this scenario names ITSELF on the way in.
   *
   * The four questions derive the scenario; this lets someone skip straight to
   * it by recognising themselves — which is both faster and, for the audiences
   * whose vocabulary the questions never use ("Airbnb", "staging"), the only
   * way they would ever find their route. Recognition beats derivation.
   */
  entry: { label: string; sub: string };
  /**
   * Answers that land on this scenario. Picking the identity fills these in and
   * drops the visitor at whatever is left to ask. A test asserts each prefill
   * really does resolve back to its own scenario, so the shortcut can never send
   * someone somewhere else.
   */
  prefill: Partial<RouterAnswers>;
  /** Why this route is shaped this way. Studio-facing. */
  note: string;
  /** Some answers should not produce a self-serve path at all. */
  exit?: { heading: string; body: string };
}

// Order matters: it is the tie-break when two scenarios match equally
// specifically. Earlier wins.
export const SCENARIOS: readonly Scenario[] = [
  {
    id: 'decided',
    entry: { label: "I know what I want already", sub: "Just need to buy it and fit it" },
    prefill: { relationship: 'live', state: 'decided', scope: 'one-room' },
    priority: 2, // they do not want planning, whatever the room is
    name: 'I know what I want already',
    who: 'Decided · needs to buy and fit it',
    you: 'You already know what you want. Straight to buying it — and then fitting it properly.',
    route: ['shop', 'guide-install'],
    blocker: 'shop',
    match: { relationship: '*', state: ['decided'], scope: '*' },
    note: 'The shortest route on the board — it enters at Specify and skips four phases. Worth building for: it proves the router can send you PAST the studio rather than through it, which is the fastest way to earn trust in what it says next.',
  },
  {
    id: 'wet',
    entry: { label: "A kitchen or a bathroom", sub: "The room where the pipes decide the layout" },
    prefill: { relationship: 'live', state: 'lived-in', scope: 'wet-room' },
    priority: 1, // the pipes decide the layout — this beats a room-count answer
    name: 'Kitchen or bathroom',
    who: 'Wet room · any state',
    you: 'A kitchen or a bathroom is the one room where the pipes decide the layout. We settle that first, then make it beautiful.',
    route: ['plan-room', 'plumb-room', 'light-room', 'redesign', 'finishes', 'shop', 'guide-install'],
    blocker: 'plumb-room',
    match: { relationship: '*', state: '*', scope: ['wet-room'] },
    note: 'The route that cannot complete without Plumb My Room. Drainage falls and stack positions decide the layout before anything aesthetic does. Also the two highest-spend rooms in any home, so it is worth the most per completion.',
  },
  {
    id: 'business',
    entry: { label: "A cafe, clinic or office", sub: "A space customers walk into" },
    prefill: { relationship: 'business', state: 'lived-in', scope: 'whole' },
    priority: 3, // code, accessibility and licensing outrank everything else
    name: "It's a café, clinic or office",
    who: 'Commercial fit-out',
    you: "A space your customers walk into carries rules a home doesn't. Let's talk before you commit to anything.",
    route: ['plan-home', 'light-room', 'wire-room', 'redesign', 'finishes', 'phase-reno'],
    blocker: 'plan-home',
    match: { relationship: ['business'], state: '*', scope: '*' },
    note: 'Six steps, one built. Commercial work also carries code, accessibility and licensing constraints the tools are not tuned for — so even fully built, this route should hand off rather than complete.',
    exit: {
      heading: 'This one is a conversation.',
      body: 'Commercial fit-out is a studio project, not a self-serve path. The tools can support it afterwards, but leading with them over-promises — and a wrong commercial render costs far more reputationally than a wrong bedroom.',
    },
  },
  {
    id: 'reno',
    entry: { label: "I'm mid-renovation", sub: "The walls are still moving" },
    prefill: { relationship: 'live', state: 'mid-reno', scope: 'whole' },
    name: 'The walls are still moving',
    who: 'Mid-renovation · whole home',
    you: 'Your walls are still moving — so the order you do things in matters far more right now than how any of it looks.',
    route: ['plan-home', 'plumb-room', 'heat-room', 'light-room', 'wire-room', 'redesign', 'finishes', 'shop', 'phase-reno'],
    blocker: 'phase-reno',
    match: { relationship: ['live', 'moving'], state: ['mid-reno'], scope: '*' },
    note: 'Nine steps, two of them built. The whole services band plus the finishes schedule sits between "I can see it" and "I can buy it" — today this person falls into the gap.',
    exit: {
      heading: 'Talk to us first.',
      body: 'Nine steps with eight unbuilt is not a self-serve problem, and even fully built, order-of-works on a live site needs a human. This is the highest-value lead the studio can get. With designer checks on the critical joins, this route stops being a dead end and becomes a product.',
    },
  },
  {
    id: 'plan-in-hand',
    entry: { label: "I have the floorplan already", sub: "Off-plan, or straight from the architect" },
    prefill: { relationship: 'moving', state: 'plans', scope: 'whole' },
    name: 'I already have the floorplan',
    who: 'Off-plan buyer · architect handover',
    you: "You have drawings but no walls yet. We can work straight from the plan; you don't need a photo.",
    route: ['plan-home', 'redesign', 'finishes', 'shop', 'write-brief'],
    blocker: 'redesign',
    match: { relationship: ['live', 'moving'], state: ['plans'], scope: '*' },
    note: 'The buyer specifying an interior for a flat that does not physically exist yet. No photo to work from — which is exactly what AI-033 (Vision accepts a floorplan) is for. This route is that ticket\'s business case.',
  },
  {
    id: 'stage-sell',
    entry: { label: "I stage properties to sell", sub: "Virtual staging \u2014 pictures, not purchases" },
    prefill: { relationship: 'selling', state: 'lived-in', scope: 'whole', outcome: 'picture' },
    name: "I'm staging it to sell",
    who: 'Agent or digital stager · images only',
    you: "You need pictures that sell the place. You don't need to buy a single thing, so we won't send you shopping.",
    route: ['redesign', 'palette'],
    blocker: 'redesign',
    match: { relationship: ['selling'], state: '*', scope: '*', outcome: ['picture'] },
    note: 'Ends at step one on purpose. A digital stager is not going to buy the sofa — pushing them toward Shop wastes the step and reads as a funnel. The upsell here is render VOLUME.',
  },
  {
    id: 'refresh',
    entry: { label: "A refresh that must pay for itself", sub: "Between tenants, or before a listing" },
    prefill: { relationship: 'letting', state: 'lived-in', scope: 'one-room', outcome: 'cost' },
    name: 'A refresh that must pay for itself',
    who: 'Landlord between tenants · seller pre-listing',
    you: 'This has to pay for itself. So we start with the number and work backwards from it.',
    route: ['cost', 'redesign', 'shop'],
    blocker: 'cost',
    match: { relationship: ['letting', 'selling'], state: ['lived-in'], scope: '*', outcome: ['cost'] },
    note: 'The route that starts with the money. When the blocker is a budget ceiling, Cost My Project is promoted to step one and overrides phase order — everything downstream is filtered by the number it returns.',
  },
  {
    id: 'airbnb',
    entry: { label: "I host on Airbnb", sub: "Short-let \u2014 and I'll do it again next unit" },
    prefill: { relationship: 'letting', state: 'lived-in', scope: 'one-room' },
    name: 'I let it on Airbnb',
    who: 'Short-let host · repeats per unit',
    you: 'You need this unit to photograph well, survive guests, and not cost much — and then you need to do it again on the next one.',
    route: ['score-room', 'redesign', 'shop', 'cost'],
    blocker: 'redesign',
    match: { relationship: ['letting'], state: '*', scope: '*' },
    note: 'The only route that runs AGAIN — every new unit, every seasonal refresh. The clearest subscription case on the board; everything else is a one-off.',
  },
  {
    id: 'dreaming',
    entry: { label: "Just dreaming for now", sub: "No keys yet" },
    prefill: { relationship: 'none', state: 'lived-in', scope: 'unsure' },
    name: 'Just dreaming for now',
    who: 'No property yet · browsing',
    you: "No keys yet, and that's fine. Let's work out what you actually like, so you recognise it when you walk in.",
    route: ['find-style', 'redesign', 'palette'],
    blocker: 'find-style',
    match: { relationship: ['none'], state: '*', scope: '*' },
    note: 'Ends in a saved board and an email, not a sale — and that is the honest outcome. Two of three steps are live, so this visitor gets a complete experience today. Treat it as list-building.',
  },
  {
    id: 'keys',
    entry: { label: "I just got the keys", sub: "Empty place, moving in" },
    prefill: { relationship: 'moving', state: 'empty', scope: 'whole' },
    name: 'I just got the keys',
    who: 'Empty flat · moving in',
    you: "You've got the keys and an empty flat. Start with what you actually like, then get the layout right before you spend a thing on furniture.",
    route: ['find-style', 'plan-home', 'redesign', 'shop', 'cost'],
    blocker: 'plan-home',
    match: { relationship: ['live', 'moving'], state: ['empty'], scope: '*' },
    note: 'The classic first-home path, and the longest route that already half works — three of five steps are live, which is why this visitor converts and the renovator does not.',
  },
  {
    id: 'one-room',
    entry: { label: "One room doesn't work", sub: "The rest of the place is fine" },
    prefill: { relationship: 'live', state: 'lived-in', scope: 'one-room' },
    name: "This one room doesn't work",
    who: 'Lived-in · single room',
    you: "One room isn't working. Let's find out why, fix the layout, and let you see it — before you buy anything.",
    route: ['score-room', 'plan-room', 'redesign', 'shop'],
    blocker: 'redesign',
    match: { relationship: ['live', 'moving'], state: ['lived-in'], scope: '*' },
    note: 'The most common arrival, and the best-served. Note the order: Plan before Redesign — the render should visualise the layout the previous step produced, not invent its own.',
  },
];

/**
 * The identities, in the order they are offered.
 *
 * Deliberately NOT all eleven at once — offering eleven choices to solve the
 * problem of nineteen choices is no help. The first six cover the arrivals we
 * see most, and the rest sit behind "more", with the four questions underneath
 * for anyone who does not recognise themselves.
 */
export const ENTRY_ORDER: readonly string[] = [
  'keys', 'one-room', 'wet', 'airbnb', 'stage-sell', 'reno',
  'plan-in-hand', 'refresh', 'business', 'decided', 'dreaming',
];
/**
 * Five identities, not six — because the "none of these" tile is the sixth cell.
 * The grid is two columns, so every state has to be even or it leaves a dangling
 * tile: 5 + fallback = 6 collapsed, 11 + fallback = 12 expanded.
 */
export const ENTRIES_SHOWN_FIRST = 5;

/** The identities in display order. */
export function entryScenarios(): Scenario[] {
  return ENTRY_ORDER
    .map((id) => SCENARIOS.find((s) => s.id === id))
    .filter((s): s is Scenario => !!s);
}

// ── Matching ───────────────────────────────────────────────────────────────

function axisMatches<T extends string>(axis: Axis<T> | undefined, answer: T): boolean {
  if (axis === undefined || axis === '*') return true;
  return axis.includes(answer);
}

/** Number of axes a scenario actually constrains — more specific wins. */
function specificity(s: Scenario): number {
  const m = s.match;
  return [m.relationship, m.state, m.scope, m.outcome]
    .filter((a) => a !== undefined && a !== '*').length;
}

/**
 * Resolve the answers to a scenario. `null` means no scenario claims this
 * combination — the honest exit, which routes to the free 15-minute call
 * rather than guessing a path.
 */
export function resolveScenario(a: RouterAnswers): Scenario | null {
  const hits = SCENARIOS.filter(
    (s) =>
      axisMatches(s.match.relationship, a.relationship) &&
      axisMatches(s.match.state, a.state) &&
      axisMatches(s.match.scope, a.scope) &&
      axisMatches(s.match.outcome, a.outcome),
  );
  if (!hits.length) return null;
  // A decisive answer wins outright; otherwise the most specific scenario wins;
  // array order is the final tie-break.
  return hits.reduce((best, s) => {
    const p = s.priority ?? 0;
    const bp = best.priority ?? 0;
    if (p !== bp) return p > bp ? s : best;
    return specificity(s) > specificity(best) ? s : best;
  });
}

// ── Termination — Q4 shortens the tail, it never selects ───────────────────

/** The last phase index a given outcome cares about. `builder` runs the lot. */
const OUTCOME_PHASE_CAP: Record<Outcome, number> = {
  layout: 1,   // Plan
  picture: 2,  // Visualize
  cost: 3,     // Specify
  buylist: 3,  // Specify
  builder: 5,  // everything
};

/**
 * Trim the tail of a route to what the visitor said they need.
 *
 * Two guarantees:
 *  - it NEVER truncates past the blocker (that is the step they came for), and
 *  - it never returns an empty route.
 */
export function terminate(route: readonly string[], blocker: string, outcome: Outcome): string[] {
  const cap = OUTCOME_PHASE_CAP[outcome];
  let stop = -1;
  route.forEach((id, i) => {
    const t = toolById(id);
    if (t && t.phase <= cap) stop = i;
  });
  const blockerIndex = route.indexOf(blocker);
  stop = Math.max(stop, blockerIndex, 0);
  return route.slice(0, stop + 1);
}

// ── The assembled result ───────────────────────────────────────────────────

export interface RouteStep {
  tool: ExplorerTool;
  /** 1-based position in the route. */
  step: number;
  isBlocker: boolean;
  /** The check on the join to the NEXT step. `null` on the last step. */
  check: JoinCheck | null;
}

export interface RouterResult {
  scenario: Scenario | null;
  steps: RouteStep[];
  /** Set when this combination should go to the free call instead. */
  exit: Scenario['exit'] | null;
  tiers: { free: number; design: number; studio: number };
  /** How many steps are not yet in production. Studio-facing. */
  unbuilt: number;
}

const EXIT_NO_SCENARIO: NonNullable<Scenario['exit']> = {
  heading: 'Let us point you in the right direction.',
  body: 'Nothing on our shelf is a clean fit for what you just described, and guessing would waste your time. A free 15-minute call is the honest next step.',
};

/**
 * Build for a scenario the visitor picked BY NAME.
 *
 * An explicitly chosen identity is not re-derived: Q4 may still trim the tail,
 * but it must never re-select. Someone who said "I host on Airbnb" and then
 * asked what it would cost should get the Airbnb route costed — not silently
 * be handed the landlord's.
 */
export function buildForScenario(scenarioId: string, outcome: Outcome): RouterResult {
  const scenario = SCENARIOS.find((s) => s.id === scenarioId);
  if (!scenario) {
    return { scenario: null, steps: [], exit: EXIT_NO_SCENARIO, tiers: { free: 0, design: 0, studio: 0 }, unbuilt: 0 };
  }
  return assemble(scenario, outcome);
}

export function buildRoute(a: RouterAnswers): RouterResult {
  const scenario = resolveScenario(a);
  if (!scenario) {
    return { scenario: null, steps: [], exit: EXIT_NO_SCENARIO, tiers: { free: 0, design: 0, studio: 0 }, unbuilt: 0 };
  }

  return assemble(scenario, a.outcome);
}

/** Shared tail of buildRoute / buildForScenario. */
function assemble(scenario: Scenario, outcome: Outcome): RouterResult {
  const ids = terminate(scenario.route, scenario.blocker, outcome);
  const steps: RouteStep[] = ids.map((id, i) => ({
    tool: toolById(id)!,
    step: i + 1,
    isBlocker: id === scenario.blocker,
    check: i < ids.length - 1 ? checkFor(id, ids[i + 1]) : null,
  }));

  const tiers = { free: 0, design: 0, studio: 0 };
  steps.forEach((s) => { tiers[s.tool.lvl] += 1; });

  return {
    scenario,
    steps,
    exit: scenario.exit ?? null,
    tiers,
    unbuilt: steps.filter((s) => s.tool.status !== 'live').length,
  };
}

/**
 * The path as it stands mid-survey, so it can assemble live beside the questions.
 *
 * Returns `null` until the three selecting questions are answered — before that
 * there is nothing honest to show. Q4 is treated as `builder` while unanswered,
 * which means the full route appears first and visibly *shortens* when they say
 * what they actually need. That shortening is the moment the feature explains
 * itself, so it is worth the extra call.
 */
export function buildPreview(partial: Partial<RouterAnswers>): RouterResult | null {
  const { relationship, state, scope } = partial;
  if (!relationship || !state || !scope) return null;
  return buildRoute({ relationship, state, scope, outcome: partial.outcome ?? 'builder' });
}

/**
 * Everything the router needs to remember about one visitor.
 *
 * `pickedId` is set when they chose an identity by name; the answers still fill
 * in around it, but the scenario itself is locked.
 */
export interface RouterState {
  pickedId?: string;
  answers: Partial<RouterAnswers>;
}

export const EMPTY_ROUTER_STATE: RouterState = { answers: {} };

/** The one place the panel and the rail both read from, so they cannot disagree. */
export function resultForState(st: RouterState): RouterResult | null {
  if (st.pickedId) return buildForScenario(st.pickedId, st.answers.outcome ?? 'builder');
  return buildPreview(st.answers);
}

/** Is there enough here to call it a workflow worth showing in the rail? */
export function hasWorkflow(st: RouterState): boolean {
  const r = resultForState(st);
  return !!r && r.steps.length > 0;
}

// ── The custom escape hatch ────────────────────────────────────────────────
// The ONE place a model call is justified: free text → a route. The model's
// job is narrow and checkable, and this validator is what keeps v1's most
// important property — it can only ever return cards that actually exist.

export const MAX_CUSTOM_STEPS = 6;
export const MIN_CUSTOM_STEPS = 2;

/**
 * Clean a model-proposed list of card ids into a route we are willing to show.
 * Drops anything not in the roster, de-duplicates, sorts into phase order, and
 * caps the length. Returns `null` when too little survives to be worth showing
 * — the caller then falls through to the free call rather than guessing.
 */
export function validateCustomRoute(proposed: readonly string[]): string[] | null {
  const seen = new Set<string>();
  const kept: ExplorerTool[] = [];

  for (const id of proposed) {
    if (seen.has(id)) continue;
    const tool = toolById(id);
    if (!tool) continue; // it invented a card — drop it silently
    seen.add(id);
    kept.push(tool);
  }

  // Phase orders the path, exactly as it does for the eleven. Stable sort keeps
  // the model's ordering intact within a phase.
  kept.sort((x, y) => x.phase - y.phase);

  const ids = kept.slice(0, MAX_CUSTOM_STEPS).map((t) => t.id);
  return ids.length >= MIN_CUSTOM_STEPS ? ids : null;
}

/** Every card id any scenario route references. Used by the tests and the rail. */
export const ROUTED_TOOL_IDS: readonly string[] = Array.from(
  new Set(SCENARIOS.flatMap((s) => s.route)),
);

/** How many of the scenarios run through a given card — the build-order argument. */
export function routeFrequency(): Record<string, number> {
  const freq: Record<string, number> = {};
  EXPLORER_TOOLS.forEach((t) => { freq[t.id] = 0; });
  SCENARIOS.forEach((s) => s.route.forEach((id) => { freq[id] += 1; }));
  return freq;
}
