import { describe, it, expect } from 'vitest';
import {
  QUESTIONS,
  SCENARIOS,
  ROUTED_TOOL_IDS,
  ENTRIES_SHOWN_FIRST,
  ENTRY_ORDER,
  MAX_CUSTOM_STEPS,
  buildForScenario,
  buildRoute,
  entryScenarios,
  checkFor,
  resolveScenario,
  routeFrequency,
  terminate,
  validateCustomRoute,
  type Outcome,
  type Relationship,
  type RouterAnswers,
  type Scope,
  type SpaceState,
} from '../data/studioRouter';
import { EXPLORER_TOOLS, toolById } from '../components/studio/explorerRoster';

const RELATIONSHIPS = QUESTIONS[0].options.map((o) => o.id) as Relationship[];
const STATES = QUESTIONS[1].options.map((o) => o.id) as SpaceState[];
const SCOPES = QUESTIONS[2].options.map((o) => o.id) as Scope[];
const OUTCOMES = QUESTIONS[3].options.map((o) => o.id) as Outcome[];

function everyCombination(): RouterAnswers[] {
  const out: RouterAnswers[] = [];
  RELATIONSHIPS.forEach((relationship) =>
    STATES.forEach((state) =>
      SCOPES.forEach((scope) =>
        OUTCOMES.forEach((outcome) => out.push({ relationship, state, scope, outcome })))));
  return out;
}

// ── The rule that must never break ─────────────────────────────────────────

describe('routes only ever reference cards that exist', () => {
  it('every scenario route id is in the explorer roster', () => {
    const unknown = ROUTED_TOOL_IDS.filter((id) => !toolById(id));
    expect(unknown).toEqual([]);
  });

  it('every scenario blocker is a step on its own route', () => {
    const broken = SCENARIOS.filter((s) => !s.route.includes(s.blocker)).map((s) => s.id);
    expect(broken).toEqual([]);
  });

  it('no route repeats a card', () => {
    const dupes = SCENARIOS
      .filter((s) => new Set(s.route).size !== s.route.length)
      .map((s) => s.id);
    expect(dupes).toEqual([]);
  });
});

// ── Phase ordering — the bug the owner caught in v1 ────────────────────────

describe('phase orders the path', () => {
  it('Plan always precedes Redesign when both are on a route', () => {
    SCENARIOS.forEach((s) => {
      const redesign = s.route.indexOf('redesign');
      if (redesign < 0) return;
      s.route.forEach((id, i) => {
        if (toolById(id)!.phase === 1) {
          expect(i, `${s.id}: ${id} must come before redesign`).toBeLessThan(redesign);
        }
      });
    });
  });

  it('routes run in non-decreasing phase order, except where a constraint jumps the queue', () => {
    // "refresh" deliberately promotes Cost (Specify) to step 1 because the
    // blocker is a budget ceiling. It is the only sanctioned exception.
    SCENARIOS.filter((s) => s.id !== 'refresh').forEach((s) => {
      const phases = s.route.map((id) => toolById(id)!.phase);
      const sorted = [...phases].sort((a, b) => a - b);
      expect(phases, `${s.id} is out of phase order`).toEqual(sorted);
    });
  });

  it('refresh starts on the money', () => {
    expect(SCENARIOS.find((s) => s.id === 'refresh')!.route[0]).toBe('cost');
  });
});

// ── Resolution across the whole answer space ──────────────────────────────

