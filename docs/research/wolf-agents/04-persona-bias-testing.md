# 04. Persona and bias testing for Designature

## How Wolf's method works

Three artefacts, one data set.

1. **UX Core (105 biases).** Each bias has a one line product meaning, worked examples for product, engineering and HR, and links to the business questions it answers. Canonical source: `/uxcore-api` on keepsimple.io, or `assets/bob-skill/references/biases.md`.
2. **UXCG (63 questions).** Business problems such as "Why aren't our promotions working?" or "What to consider when creating a Persona for a product?" (question 62), each mapped to the biases that explain it. Source: `assets/bob-skill/references/questions.md`.
3. **UXCP (persona builder).** A persona is a name plus the biases that person or group tends to show. The tool intersects the persona's biases with the 63 questions and ranks the questions by how many of the persona's biases point at them, filtered by product stage: Team forming, Development, Pre signup (marketing), Post signup (product use), Analytics. Sharing is a URL. The team member mode flips it: which biases to watch when working with this person.

Bob is the agent form: give it a screen or a problem and it returns 3 to 5 biases with a concrete action each, plus a "Watch out" list. The 89 demo recipes are before/after pairs (scenario, without bias, with bias, why it works) that make a bias visible in a mock.

His own caveats that apply here: never cite psychology to users (bias 33); loss framing on first contact creates anxiety; commitment tricks feel manipulative in products whose brand is calm; aggressive warnings trigger reactance (bias 91).

## Designature personas

Derived from what the repository already knows about its market: the competitor scan (six segments, "Style Quiz as onboarding moat", trilingual white space), the virtual staging spec (US agents, sellers, short stay hosts), the journal drafts (rental friendly design, realtor guide, Yerevan), and the pricing model (0, 19, 49 dollars plus a 99 dollar consultation).

Each persona lists candidate biases by UX Core number, the Designature surface where the bias acts, a testable hypothesis, and the biases to watch. The full matrix is in `designature-persona-bias-matrix.csv`.

### P1. The renter refresher

Lives in a rented flat, wants it to feel like theirs, cannot touch walls or fixtures, budget under a few hundred dollars, afraid of buying things that will not fit or that the landlord will object to.

| Bias | Surface | Hypothesis |
| --- | --- | --- |
| 93 Ambiguity Effect | AI Vision result, shopping list | Showing "reversible, no drilling" as a filter and a badge raises add to list rate |
| 88 Endowment Effect | AI Vision upload | Rendering their own room (not a stock room) makes them value the concept more than a gallery example |
| 84 IKEA Effect | Style quiz | Answering the quiz before seeing renders raises attachment to the result and the share rate |
| 79 Hyperbolic Discounting | Pricing | "Ready this weekend" beats "saves money over a year" on the free to paid step |
| 57 Mental Accounting | Shopping list | Grouping items into "keep when you move" and "leave behind" lowers resistance to the total |
| 23 Money Illusion | Pricing | Monthly framing of the 49 dollar plan converts better than annual |
| Watch: 83 Loss Aversion | Onboarding | Loss framing on first contact raises anxiety and drop off |

### P2. The homeowner renovator

Owns the place, larger budget, one shot decision, wants a human to check the AI, fears an expensive mistake and being sold to.

| Bias | Surface | Hypothesis |
| --- | --- | --- |
| 48 Authority Bias | Consultation, deliverables | The designer's credentials and process next to the render raise consultation bookings |
| 86 Zero Risk Bias | Pricing, consultation | A named guarantee (revision included, cancel before the call) outperforms a discount of equal value |
| 54 Halo Effect | Portfolio, first render | Render quality on the first concept sets the perceived quality of the whole service; a weak first render loses the booking |
| 18 Anchoring | Pricing | Showing the 99 dollar consultation next to typical studio fees anchors it as small |
| 92 Decoy Effect | Pricing | The 19 dollar tier exists to make 49 look like the sensible middle; test its position and copy |
| 49 Automation Bias | AI Vision | Users over trust the render; a visible "structure verified" line and a human review option increase trust without increasing false confidence |
| Watch: 91 Reactance | Consultation CTA | Pushy booking prompts reduce bookings from this persona |

### P3. The listing agent (realtor)

Needs staged photos for a listing this week, judged on speed, price per image and compliance, compares against REimagine and MeltFlex.

| Bias | Surface | Hypothesis |
| --- | --- | --- |
| 20 Contrast Effect | Landing, pricing | Before/after pairs and a price per image next to physical staging cost make the offer read as cheap |
| 50 Bandwagon | Landing | "Used by N agents in M markets" claims work only once there are real numbers; do not fake them |
| 3 Illusory Truth Effect | Journal, landing | Repeating "we never move your walls" across pages builds the trust claim |
| 102 Serial Recall | Staging flow | A numbered three step flow (upload, pick style, download with disclosure label) is remembered and repeated |
| 58 Normality Bias | Compliance | Agents underestimate MLS disclosure risk; an automatic "virtually staged" label removes the decision |
| Watch: 35 Insensitivity to Sample Size | Testimonials | Three testimonials read as proof; label sample honestly |

### P4. The short stay host

Runs an Airbnb, thinks in return on investment and photo appeal, buys in batches, wants durable and cheap.

