/**
 * THROWAWAY SPIKE — prove the Ameriabank vPOS card-binding (recurring) round-trip
 * works with our SANDBOX terminal, before building the subscription rail.
 *
 * The first bind needs a human on the hosted page (card entry + 3DS), so this is
 * run in stages:
 *
 *   npx tsx scripts/binding-spike.ts init
 *       → InitPayment WITH a generated CardHolderID. Prints the hosted-page URL
 *         and saves state. A HUMAN then opens the URL and pays with the SANDBOX
 *         TEST CARD once (this creates the binding).
 *
 *   npx tsx scripts/binding-spike.ts verify
 *       → GetPaymentDetails on the first payment (confirm it deposited + a
 *         CardHolderID/BindingID came back) + GetBindings (list saved cards).
 *
 *   npx tsx scripts/binding-spike.ts recur
 *       → MakeBindingPayment on the saved CardHolderID with a FRESH OrderID and
 *         NO card entry. ★ THE KEY TEST ★ — if this returns "00" the whole
 *         recurring premise is proven. Then GetPaymentDetails on the new charge.
 *
 *   npx tsx scripts/binding-spike.ts cleanup
 *       → RefundPayment on both charges + DeactivateBinding.
 *
 * GUARDRAIL: refuses to run unless AMERIA_MODE resolves to sandbox. Never prod.
 * State lives in the OS temp dir — nothing here is committed or shipped.
 */
import dotenv from "dotenv";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

// Same env-load order as server.ts (local .env, else the secrets fallback).
const FALLBACK_ENV_PATH = "E:/Secrets/Website/.env";
dotenv.config({
  path: existsSync(".env") ? ".env" : existsSync(FALLBACK_ENV_PATH) ? FALLBACK_ENV_PATH : undefined,
});

import {
  getAmeriaConfig,
  buildGatewayRedirectUrl,
  initPayment,
  getPaymentDetails,
  makeBindingPayment,
  getBindings,
  refundPayment,
  deactivateBinding,
  evaluatePaymentSuccess,
  normalizeCode,
} from "../services/payments/ameria";

const STATE_FILE = join(tmpdir(), "ameria-binding-spike.json");
const TEST_CARD = "4083060013681818 · TEST CARD VPOS · 05/28 · CVV 233";
// Sandbox OrderID must fall in 4423001..4424000. Derive a fresh one per call.
const nextSandboxOrderId = () => 4423001 + (Date.now() % 1000);

type State = {
  cardHolderId: string;
  initOrderId: number;
  initPaymentId: string | null;
  recurOrderId?: number;
  recurPaymentId?: string | null;
};

function loadState(): State {
  if (!existsSync(STATE_FILE)) {
    throw new Error(`No spike state at ${STATE_FILE}. Run \`init\` first.`);
  }
  return JSON.parse(readFileSync(STATE_FILE, "utf8"));
}
function saveState(s: State) {
  writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));
}

function assertSandbox() {
  const cfg = getAmeriaConfig();
  if (cfg.mode !== "sandbox") {
    console.error("✋ Refusing to run: AMERIA_MODE is not sandbox. This spike never touches production.");
    process.exit(1);
  }
  if (!cfg.baseUrl || !cfg.clientId || !cfg.username || !cfg.password) {
    console.error("✋ Ameria env incomplete. Missing base URL / client id / username / password.");
    console.error(
      `   baseUrl=${cfg.baseUrl ? "set" : "MISSING"} clientId=${cfg.clientId ? "set" : "MISSING"} ` +
        `user=${cfg.username ? "set" : "MISSING"} pass=${cfg.password ? "set" : "MISSING"}`,
    );
    process.exit(1);
  }
  return cfg;
}

async function cmdInit() {
  const cfg = assertSandbox();
  const cardHolderId = `spike-${randomUUID()}`;
  const orderId = nextSandboxOrderId();
  const opaque = randomUUID();
  console.log(`→ InitPayment (bind) mode=${cfg.mode} amount=${cfg.amount} currency=${cfg.currency} orderId=${orderId}`);
  console.log(`  CardHolderID=${cardHolderId}`);

  const res = await initPayment({
    orderId,
    description: "Binding spike — subscription card bind (sandbox)",
    opaque,
    cardHolderId,
  });
  console.log(`  ResponseCode=${res.responseCode} (InitPayment success = 1)  msg=${res.responseMessage ?? ""}`);
  console.log(`  PaymentID=${res.paymentId}`);

  if (String(res.responseCode) !== "1" || !res.paymentId) {
    console.error("✗ InitPayment did not succeed — cannot proceed. Raw:", JSON.stringify(res.raw));
    process.exit(1);
  }
  saveState({ cardHolderId, initOrderId: orderId, initPaymentId: res.paymentId });

  const url = buildGatewayRedirectUrl(cfg.baseUrl, res.paymentId, "en");
  console.log("\n✅ InitPayment-with-CardHolderID ACCEPTED. The binding request shape works.\n");
  console.log("NEXT — a human opens this URL and pays ONCE with the sandbox test card:");
  console.log(`\n  ${url}\n`);
  console.log(`  Test card: ${TEST_CARD}\n`);
  console.log("Then run:  npx tsx scripts/binding-spike.ts verify");
}