describe('resolveScenario', () => {
  it('resolves to a scenario or a deliberate null for all 600 combinations', () => {
    const all = everyCombination();
    expect(all).toHaveLength(6 * 5 * 4 * 5);
    all.forEach((a) => {
      const s = resolveScenario(a);
      if (s !== null) expect(SCENARIOS).toContain(s);
    });
  });

  it('never throws, and always returns a usable result', () => {
    everyCombination().forEach((a) => {
      const r = buildRoute(a);
      if (r.scenario) {
        expect(r.steps.length).toBeGreaterThan(0);
        expect(r.steps[0].step).toBe(1);
      } else {
        expect(r.exit).not.toBeNull();
        expect(r.steps).toEqual([]);
      }
    });
  });

  it('a wet room routes to the plumbing path whoever is asking', () => {
    (['live', 'moving', 'letting'] as Relationship[]).forEach((relationship) => {
      const s = resolveScenario({ relationship, state: 'lived-in', scope: 'wet-room', outcome: 'buylist' });
      expect(s?.id).toBe('wet');
    });
  });

  it('"everything is decided" wins over the wet-room path — they do not want planning', () => {
    const s = resolveScenario({ relationship: 'live', state: 'decided', scope: 'wet-room', outcome: 'buylist' });
    expect(s?.id).toBe('decided');
  });

  it('a business space outranks every other answer — code and licensing do not care', () => {
    STATES.forEach((state) =>
      SCOPES.forEach((scope) => {
        const s = resolveScenario({ relationship: 'business', state, scope, outcome: 'builder' });
        expect(s?.id, `business / ${state} / ${scope}`).toBe('business');
      }));
  });

  it('Q4 splits staging from a pay-for-itself refresh — the only place it selects', () => {
    const base = { relationship: 'selling', state: 'lived-in', scope: 'whole' } as const;
    expect(resolveScenario({ ...base, outcome: 'picture' })?.id).toBe('stage-sell');
    expect(resolveScenario({ ...base, outcome: 'cost' })?.id).toBe('refresh');
  });
});

// ── Termination ────────────────────────────────────────────────────────────

describe('terminate', () => {
  it('"a picture" stops the keys route at the render', () => {
    const keys = SCENARIOS.find((s) => s.id === 'keys')!;
    expect(terminate(keys.route, keys.blocker, 'picture')).toEqual([
      'find-style', 'plan-home', 'redesign',
    ]);
  });

  it('"a list I can buy from" keeps the shopping step', () => {
    const keys = SCENARIOS.find((s) => s.id === 'keys')!;
    expect(terminate(keys.route, keys.blocker, 'buylist')).toContain('shop');
  });

  it('"something a builder can work from" runs the whole route', () => {
    SCENARIOS.forEach((s) => {
      expect(terminate(s.route, s.blocker, 'builder')).toEqual([...s.route]);
    });
  });

  it('never truncates past the blocker — that is the step they came for', () => {
    SCENARIOS.forEach((s) => {
      OUTCOMES.forEach((outcome) => {
        const kept = terminate(s.route, s.blocker, outcome);
        expect(kept, `${s.id} / ${outcome} dropped its blocker`).toContain(s.blocker);
      });
    });
  });

  it('never returns an empty route', () => {
    SCENARIOS.forEach((s) => {
      OUTCOMES.forEach((outcome) => {
        expect(terminate(s.route, s.blocker, outcome).length).toBeGreaterThan(0);
      });
    });
  });
});

// ── Designer checks ────────────────────────────────────────────────────────

describe('checkFor', () => {
  it('is available after EVERY stage — a gap in the line reads as "no help here"', () => {
    // Owner decision 2026-08-30. Availability is universal; only the prompting
    // is tiered. Previously these returned null.
    expect(checkFor('find-style', 'redesign')?.level).toBe('offer');
    expect(checkFor('score-room', 'redesign')?.level).toBe('offer');
    expect(checkFor('shop', 'cost')?.level).toBe('offer');
  });

  it('offers a check on every consecutive pair of every scenario route', () => {
    SCENARIOS.forEach((s) => {
      s.route.slice(0, -1).forEach((id, i) => {
        const ck = checkFor(id, s.route[i + 1]);
        expect(ck, `${s.id}: ${id} → ${s.route[i + 1]} has no check`).not.toBeNull();
      });
    });
  });

  it('is loud where a mistake propagates or the next step spends money', () => {
    expect(checkFor('plan-room', 'redesign')?.level).toBe('high');
    expect(checkFor('plan-home', 'redesign')?.level).toBe('high');
    expect(checkFor('redesign', 'shop')?.level).toBe('high');
    expect(checkFor('redesign', 'finishes')?.level).toBe('high');
    expect(checkFor('finishes', 'shop')?.level).toBe('high');
    expect(checkFor('plumb-room', 'heat-room')?.level).toBe('high');
    expect(checkFor('wire-room', 'redesign')?.level).toBe('high');
  });

  it('offers quietly everywhere else', () => {
    expect(checkFor('shop', 'guide-install')?.level).toBe('offer');
    expect(checkFor('redesign', 'palette')?.level).toBe('offer');
  });

  it('returns null for card ids that do not exist', () => {
    expect(checkFor('not-a-card', 'redesign')).toBeNull();
    expect(checkFor('redesign', 'not-a-card')).toBeNull();
  });

  it('checks ride the joins, never becoming steps of their own', () => {
    const r = buildRoute({ relationship: 'live', state: 'lived-in', scope: 'wet-room', outcome: 'builder' });
    expect(r.steps.map((s) => s.tool.id)).toEqual([...SCENARIOS.find((s) => s.id === 'wet')!.route]);
    expect(r.steps[r.steps.length - 1].check).toBeNull();
  });
});

