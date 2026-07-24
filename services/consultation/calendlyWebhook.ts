/**
 * Calendly webhook verification + payload parsing (pure — unit-tested).
 *
 * Calendly signs each webhook with `Calendly-Webhook-Signature: t=<unix>,v1=<hex>`
 * where v1 = HMAC-SHA256( `${t}.${rawBody}` , signingKey ). The signing key is
 * returned once when the subscription is created (see scripts/calendly-webhook-setup.ts)
 * and stored in CALENDLY_WEBHOOK_SIGNING_KEY. We verify the HMAC (timing-safe) and
 * a freshness window before acting, so forged/replayed calls can't inject contacts.
 */
import crypto from "node:crypto";

export function parseSignatureHeader(header: string | undefined | null): { t?: string; v1?: string } {
  const out: { t?: string; v1?: string } = {};
  for (const part of String(header || "").split(",")) {
    const idx = part.indexOf("=");
    if (idx <= 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k === "t") out.t = v;
    else if (k === "v1") out.v1 = v;
  }
  return out;
}

/** Verify a Calendly webhook signature. Returns true only on a fresh, valid HMAC. */
export function verifyCalendlySignature(
  rawBody: string | Buffer,
  header: string | undefined | null,
  signingKey: string,
  toleranceSec = 300,
  nowMs: number = Date.now(),
): boolean {
  if (!signingKey) return false;
  const { t, v1 } = parseSignatureHeader(header);
  if (!t || !v1) return false;

  const bodyStr = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : String(rawBody);
  const expected = crypto.createHmac("sha256", signingKey).update(`${t}.${bodyStr}`).digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(v1, "utf8");
  if (a.length !== b.length) return false;
  if (!crypto.timingSafeEqual(a, b)) return false;

  if (toleranceSec > 0) {
    const ts = Number(t) * 1000;
    if (!Number.isFinite(ts) || Math.abs(nowMs - ts) > toleranceSec * 1000) return false;
  }
  return true;
}

export interface ParsedWebhook {
  /** e.g. "invitee.created" | "invitee.canceled" */
  event: string;
  /** The invitee object (email/name/uri/status/created_at/…) for normalizeBooking. */
  invitee: any;
  /** The scheduled_event object (uri/name/start_time/event_type/…) for normalizeBooking. */
  scheduledEvent: any;
}

/** Pull the pieces we need out of a Calendly webhook body. Returns null if malformed. */
export function parseWebhookPayload(body: any): ParsedWebhook | null {
  const event = String(body?.event || "").trim();
  const payload = body?.payload;
  if (!event || !payload || typeof payload !== "object") return null;
  const scheduledEvent = payload.scheduled_event;
  if (!scheduledEvent || typeof scheduledEvent !== "object") return null;
  // The invitee fields sit at the top level of `payload`.
  return { event, invitee: payload, scheduledEvent };
}
