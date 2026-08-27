# Product spec — Designer Checkpoints (the human in the AI pipeline)

*Designature Studio · Aug 2026 · owner idea, captured 27 Aug. Pairs with `signature-styles-spec.md`.*

## Why

Every real Designature project runs the same way: **Phase 1 → meeting → client confirms → Phase 2 →
meeting → confirms → …** The client is never handed a finished design; they are walked through it,
and each phase is signed off by a human before the next one starts. That process is already public on
`/deliverables` (Discover · Direct · Visualize · Build) and it is the reason clients trust the studio.

The AI Studio today has none of it. A visitor uploads a photo, gets a render, and is alone with it.
The only human on offer is a single $99 consultation CTA sitting under the result
(`ConsultationReviewBand`) — a dead end, not a process.

**Designer Checkpoints puts the studio's real phase-gate process inside the AI product.** After each
AI phase the client can either continue self-serve, or open a checkpoint: book the designer, review
the actual files together, get written notes and a designer-corrected render, and only then move to
the next phase. That is what no AI competitor can copy — REimagine and MeltFlex have no designer, and
Havenly's human layer is a full paid project, not a per-phase gate.

It also fixes the funnel: free AI → $49 checkpoint → $99 consult → full project, with each rung
crediting into the next. Same ladder the studio already uses, just automated.

## What already exists in our codebase (important)

- **The four phases are already defined and public** — `src/components/DeliverablesPage.tsx`
  (Phase 1 Discover, 2 Direct, 3 Visualize, 4 Build) with real sample deliverables per phase.
- **Booking works end to end** — Calendly availability + booking + webhook
  (`services/consultation/`), Ameria payment rail for the $99 consultation, `orders` table with
  `booking_slot`, confirmation email (`lib/email.ts`), and an admin consultations page.
- **Saved outputs already persist** — `saved_items` table (tool, title, thumbnail_url, full_url,
  jsonb metadata) + the account Library UI. Concepts, shopping lists, audits all land there.
- **Admin surface exists** — `/admin` with orders, consultations, users, feedback panels.
- **The CTA exists but is a dead end** — `ConsultationReviewBand` in `ConsultationCTA.tsx`.

**Gap to build:** a **Project** object that ties a client's items into an ordered, phase-aware
journey, a **checkpoint** state machine on top of it, a designer review queue in admin, and the
per-checkpoint Calendly event types. Booking, payment, email and storage are all already solved.

## The model

```
Phase 1 · DISCOVER  →  ◆ Checkpoint A — Brief review
Phase 2 · DIRECT    →  ◆ Checkpoint B — Concept review     ← the commercial core
Phase 3 · VISUALIZE →  ◆ Checkpoint C — Specification review
Phase 4 · BUILD     →  studio project (human only — technical drawings)
```

**A checkpoint is optional, never a wall.** Every phase has two exits: *Continue on my own* (one
click, free, instant) and *Review with a designer* (booked, paid, gated on approval). Blocking a
paying self-serve user behind a human queue would break the product and cap it at Anahit's capacity.

**What a checkpoint actually delivers** (this is the product, not the call):
1. A **booked 30–45 min call** on the client's files — the same conversation as a real project meeting.
2. **Written designer notes** attached to the project, visible in the account and downloadable.
3. **A designer-corrected render** — Anahit re-runs AI Vision with her own prompt corrections from the
   admin side and attaches the result. This is the single most valuable artifact: proof that a human
   improved it.
4. **An approval stamp** — "Reviewed by Anahit Grigoryan, [date]" on the approved concept, carried
   into the shopping list and any exported PDF.
5. **Credit** — the checkpoint fee credits toward the next rung, up to a full project (the studio's
   existing promise, applied consistently).

### Per-checkpoint definition

| | Checkpoint A · Brief | Checkpoint B · Concept | Checkpoint C · Specification |
|---|---|---|---|
| After | Style Quiz + room photo + intake | AI Vision concepts in a chosen Style / Signature Look | Shopping list + budget |
| Reviewed | Room constraints, function, budget realism, style direction | Which concept is buildable, proportion, lighting, what the AI got wrong | Real products: sizes, lead times, substitutions, total budget |
| Output | Direction note + a corrected brief | Designer notes + **corrected render** + approval stamp | Verified list + swaps + a build/ordering order |
| Price | **Free** for Design+ / Studio; $29 otherwise | **$49** (the core SKU) | **$99** (the existing consultation, retargeted) |
| Duration | 20 min | 45 min | 45 min |

## Scope

### V1 — one checkpoint, done properly
1. **Project object.** Group a client's items (photo, quiz result, concepts, shopping list) into one
   named Project with a current phase. Auto-created on first AI Vision generation; the account gets a
   **Projects** tab showing the phase spine.
2. **Checkpoint B only** (Concept review, $49) — the highest-intent moment, straight after a render.
   Replace the `ConsultationReviewBand` dead end with "Review this concept with a designer →".
3. **Booking flow**: dedicated Calendly event type → pay → confirmed slot → the project's checkpoint
   moves to `booked`, the client's files are attached to the booking.
