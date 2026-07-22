/**
 * Ameriabank vPOS 3.1 — REST/JSON client (Rail B / I-025).
 *
 * Wraps the three payment functions the consultation flow needs:
 *   - InitPayment       → reserve a payment, get a PaymentID + hosted-page redirect
 *   - GetPaymentDetails → server-side verification of the real payment state
 *   - RefundPayment     → admin-triggered refund
 *
 * The legacy WooCommerce brief assumed SOAP; the 3.1 doc (received 2026-06-16)
 * confirms the MAIN flow is REST/JSON under `${AMERIA_VPOS_BASE_URL}api/VPOS/`.
 * Only the admin reconciliation listing uses SOAP — out of scope here.
 *
 * SECURITY: credentials (ClientID/Username/Password) live in env and are read
 * lazily inside getConfig() — NEVER at module top level (server.ts loads env via
 * a top-level dotenv.config() that runs AFTER ESM imports are evaluated; reading
 * env at import time would see it undefined — same trap fixed in db/pgPool.ts).
 * Nothing in this module is ever sent to the browser.
 *
 * SANDBOX vs PRODUCTION (per Ameriabank 2026-06-17 instructions):
 *   - sandbox: amount forced to 10 AMD (currency 051); OrderID must fall in the
 *     range 4423001..4424000 (handled at the DB layer via a sequence restart, so
 *     the bigserial `ameria_order_id` is already in range — this module just
 *     sends whatever OrderID it's given).
 *   - production: amount = CONSULTATION_PRICE_USD; currency 840 (USD); OrderID
 *     unconstrained (the bigserial value).
 */

/** Numeric ISO-4217 currency codes the gateway expects as strings. */
export const CURRENCY_AMD = "051";
export const CURRENCY_USD = "840";

export type AmeriaMode = "sandbox" | "production";

export interface AmeriaConfig {
  baseUrl: string; // always ends with a single trailing slash
  clientId: string;
  username: string;
  password: string;
  callbackUrl: string;
  mode: AmeriaMode;
  /** The amount + currency to charge, already resolved for the active mode. */
  amount: number;
  currency: string;
}

/**
 * Read + resolve all Ameria config from env, lazily (see module doc). Resolves
 * the mode-dependent amount + currency so callers never branch on mode.
 */
export function getAmeriaConfig(): AmeriaConfig {
  const mode: AmeriaMode = process.env.AMERIA_MODE === "production" ? "production" : "sandbox";

  const baseUrlRaw = (process.env.AMERIA_VPOS_BASE_URL || "").trim();
  // Normalise to exactly one trailing slash so `${base}api/VPOS/...` is correct
  // whether or not the env value already has one.
  const baseUrl = baseUrlRaw ? baseUrlRaw.replace(/\/+$/, "") + "/" : "";

  const { amount, currency } = resolveAmountAndCurrency(mode);

  return {
    baseUrl,
    clientId: (process.env.AMERIA_CLIENT_ID || "").trim(),
    username: (process.env.AMERIA_CLIENT_USR || "").trim(),
    password: (process.env.AMERIA_CLIENT_PASS || "").trim(),
    callbackUrl: (process.env.AMERIA_CALLBACK_URL || "").trim(),
    mode,
    amount,
    currency,
  };
}

/**
 * Mode-aware amount + currency. PURE (env-driven but no I/O) so it's unit-tested.
 *   sandbox    → AMERIA_SANDBOX_AMOUNT (default 10) AMD / AMERIA_SANDBOX_CURRENCY (051)
 *   production → CONSULTATION_PRICE_USD USD (840)
 */
export function resolveAmountAndCurrency(mode: AmeriaMode): { amount: number; currency: string } {
  if (mode === "sandbox") {
    const amount = Number(process.env.AMERIA_SANDBOX_AMOUNT || "10");
    const currency = (process.env.AMERIA_SANDBOX_CURRENCY || CURRENCY_AMD).trim();
    return { amount: Number.isFinite(amount) && amount > 0 ? amount : 10, currency };
  }
  const amount = Number(process.env.CONSULTATION_PRICE_USD || "99");
  return { amount: Number.isFinite(amount) && amount > 0 ? amount : 99, currency: CURRENCY_USD };
}

/** Minimal, deliberately conservative email check for the booking form. */
export function isValidEmail(email: unknown): email is string {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && email.trim().length <= 254;
}