// ── The custom escape hatch ────────────────────────────────────────────────

describe('validateCustomRoute', () => {
  it('drops ids that are not real cards — it can never invent a tool', () => {
    expect(validateCustomRoute(['redesign', 'teleport-my-room', 'shop']))
      .toEqual(['redesign', 'shop']);
  });

  it('de-duplicates', () => {
    expect(validateCustomRoute(['shop', 'shop', 'redesign'])).toEqual(['redesign', 'shop']);
  });

  it('re-sorts into phase order, same as the eleven', () => {
    expect(validateCustomRoute(['shop', 'find-style', 'redesign', 'plan-room']))
      .toEqual(['find-style', 'plan-room', 'redesign', 'shop']);
  });

  it('caps the length', () => {
    const everything = EXPLORER_TOOLS.map((t) => t.id);
    expect(validateCustomRoute(everything)).toHaveLength(MAX_CUSTOM_STEPS);
  });

  it('falls through to the call rather than showing a one-step guess', () => {
    expect(validateCustomRoute(['redesign'])).toBeNull();
    expect(validateCustomRoute([])).toBeNull();
    expect(validateCustomRoute(['nope', 'also-nope'])).toBeNull();
  });
});

// ── The numbers the build order rests on ───────────────────────────────────

describe('routeFrequency', () => {
  it('counts every card, including the ones no route touches', () => {
    const freq = routeFrequency();
    expect(Object.keys(freq).sort()).toEqual(EXPLORER_TOOLS.map((t) => t.id).sort());
  });

  it('Redesign and Shop carry the most routes', () => {
    const freq = routeFrequency();
    const ranked = Object.entries(freq).sort((a, b) => b[1] - a[1]).map(([id]) => id);
    expect(ranked.slice(0, 2).sort()).toEqual(['redesign', 'shop']);
  });

  it('flags the cards that sit on no route at all', () => {
    const freq = routeFrequency();
    const orphans = Object.entries(freq).filter(([, n]) => n === 0).map(([id]) => id).sort();
    // If this list changes, the AI-032 v2 build-order argument needs revisiting.
    expect(orphans).toEqual(['localize', 'moodboard', 'walk-room']);
  });
});

// ── Worked examples from the spec, as fixtures ─────────────────────────────

