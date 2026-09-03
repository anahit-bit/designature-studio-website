import React from 'react';
import { ArrowRight, Check, Diamond } from 'lucide-react';
import {
  ENTRIES_SHOWN_FIRST,
  QUESTIONS,
  entryScenarios,
  resultForState,
  type QuestionId,
  type RouterState,
} from '../../data/studioRouter';

/**
 * ─── AI-032 v2 · "Start here" ────────────────────────────────────────────
 * Two ways in, because two kinds of visitor arrive.
 *
 *  1. **Recognition.** Some people know exactly what they are — a stager, an
 *     Airbnb host, someone mid-renovation. They should be able to say so and be
 *     done in two clicks. This also matters for reach: the questions never use
 *     the words "Airbnb" or "staging", so those audiences would never see
 *     themselves in them, however good the routing underneath is.
 *  2. **Derivation.** Everyone else answers four questions and the scenario is
 *     inferred.
 *
 * A picked identity is LOCKED: the last question may still trim the tail, but
 * it never re-selects. Saying "I host on Airbnb" and then asking the cost gets
 * the Airbnb route costed, not the landlord's.
 *
 * The path assembles on the right either way, and no answer needs an account.
 */

const StartHerePanel: React.FC<{
  state: RouterState;
  /** Pick an identity by name — fills its answers and locks the scenario. */
  onPick: (scenarioId: string) => void;
  onAnswer: (id: QuestionId, value: string) => void;
  onReset: () => void;
  /** Open a card. Routes through the page's guard, which asks before discarding work. */
  onOpenTool: (id: string) => void;
  /** The honest exit — a free 15-minute conversation, not a funnel. */
  onBookCall: () => void;
}> = ({ state, onPick, onAnswer, onReset, onOpenTool, onBookCall }) => {
  const [showAll, setShowAll] = React.useState(false);
  const [askQuestions, setAskQuestions] = React.useState(false);
  const { pickedId, answers } = state;

  const result = resultForState(state);
  const started = !!pickedId || Object.keys(answers).length > 0;
  const showIdentities = !started && !askQuestions;

  // A picked identity has already answered everything except what they want out.
  const asked = pickedId ? QUESTIONS.filter((q) => q.id === 'outcome') : QUESTIONS;
  const answeredCount = asked.filter((q) => answers[q.id]).length;
  const done = answeredCount === asked.length;

  const entries = entryScenarios();
  const visible = showAll ? entries : entries.slice(0, ENTRIES_SHOWN_FIRST);
  const firstRunnable = result?.steps.find((s) => s.tool.status === 'live');

  return (
    <div className="bg-white px-6 md:px-10 py-8">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start">
        {/* ── left: recognise yourself, or answer the questions ── */}
        <div>
          {showIdentities && (
            <>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">
                Start here
              </span>
              <h2 className="font-display text-[30px] leading-[1.1] text-black mt-1.5">
                Which of these is you?
              </h2>
              <p className="text-[13px] text-black/55 leading-relaxed mt-2 max-w-[44ch]">
                Pick the one that fits and we&rsquo;ll hand you the workflow. If none of them do,
                answer four questions instead — same result, one more minute.
              </p>

              <div data-testid="identity-grid" className="grid sm:grid-cols-2 gap-2.5 mt-5">
                {visible.map((sc) => (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => onPick(sc.id)}
                    className="text-left border border-black/15 hover:border-[#0047AB] hover:bg-[#0047AB]/[0.04] transition-colors px-4 py-3.5"
                  >
                    <span className="block text-[14px] font-semibold text-black leading-tight">
                      {sc.entry.label}
                    </span>
                    <span className="block text-[11.5px] text-black/50 leading-snug mt-1">
                      {sc.entry.sub}
                    </span>
                  </button>
                ))}

                {/* The last cell is always the way out, which is also what keeps
                    the two-column grid even: 5 + this = 6, or 11 + this = 12. */}
                <button
                  type="button"
                  onClick={() => setAskQuestions(true)}
                  className="text-left border border-dashed border-black/25 hover:border-[#0047AB] hover:bg-[#0047AB]/[0.04] transition-colors px-4 py-3.5"
                >
                  <span className="block text-[14px] font-semibold text-black/70 leading-tight">
                    None of these
                  </span>
                  <span className="block text-[11.5px] text-black/45 leading-snug mt-1">
                    Answer four quick questions instead
                  </span>
                </button>
              </div>

              {!showAll && entries.length > ENTRIES_SHOWN_FIRST && (
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0047AB] mt-3.5 hover:underline underline-offset-4"
                >
                  {entries.length - ENTRIES_SHOWN_FIRST} more →
                </button>
              )}
            </>
          )}

          <div className={started || askQuestions ? '' : 'mt-4'}>
              {(started || askQuestions) && (
                <div className="flex gap-1.5 mb-6" aria-hidden="true">
                  {asked.map((q, i) => (
                    <span
                      key={q.id}
                      className={`h-[3px] flex-1 ${i < answeredCount ? 'bg-[#0047AB]' : 'bg-black/10'}`}
                    />
                  ))}
                </div>
              )}

              {asked.map((q, i) => {
                const chosen = answers[q.id];
                // Reveal one at a time, but never hide an answered one — changing
                // an earlier answer has to stay one click away.
                if (i > answeredCount) return null;
                // While the identities are up they ARE the first screen; the
                // questions live behind the "None of these" tile.
                if (showIdentities) return null;
                return (
                  <fieldset key={q.id} className="border-0 p-0 m-0 mb-8">
                    <legend className="p-0 mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">
                        Question {i + 1} of {asked.length}
                      </span>
                      <span className="block font-display text-[26px] leading-[1.15] text-black mt-1.5">
                        {q.prompt}
                      </span>
                    </legend>
                    <div className="flex flex-wrap gap-2">
                      {q.options.map((o) => {
                        const on = chosen === o.id;
                        return (
                          <button
                            key={o.id}
                            type="button"
                            aria-pressed={on}
                            onClick={() => onAnswer(q.id, o.id)}
                            className={`text-[13.5px] font-medium px-4 py-2.5 border transition-colors ${
                              on
                                ? 'bg-[#0047AB] border-[#0047AB] text-white'
                                : 'bg-white border-black/15 text-black hover:border-[#0047AB] hover:text-[#0047AB]'
                            }`}
                          >
                            {o.label}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                );
              })}

              {(started || askQuestions) && (
                <button
                  type="button"
                  onClick={() => { setAskQuestions(false); onReset(); }}
                  className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/40 hover:text-black underline underline-offset-4"
                >
                  Start over
                </button>
              )}
          </div>
        </div>

        {/* ── right: the path, assembling ── */}
        <div className="lg:sticky lg:top-24">
          {!result ? (
            <div className="border border-dashed border-black/15 px-6 py-10 text-center">
              <p className="text-[13px] text-black/45 leading-relaxed max-w-[34ch] mx-auto">
                Your workflow builds here as you answer. Nothing asks you to sign in until you open
                a step.
              </p>
            </div>
          ) : (
            <div className="border border-black/10">
              <div className="px-5 py-4 border-b border-black/10">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">
                  {done ? 'Your workflow' : 'Your workflow so far'}
                </span>
                <h3 className="font-display text-[27px] leading-[1.12] text-black mt-1">
                  {result.scenario?.name ?? 'Let’s talk it through'}
                </h3>
                {result.scenario && (
                  <p className="text-[13px] text-black/60 leading-[1.55] mt-2">
                    {result.scenario.you}
                  </p>
                )}
              </div>

              {result.steps.length > 0 && (
                <ol className="px-5 py-1">
                  {result.steps.map((s, i) => (
                    <React.Fragment key={s.tool.id}>
                      <li className="grid grid-cols-[26px_minmax(0,1fr)_auto] gap-3 items-center py-3 border-b border-black/6 last:border-b-0">
                        <span
                          className={`text-[11px] font-mono font-semibold ${
                            s.isBlocker ? 'text-[#9E5E41]' : 'text-black/35'
                          }`}
                        >
                          {String(s.step).padStart(2, '0')}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[14px] font-semibold text-black leading-tight">
                            {s.tool.name}
                          </span>
                          <span className="block text-[12px] text-black/50 leading-snug mt-0.5">
                            {s.tool.get}
                          </span>
                          {s.isBlocker && (
                            <span className="block text-[11px] font-semibold text-[#9E5E41] mt-1">
                              This is the one you came for.
                            </span>
                          )}
                        </span>
                        <span className="flex flex-col items-end gap-1">
                          <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-black/45 border border-black/12 px-1.5 py-0.5">
                            {s.tool.tier}
                          </span>
                          {s.tool.status === 'live' ? (
                            <button
                              type="button"
                              onClick={() => onOpenTool(s.tool.id)}
                              className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0047AB] hover:underline underline-offset-2"
                            >
                              {i === 0 ? 'Start' : 'Open'}
                            </button>
                          ) : (
                            <span className="text-[9px] uppercase tracking-[0.12em] text-black/30">
                              Not built yet
                            </span>
                          )}
                        </span>
                      </li>

                      {/* A check is available on every join. The loud ones argue
                          for themselves; the quiet ones just have to be visibly
                          THERE, so the offer never reads as "no help here". */}
                      {s.check && (
                        <li className="grid grid-cols-[26px_minmax(0,1fr)] gap-3 items-start py-2 border-b border-dashed border-black/10">
                          <Diamond
                            className={`w-3 h-3 mt-0.5 ml-1 ${
                              s.check.level === 'high' ? 'text-[#9E5E41]' : 'text-black/25'
                            }`}
                            aria-hidden="true"
                          />
                          {/* One invitation, two weights. An earlier version used
                              different WORDS for the loud and quiet joins, which read
                              as two unrelated features. The tiering belongs in the
                              styling and in how much the reason argues — never in
                              whether it sounds like the same offer. */}
                          <span
                            className={`text-[11.5px] leading-snug ${
                              s.check.level === 'high' ? 'text-black/55' : 'text-black/40'
                            }`}
                          >
                            <strong
                              className={`font-semibold ${
                                s.check.level === 'high' ? 'text-[#9E5E41]' : 'text-black/50'
                              }`}
                            >
                              Have a designer look at this.
                            </strong>{' '}
                            {s.check.why}
                          </span>
                        </li>
                      )}
                    </React.Fragment>
                  ))}
                </ol>
              )}

              {result.exit && (
                <div className="m-5 border border-[#9E5E41] bg-[#9E5E41]/8 px-4 py-4">
                  <h4 className="font-display text-[21px] text-black leading-tight">
                    {result.exit.heading}
                  </h4>
                  <p className="text-[12.5px] text-black/65 leading-relaxed mt-1.5">
                    {result.exit.body}
                  </p>
                  <button
                    type="button"
                    onClick={onBookCall}
                    className="inline-flex items-center gap-2 bg-[#9E5E41] text-white px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] mt-3.5"
                  >
                    Book a free 15 minutes <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {result.steps.length > 0 && (
                <div className="px-5 py-4 border-t border-black/10 bg-[#FAFAFA]">
                  <p className="text-[12px] text-black/60 leading-relaxed">
                    {result.tiers.free === result.steps.length ? (
                      <>All {result.steps.length} of these are free. Nothing here asks for a card.</>
                    ) : result.tiers.free > 0 ? (
                      <>
                        Start free — <strong className="text-black">{result.tiers.free}</strong> of
                        these {result.steps.length} cost you nothing.
                        {result.tiers.design > 0 && <> {result.tiers.design} on the Design plan.</>}
                        {result.tiers.studio > 0 && <> {result.tiers.studio} on Studio.</>}
                      </>
                    ) : (
                      <>Every step here is on a paid plan. Worth knowing before you start.</>
                    )}
                  </p>
                  {result.unbuilt > 0 && (
                    <p className="text-[10px] uppercase tracking-[0.14em] text-black/35 mt-2">
                      {result.unbuilt} of the {result.steps.length}{' '}
                      {result.unbuilt === 1 ? 'is' : 'are'} still being built
                    </p>
                  )}

                  {done && firstRunnable && (
                    <>
                      <button
                        type="button"
                        onClick={() => onOpenTool(firstRunnable.tool.id)}
                        className="inline-flex items-center gap-2.5 bg-[#0047AB] text-white px-6 py-3 text-[11px] font-bold uppercase tracking-[0.18em] rounded-md mt-4"
                      >
                        <Check className="w-4 h-4" /> Start with {firstRunnable.tool.name}
                      </button>
                      {/* The route's own step 1 may not be built yet. Saying so, and
                          starting from the first step that IS, beats leaving the
                          panel with no action at all. */}
                      {firstRunnable.step > 1 && (
                        <p className="text-[11.5px] text-black/50 leading-snug mt-2">
                          Step {firstRunnable.step} is the first one we can run today —
                          {' '}{result.steps[0].tool.name} is still being built.
                        </p>
                      )}
                    </>
                  )}

                  {done && !firstRunnable && (
                    <button
                      type="button"
                      onClick={onBookCall}
                      className="inline-flex items-center gap-2.5 bg-[#9E5E41] text-white px-6 py-3 text-[11px] font-bold uppercase tracking-[0.18em] rounded-md mt-4"
                    >
                      None of this is built yet — talk to us
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StartHerePanel;