/**
 * The browser redirect to the hosted ARCA payment page after InitPayment.
 * PURE so it's testable without a network round-trip.
 */
export function buildGatewayRedirectUrl(baseUrl: string, paymentId: string, lang = "en"): string {
  const base = baseUrl.replace(/\/+$/, "") + "/";
  return `${base}Payments/Pay?id=${encodeURIComponent(paymentId)}&lang=${encodeURIComponent(lang)}`;
}

// ── REST response shapes (only the fields we use are typed) ──────────────────

export interface InitPaymentResult {
  paymentId: string | null;
  responseCode: number | string | null;
  responseMessage: string | null;
  /** The raw body, kept for logging/diagnostics. */
  raw: unknown;
}

export interface PaymentDetails {
  ResponseCode?: string | number;
  ResponseMessage?: string;
  PaymentState?: string;
  Amount?: number | string;
  DepositedAmount?: number | string;
  ApprovedAmount?: number | string;
  RefundedAmount?: number | string;
  Currency?: number | string;
  OrderID?: number | string;
  OrderStatus?: number | string;
  Opaque?: string;
  ClientEmail?: string;
  ClientName?: string;
  CardNumber?: string;
  ApprovalCode?: string;
  rrn?: string;
  DateTime?: string;
  Description?: string;
  [k: string]: unknown;
}

export interface RefundResult {
  responseCode: string | number | null;
  responseMessage: string | null;
  raw: unknown;
}

/** CancelPayment shares RefundPayment's response shape ({ ResponseCode, ResponseMessage, Opaque }). */
export type CancelResult = RefundResult;

const VPOS_TIMEOUT_MS = 20_000;

/** POST JSON to a vPOS REST endpoint with a hard timeout. Throws on transport
 *  failure; the caller maps a thrown error to a clean 502. */
async function postJson(url: string, body: Record<string, unknown>): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), VPOS_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    let parsed: any = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      throw new Error(`vPOS returned non-JSON (${res.status}): ${text.slice(0, 300)}`);
    }
    if (!res.ok) {
      throw new Error(`vPOS HTTP ${res.status}: ${JSON.stringify(parsed).slice(0, 300)}`);
    }
    return parsed;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * InitPayment — reserve a payment and obtain a PaymentID. The OrderID passed in
 * is our `orders.ameria_order_id` (bigserial, already in the sandbox range via
 * the seq restart). Opaque carries our UUID `orders.id`; the bank echoes it back
 * on the callback for cross-checking.
 */
export async function initPayment(args: {
  orderId: number | string;
  description: string;
  opaque: string;
  /**
   * When present, InitPayment registers a card BINDING under this ID: after the
   * customer completes this first (CIT + 3DS) payment on the hosted page, the
   * card is tokenised to `cardHolderId` and can be charged later, without any
   * card entry, via `makeBindingPayment`. Omit for one-off payments (the
   * consultation flow). This is the entry point for the subscription rail.
   */
  cardHolderId?: string;
}): Promise<InitPaymentResult> {
  const cfg = getAmeriaConfig();
  if (!cfg.baseUrl || !cfg.clientId || !cfg.username || !cfg.password) {
    throw new Error("Ameria vPOS env is incomplete (base URL / client id / username / password).");
  }
  const url = `${cfg.baseUrl}api/VPOS/InitPayment`;
  const body: Record<string, unknown> = {
    ClientID: cfg.clientId,
    Username: cfg.username,
    Password: cfg.password,
    Amount: cfg.amount,
    OrderID: args.orderId,
    Currency: cfg.currency,
    Description: args.description,
    BackURL: cfg.callbackUrl,
    Opaque: args.opaque,
  };
  if (args.cardHolderId) body.CardHolderID = args.cardHolderId;
  const raw = await postJson(url, body);
  return {
    paymentId: raw?.PaymentID ?? null,
    responseCode: raw?.ResponseCode ?? null,
    responseMessage: raw?.ResponseMessage ?? null,
    raw,
  };
}

/** GetPaymentDetails — the authoritative, server-side payment state. */
export async function getPaymentDetails(paymentId: string): Promise<PaymentDetails> {
  const cfg = getAmeriaConfig();
  const url = `${cfg.baseUrl}api/VPOS/GetPaymentDetails`;
  const raw = await postJson(url, {
    PaymentID: paymentId,
    Username: cfg.username,
    Password: cfg.password,
  });
  return raw as PaymentDetails;
}

