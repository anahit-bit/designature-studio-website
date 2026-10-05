# Prompt: wire monthly subscriptions on Ameriabank vPOS (card binding)

Copy everything below the line into a fresh Claude Code session opened in the target website's repository.
Do NOT paste real credentials into the prompt. Put them in the target site's local .env yourself.

---

You are implementing monthly recurring subscriptions on a website, using Ameriabank vPOS 3.1 card bindings. I already run this exact setup in production code on another site, Designature Studio. Your job is to reproduce it faithfully here, then prove it in the bank's sandbox. Read this whole brief before touching code.

## 0. Ground rules

1. Before writing code, inspect this repository (stack, framework, database, auth, how env vars load, where scheduled jobs live, test runner) and tell me in a short summary how you plan to map the design below onto it. If the stack is not Node, Express and Postgres, keep the behavior identical and adapt the idioms.
2. Never print, log, commit or send to the browser any value of AMERIA_CLIENT_USR, AMERIA_CLIENT_PASS or AMERIA_CLIENT_ID. Read them from environment variables only. Add placeholders (empty values) to .env.example, never real ones.
3. Everything that talks to the bank runs on the server. The browser only receives a redirect URL.
4. Work in sandbox mode only until I explicitly say otherwise. Any script that can create charges must refuse to run unless AMERIA_MODE resolves to sandbox.
5. Write unit tests for every pure decision function (listed below). Run the repo's tests, typecheck and linter before you report done.
6. Do not open a pull request unless I ask. Commit to the branch I name and push.
7. Ask me before doing anything irreversible or outward facing (production deploys, production env changes, emails to real users).

## 1. What the payment setup is

1. Gateway: Ameriabank vPOS 3.1, REST and JSON. All calls are POST to `${AMERIA_VPOS_BASE_URL}api/VPOS/<Function>`. Normalize the base URL so it ends with exactly one trailing slash.
2. The merchant terminal is a USD card terminal with card binding (recurring) enabled by the bank. Production charges are in USD (ISO currency code 840). The sandbox only accepts a fixed small amount in AMD (code 051), see section 3.
3. The same merchant credentials may be shared between my sites. That has consequences for OrderID uniqueness, see section 4. Confirm with me whether this site uses the same terminal credentials as Designature Studio or its own.
4. Card data never touches our servers. The customer enters the card on the bank's hosted page (ARCA, with 3DS). We only ever store a masked card number, an expiry and our own CardHolderID.

## 2. Environment variables (names only, I will supply the values)

```
AMERIA_MODE=sandbox                 # "production" switches to live; anything else means sandbox
AMERIA_VPOS_BASE_URL=               # gateway base URL, trailing slash optional
AMERIA_CLIENT_ID=
AMERIA_CLIENT_USR=
AMERIA_CLIENT_PASS=
AMERIA_CALLBACK_URL=                # public https URL of THIS site's callback route, see section 6
AMERIA_SANDBOX_AMOUNT=10
AMERIA_SANDBOX_CURRENCY=051
AMERIA_SANDBOX_ORDER_ID_MIN=4423001
AMERIA_SANDBOX_ORDER_ID_MAX=4424000
```

Critical gotcha: read these lazily inside a function (a getAmeriaConfig() that runs per call), never at module top level. On the reference site, dotenv loads after ES module imports are evaluated, so top level reads saw undefined. Same trap can exist here.

## 3. Sandbox versus production behavior

