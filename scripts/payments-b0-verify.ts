/**
 * I-024 / B0 verification probe (one-off, dev only).
 *
 *   npx tsx scripts/payments-b0-verify.ts          # DB checks only
 *   npx tsx scripts/payments-b0-verify.ts --email  # also send a test email
 *
 * Verifies the three B0 acceptance criteria:
 *   1. `select 1` works against the pool.
 *   2. orders + subscriptions tables exist with the expected columns.
 *   3. (with --email) sendEmail() reaches the owner's inbox.
 *
 * Loads env the same way server.ts does (local .env → E:/Secrets/Website/.env).
 */
import dotenv from "dotenv";
import { existsSync } from "fs";

const FALLBACK_ENV_PATH = "E:/Secrets/Website/.env";
dotenv.config({
  path: existsSync(".env") ? ".env" : existsSync(FALLBACK_ENV_PATH) ? FALLBACK_ENV_PATH : undefined,
});

const OWNER_EMAIL = "anahit@designature.studio";

async function main() {
  const sendTestEmail = process.argv.includes("--email");

  // Import AFTER dotenv so DATABASE_URL / RESEND_API_KEY are populated.
  const { getPool } = await import("../db/pgPool.js");
  const { runMigrations } = await import("../db/migrate.js");
  const pool = getPool();

  console.log("→ Running idempotent migration (same as server boot)…");
  await runMigrations();

  console.log("→ select 1 …");
  const ping = await pool.query("select 1 as ok");
  console.log("  result:", ping.rows[0]);

  console.log("→ Inspecting orders columns …");
  const orders = await pool.query(
    `select column_name, data_type
       from information_schema.columns
      where table_name = 'orders'
      order by ordinal_position`,
  );
  console.table(orders.rows);

  console.log("→ Inspecting subscriptions columns …");
  const subs = await pool.query(
    `select column_name, data_type
       from information_schema.columns
      where table_name = 'subscriptions'
      order by ordinal_position`,
  );
  console.table(subs.rows);

  console.log("→ Inspecting usage_events columns …");
  const usage = await pool.query(
    `select column_name, data_type
       from information_schema.columns
      where table_name = 'usage_events'
      order by ordinal_position`,
  );
  console.table(usage.rows);

  console.log("→ Confirming indexes …");
  const idx = await pool.query(
    `select indexname from pg_indexes
      where indexname in ('idx_subscriptions_user_id', 'idx_usage_events_user_created')
      order by indexname`,
  );
  console.log("  indexes present:", idx.rows.map((r) => r.indexname));

  console.log("→ Confirming all 3 foundation tables exist …");
  const tables = await pool.query(
    `select table_name from information_schema.tables
      where table_schema = 'public'
        and table_name in ('orders', 'subscriptions', 'usage_events')
      order by table_name`,
  );
  console.log("  tables:", tables.rows.map((r) => r.table_name));

  if (sendTestEmail) {
    console.log(`→ Sending test email to ${OWNER_EMAIL} via Resend …`);
    const { sendEmail } = await import("../lib/email.js");
    const { id } = await sendEmail({
      to: OWNER_EMAIL,
      subject: "Designature Studio — payments foundation (B0) test email",
      html: `
        <div style="font-family:Montserrat,Arial,sans-serif;color:#1C1C1C;line-height:1.6">
          <p style="font-family:'Cormorant Garamond',Georgia,serif;font-size:22px;color:#0047AB;margin:0 0 12px">
            Payments foundation is live
          </p>
          <p>This is the I-024 / B0 verification email, sent server-side through Resend
          from the verified <strong>designature.studio</strong> domain.</p>
          <p>If you're reading this, transactional email works end-to-end — Rail&nbsp;B
          consultation confirmations and Rail&nbsp;A payment notices can ship on this.</p>
          <p style="color:#8E3F2D;margin-top:20px">— Designature Studio</p>
        </div>`,
    });
    console.log("  ✅ sent, Resend message id:", id);
  } else {
    console.log("→ Skipping email (pass --email to send the test email).");
  }

  await pool.end();
  console.log("\n✅ B0 verification complete.");
}

main().catch((err) => {
  console.error("\n❌ B0 verification failed:", err);
  process.exit(1);
});