/** RefundPayment — full or partial refund (admin-gated upstream). */
export async function refundPayment(paymentId: string, amount: number): Promise<RefundResult> {
  const cfg = getAmeriaConfig();
  const url = `${cfg.baseUrl}api/VPOS/RefundPayment`;
  const raw = await postJson(url, {
    PaymentID: paymentId,
    Username: cfg.username,
    Password: cfg.password,
    Amount: amount,
  });
  return {
    responseCode: raw?.ResponseCode ?? null,
    responseMessage: raw?.ResponseMessage ?? null,
    raw,
  };
}

/**
 * CancelPayment — void a payment and return the funds to the cardholder.
 * Body is { PaymentID, Username, Password } (no Amount — cancel is a full void,
 * unlike the partial-capable RefundPayment). Per the vPOS 3.1 doc this is only
 * available within 72 hours of payment initialization.
 */
export async function cancelPayment(paymentId: string): Promise<CancelResult> {
  const cfg = getAmeriaConfig();
  const url = `${cfg.baseUrl}api/VPOS/CancelPayment`;
  const raw = await postJson(url, {
    PaymentID: paymentId,
    Username: cfg.username,
    Password: cfg.password,
  });
  return {
    responseCode: raw?.ResponseCode ?? null,
    responseMessage: raw?.ResponseMessage ?? null,
    raw,
  };
}

// ── Binding (recurring) transactions ────────────────────────────────────────
// The subscription rail. A card is bound once via initPayment({cardHolderId})
// (CIT + 3DS on the hosted page); thereafter makeBindingPayment charges it
// server-to-server (MIT — no customer, no browser). PaymentType 6 = Binding.

/** vPOS PaymentType enum value for binding transactions. */
export const PAYMENT_TYPE_BINDING = 6;

export interface BindingPaymentResult {
  paymentId: string | null;
  responseCode: string | number | null;
  responseMessage: string | null;
  paymentState: string | null;
  orderId: string | number | null;
  cardHolderId: string | null;
  bindingId: string | null;
  approvedAmount: number | string | null;
  cardNumber: string | null;
  raw: unknown;
}

export interface CardBinding {
  CardHolderID?: string;
  CardPan?: string;
  ExpDate?: string;
  IsAvtive?: boolean; // (sic) — spelled this way in the vPOS 3.1 response
}

export interface GetBindingsResult {
  responseCode: string | number | null;
  responseMessage: string | null;
  bindings: CardBinding[];
  raw: unknown;
}

/**
 * MakeBindingPayment — charge a previously-bound card with NO customer
 * interaction (the recurring engine). `cardHolderId` must already have a
 * successful bound payment behind it (see initPayment). OrderID must be fresh
 * and unique per charge (in sandbox, within the allowed range). Success = "00".
 */
export async function makeBindingPayment(args: {
  cardHolderId: string;
  orderId: number | string;
  description: string;
  opaque: string;
  /** Override the amount (e.g. a proration). Defaults to the mode's amount. */
  amount?: number;
  /** Override the currency. Defaults to the mode's currency. */
  currency?: string;
}): Promise<BindingPaymentResult> {
  const cfg = getAmeriaConfig();
  if (!cfg.baseUrl || !cfg.clientId || !cfg.username || !cfg.password) {
    throw new Error("Ameria vPOS env is incomplete (base URL / client id / username / password).");
  }
  const url = `${cfg.baseUrl}api/VPOS/MakeBindingPayment`;
  const raw = await postJson(url, {
    ClientID: cfg.clientId,
    Username: cfg.username,
    Password: cfg.password,
    CardHolderID: args.cardHolderId,
    Amount: args.amount ?? cfg.amount,
    OrderID: args.orderId,
    Currency: args.currency ?? cfg.currency,
    Description: args.description,
    BackURL: cfg.callbackUrl,
    PaymentType: PAYMENT_TYPE_BINDING,
    Opaque: args.opaque,
  });
  return {
    paymentId: raw?.PaymentID ?? null,
    responseCode: raw?.ResponseCode ?? null,
    responseMessage: raw?.ResponseMessage ?? null,
    paymentState: raw?.PaymentState ?? null,
    orderId: raw?.OrderID ?? null,
    cardHolderId: raw?.CardHolderID ?? null,
    bindingId: raw?.BindingID ?? null,
    approvedAmount: raw?.ApprovedAmount ?? null,
    cardNumber: raw?.CardNumber ?? null,
    raw,
  };
}