Sandbox (per Ameriabank's instructions):
1. Amount is forced to 10 AMD, currency "051", regardless of the real subscription price.
2. Every OrderID must be an integer inside 4423001 to 4424000. That is a window of only 1000 IDs per merchant.
3. Test card for the hosted page: number 4083060013681818, name "TEST CARD VPOS", expiry 05/28, CVV 233. A human must enter it once per binding, 3DS included.

Production:
1. Amount is the real subscription price in USD, currency "840".
2. OrderID has no range limit, it only has to be unique per merchant.

Implement one function, `resolveChargeAmount(priceUsd, mode)`, so no other code branches on mode. Sandbox returns `{amount: AMERIA_SANDBOX_AMOUNT or 10, currency: AMERIA_SANDBOX_CURRENCY or "051"}`. Production returns `{amount: priceUsd, currency: "840"}` and a non positive price returns amount 0 so the caller can reject it.

The subscription row always stores the real USD price. The sandbox figure is only what we hand the bank.

## 4. OrderID rules (this is where integrations break)

1. Ameria requires OrderID to be unique per merchant across every payment type.
2. Use ONE database sequence for all OrderIDs on this site (every table that creates a payment shares it), defaulting each table's order id column to `nextval('ameria_order_id_seq')`. Separate bigserial columns per table will hand the bank the same integer twice.
3. In sandbox the sequence must sit inside 4423001 to 4424000. Restart it into the window with a one off script that refuses to run if any existing row is already at or above the floor. In production no window applies, so the sequence just keeps counting up.
4. If this site shares the terminal with Designature Studio, both sites draw from the same 1000 ID window and the same uniqueness space. Designature Studio has already consumed part of the window. Do not guess. Ask me which slice of the window this site may use and restart this site's sequence into that slice, and make sure the slices cannot overlap. If the bank will give this site its own credentials instead, prefer that.
5. Also give every CardHolderID a site specific prefix (see section 5), because GetBindings lists bindings merchant wide.

## 5. The vPOS functions to wrap

Build a small module (on the reference site: services/payments/ameria.ts) with these functions. All use a 20 second timeout, send `Content-Type: application/json`, throw on transport errors or non 2xx, and throw if the response is not JSON. Callers map a throw to a clean 502 for the user.

1. `initPayment({orderId, description, opaque, cardHolderId?, amount, currency, backUrl})`
   Body: `ClientID, Username, Password, Amount, OrderID, Currency, Description, BackURL, Opaque`, plus `CardHolderID` when binding. Including CardHolderID is what makes the bank tokenise the card after the customer pays. Success is `ResponseCode == 1` and a non empty `PaymentID`. Response also has `ResponseMessage`.
2. `buildGatewayRedirectUrl(baseUrl, paymentId, lang="en")` returns `${base}Payments/Pay?id=<PaymentID>&lang=<lang>`. Pure function.
3. `getPaymentDetails(paymentId)`
   Body: `PaymentID, Username, Password`. Returns the authoritative state: `ResponseCode, ResponseMessage, PaymentState, Amount, DepositedAmount, ApprovedAmount, RefundedAmount, Currency, OrderID, Opaque, CardNumber, ExpDate, CardHolderID, BindingID, ClientEmail, ApprovalCode`.
4. `makeBindingPayment({cardHolderId, orderId, description, opaque, amount, currency})` is the recurring charge. No customer, no browser.
   Body: `ClientID, Username, Password, CardHolderID, Amount, OrderID, Currency, Description, BackURL, PaymentType: 6, Opaque`. Success is `ResponseCode == "00"` (after normalization). Response includes `PaymentID, PaymentState, OrderID, CardHolderID, BindingID, ApprovedAmount, CardNumber`.
5. `getBindings(paymentType=6)`
   Body: `ClientID, Username, Password, PaymentType`. The list arrives under the misspelled key `CardBindingFileds`, each item with `CardHolderID, CardPan, ExpDate` and the misspelled flag `IsAvtive`. Keep those spellings in the parser, they are how the bank sends them.
6. `deactivateBinding(cardHolderId, paymentType=6)`
   Body: `ClientID, Username, Password, CardHolderID, PaymentType`. Success is "00". Called on cancellation and on expiry after failed renewals.
7. `refundPayment(paymentId, amount)` (body: `PaymentID, Username, Password, Amount`) and `cancelPayment(paymentId)` (body: `PaymentID, Username, Password`, a full void, only valid within 72 hours of initialization). Admin only.

Pure helpers, each with unit tests:
1. `normalizeCode(code)`: null or empty gives null, "0" gives "00", otherwise the trimmed string.
2. `evaluatePaymentSuccess(details, expectedAmount, expectedCurrency)` returns `{ok, reasons[]}`. Every one of these must hold: normalized ResponseCode is "00"; PaymentState (trimmed, lowercased) equals `payment_deposited`; DepositedAmount (number or numeric string) is at least expectedAmount; Currency matches numerically (so "051" equals 51). Never trust the browser redirect parameters for success.

## 6. Subscription checkout flow

Route set (names are mine to choose here, but the callback path must match exactly what Ameriabank has registered for this site, so ask me):

1. `POST /api/subscriptions/subscribe` (requires a logged in user)
   1. Read only `plan` and `interval` from the request. The price is looked up on the server from the plan catalog. Never accept an amount from the client.
   2. Only monthly is supported in this build. Reject annual with a 400 and code `annual_not_supported`. Reason: renewals fire at current_period_end, so an annual term would give one grant per year, and the refill cadence needs separate design.
   3. One live subscription per user (status active or past_due). A second attempt returns 409 `already_subscribed`.
   4. Generate `cardHolderId` = a site specific prefix followed by a random UUID. Reuse this same value for every later charge of this subscription.
   5. In ONE transaction, insert a `subscriptions` row with status `pending` and a `subscription_payments` row with kind `initial`, status `pending`. The payment row's id is the Opaque value, and its sequence generated integer is the OrderID.
   6. Call `initPayment` with `cardHolderId`, the amount and currency from `resolveChargeAmount`, and `backUrl` set to this site's subscription callback URL. If ResponseCode is not 1 or PaymentID is missing, mark the payment `failed` and the subscription `expired`, and return 502. Otherwise store PaymentID on the payment row and return `{redirectUrl}`. The frontend does `window.location = redirectUrl`.
2. `GET <callback>` (the bank sends the customer's browser here; query params arrive as `orderID` and `opaque`, accept either letter case)
   1. Reject with a redirect to the failed page unless `opaque` is a valid UUID and both params exist.
   2. Look up the payment row by `ameria_order_id` AND `id = opaque` together.
   3. Idempotency: status `paid` redirects to success without doing anything again; status `failed` redirects to failed.
   4. Call `getPaymentDetails` with the stored PaymentID. If the returned Opaque is present and differs from the stored payment id, fail.
   5. Run `evaluatePaymentSuccess` against `resolveChargeAmount(subscription.amount_usd)`. If not ok, fail (log reasons server side only).
   6. On success: mark the payment `paid`; set the subscription `active`, `current_period_start = now()`, `current_period_end = now() + 1 month` (calendar correct, done in SQL), and store `binding_id` (BindingID, falling back to CardHolderID), `binding_card_pan` (CardNumber, masked), `binding_exp_date` (ExpDate); then grant the plan's entitlements to the user server side; then send a receipt email (a failed email must not undo the activation); redirect to the success page.
   7. If the database write fails AFTER the payment was captured, log it loudly and still grant access, because the customer has paid. Reconcile by hand.
3. `GET /api/subscriptions/me` returns plan, status, interval, amount, currentPeriodEnd, cancelAtPeriodEnd and the masked card.
4. `POST /api/subscriptions/cancel` sets `cancel_at_period_end = true` and `cancelled_at = now()`. Access continues to the end of the paid period, no partial refund.
5. `POST /api/subscriptions/reactivate` clears both fields while the period is still running.
6. `POST /api/admin/subscriptions/run-billing` (admin only) runs the billing sweep on demand, for testing and catch up.
7. Success and failed pages in the frontend (`/subscribe/success`, `/subscribe/failed`).

## 7. Database schema (Postgres)

Keep migrations idempotent. The column named `interval` is a reserved SQL word and must be double quoted in every statement.

```sql
CREATE SEQUENCE IF NOT EXISTS ameria_order_id_seq AS bigint START 1;

CREATE TABLE IF NOT EXISTS subscriptions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              text NOT NULL,
  tier                 text NOT NULL,            -- plan key
  "interval"           text NOT NULL,            -- 'monthly' for now
  amount_usd           numeric NOT NULL,         -- LOCKED at signup (grandfathering)
  status               text NOT NULL,            -- pending | active | past_due | cancelled | expired
  card_holder_id       text NOT NULL,            -- we generate it, we reuse it for every charge
  binding_id           text,
  binding_card_pan     text,                     -- masked
  binding_exp_date     text,
  current_period_start timestamptz NOT NULL,
  current_period_end   timestamptz NOT NULL,     -- the next charge date
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  cancelled_at         timestamptz,
  pending_change       jsonb,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status_period_end ON subscriptions (status, current_period_end);

CREATE TABLE IF NOT EXISTS subscription_payments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id   uuid NOT NULL REFERENCES subscriptions(id),
  user_id           text NOT NULL,
  ameria_order_id   bigint NOT NULL UNIQUE DEFAULT nextval('ameria_order_id_seq'),
  ameria_payment_id text,
  kind              text NOT NULL,               -- initial | renewal | proration | refund
  amount_usd        numeric NOT NULL,
  status            text NOT NULL DEFAULT 'pending',  -- pending | paid | failed | refunded
  response_code     text,
  attempt           integer NOT NULL DEFAULT 1,
  created_at        timestamptz NOT NULL DEFAULT now(),
  paid_at           timestamptz
);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_subscription ON subscription_payments (subscription_id, created_at);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_status ON subscription_payments (status);
```

Adapt user_id's type to this site's user key. Never delete payment rows, they are the audit trail.

## 8. The recurring engine (daily billing sweep)

A scheduled job calls `runSubscriptionBilling()`. On the reference site it is a timer started 90 seconds after boot and then every 24 hours; use the equivalent here (a cron or the host's scheduler is fine). Requirements:

1. Take a Postgres advisory lock (`pg_try_advisory_lock(hashtext('<site>-subscription-billing')::bigint)`) so only one instance runs. If the lock is held, skip. Always release it in `finally`.
2. Step one, finalize cancellations: for rows with status in (active, past_due), `cancel_at_period_end = true` and `current_period_end <= now()`, set status `cancelled`, call `deactivateBinding` (ignore its failure), revoke the user's paid entitlements, send an "ended as requested" email.
3. Step two, charge renewals: rows with status in (active, past_due), `cancel_at_period_end = false`, `current_period_end <= now()`. For each, call `processRenewal`:
   1. Idempotency check first: if a payment of kind `renewal`, status `paid`, created at or after `current_period_start` already exists, advance the period without charging again (crash recovery).
   2. Insert a `subscription_payments` row (kind `renewal`, status `pending`) BEFORE charging, to get the OrderID and an Opaque.
   3. Call `makeBindingPayment` with the stored `card_holder_id`, amount and currency from `resolveChargeAmount(subscription.amount_usd)`, description naming the plan, and Opaque = the payment row id. Treat a thrown error as a failed charge.
   4. Success (normalized code "00"): mark the payment `paid` with its PaymentID and `paid_at`; advance the period in SQL (`current_period_start = current_period_end`, `current_period_end = current_period_end + interval '1 month'`, status `active`); refill the plan's entitlements; send a renewal receipt.
   5. Failure: mark the payment `failed` with the response code, count failed renewals for this period. If the count reaches `MAX_DUNNING_ATTEMPTS` (3), set the subscription `expired`, deactivate the binding, revoke entitlements and email the customer. Otherwise set `past_due` and email "update your card". The daily sweep retries it the next day.
4. One failing subscription must never stop the loop. Catch per row and carry on.
5. The sweep returns `{charged, failed, expired, cancelled}` and logs it when nonzero.

Pure functions to unit test: `shouldExpireAfterFailure(failedAttempts, max=3)` is `failedAttempts >= max` (the count includes the attempt that just failed); `isRenewalDue(periodEndIso, nowIso)`; `addInterval(iso, interval)` for reference.

Grandfathering rule: renewals charge `amount_usd` stored on the row, never the live catalog price.

Entitlements: on the reference site a subscription grants a monthly credit allowance that REPLACES the previous month's bucket on each renewal (no rollover), which is why the grant can run on every renewal without compounding. Ask me what this site grants, and keep the grant idempotent in the same way.

## 9. Card update and expiry (build the minimum now, flag the rest)

1. `binding_card_pan` and `binding_exp_date` exist so the account page can show the card and warn before expiry.
2. Replacing a card means running a fresh `initPayment` with a new CardHolderID, then swapping it onto the subscription after the callback verifies. Tell me if you want me to scope this as a follow up rather than build it now.

## 10. Testing plan (sandbox only)

Do these in order and report the real output of each:

1. Unit tests for every pure function above, plus resolveChargeAmount in both modes.
2. A throwaway script with four stages that refuses to run unless sandbox:
   1. `init`: InitPayment with a generated CardHolderID, print the hosted page URL, save state to the OS temp directory. A human (me) opens the URL and pays once with the test card.
   2. `verify`: GetPaymentDetails on that payment, then GetBindings, confirm our CardHolderID is listed.
   3. `recur`: MakeBindingPayment on that CardHolderID with a fresh OrderID and no card entry. If it returns "00", the whole recurring premise is proven. This is the key test.
   4. `cleanup`: RefundPayment on both charges, then DeactivateBinding.
   OrderIDs for the script must also fall in the sandbox window and must not collide with anything the site itself has used.
3. End to end through the real routes: log in as a test user, subscribe, pay with the test card, confirm the callback activates it, entitlements are granted and the receipt email is sent.
4. Force a renewal: set the test subscription's `current_period_end` into the past with SQL, call `POST /api/admin/subscriptions/run-billing`, confirm a renewal payment row is `paid`, the period advanced by one month and entitlements refilled. Run the sweep a second time immediately and confirm nothing is charged twice.
5. Dunning: temporarily make the charge fail (for example point the subscription at a CardHolderID that does not exist), run the sweep three times across simulated days, confirm past_due after attempts one and two and expired after attempt three, with the binding deactivated.
6. Cancel and reactivate: cancel, confirm access continues, force the period end, run the sweep, confirm status `cancelled` and entitlements revoked. Separately confirm reactivate works before period end.
7. Replay safety: hit the callback URL twice with the same params and confirm the second hit changes nothing.
8. Refund the sandbox charges afterwards.

## 11. Going to production (do not do this until I say so)

1. I request production credentials and a USD terminal confirmation from Ameriabank, and confirm card binding is enabled on that terminal.
2. Ameriabank must have this site's callback URL and domain registered. Ask me whether that is done.
3. Set AMERIA_MODE=production and the production credentials in the host's environment, never in the repository.
4. Verify `resolveChargeAmount` now returns the real USD price with currency "840".
5. Run one real low risk charge and refund before opening to customers.

## 12. Things I need you to ask me before you start coding

1. Does this site use the same Ameriabank credentials as Designature Studio, or its own? (Decides the OrderID window slice.)
2. What is the exact public callback URL registered with the bank for this site?
3. What does a subscription grant on this site, and what are the plan names and monthly prices in USD?
4. Where do plans and prices live (code, CMS, database)?
5. What is the auth mechanism and user key on this site?
6. What email provider does this site use for receipts?
7. Do I want the card update flow now or later?

When you finish, give me: a list of files created or changed, the env vars I must set, the exact commands to run the migration and the sandbox sequence restart, and the real results of each step in section 10.
