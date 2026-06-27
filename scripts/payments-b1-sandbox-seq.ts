/**
 * I-025 / B1 — one-off sandbox OrderID sequence alignment (DEV ONLY).
 *
 *   npx tsx scripts/payments-b1-sandbox-seq.ts            # inspect only
 *   npx tsx scripts/payments-b1-sandbox-seq.ts --apply    # restart the sequence
 *
 * Ameriabank's SANDBOX requires every InitPayment OrderID to fall in the range
 * AMERIA_SANDBOX_ORDER_ID_MIN..MAX (4423001..4424000). `orders.ameria_order_id`
 * is a bigserial whose sequence (`orders_ameria_order_id_seq`) starts at 1 — so
 * we restart it into the sandbox range. Every order then naturally gets an
 * in-range OrderID and the /initiate + /callback code needs no mode branching
 * for the OrderID itself (option (a) in the B1 plan).
 *
 * SAFE FOR PRODUCTION TOO: production has NO OrderID constraint, so once live the
 * sequence simply keeps counting up from wherever sandbox testing left off — a
 * larger starting number is harmless. This is why it can run on the shared
 * Railway instance. It is a no-op-style DDL: no rows change, only the next value.
 *
 * Refuses to run if any existing order already has ameria_order_id >= MIN (so it
 * can't rewind a sequence that's already advanced past the floor).
 */
import dotenv from "dotenv";
import { existsSync } from "fs";

const FALLBACK_ENV_PATH = "E:/Secrets/Website/.env";
dotenv.config({
  path: existsSync(".env") ? ".env" : existsSync(FALLBACK_ENV_PATH) ? FALLBACK_ENV_PATH : undefined,
});

async function main() {
  const apply = process.argv.includes("--apply");
  const MIN = Number(process.env.AMERIA_SANDBOX_ORDER_ID_MIN || "4423001");
  const MAX = Number(process.env.AMERIA_SANDBOX_ORDER_ID_MAX || "4424000");

  const { getPool } = await import("../db/pgPool.js");
  const pool = getPool();

  const seqName = "orders_ameria_order_id_seq";

  const { rows: cur } = await pool.query(
    `SELECT last_value, is_called FROM ${seqName}`,
  );
  console.log("→ current sequence state:", cur[0]);

  const { rows: maxRows } = await pool.query(
    `SELECT COUNT(*)::int AS n, COALESCE(MAX(ameria_order_id), 0)::bigint AS max_id FROM orders`,
  );
  const { n, max_id } = maxRows[0];
  console.log(`→ orders rows: ${n}, max ameria_order_id: ${max_id}`);
  console.log(`→ sandbox range: ${MIN}..${MAX}`);

  if (Number(max_id) >= MIN) {
    console.log(
      `\n⛔ An order already has ameria_order_id >= ${MIN} (max=${max_id}). ` +
        `The sequence is at/above the sandbox floor already — NOT restarting.`,
    );
    await pool.end();
    return;
  }

  if (!apply) {
    console.log(`\nℹ️  Dry run. Re-run with --apply to: ALTER SEQUENCE ${seqName} RESTART WITH ${MIN};`);
    await pool.end();
    return;
  }

  await pool.query(`ALTER SEQUENCE ${seqName} RESTART WITH ${MIN}`);
  const { rows: after } = await pool.query(`SELECT last_value, is_called FROM ${seqName}`);
  console.log(`\n✅ Sequence restarted. Next order's ameria_order_id will be ${MIN}. State:`, after[0]);
  await pool.end();
}

main().catch((err) => {
  console.error("\n❌ sandbox-seq script failed:", err);
  process.exit(1);
});
