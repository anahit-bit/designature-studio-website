# Setup checklist — affiliate, Pinterest, directories

Owner-action items (these need your own logins, so I can't submit them for you — but here's exactly what to do, in order).

## A. Affiliate monetization (decision made: monetize + disclose)

**Rule of thumb:** affiliate = open to an Armenian company; trade discounts = need a US entity. Go affiliate now.

1. **Set up Payoneer** (payout rail). Get the "Global Payment Service" USD receiving account. This is how CJ and others pay a non-US publisher. *(Payments only — it does NOT make you a US business.)*
2. **Apply to Skimlinks** (skimlinks.com) — one approval auto-converts your Shopping-List links into commission links across West Elm, Pottery Barn, Crate & Barrel, CB2, Wayfair, Society6 + ~48k stores. It's selective (~3% approval), so apply with the polished live site and real content (the two Journal articles help).
3. **Apply to CJ Affiliate** → the **Wayfair** program (covers AllModern/Joss & Main/Birch Lane/Perigold). Non-US publishers are paid via Payoneer.
4. **Apply to Impact.com** → **West Elm, Pottery Barn, Crate & Barrel/CB2, Society6, Blu Dot**. Migrate your top retailers from Skimlinks to these direct programs once approved (direct usually pays more).
5. **EU-friendly extras:** **Kave Home** (own affiliate portal, up to 30%), **Desenio** (Awin), **Society6** (worldwide). No US entity needed.
6. **Skip for commission:** **Article** (no program) and **IKEA** (no global program).
7. **US LLC — only later,** and only if you start *buying and reselling* furniture for clients to use the 15–20% trade discounts (West Elm/PB, C&B/CB2, Wayfair Pro, Blu Dot). Wyoming/Delaware LLC + EIN + state resale permit + US forwarding address. Get US tax advice first. If your model stays affiliate-on-client-self-purchase, you don't need it.

### ✅ DONE (Aug 2026) — affiliate live: Skimlinks script added + disclosure applied
Skimlinks tracking script installed in `index.html`; both "No affiliate fees" bullets replaced with
"Independent picks — we may earn a small commission" and an explicit disclosure line added under the
Shopping-List cards in `AIConceptsPage.tsx`. Original queued note kept below for reference.

### (historical) Queued code change — was: do the day affiliate links go live
In `src/components/AIConceptsPage.tsx`, the Shopping-List "What you'll get" list currently claims:
> `'No affiliate fees or sponsored results'`  *(appears twice: ~line 1811 and ~line 2456)*

The moment commission links are live, that line becomes false. Replace **both** occurrences with an honest disclosure, e.g.:
> `'Independent picks — we may earn a commission, but it never sways our choices'`

and add a one-line disclosure near where the product links render (e.g. "Some links may earn us a commission at no cost to you. It never changes what we recommend."). Until links are live, leave the current copy as-is (it's still true).

## B. Pinterest before/after engine (open lane — MeltFlex has none)

1. Create a **Pinterest Business** account (free) and verify the domain (enables analytics + rich pins).
2. Boards: "Rental-Friendly Design," "Small Apartment Ideas," "Before & After Rooms," + one per style (Japandi, Minimalist, etc.).
3. Pin AI Vision **before/afters** as vertical 2:3 images, keyword-rich titles, each linking to the matching Journal article or `/ai-concepts`.
4. Start with the rentals article's pin kit. Aim for a steady cadence (a few pins/week) — pins are evergreen and compound.

## C. AI directories (GEO equity — theirs are young, so move now)

Submit the product (clean screenshots, one-liner, category, free-tier note) to:
- There's An AI For That (theresanaiforthat.com)
- Toolify (toolify.ai)
- Futurepedia (futurepedia.io)
- ToolPilot, AIxploria, Insidr
- Capterra + Crunchbase (also good for credibility/backlinks)
Then nudge happy users to leave a review on 1–2 of them.

## D. Reviews / reputation (attack their weak spot)
MeltFlex is thin and negative on Trustpilot/Reddit. Proactively ask satisfied clients for a Google/Trustpilot review, and publish accuracy-first before/afters. This is cheap and directly counters the "AI is inaccurate" perception.

## E. Publish the two Journal drafts
Paste `journal-drafts/best-ai-interior-design-tools-2026.md` and `journal-drafts/rental-friendly-interior-design.md` into Sanity (map the title/excerpt/seo.metaTitle/metaDescription/faq fields). Add cover images. Submit both URLs in Google Search Console after publishing.