| Bias | Surface | Hypothesis |
| --- | --- | --- |
| 97 Less Is Better Effect | Shopping list | One curated premium item outperforms a long list of cheap ones |
| 85 Unit Bias | Shopping list | Batching the list into rooms with a completion state sustains purchase progress |
| 101 Peak End Rule | AI Vision flow | The final screen (share, download, book) determines the rating of the whole flow; invest there |
| 14 Picture Superiority | Journal | Photo led guides outperform text led ones for this persona |
| 22 Framing Effect | Pricing | "Pays for itself in one booking" framing beats feature lists |
| Watch: 81 Escalation of Commitment | Credits | Sunk cost nudges around credits feel manipulative; avoid |

### P5. The Yerevan local client

Wants a real studio in the city, may prefer Armenian or Russian, trusts local references and local retailers, expects a consultation and a person.

| Bias | Surface | Hypothesis |
| --- | --- | --- |
| 16 Self Reference Effect | Portfolio, journal | Yerevan projects and local names on the first screen raise engagement for local traffic |
| 4 Mere Exposure | Retail page | Familiar local retailer logos raise trust in the shopping list |
| 53 In Group Favoritism | Studio page | The studio's local identity and language raise consultation requests from this segment |
| 45 Stereotype and 99 Prejudice | All copy and colour | Cultural cues that read well for a US audience may not for an Armenian one; test palette and symbols by locale |
| 48 Authority Bias | Consultation | Engineering plus design background of the founder is a credential for this segment; show it |
| Watch: 33 Bias Blind Spot | Copy | Never explain the persuasion; this segment distrusts visible manipulation strongly |

### P6. The free tier tinkerer

Curious, price sensitive, has tried RoomGPT and IKEA Kreativ, will not pay unless the result is clearly better, likely to churn silently.

| Bias | Surface | Hypothesis |
| --- | --- | --- |
| 104 Primacy Effect | First render | The first free render decides the paid conversion; spend the best model on it |
| 80 Appeal to Novelty | Feature naming | Naming the structure lock and shoppable list as features raises perceived value over free tools |
| 39 Recency Illusion | Account, email | Re surfacing an unused feature as "new" brings tinkerers back |
| 15 Von Restorff | Pricing | One visually distinct plan gets chosen; test which one |
| 6 Cue Dependent Forgetting | Email | A reminder that shows their own past render brings them back better than a generic nudge |
| Watch: 87 Processing Difficulty | Delete account, cancel | Friction on destructive actions is fine; friction on cancel is a dark pattern and the competitor scan shows it is punished |

## Test protocol

Four phases, each with a stop condition.

### Phase 1. Persona charters (paper)

Write one charter per persona: who they are, what they want, what they fear, the bias set above, and the questions from the 63 that score high for that set. Keep each charter under 300 words. Different charters must differ in what they care about, not only in wording.

### Phase 2. Synthetic panel (agents)

Run each persona as a separate agent with its charter as the system prompt and, following Wolf's pilot, on **different models** where possible (his numbers: same model and prompt agree 100%, charters on one model 78%, different models 56%). Give the panel Designature surfaces as fixed tasks with a fixed output contract copied from his `tasks.json`: choose one option and list three ranked concerns in at most 12 words each, JSON only. Tasks worth running first:

1. Pricing page: which plan would you pick and why, what stops you.
2. Style quiz: would you finish it before seeing a render, what makes you quit.
3. AI Vision upload: would you upload your own room photo, what would you need to trust the result.
4. Shopping list: what would make you buy from this list rather than search yourself.
5. Consultation: would you book a 99 dollar call, what would the page need to say.

Score with `assets/agent-panel-tools/agent-quorum-score.mjs.txt` (drop the suffix to run) and a concept map written for interior design concerns. **Stop condition:** if choice agreement is above about 80% and the third persona adds near zero new concerns, the panel is one opinion; rewrite charters or change models before reading the answers as insight.

Run `agent-voice-check.mjs.txt` (suffix dropped) over the transcripts if the personas are kept as long lived Claude Code agents; identical voices are a sign the charters are not biting.

### Phase 3. Real users (evidence)

Synthetic panels produce hypotheses. Confirm the top three per persona with real people: five short interviews per persona or one A/B test per hypothesis. Designature already has the tracking endpoints (quiz start and complete, vision start, shopping start, audit start, Calendly) and GA4 and Search Console in the admin insights, so most hypotheses above can be measured without new instrumentation. The UXCP "team member" mode is also useful in reverse: run it on the founder and the studio team to see which biases shape the studio's own decisions.

### Phase 4. Design changes

Only confirmed hypotheses become changes. Every change follows Bob's rule set: no psychology in the copy, no loss framing on first contact, no commitment traps around credits or cancellation. Log each confirmed bias next to the change in the repo so the next agent knows why the pricing page looks the way it does.

## What this cannot do

- It cannot tell you what Armenian or US buyers actually feel. It tells you what to ask them.
- Wolf's own pilot is three tasks and nine agents from one vendor; treat his percentages as a warning about clones, not as a calibrated benchmark.
- The 105 biases were written for software products in general. Six of the mappings above are my judgement, not his data; the CSV marks which rows come from Bob's curated question answers and which are proposals.