4. **Admin review queue** (`/admin/reviews`): upcoming checkpoints with the client's photo, brief,
   concepts and shopping list on one screen; a notes field; a "generate corrected render" action
   reusing the AI Vision pipeline; "Approve" / "Request changes".
5. **Client-side result**: notes + corrected render + approval stamp land in the project, plus an
   email. Phase 3 unlocks (or unlocks anyway via *Continue on my own*).
6. **Capacity control**: Calendly availability is the throttle; when full, the CTA offers a waitlist
   rather than a broken booking.

### V2 — the full spine
7. **Checkpoints A and C** live, with the free-for-paid-tiers rule on A (a strong retention hook).
8. **Phase progress UI** across the AI Studio — the client always sees which phase they are in, what
   was approved, and what is next. Same visual language as `/deliverables` so the studio and the AI
   product read as one process.
9. **Project PDF export** — brief + approved concept + notes + shopping list as one document, stamped.
10. **Revision rounds** — "request changes" loops a checkpoint without a new booking (one round included).

### V3 — scale past one designer
11. **Multi-designer roster** — associate reviews with a reviewer, route by availability/style, pay a
    per-review fee. Unblocks volume and pairs with licensed Signature Looks (Route B in the looks spec).
12. **B2B**: the same checkpoint mechanic as the "human-reviewed" premium SKU for virtual staging
    (already named in `virtual-staging-spec.md`) and for developer/agent accounts.

## Pricing and the ladder

```
Free AI render  →  $49 Concept Review  →  $99 Specification Review  →  Full project
                    (credits to $99)       (credits to project)        (existing service)
```

- **$49** for 45 min + written notes + a corrected render is deliberately near-loss-leader; it exists
  to convert. Watch it: if the real time cost lands above ~1.5 h, raise to $79 rather than cutting the
  corrected render — the render is what people pay for.
- **Free Checkpoint A for Design+ / Studio** turns the subscription from "more renders" into "access
  to a designer", which is a much better reason to keep paying.
- Never bundle unlimited checkpoints into a subscription tier — capacity is one human.

## Technical build tasks

- [ ] `projects` table (id, user_id, title, room_type, style_key / signature_look, phase,
      status, created_at, updated_at) + `project_items` linking existing `saved_items` rows.
- [ ] `checkpoints` table (id, project_id, phase, kind, status
      `available|booked|in_review|approved|changes_requested`, order_id, calendly_event_uri,
      designer_notes text, corrected_item_id, decided_at) — state machine in `services/consultation/`.
- [ ] Calendly: one event type per checkpoint kind; extend `getConsultationConfig()` beyond the single
      `CALENDLY_PAID_CONSULT_EVENT_TYPE_URI`, and map webhook events → checkpoint status.
- [ ] Payment: reuse the Ameria rail; `orders.product_type` = `checkpoint_concept` etc.; credit
      tracking so a fee can be applied to the next rung.
- [ ] API: `POST /api/projects`, `GET /api/projects/:id`, `POST /api/projects/:id/checkpoint`,
      `POST /api/admin/checkpoints/:id/notes|render|approve`.
- [ ] Admin: `/admin/reviews` panel (client files on one screen, notes, corrected render, approve).
- [ ] Corrected render: admin-side call into the existing generation pipeline with an override prompt
      field; store as a `saved_item` flagged `designer_corrected`.
- [ ] Approval stamp: badge component on concept cards + a Cloudinary overlay for exported/shared images.
- [ ] Client UI: Projects tab in the account, phase spine, checkpoint CTA replacing
      `ConsultationReviewBand`, notes viewer.
- [ ] Emails: booking confirmation (exists), "your review is ready" (new), reminder (Calendly).
- [ ] Bilingual copy EN + AM in `src/LanguageContext.tsx`.

## Operations (the part that decides whether this works)

- **SLA**: notes + corrected render delivered within **2 business days** of the call. Publish it.
- **Capacity**: cap at N reviews/week via Calendly availability. Waitlist beyond it. Never oversell
  the designer — one bad late review costs more than five sales.
- **Prep discipline**: the admin screen must make a review preppable in <10 minutes, otherwise the
  economics fail at $49.
- **Scope guard**: a checkpoint is a review, not a free redesign. One corrected render, one revision
  round, then it becomes a project quote.
- **No-shows**: charge on booking (already how the $99 flow works), one free reschedule.

## Risks / watch-outs

- **Capacity is the whole risk.** This feature's ceiling is one person's calendar until V3.
- **Unit economics** — measure real minutes per review from week one; the $49 rung is the first thing
  to reprice.
- **Promise discipline** — "reviewed by a designer" must always mean a human actually looked. Never
  let this become an AI-generated "review"; that is the one thing that would destroy the wedge.
- **Complexity creep** — V1 is *one* checkpoint. The phase spine is worthless if the first rung is not
  converting.

## Success metrics

- Checkpoint attach rate (renders → paid reviews), split by generic style vs Signature Look.
- Checkpoint → $99 → project conversion, and revenue per checkpoint client.
- Median hours per review (economics) and on-time notes % (SLA).
- Subscription retention among users who used a free Checkpoint A vs those who did not.
