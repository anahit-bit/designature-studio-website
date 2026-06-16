/**
 * Dev launcher for the Shopping List MOCK click-through (no Serper credits).
 * Sets MOCK_SERPER before server.ts loads — dotenv does NOT override an already-set
 * process.env var, so this wins over the secrets .env regardless of the launcher.
 * Run via: npm run dev:mock
 */
process.env.MOCK_SERPER = 'true';
process.env.SHOPPING_DISABLED = 'false';
await import('../server.js');