describe('worked examples', () => {
  it('01 · just got the keys', () => {
    const r = buildRoute({ relationship: 'moving', state: 'empty', scope: 'whole', outcome: 'buylist' });
    expect(r.scenario?.id).toBe('keys');
    // "a list I can buy from" runs to the end of Specify, and Cost is a
    // Specify card — so the budget breakdown is a legitimate tail here.
    expect(r.steps.map((s) => s.tool.id)).toEqual(['find-style', 'plan-home', 'redesign', 'shop', 'cost']);
    expect(r.steps.find((s) => s.isBlocker)?.tool.id).toBe('plan-home');
    expect(r.exit).toBeNull();
  });

  it('02 · mid-renovation takes the honest exit', () => {
    const r = buildRoute({ relationship: 'live', state: 'mid-reno', scope: 'whole', outcome: 'builder' });
    expect(r.scenario?.id).toBe('reno');
    expect(r.steps).toHaveLength(9);
    expect(r.exit?.heading).toBe('Talk to us first.');
    expect(r.steps.filter((s) => s.check?.level === 'high')).toHaveLength(4);
  });

  it('06 · staging ends inside Visualize, on purpose — it never reaches Shop', () => {
    const r = buildRoute({ relationship: 'selling', state: 'empty', scope: 'whole', outcome: 'picture' });
    expect(r.scenario?.id).toBe('stage-sell');
    expect(r.steps.map((s) => s.tool.id)).toEqual(['redesign', 'palette']);
    expect(r.steps.map((s) => s.tool.id)).not.toContain('shop');
  });

  it('10 · already decided is the shortest route on the board', () => {
    const r = buildRoute({ relationship: 'live', state: 'decided', scope: 'one-room', outcome: 'builder' });
    expect(r.steps.map((s) => s.tool.id)).toEqual(['shop', 'guide-install']);
  });

  it('reports tiers and what is still unbuilt', () => {
    const r = buildRoute({ relationship: 'live', state: 'lived-in', scope: 'wet-room', outcome: 'builder' });
    expect(r.tiers.free + r.tiers.design + r.tiers.studio).toBe(r.steps.length);
    expect(r.unbuilt).toBe(r.steps.filter((s) => s.tool.status !== 'live').length);
  });
});

// ── Picking your identity directly ─────────────────────────────────────────

describe('scenario entries', () => {
  it('offers every scenario as an identity, each one exactly once', () => {
    expect([...ENTRY_ORDER].sort()).toEqual(SCENARIOS.map((s) => s.id).sort());
    expect(new Set(ENTRY_ORDER).size).toBe(ENTRY_ORDER.length);
    expect(entryScenarios()).toHaveLength(SCENARIOS.length);
  });

  it('names the audiences the questions never say out loud', () => {
    const labels = entryScenarios().map((s) => s.entry.label + ' ' + s.entry.sub).join(' | ');
    // A stager or a host would never recognise themselves in "I'm selling it".
    expect(labels).toMatch(/Airbnb/);
    expect(labels).toMatch(/stag/i);
  });

  it('every prefill really does resolve back to its own scenario', () => {
    // The whole point of the shortcut is that it cannot send you somewhere else.
    SCENARIOS.forEach((s) => {
      const a = {
        relationship: s.prefill.relationship!,
        state: s.prefill.state!,
        scope: s.prefill.scope!,
        outcome: s.prefill.outcome ?? 'builder',
      } as RouterAnswers;
      expect(resolveScenario(a)?.id, `${s.id} prefill lands elsewhere`).toBe(s.id);
    });
  });

  it('a picked identity is never re-derived away by Q4', () => {
    // Said "I host on Airbnb", then asked the cost. Without locking this would
    // silently become the landlord's pay-for-itself route.
    const airbnb = buildForScenario('airbnb', 'cost');
    expect(airbnb.scenario?.id).toBe('airbnb');

    const inferred = buildRoute({
      relationship: 'letting', state: 'lived-in', scope: 'one-room', outcome: 'cost',
    });
    expect(inferred.scenario?.id).toBe('refresh');
  });

  it('a picked identity still gets its tail trimmed by Q4', () => {
    const full = buildForScenario('wet', 'builder');
    const short = buildForScenario('wet', 'picture');
    expect(short.steps.length).toBeLessThan(full.steps.length);
    expect(short.scenario?.id).toBe('wet');
  });

  it('an unknown identity falls through to the conversation', () => {
    const r = buildForScenario('not-a-scenario', 'builder');
    expect(r.scenario).toBeNull();
    expect(r.exit).not.toBeNull();
  });

  it('shows a workable number up front, with the rest behind "more"', () => {
    expect(ENTRIES_SHOWN_FIRST).toBeLessThan(ENTRY_ORDER.length);
  });
});
