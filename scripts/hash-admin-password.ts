/**
 * Generate a bcrypt hash for the admin password (I-019).
 *
 * Usage (Powershell):
 *   npx tsx scripts/hash-admin-password.ts "my-strong-password"
 *
 * Prints the hash to stdout. Paste it into:
 *   E:/Secrets/Website/.env           → ADMIN_PASSWORD_HASH=<hash>
 *   Railway → Variables               → ADMIN_PASSWORD_HASH=<hash>
 *
 * Cost factor 12 — ~250ms on a modern laptop, intentional bcrypt latency
 * against brute-force. Same hash will validate via bcrypt.compare() at
 * login time in server.ts.
 */
import bcrypt from "bcryptjs";

const pwd = process.argv[2];
if (!pwd) {
  console.error("usage: tsx scripts/hash-admin-password.ts <password>");
  process.exit(1);
}
if (pwd.length < 10) {
  console.error("error: password must be at least 10 characters");
  process.exit(1);
}

const hash = bcrypt.hashSync(pwd, 12);
console.log(hash);