/** GetBindings — list the cards bound for this merchant (PaymentType 6). Used to
 *  read a saved card's masked PAN + expiry (for the "update card" prompt). */
export async function getBindings(paymentType = PAYMENT_TYPE_BINDING): Promise<GetBindingsResult> {
  const cfg = getAmeriaConfig();
  const url = `${cfg.baseUrl}api/VPOS/GetBindings`;
  const raw = await postJson(url, {
    ClientID: cfg.clientId,
    Username: cfg.username,
    Password: cfg.password,
    PaymentType: paymentType,
  });
  return {
    responseCode: raw?.ResponseCode ?? null,
    responseMessage: raw?.ResponseMessage ?? null,
    bindings: Array.isArray(raw?.CardBindingFileds) ? raw.CardBindingFileds : [],
    raw,
  };
}

/** DeactivateBinding — switch a saved card off (used on cancellation). Success = "00". */
export async function deactivateBinding(
  cardHolderId: string,
  paymentType = PAYMENT_TYPE_BINDING,
): Promise<RefundResult> {
  const cfg = getAmeriaConfig();
  const url = `${cfg.baseUrl}api/VPOS/DeactivateBinding`;
  const raw = await postJson(url, {
    ClientID: cfg.clientId,
    Username: cfg.username,
    Password: cfg.password,
    CardHolderID: cardHolderId,
    PaymentType: paymentType,
  });
  return {
    responseCode: raw?.ResponseCode ?? null,
    responseMessage: raw?.ResponseMessage ?? null,
    raw,
  };
}

/** vPOS "Approved" response code (Table 1). */
export const APPROVED_RESPONSE_CODE = "00";
/** vPOS payment state for a captured single-stage payment (Table 2, code 2). */
export const DEPOSITED_STATE = "payment_deposited";

/**
 * Decide whether GetPaymentDetails describes a genuinely completed payment.
 * PURE — no I/O — so the success criteria are unit-tested independently of the
 * network. We DELIBERATELY do not trust the browser-redirect responseCode; this
 * runs against the server-fetched details.
 *
 * Criteria (per vPOS 3.1 spec, Tables 1 + 2):
 *   - ResponseCode === "00"                  (Approved)
 *   - PaymentState === "payment_deposited"   (captured)
 *   - DepositedAmount >= expectedAmount      (captured at least what we asked)
 *   - Currency === expectedCurrency          (right currency)
 */
export function evaluatePaymentSuccess(
  details: PaymentDetails,
  expectedAmount: number,
  expectedCurrency: string,
): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];

  const code = normalizeCode(details.ResponseCode);
  if (code !== APPROVED_RESPONSE_CODE) {
    reasons.push(`ResponseCode ${code ?? "(missing)"} != ${APPROVED_RESPONSE_CODE}`);
  }

  const state = (details.PaymentState ?? "").toString().trim().toLowerCase();
  if (state !== DEPOSITED_STATE) {
    reasons.push(`PaymentState "${state || "(missing)"}" != ${DEPOSITED_STATE}`);
  }

  const deposited = toNumber(details.DepositedAmount);
  if (deposited === null || deposited < expectedAmount) {
    reasons.push(`DepositedAmount ${details.DepositedAmount ?? "(missing)"} < expected ${expectedAmount}`);
  }

  if (!currencyMatches(details.Currency, expectedCurrency)) {
    reasons.push(`Currency ${details.Currency ?? "(missing)"} != ${expectedCurrency}`);
  }

  return { ok: reasons.length === 0, reasons };
}

/** Normalise a vPOS response code to a comparable string ("0"→"00", 0→"00"). */
export function normalizeCode(code: unknown): string | null {
  if (code === null || code === undefined) return null;
  const s = String(code).trim();
  if (s === "") return null;
  // "0" and "00" both mean approved depending on the field; canonicalise to "00".
  if (s === "0") return "00";
  return s;
}

function toNumber(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Currency may come back as "051", 51, "840", 840, etc. — compare numerically. */
function currencyMatches(actual: unknown, expected: string): boolean {
  const a = toNumber(actual);
  const e = toNumber(expected);
  if (a !== null && e !== null) return a === e;
  return String(actual ?? "").trim() === String(expected).trim();
}
