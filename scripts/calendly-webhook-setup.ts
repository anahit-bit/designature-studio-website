/**
 * One-time Calendly webhook subscription setup.
 *
 * Creates an `invitee.created` + `invitee.canceled` subscription pointed at our
 * server, scoped to the organisation (so it fires for BOTH the free + paid event
 * types when they share one Calendly org). Generates a signing key, registers it,
 * and prints it — paste that into CALENDLY_WEBHOOK_SIGNING_KEY.
 *
 * Requires CALENDLY_ADMIN_TOKEN — a Personal Access Token with scopes:
 *   webhook_subscription:write, organization/user read, users:read
 *
 * Usage:
 *   npx tsx scripts/calendly-webhook-setup.ts            # org scope (default)
 *   npx tsx scripts/calendly-webhook-setup.ts --user     # user scope (paid-only)
 *   CALLBACK_URL=https://www.designature.studio/api/calendly/webhook npx tsx ...
 */
import dotenv from "dotenv";
import { existsSync } from "fs";
import crypto from "node:crypto";

const FALLBACK_ENV_PATH = "E:/Secrets/Website/.env";
dotenv.config({
  path: existsSync(".env") ? ".env" : existsSync(FALLBACK_ENV_PATH) ? FALLBACK_ENV_PATH : undefined,
});

const API = "https://api.calendly.com";
const CALLBACK_URL = (process.env.CALLBACK_URL || "https://www.designature.studio/api/calendly/webhook").trim();

async function cGet(token: string, url: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
  const text = await res.text();
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

async function main() {
  const token = (process.env.CALENDLY_ADMIN_TOKEN || "").trim();
  if (!token) {
    console.error("❌ CALENDLY_ADMIN_TOKEN not set. Create a Personal Access Token in Calendly (Integrations → API & webhooks) and add it to the env.");
    process.exit(1);
  }
  const userScope = process.argv.includes("--user");

  const me = await cGet(token, `${API}/users/me`);
  const user = me?.resource?.uri;
  const organization = me?.resource?.current_organization;
  console.log("Authenticated as:", me?.resource?.name, "| org:", organization);
  if (!organization) {
    console.error("❌ Could not resolve current_organization — the token needs users:read scope.");
    process.exit(1);
  }

  const signingKey = crypto.randomBytes(32).toString("hex");
  const body: Record<string, unknown> = {
    url: CALLBACK_URL,
    events: ["invitee.created", "invitee.canceled"],
    organization,
    scope: userScope ? "user" : "organization",
    signing_key: signingKey,
  };
  if (userScope) body.user = user;

  const res = await fetch(`${API}/webhook_subscriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`❌ Create webhook failed → ${res.status}: ${text.slice(0, 500)}`);
    process.exit(1);
  }
  const sub = JSON.parse(text)?.resource;
  console.log("\n✅ Webhook subscription created");
  console.log("   uri:     ", sub?.uri);
  console.log("   callback:", CALLBACK_URL);
  console.log("   events:  ", (sub?.events || []).join(", "));
  console.log("   scope:   ", sub?.scope);
  console.log("\n🔑 Add this to your env (Railway + E:/Secrets/Website/.env), then redeploy:");
  console.log(`   CALENDLY_WEBHOOK_SIGNING_KEY=${signingKey}\n`);
}

main().catch((e) => {
  console.error("❌", e?.message || e);
  process.exit(1);
});
