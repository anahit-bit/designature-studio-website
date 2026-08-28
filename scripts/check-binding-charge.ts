/**
 * Ameriabank vPOS self-test (SANDBOX). Run any time the bank says "try again":
 *
 *   npx tsx scripts/check-binding-charge.ts
 *
 * Sends the three requests that matter and prints a plain-language verdict:
 *   STEP 1  Single payment start   (InitPayment, no card saved)   → should be ACCEPTED
 *   STEP 2  Save-a-card start      (InitPayment + CardHolderID)    → should be ACCEPTED
 *   STEP 3  Charge a saved card    (MakeBindingPayment)            → the recurring charge
 *
 * STEP 1 + 2 only START a payment (no card is entered here, nothing is charged).
 * Read-only diagnostic — safe to run repeatedly.
 */
import dotenv from "dotenv";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
dotenv.config({ path: existsSync(".env") ? ".env" : "E:/Secrets/Website/.env" });
import { getAmeriaConfig } from "../services/payments/ameria";

const cfg = getAmeriaConfig();
const nextOrderId = () => 4423001 + Math.floor(Math.random() * 999);

async function post(fn: string, body: Record<string, unknown>) {
  const r = await fetch(`${cfg.baseUrl}api/VPOS/${fn}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await r.json()) as any;
}

(async () => {
  console.log("=== Ameriabank vPOS self-test (sandbox) ===");
  console.log(`Terminal: Username ${cfg.username}  ·  ClientID ${cfg.clientId}`);
  console.log(`Base URL: ${cfg.baseUrl}\n`);

  const single = await post("InitPayment", {
    ClientID: cfg.clientId, Username: cfg.username, Password: cfg.password,
    Amount: cfg.amount, OrderID: nextOrderId(), Currency: cfg.currency,
    Description: "self-test: single payment", BackURL: cfg.callbackUrl,
  });
  const singleOk = String(single?.ResponseCode) === "1";
  console.log("STEP 1 — Single (one-time) payment start  [InitPayment, no binding]");
  console.log(`  ResponseCode = ${single?.ResponseCode}  → ${singleOk ? "✓ ACCEPTED (normal one-time payments work)" : "✗ NOT accepted: " + (single?.ResponseMessage ?? "")}\n`);

  const chId = `selftest-${randomUUID()}`;
  const init = await post("InitPayment", {
    ClientID: cfg.clientId, Username: cfg.username, Password: cfg.password,
    Amount: cfg.amount, OrderID: nextOrderId(), Currency: cfg.currency,
    Description: "self-test: save a card", BackURL: cfg.callbackUrl, CardHolderID: chId,
  });
  const initOk = String(init?.ResponseCode) === "1";
  console.log("STEP 2 — Save-a-card start  [InitPayment + CardHolderID]");
  console.log(`  ResponseCode = ${init?.ResponseCode}  → ${initOk ? "✓ ACCEPTED (terminal can create card bindings)" : "✗ NOT accepted: " + (init?.ResponseMessage ?? "")}\n`);

  const charge = await post("MakeBindingPayment", {
    ClientID: cfg.clientId, Username: cfg.username, Password: cfg.password,
    CardHolderID: chId, Amount: cfg.amount, OrderID: nextOrderId(),
    Currency: cfg.currency, Description: "self-test: charge saved card",
    BackURL: cfg.callbackUrl, PaymentType: 6, Opaque: randomUUID(),
  });
  const msg = String(charge?.Description ?? charge?.ResponseMessage ?? "");
  const stillBlocked = /BindingMainRest is not available/i.test(msg);
  const chargeOk = String(charge?.ResponseCode) === "00" || String(charge?.ResponseCode) === "0";
  console.log("STEP 3 — Charge a saved card  [MakeBindingPayment]");
  console.log(`  ResponseCode = ${charge?.ResponseCode}  PaymentState = ${charge?.PaymentState ?? ""}  Message = "${msg}"\n`);

  console.log("──────────────────────────────────────────────");
  console.log(`Single payments:   ${singleOk ? "✓ WORK" : "✗ fail"}`);
  console.log(`Save a card:       ${initOk ? "✓ WORKS" : "✗ fails"}`);
  console.log(`Charge saved card: ${stillBlocked ? '✗ REFUSED — "BindingMainRest is not available"' : chargeOk ? "✓ CHARGED (ResponseCode 00)" : "→ changed, see message above"}`);
  console.log("──────────────────────────────────────────────");
  if (stillBlocked) {
    console.log('VERDICT: Only the RECURRING CHARGE is blocked. The bank must enable');
    console.log(`payment type "BindingMainRest" on terminal ${cfg.username} / ${cfg.clientId}.`);
  } else if (chargeOk) {
    console.log("VERDICT: 🎉 THE RECURRING CHARGE WORKS. The blocker is cleared.");
  } else {
    console.log('VERDICT: The "not available" error is GONE, but this test used an');
    console.log("unbound card so it can't fully charge. Run the full bind-then-charge test.");
  }
  console.log("──────────────────────────────────────────────");
})();
