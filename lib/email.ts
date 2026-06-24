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

const apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
  console.warn(
    "[email] RESEND_API_KEY is not set — sendEmail() will throw on use. " +
      "Set it in E:/Secrets/Website/.env (see I-024 / B0).",
  );
}

// Resend's constructor tolerates an undefined key (it only fails at send time);
// we still construct it so the module imports cleanly when email isn't needed.
const resend = new Resend(apiKey);

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
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured — cannot send email.");
  }

  const { data, error } = await resend.emails.send({
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
