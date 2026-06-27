/**
 * Payments — transactional email helper (I-024 / B0).
 *
 * Thin wrapper over Resend. This is the project's FIRST server-side email path
 * (feedback/testimonials go through a Google Apps Script; EmailJS is client-side
 * only). Both payment rails use it: Rail B sends the consultation confirmation
 * with the private Calendly link; Rail A sends payment-failed notices.
 *
 * Sends from the verified domain sender. Throws on failure so the caller decides
 * how to handle (e.g. a payment callback logs and still completes the order — a
 * dropped email must never lose a paid order).
 *
 * Env: RESEND_API_KEY (loaded by server.ts's dotenv call). designature.studio is
 * verified in Resend so the From address below is deliverable.
 */
import { Resend } from "resend";

/** Verified sender for all studio transactional mail. */
export const FROM_ADDRESS = "Designature Studio <hello@designature.studio>";

// IMPORTANT — lazy key read (same ESM-vs-dotenv trap fixed in db/pgPool.ts):
// ESM evaluates an imported module's top-level statements BEFORE the importing
// module's body, and server.ts loads env via a top-level dotenv.config(). Reading
// RESEND_API_KEY at import time would therefore see it undefined when server.ts
// statically imports this file. So we read the key + construct Resend lazily on
// first sendEmail() call, by which point dotenv has run.
let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn(
        "[email] RESEND_API_KEY is not set — sendEmail() will throw on use. " +
          "Set it in E:/Secrets/Website/.env (see I-024 / B0).",
      );
    }
    // Resend's constructor tolerates an undefined key (it only fails at send time).
    _resend = new Resend(apiKey);
  }
  return _resend;
}

export interface SendEmailArgs {
  /** Recipient address (single recipient). */
  to: string;
  subject: string;
  /** Full HTML body. */
  html: string;
}

/**
 * Send one transactional email from the studio's verified sender.
 * Resolves with Resend's message id on success; throws on any failure.
 */
export async function sendEmail({ to, subject, html }: SendEmailArgs): Promise<{ id: string }> {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured — cannot send email.");
  }

  const { data, error } = await getResend().emails.send({
    from: FROM_ADDRESS,
    to,
    subject,
    html,
  });

  if (error) {
    throw new Error(`Resend send failed: ${error.name}: ${error.message}`);
  }
  if (!data?.id) {
    throw new Error("Resend send returned no message id.");
  }

  return { id: data.id };
}