async function cmdVerify() {
  assertSandbox();
  const st = loadState();
  if (!st.initPaymentId) throw new Error("No initPaymentId in state.");
  const cfg = getAmeriaConfig();

  console.log(`→ GetPaymentDetails for the first (bind) payment ${st.initPaymentId}`);
  const d = await getPaymentDetails(st.initPaymentId);
  const evalRes = evaluatePaymentSuccess(d, cfg.amount, cfg.currency);
  console.log(`  ResponseCode=${d.ResponseCode}  PaymentState=${d.PaymentState}  Deposited=${d.DepositedAmount}`);
  console.log(`  CardHolderID=${(d as any).CardHolderID ?? "(none)"}  BindingID=${(d as any).BindingID ?? "(none)"}  Card=${d.CardNumber ?? ""}`);
  console.log(`  Deposited-payment check: ${evalRes.ok ? "✅ ok" : "✗ " + evalRes.reasons.join("; ")}`);

  console.log(`\n→ GetBindings (PaymentType 6)`);
  const b = await getBindings();
  console.log(`  ResponseCode=${b.responseCode}  count=${b.bindings.length}`);
  for (const c of b.bindings) {
    console.log(`   • CardHolderID=${c.CardHolderID} pan=${c.CardPan} exp=${c.ExpDate} active=${c.IsAvtive}`);
  }
  const ours = b.bindings.find((c) => c.CardHolderID === st.cardHolderId);
  if (ours) {
    console.log(`\n✅ Our binding is present (${ours.CardPan}, exp ${ours.ExpDate}). Ready to recur.`);
    console.log("Then run:  npx tsx scripts/binding-spike.ts recur");
  } else if ((d as any).CardHolderID) {
    console.log("\n⚠️ Binding not in GetBindings list yet, but the payment carries a CardHolderID. Try `recur` anyway.");
  } else {
    console.log("\n✗ No binding found. Was the hosted-page payment completed with the test card?");
  }
}

async function cmdRecur() {
  const cfg = assertSandbox();
  const st = loadState();
  const orderId = nextSandboxOrderId();
  console.log(`★ MakeBindingPayment — recurring charge, NO card entry.`);
  console.log(`  CardHolderID=${st.cardHolderId}  orderId=${orderId}  amount=${cfg.amount} ${cfg.currency}`);

  const res = await makeBindingPayment({
    cardHolderId: st.cardHolderId,
    orderId,
    description: "Binding spike — recurring charge (sandbox)",
    opaque: randomUUID(),
  });
  console.log(`  ResponseCode=${res.responseCode}  PaymentState=${res.paymentState}  PaymentID=${res.paymentId}`);
  console.log(`  ApprovedAmount=${res.approvedAmount}  Card=${res.cardNumber ?? ""}  BindingID=${res.bindingId ?? ""}`);

  st.recurOrderId = orderId;
  st.recurPaymentId = res.paymentId;
  saveState(st);

  if (normalizeCode(res.responseCode) === "00") {
    console.log("\n🎉 RECURRING CHARGE APPROVED with no card entry. The binding premise is PROVEN.");
    if (res.paymentId) {
      const d = await getPaymentDetails(res.paymentId);
      console.log(`  Verify: PaymentState=${d.PaymentState} Deposited=${d.DepositedAmount} RC=${d.ResponseCode}`);
    }
    console.log("\nWhen done:  npx tsx scripts/binding-spike.ts cleanup");
  } else {
    console.error("\n✗ MakeBindingPayment did not return 00. Raw:", JSON.stringify(res.raw));
    process.exit(1);
  }
}

async function cmdCleanup() {
  const cfg = assertSandbox();
  const st = loadState();
  for (const [label, pid] of [["init", st.initPaymentId], ["recur", st.recurPaymentId]] as const) {
    if (!pid) continue;
    try {
      const r = await refundPayment(pid, cfg.amount);
      console.log(`↩ refund ${label} ${pid}: ${r.responseCode} ${r.responseMessage ?? ""}`);
    } catch (e) {
      console.log(`↩ refund ${label} ${pid}: error ${(e as Error).message}`);
    }
  }
  try {
    const d = await deactivateBinding(st.cardHolderId);
    console.log(`⛔ DeactivateBinding ${st.cardHolderId}: ${d.responseCode} ${d.responseMessage ?? ""}`);
  } catch (e) {
    console.log(`⛔ DeactivateBinding: error ${(e as Error).message}`);
  }
}

const cmd = process.argv[2];
const run = { init: cmdInit, verify: cmdVerify, recur: cmdRecur, cleanup: cmdCleanup }[cmd ?? ""];
if (!run) {
  console.log("Usage: npx tsx scripts/binding-spike.ts <init|verify|recur|cleanup>");
  process.exit(1);
}
run().catch((e) => {
  console.error("SPIKE ERROR:", e);
  process.exit(1);
});
