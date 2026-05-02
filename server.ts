import dotenv from "dotenv";
import express from "express";
import { createServer as createViteServer } from "vite";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { createHash } from "crypto";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import path from "path";
import { google } from "googleapis";
import * as net from "net";

// ─── Gemini SDK (used by shopping identify + room audit endpoints) ─────────────
import { GoogleGenAI } from "@google/genai";

// ─── AI Vision pipeline services ──────────────────────────────────────────────
import { extractStyleBrief } from "./services/aiVision/styleExtraction.js";
import { generateConceptImage } from "./services/aiVision/imageGeneration.js";
import { getCacheKey, getCachedBrief, setCachedBrief } from "./services/aiVision/styleCache.js";
import { STYLE_NAME_TO_PRESET, ROOM_NAME_TO_TYPE } from "./services/aiVision/stylePresets.js";

const FALLBACK_ENV_PATH = 'E:/Secrets/Website/.env';
dotenv.config({
  path: existsSync('.env')
    ? '.env'
    : existsSync(FALLBACK_ENV_PATH)
    ? FALLBACK_ENV_PATH
    : undefined,
});

/** Free tier caps (UI + API). Paid tier can be added later with an `isPaid` flag. */
const FREE_TIER_MAX_CONCEPTS = 3;
const FREE_TIER_MAX_SHOPPING_LISTS = 3;

/** Accounts that get unlimited quotas — never clamped or decremented. */
const UNLIMITED_ACCOUNT_EMAILS = [
  "anahit@designature.studio",
  "anahit.ghasabyan@gmail.com",
];

/** @deprecated kept for call-sites that haven't been updated yet */
const CONCEPT_TEST_ACCOUNT_EMAIL = UNLIMITED_ACCOUNT_EMAILS[0];

function isConceptTestAccountEmail(email: string): boolean {
  return UNLIMITED_ACCOUNT_EMAILS.includes(email.trim().toLowerCase());
}

// ─── Simple JSON "database" stored in users.json ───────────────────────────
const DB_PATH = "./users.json";
const DB_SEED_PATH = "./users.seed.json";

interface User {
  email: string;
  name: string;
  picture: string;
  googleId: string;
  generationsLeft: number;
  /** Remaining shopping-list runs (Serper searches) for free tier; optional in older `users.json` */
  shoppingListsLeft?: number;
  isPaid?: boolean;
  auditQuota?: number;
  createdAt: string;
  lastUsed: string;
}

function normalizeUserForFreeTier(user: User): { user: User; changed: boolean } {
  let changed = false;
  const u = { ...user };
  const isUnlimited = isConceptTestAccountEmail(u.email);

  if (isUnlimited) {
    // Unlimited accounts (owner/demo) — force 999, never clamp
    if (u.generationsLeft !== 999) { u.generationsLeft = 999; changed = true; }
    if (u.shoppingListsLeft !== 999) { u.shoppingListsLeft = 999; changed = true; }
  } else {
    // Everyone else — enforce free-tier caps regardless of isPaid flag.
    // (No paid tier exists yet; isPaid on the user record is only used for
    //  audit access in the API response, not for quota bypass.)
    if (u.generationsLeft > FREE_TIER_MAX_CONCEPTS) {
      u.generationsLeft = FREE_TIER_MAX_CONCEPTS;
      changed = true;
    }
    if (typeof u.shoppingListsLeft !== "number" || Number.isNaN(u.shoppingListsLeft)) {
      u.shoppingListsLeft = FREE_TIER_MAX_SHOPPING_LISTS;
      changed = true;
    }
    if (u.shoppingListsLeft > FREE_TIER_MAX_SHOPPING_LISTS) {
      u.shoppingListsLeft = FREE_TIER_MAX_SHOPPING_LISTS;
      changed = true;
    }
  }
  return { user: u, changed };
}

interface DB {
  users: Record<string, User>; // keyed by googleId
}

function readDB(): DB {
  if (!existsSync(DB_PATH)) {
    if (existsSync(DB_SEED_PATH)) {
      writeFileSync(DB_PATH, readFileSync(DB_SEED_PATH, "utf-8"));
    } else {
      writeFileSync(DB_PATH, JSON.stringify({ users: {} }, null, 2));
    }
  }
  return JSON.parse(readFileSync(DB_PATH, "utf-8"));
}

function writeDB(db: DB) {
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// ─── Session store (in-memory, keyed by session token) ─────────────────────
const sessions: Record<string, string> = {}; // token → googleId

function createSession(googleId: string): string {
  const token = createHash("sha256")
    .update(googleId + Date.now() + Math.random())
    .digest("hex");
  sessions[token] = googleId;
  return token;
}

function getSession(token: string): string | null {
  return sessions[token] || null;
}

// ─── Server ────────────────────────────────────────────────────────────────
async function startServer() {
  const app = express();
  const PORT = Number(process.env.NIXPACKS_NODEJS_PORT) || Number(process.env.PORT) || 3000;

  // Raised to 100 MB to accommodate base64-encoded room + reference images in one request
  app.use(express.json({ limit: "100mb" }));

  // ── Cloudinary Configuration ──
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: "ai-studio-uploads",
      allowed_formats: ["jpg", "png", "jpeg", "webp"],
    } as any,
  });

  const upload = multer({ storage: storage });

  // ── POST /api/upload — upload image to Cloudinary ──
  app.post("/api/upload", upload.single("image"), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No image uploaded" });
    res.json({ url: req.file.path });
  });

  // ── GET /api/images — list images from Cloudinary ──
  app.get("/api/images", async (req, res) => {
    try {
      const { folder = "ai-studio-uploads" } = req.query;
      const folderName = String(folder || "").trim();

      // Cloudinary can run in "dynamic folders" mode where public_id paths are flattened.
      // In that setup, prefix search won't find by folder, so prefer asset_folder query.
      try {
        const byAssetFolder = await cloudinary.api.resources_by_asset_folder(folderName, {
          type: "upload",
          max_results: 200,
        } as any);
        return res.json(byAssetFolder.resources || []);
      } catch (assetFolderErr) {
        // Fallback for accounts/files that still use folder-prefixed public_id
        const byPrefix = await cloudinary.api.resources({
          type: "upload",
          prefix: folderName,
          max_results: 200,
        });
        return res.json(byPrefix.resources || []);
      }
    } catch (error: any) {
      console.error("Cloudinary list error:", error);
      res.status(500).json({ error: error.message || "Failed to list images" });
    }
  });

  // ── Auth middleware helper ──
  function requireAuth(req: any, res: any): string | null {
    const token = req.headers["x-session-token"] as string;
    if (!token) {
      res.status(401).json({ error: "Not authenticated" });
      return null;
    }
    const googleId = getSession(token);
    if (!googleId) {
      res.status(401).json({ error: "Session expired" });
      return null;
    }
    return googleId;
  }

  // ── Free-tier users Google Sheets upsert (best-effort) ──────────────────
  async function upsertFreeTierUserByEmail(params: {
    email: string;
    name: string;
    provider: string;
    plan: string;
    country: string;
    toolUsed: string;
    source: string;
    createdAt: string;
    nowIso: string;
  }) {
    const spreadsheetId =
      (process.env.FREE_USERS_SPREADSHEET_ID ||
        "14aFSp92YNw7DiBS-k3Ci7-pW_rIzQ_qURPkqzLirg0M").trim();

    const serviceAccountJson = (process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON || "").trim();
    const keyFile = (process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_KEYFILE || "").trim();

    // Do not break auth flow if env vars are missing.
    if (!serviceAccountJson && !keyFile) {
      console.warn(
        "Google Sheets upsert skipped: missing GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON/GOOGLE_SHEETS_SERVICE_ACCOUNT_KEYFILE"
      );
      return;
    }

    if (!spreadsheetId) {
      console.warn("Google Sheets upsert skipped: missing FREE_USERS_SPREADSHEET_ID");
      return;
    }

    let credentials: any;
    try {
      if (serviceAccountJson) {
        credentials = JSON.parse(serviceAccountJson);
        if (typeof credentials?.private_key === "string" && credentials.private_key.includes("\\n")) {
          credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
        }
      } else {
        credentials = JSON.parse(readFileSync(keyFile, "utf-8"));
        if (typeof credentials?.private_key === "string" && credentials.private_key.includes("\\n")) {
          credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
        }
      }
    } catch (err) {
      console.error("Google Sheets upsert skipped: invalid service account credentials", err);
      return;
    }

    if (!credentials?.client_email || !credentials?.private_key) {
      console.error("Google Sheets upsert skipped: missing client_email/private_key in service account JSON");
      return;
    }

    const scopes = ["https://www.googleapis.com/auth/spreadsheets"];
    const jwtClient = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes,
    });

    const sheetsApi = google.sheets({ version: "v4", auth: jwtClient });

    const createdAt = params.createdAt || params.nowIso;
    const rowNow = params.nowIso;
    const emailLower = params.email.trim().toLowerCase();

    // 1) Find the first worksheet/tab title
    const meta = await sheetsApi.spreadsheets.get({
      spreadsheetId,
      fields: "sheets(properties(title))",
    });
    const firstSheetTitle = meta.data.sheets?.[0]?.properties?.title;
    if (!firstSheetTitle) {
      console.warn("Google Sheets upsert skipped: could not read first worksheet/tab title");
      return;
    }

    // 2) Read existing A-K cells and upsert by email (column B)
    const range = `${firstSheetTitle}!A:K`;
    const existing = await sheetsApi.spreadsheets.values.get({
      spreadsheetId,
      range,
      majorDimension: "ROWS",
    });
    const rows = existing.data.values ?? [];

    // Optional header detection: if row 1 looks like our headers, skip it.
    let headerOffset = 0;
    const firstRow = rows[0] || [];
    const firstCell = String(firstRow[0] || "").toLowerCase();
    const secondCell = String(firstRow[1] || "").toLowerCase();
    if (firstCell === "created_at" && secondCell === "email") headerOffset = 1;

    let matchIndex = -1;
    for (let i = headerOffset; i < rows.length; i++) {
      const row = rows[i] || [];
      const rowEmail = String(row[1] || "").trim().toLowerCase();
      if (rowEmail === emailLower) {
        matchIndex = i;
        break;
      }
    }

    // Column order A-K:
    // created_at,email,name,provider,plan,first_login_at,last_login_at,login_count,country,tool_used,source
    const toStr = (v: any) => (v == null ? "" : String(v));

    if (matchIndex >= 0) {
      const existingRow = rows[matchIndex] || [];
      const createdAtExisting = toStr(existingRow[0]) || createdAt;
      const firstLoginExisting = toStr(existingRow[5]) || createdAt;

      const parsedCount = parseInt(String(existingRow[7] ?? ""), 10);
      const loginCountNext = Number.isFinite(parsedCount) ? parsedCount + 1 : 1;

      const rowNumber = matchIndex + 1; // sheet rows are 1-indexed
      const rowUpdate = [
        createdAtExisting, // preserve created_at
        params.email,
        params.name,
        params.provider,
        params.plan,
        firstLoginExisting, // preserve first_login_at
        rowNow, // last_login_at
        loginCountNext,
        params.country,
        params.toolUsed,
        params.source,
      ];

      await sheetsApi.spreadsheets.values.update({
        spreadsheetId,
        range: `${firstSheetTitle}!A${rowNumber}:K${rowNumber}`,
        valueInputOption: "RAW",
        requestBody: { values: [rowUpdate] },
      });
    } else {
      const newRow = [
        createdAt,
        params.email,
        params.name,
        params.provider,
        params.plan,
        createdAt, // first_login_at
        rowNow, // last_login_at
        1, // login_count
        params.country,
        params.toolUsed,
        params.source,
      ];

      await sheetsApi.spreadsheets.values.append({
        spreadsheetId,
        range: `${firstSheetTitle}!A:K`,
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: [newRow] },
      });
    }
  }

  // ── POST /api/auth/google — exchange Google ID token for session ──
  app.post("/api/auth/google", async (req, res) => {
    try {
      const { credential, toolUsed, source } = req.body || {};
      if (!credential) {
        return res.status(400).json({ error: "Missing credential" });
      }

      // Decode the JWT payload (Google ID token) — parts are base64url encoded
      const parts = credential.split(".");
      if (parts.length !== 3) {
        return res.status(400).json({ error: "Invalid credential format" });
      }

      const payload = JSON.parse(
        Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8")
      );

      const { sub: googleId, email, name, picture } = payload;

      if (!googleId || !email) {
        return res.status(400).json({ error: "Invalid token payload" });
      }

      // Get or create user
      const db = readDB();
      let user = db.users[googleId];

      if (!user) {
        // New user — give 3 free generations + 3 shopping list runs
        user = {
          email,
          name: name || email,
          picture: picture || "",
          googleId,
          generationsLeft: FREE_TIER_MAX_CONCEPTS,
          shoppingListsLeft: FREE_TIER_MAX_SHOPPING_LISTS,
          createdAt: new Date().toISOString(),
          lastUsed: new Date().toISOString(),
        };
        db.users[googleId] = user;
        writeDB(db);
        console.log(`New user registered: ${email}`);
      } else {
        // Existing user — update profile info
        user.email = email;
        user.name = name || user.name;
        user.picture = picture || user.picture;
        user.lastUsed = new Date().toISOString();
        db.users[googleId] = user;
        writeDB(db);
        console.log(`Existing user logged in: ${email} (${user.generationsLeft} gens left)`);
      }

      // Clamp legacy accounts (e.g. admin-inflated concept counts) and migrate shoppingListsLeft
      {
        const norm = normalizeUserForFreeTier(user);
        user = norm.user;
        if (norm.changed) {
          db.users[googleId] = user;
          writeDB(db);
        }
      }

      const token = createSession(googleId);

      // Best-effort free-tier tracking update (must never break auth flow)
      const nowIso = new Date().toISOString();
      void upsertFreeTierUserByEmail({
        email,
        name: user.name,
        provider: "google",
        plan: "free",
        country: "",
        toolUsed: typeof toolUsed === "string" ? toolUsed : "",
        source: typeof source === "string" ? source : "",
        createdAt: user.createdAt || nowIso,
        nowIso,
      }).catch((err) => console.error("Free-tier Google Sheets upsert error:", err));

      const ownerLogin = isConceptTestAccountEmail(user.email);
      res.json({
        token,
        user: {
          email: user.email,
          name: user.name,
          picture: user.picture,
          generationsLeft: user.generationsLeft,
          shoppingListsLeft: user.shoppingListsLeft,
          isPaid: ownerLogin ? true : false,
          auditsLeft: ownerLogin ? 999 : 0,
        },
      });
    } catch (err) {
      console.error("Auth error:", err);
      res.status(500).json({ error: "Authentication failed" });
    }
  });

  // ── GET /api/auth/me — get current user info ──
  app.get("/api/auth/me", (req, res) => {
    const googleId = requireAuth(req, res);
    if (!googleId) return;

    const db = readDB();
    let user = db.users[googleId];
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const norm = normalizeUserForFreeTier(user);
    user = norm.user;
    if (norm.changed) {
      db.users[googleId] = user;
      writeDB(db);
    }

    const ownerAccount = isConceptTestAccountEmail(user.email);
    const isPaidUser = ownerAccount || user.isPaid === true;
    res.json({
      email: user.email,
      name: user.name,
      picture: user.picture,
      generationsLeft: user.generationsLeft,
      shoppingListsLeft: user.shoppingListsLeft,
      isPaid: isPaidUser,
      auditsLeft: isPaidUser ? 999 : 0,
    });
  });

  // ── POST /api/auth/logout — clear session ──
  app.post("/api/auth/logout", (req, res) => {
    const token = req.headers["x-session-token"] as string;
    if (token && sessions[token]) {
      delete sessions[token];
    }
    res.json({ ok: true });
  });

  // ── POST /api/generation/use — consume one generation ──
  app.post("/api/generation/use", (req, res) => {
    const googleId = requireAuth(req, res);
    if (!googleId) return;

    const { count = 1 } = req.body;

    const db = readDB();
    const user = db.users[googleId];
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.generationsLeft < count) {
      return res.status(403).json({ error: "No generations left", generationsLeft: user.generationsLeft });
    }

    if (user.generationsLeft < 999) user.generationsLeft -= count;
    user.lastUsed = new Date().toISOString();
    db.users[googleId] = user;
    writeDB(db);

    res.json({ generationsLeft: user.generationsLeft });
  });

  // ── POST /api/generation/restore — restore generations on failure ──
  app.post("/api/generation/restore", (req, res) => {
    const googleId = requireAuth(req, res);
    if (!googleId) return;

    const { count = 1 } = req.body;

    const db = readDB();
    const user = db.users[googleId];
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const cap = isConceptTestAccountEmail(user.email) ? 999 : FREE_TIER_MAX_CONCEPTS;
    user.generationsLeft = Math.min(cap, user.generationsLeft + count);
    db.users[googleId] = user;
    writeDB(db);

    res.json({ generationsLeft: user.generationsLeft });
  });

  // ── Testimonials cache ──────────────────────────────────────────────────────
  let testimonialsCache: { data: any; expires: number } | null = null;
  const TESTIMONIALS_CACHE_MS = 10 * 60 * 1000;

  // ── GET /api/testimonials ────────────────────────────────────────────────────
  app.get('/api/testimonials', async (_req, res) => {
    try {
      if (testimonialsCache && testimonialsCache.expires > Date.now()) {
        return res.json(testimonialsCache.data);
      }
      const url = process.env.APPS_SCRIPT_URL;
      if (!url) return res.status(500).json({ ok: false, error: 'apps script url not configured' });
      const r = await fetch(url, { method: 'GET' });
      const data = await r.json();
      if (data.ok) {
        testimonialsCache = { data, expires: Date.now() + TESTIMONIALS_CACHE_MS };
      }
      res.json(data);
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // ── POST /api/feedback ───────────────────────────────────────────────────────
  app.post('/api/feedback', async (req, res) => {
    try {
      const url = (process.env.APPS_SCRIPT_URL || '').trim();
      const token = (process.env.APPS_SCRIPT_TOKEN || '').trim();
      console.log(`[FEEDBACK] url present=${!!url} token present=${!!token}`);

      if (!url || !token) return res.status(500).json({ ok: false, error: 'apps script not configured' });

      const { name, country, email, type, message, rating, project_type } = req.body || {};
      console.log(`[FEEDBACK] body:`, JSON.stringify({ name, country, email, type, message: message?.slice(0,40), rating, project_type }));

      // Always required
      if (!type || !['testimonial', 'bug', 'feature', 'general'].includes(type)) {
        return res.status(400).json({ ok: false, error: 'Invalid type' });
      }
      if (!message || !message.trim()) {
        return res.status(400).json({ ok: false, error: 'Message is required' });
      }

      // Conditionally required (testimonials only)
      if (type === 'testimonial') {
        if (!name || !name.trim()) {
          return res.status(400).json({ ok: false, error: 'Name is required for testimonials' });
        }
        if (!email || !email.trim()) {
          return res.status(400).json({ ok: false, error: 'Email is required for testimonials' });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
          return res.status(400).json({ ok: false, error: 'Invalid email format' });
        }
        if (!rating || rating < 1 || rating > 5) {
          return res.status(400).json({ ok: false, error: 'Rating is required for testimonials' });
        }
      }

      // Optional field — validate if present
      if (project_type && !['Residential', 'Commercial', 'Other'].includes(project_type)) {
        return res.status(400).json({ ok: false, error: 'Invalid project type' });
      }

      const scriptBody = {
        token,
        name:         (name         || '').trim(),
        country:      (country      || '').trim(),
        email:        (email        || '').trim(),
        type,
        message:      (message      || '').trim(),
        rating:       rating != null ? rating : '',
        project_type: (project_type || '').trim(),
      };
      console.log(`[FEEDBACK] POST → ${url} body:`, JSON.stringify({ ...scriptBody, token: '[redacted]' }));

      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scriptBody),
        redirect: 'follow',
      });
      const text = await r.text();
      console.log(`[FEEDBACK] Apps Script status=${r.status} response:`, text.slice(0, 300));

      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        console.error(`[FEEDBACK] Apps Script returned non-JSON. Status=${r.status}. Body: ${text.slice(0, 200)}`);
        return res.status(502).json({ ok: false, error: `Apps Script returned non-JSON (status ${r.status})` });
      }

      if (data.ok) {
        console.log(`[FEEDBACK] Write confirmed — invalidating testimonials cache`);
        testimonialsCache = null;
      } else {
        console.error(`[FEEDBACK] Apps Script returned ok=false:`, data.error);
      }

      res.json(data);
    } catch (err) {
      console.error(`[FEEDBACK] Unexpected error:`, err);
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // ── POST /api/shopping/identify — identify shoppable items from an image ──
  app.post("/api/shopping/identify", async (req, res) => {
    const googleId = requireAuth(req, res);
    if (!googleId) return;

    const { imageDataUrl } = req.body ?? {};
    if (!imageDataUrl || typeof imageDataUrl !== "string") {
      return res.status(400).json({ error: "imageDataUrl is required." });
    }
    const matches = imageDataUrl.match(/^data:(image\/[\w+]+);base64,(.+)$/);
    if (!matches) return res.status(400).json({ error: "Invalid image format." });

    try {
      const apiKey = process.env.GEMINI_API_KEY ?? "";
      if (!apiKey) throw new Error("GEMINI_API_KEY is not set.");
      const ai = new GoogleGenAI({ apiKey });

      // Free-tier: identify 4–6 prominent shoppable elements distributed across
      // categories (furniture, rugs, lighting, wall art, decor) — not furniture only.
      // Skip a category if it's clearly not visible in the image; never fabricate.
      // Return richer attributes so search queries can match color/material/style.
      const identifyPrompt = `You are a professional interior design sourcing assistant.

Identify 4 to 6 of the most prominent SHOPPABLE elements in this room photo, distributed across categories — not just furniture.

Try to include a mix when visible:
- 1–2 furniture pieces (sofa, armchair, bed, coffee/dining/side table, storage, desk, etc.)
- 1 rug or floor covering, if visible
- 1 lighting piece (pendant, chandelier, floor/table lamp, sconce), if visible
- 1 wall art / poster / framed print, if visible
- 1 wallpaper or distinctive wall covering, if a clearly patterned/textured wall treatment is present
- 1 decorative accent (vase, sculptural object, large mirror, throw pillows as a set), if visible

If a category is clearly absent from the image, skip it — do not fabricate items that aren't there. Total must be between 4 and 6 items.

For each item return:
- category: short type label, e.g. "Sofa", "Area Rug", "Pendant Light", "Wall Art", "Wallpaper", "Decorative Vase"
- description: one short phrase describing the item (used as a subtitle, max ~8 words)
- color: dominant color(s)
- material: primary material if identifiable (e.g. "velvet", "wool", "brass", "ceramic", "oak", "vinyl", "non-woven paper" for wallpaper); use "unknown" if unclear
- shape: silhouette or pattern descriptor (e.g. "rounded", "linear", "geometric", "abstract", "tufted", "vertical stripe", "floral repeat")
- style: design era/style label (e.g. "mid-century modern", "boho", "contemporary", "scandinavian", "art deco")
- search_query: 5–10 word retail search query optimized for Google Shopping, baking in color + material + style + key shape/pattern

Output ONLY valid JSON with no markdown fences and no explanation:
{"items":[{"category":"Sofa","description":"Curved navy velvet sofa","color":"navy blue","material":"velvet","shape":"low curved","style":"mid-century modern","search_query":"navy velvet curved sofa mid century modern"},{"category":"Wallpaper","description":"Green vertical stripe wallpaper","color":"sage green and cream","material":"non-woven paper","shape":"vertical stripe","style":"contemporary","search_query":"sage green vertical stripe wallpaper non-woven contemporary"}]}`;

      const geminiRes = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: {
          parts: [
            { inlineData: { mimeType: matches[1], data: matches[2] } },
            { text: identifyPrompt },
          ],
        },
      });

      const rawText: string =
        (geminiRes as any).text ??
        geminiRes?.candidates?.[0]?.content?.parts
          ?.map((p: any) => p.text ?? "")
          .join("") ?? "";
      const cleaned = rawText.replace(/```json|```/g, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return res.status(422).json({ error: "Could not identify items from the image." });
      }
      const identified = JSON.parse(jsonMatch[0]);
      return res.json({ items: identified.items || [] });

    } catch (err: any) {
      console.error("[Shopping] identify error:", err?.message ?? err);
      return res.status(500).json({ error: "Could not identify items. Please try again." });
    }
  });

  // ── POST /api/shopping/search — Serper.dev Google Shopping API ──
  app.post("/api/shopping/search", async (req, res) => {
    try {
      const googleIdShopping = requireAuth(req, res);
      if (!googleIdShopping) return;

      const dbShop = readDB();
      let shopUser = dbShop.users[googleIdShopping];
      if (!shopUser) {
        return res.status(404).json({ error: "User not found" });
      }
      const normShop = normalizeUserForFreeTier(shopUser);
      shopUser = normShop.user;
      if (normShop.changed) {
        dbShop.users[googleIdShopping] = shopUser;
        writeDB(dbShop);
      }
      console.log(`[SHOP] ${shopUser.email} | isPaid=${shopUser.isPaid} | shoppingListsLeft=${shopUser.shoppingListsLeft}`);
      if (shopUser.shoppingListsLeft < 1) {
        return res.status(403).json({
          error: "No shopping list runs left",
          shoppingListsLeft: shopUser.shoppingListsLeft,
        });
      }

      const { items, country } = req.body;
      const gl = country || 'us';
      if (!items || !Array.isArray(items)) return res.status(400).json({ error: "Missing or invalid items list" });

      // Serper.dev API key — set SERPER_API_KEY in AI Studio Secrets
      // MOCK_SERPER=true bypasses Serper entirely (returns canned products from
      // mocks/serper-shopping-mock.json) so dev iteration doesn't burn credits.
      const MOCK_SERPER = (process.env.MOCK_SERPER || "").toLowerCase() === "true";
      const SERPER_API_KEY = (process.env.SERPER_API_KEY || "").trim();
      if (!MOCK_SERPER && !SERPER_API_KEY) return res.status(500).json({ error: "SERPER_API_KEY not set — add it in AI Studio Secrets" });

      // ── Shared helper: extract best direct URL from a Serper result ──────────
      const extractDirectLink = (r: any): string => {
        if (r.productLink && !r.productLink.includes('google.com/url')) return r.productLink;
        if (r.merchantLink && !r.merchantLink.includes('google.com/url')) return r.merchantLink;
        if (r.link) {
          try {
            const urlObj = new URL(r.link);
            const adUrl = urlObj.searchParams.get('adurl') || urlObj.searchParams.get('url') || urlObj.searchParams.get('q');
            if (adUrl && adUrl.startsWith('http') && !adUrl.includes('google.com')) return adUrl;
          } catch {
            const m = r.link.match(/[?&](?:adurl|url|q)=([^&]+)/i);
            if (m) {
              const decoded = decodeURIComponent(m[1]);
              if (decoded.startsWith('http') && !decoded.includes('google.com')) return decoded;
            }
          }
        }
        return (r.link && !r.link.includes('google.com/url')) ? r.link : (r.productLink || r.merchantLink || r.link || "#");
      };

      const cleanSource = (raw: string): string => {
        let s = (raw || "")
          .replace(/^https?:\/\//i, "").replace(/^www\./i, "")
          .split(/[/?#]/)[0]
          .replace(/\.(com|org|net|edu|gov|io|co|uk|ca|au|de|fr|am|ae)$/i, "")
          .split(/[-_.]/).map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
          .trim();
        return s || "Shop";
      };

      const mapProduct = (r: any) => ({
        title: r.title || "Product",
        price: r.price || null,
        source: cleanSource(r.source || ""),
        link: extractDirectLink(r),
        thumbnail: r.imageUrl || null,
        rating: r.rating || null,
        reviews: r.ratingCount || null,
      });

      const serperSearch = async (query: string, num = 8): Promise<any[]> => {
        if (MOCK_SERPER) {
          console.log(`[SHOP][MOCK] would search: "${query}"`);
          try {
            const mockPath = path.resolve(process.cwd(), "mocks/serper-shopping-mock.json");
            const mock = JSON.parse(readFileSync(mockPath, "utf-8"));
            // Pick the bucket whose key appears in the query (lowercased), else fallback
            const lowerQ = query.toLowerCase();
            const bucketKey = Object.keys(mock).find(k => lowerQ.includes(k.toLowerCase())) || "default";
            const bucket: any[] = mock[bucketKey] || mock.default || [];
            return bucket.slice(0, num);
          } catch (e: any) {
            console.error("[SHOP][MOCK] failed to load mocks/serper-shopping-mock.json:", e?.message);
            return [];
          }
        }
        const res = await fetch("https://google.serper.dev/shopping", {
          method: "POST",
          headers: { "X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({ q: query, gl, hl: "en", num }),
        });
        const data = await res.json();
        if (!res.ok) { console.error(`Serper error "${query}":`, data.message); return []; }
        return data.shopping || [];
      };

      // ── Shop catalogue with category tags ──────────────────────────────────────
      // cats: keywords that must overlap with item.category for this shop to be
      // included. Shops without an overlap are skipped so e.g. Desenio is never
      // queried for a sofa search.
      const ALL_SHOPS = [
        { name: "West Elm",        domain: "westelm.com",        cats: ["furniture","sofa","chair","table","rug","lighting","lamp","sconce","decor","bed","storage","desk","nightstand","dresser","bookcase"] },
        { name: "CB2",             domain: "cb2.com",            cats: ["furniture","sofa","chair","table","rug","lighting","lamp","decor","storage","desk","bed"] },
        { name: "IKEA",            domain: "ikea.com",           cats: ["furniture","sofa","chair","table","rug","lighting","lamp","decor","bed","storage","desk","nightstand","dresser","bookcase","shelf"] },
        { name: "Pottery Barn",    domain: "potterybarn.com",    cats: ["furniture","sofa","chair","table","rug","lighting","lamp","decor","bed","storage","nightstand","dresser"] },
        { name: "Article",         domain: "article.com",        cats: ["furniture","sofa","chair","table","bed","storage","desk","nightstand","dresser","bookcase"] },
        { name: "Crate & Barrel",  domain: "crateandbarrel.com", cats: ["furniture","sofa","chair","table","rug","lighting","lamp","decor","storage","kitchen","bed"] },
        { name: "Room & Board",    domain: "roomandboard.com",   cats: ["furniture","sofa","chair","table","bed","storage","desk","nightstand","dresser","bookcase"] },
        { name: "Blu Dot",         domain: "bludot.com",         cats: ["furniture","sofa","chair","table","bed","storage","desk","lighting","lamp","shelving"] },
        { name: "AllModern",       domain: "allmodern.com",      cats: ["furniture","sofa","chair","table","rug","lighting","lamp","decor","bed","storage","desk"] },
        { name: "Desenio",         domain: "desenio.com",        cats: ["art","poster","print","wall art","wall decor","painting","canvas"] },
        { name: "AllPosters",      domain: "allposters.com",     cats: ["art","poster","print","wall art","painting","canvas","photography"] },
        { name: "Wayfair",         domain: "wayfair.com",        cats: ["furniture","sofa","chair","table","rug","lighting","lamp","decor","bed","storage","desk","nightstand","dresser","bookcase","kitchen","outdoor"] },
      ];

      // Returns shops whose cat list has at least one keyword present in the item category string.
      const shopsForCategory = (itemCategory: string): typeof ALL_SHOPS => {
        const ic = itemCategory.toLowerCase();
        const matched = ALL_SHOPS.filter(shop =>
          shop.cats.some(cat => ic.includes(cat) || cat.includes(ic.split(/[\s,]/)[0]))
        );
        // Fallback: exclude art-only shops if nothing matched (e.g. unknown category)
        return matched.length >= 2 ? matched : ALL_SHOPS.filter(s => !["desenio","allposters"].includes(s.domain.split(".")[0]));
      };

      // ── One category-aware OR query per item, top 3 results ─────────────────
      const searchResults = await Promise.all(
        items.slice(0, 4).map(async (item: any) => {
          try {
            const relevantShops = shopsForCategory(item.category);
            // Cap at 6 shops to keep query short and focused
            const shopFilter = relevantShops.slice(0, 6).map(s => `"${s.name}"`).join(" OR ");
            const query = `${item.search_query} (${shopFilter})`;
            console.log(`[SHOP] Serper: "${query}"`);
            const hits = await serperSearch(query, 8);
            return {
              item: { category: item.category, description: item.description },
              products: hits.slice(0, 3).map(mapProduct),
            };
          } catch (err) {
            console.error("Serper search error for", item.category, err);
            return { item: { category: item.category, description: item.description }, products: [] };
          }
        })
      );

      if (shopUser.shoppingListsLeft < 999) shopUser.shoppingListsLeft -= 1;
      shopUser.lastUsed = new Date().toISOString();
      dbShop.users[googleIdShopping] = shopUser;
      writeDB(dbShop);

      res.json({ results: searchResults, shoppingListsLeft: shopUser.shoppingListsLeft });

    } catch (err: any) {
      console.error("Shopping search error:", err);
      res.status(500).json({ error: "Shopping search failed: " + (err.message || "unknown error") });
    }
  });

  // ── GET /api/pinterest/pin — extract og:image from a Pinterest pin URL ──
  app.get("/api/pinterest/pin", async (req, res) => {
    const { url } = req.query as { url?: string };
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "Missing url parameter" });
    }
    // Accept pinterest.com/pin/... or pinterest.com/username/board/... or pin.it/...
    if (!url.includes("pinterest.com") && !url.includes("pin.it")) {
      return res.status(400).json({ error: "Not a Pinterest URL" });
    }
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
        },
        redirect: "follow",
      });
      if (!response.ok) {
        return res.status(502).json({ error: "Could not fetch Pinterest page" });
      }
      const html = await response.text();
      // Extract og:image
      const match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
                 || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
      if (!match || !match[1]) {
        return res.status(404).json({ error: "No image found on this Pinterest page" });
      }
      const imageUrl = match[1].replace(/&amp;/g, "&");
      return res.json({ imageUrl });
    } catch (err: any) {
      console.error("Pinterest fetch error:", err);
      return res.status(500).json({ error: "Failed to fetch Pinterest image" });
    }
  });

  // ── POST /api/newsletter/subscribe — append email to newsletter sheet ──
  app.post("/api/newsletter/subscribe", async (req, res) => {
    const { email } = req.body || {};

    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: "Invalid email" });
    }

    const spreadsheetId = "1ADcawOqI2VElxwPSSuL-PGX3OjHehacod_ApDPRqFo4";
    const serviceAccountJson = (process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON || "").trim();
    const keyFile = (process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_KEYFILE || "").trim();

    if (!serviceAccountJson && !keyFile) {
      console.warn("Newsletter subscribe: missing service account credentials");
      return res.status(503).json({ error: "Sheet integration not configured" });
    }

    try {
      let credentials: any;
      if (serviceAccountJson) {
        credentials = JSON.parse(serviceAccountJson);
        if (typeof credentials?.private_key === "string" && credentials.private_key.includes("\\n")) {
          credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
        }
      } else {
        credentials = JSON.parse(readFileSync(keyFile, "utf-8"));
        if (typeof credentials?.private_key === "string" && credentials.private_key.includes("\\n")) {
          credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
        }
      }

      const jwtClient = new google.auth.JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      });

      const sheetsApi = google.sheets({ version: "v4", auth: jwtClient });

      const meta = await sheetsApi.spreadsheets.get({
        spreadsheetId,
        fields: "sheets(properties(title))",
      });
      const sheetTitle = meta.data.sheets?.[0]?.properties?.title;
      if (!sheetTitle) throw new Error("Could not read sheet title");

      // Detect country server-side from IP (accurate, not browser language)
      let detectedCountry = '';
      try {
        const rawIp = (req.headers['x-forwarded-for'] as string || req.ip || '').split(',')[0].trim();
        const isLocal = !rawIp || rawIp === '127.0.0.1' || rawIp === '::1' || rawIp.startsWith('192.168.') || rawIp.startsWith('10.');
        if (!isLocal) {
          const geoRes = await fetch(`https://ipapi.co/${rawIp}/country/`);
          if (geoRes.ok) detectedCountry = (await geoRes.text()).trim();
        }
      } catch { /* non-fatal — country stays empty */ }

      const now = new Date().toISOString();
      await sheetsApi.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetTitle}!A:C`,
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        requestBody: {
          values: [[
            now,                         // created_at
            email.trim().toLowerCase(),  // email
            detectedCountry,             // country (from IP)
          ]],
        },
      });

      res.json({ ok: true });
    } catch (err: any) {
      console.error("Newsletter subscribe error:", err);
      res.status(500).json({ error: "Failed to save subscription" });
    }
  });

  // ── POST /api/pricing/notify — collect pricing launch notification emails ──
  app.post("/api/pricing/notify", async (req, res) => {
    const { email, plan } = req.body || {};

    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: "Invalid email" });
    }

    const spreadsheetId = "1Q-fEVKDy6ZlBGh_eGq-0DgcPxbQ5nyrEdQlxRaVkulg";
    const serviceAccountJson = (process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON || "").trim();
    const keyFile = (process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_KEYFILE || "").trim();

    if (!serviceAccountJson && !keyFile) {
      console.warn("Pricing notify: missing service account credentials");
      return res.status(503).json({ error: "Sheet integration not configured" });
    }

    try {
      let credentials: any;
      if (serviceAccountJson) {
        credentials = JSON.parse(serviceAccountJson);
        if (typeof credentials?.private_key === "string" && credentials.private_key.includes("\\n")) {
          credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
        }
      } else {
        credentials = JSON.parse(readFileSync(keyFile, "utf-8"));
        if (typeof credentials?.private_key === "string" && credentials.private_key.includes("\\n")) {
          credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
        }
      }

      const jwtClient = new google.auth.JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      });

      const sheetsApi = google.sheets({ version: "v4", auth: jwtClient });

      const meta = await sheetsApi.spreadsheets.get({
        spreadsheetId,
        fields: "sheets(properties(title))",
      });
      const sheetTitle = meta.data.sheets?.[0]?.properties?.title;
      if (!sheetTitle) throw new Error("Could not read sheet title");

      const now = new Date().toISOString();
      await sheetsApi.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetTitle}!A:C`,
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        requestBody: {
          values: [[now, email.trim().toLowerCase(), plan || ""]],
        },
      });

      res.json({ ok: true });
    } catch (err: any) {
      console.error("Pricing notify error:", err);
      res.status(500).json({ error: "Failed to save" });
    }
  });

  // ── POST /api/admin/reset-user — reset generations for testing ──
  app.post("/api/admin/reset-user", (req, res) => {
    const { email, count = 3 } = req.body;
    const db = readDB();
    const user = Object.values(db.users).find((u: User) => u.email === email);
    if (!user) return res.status(404).json({ error: "User not found" });
    const isOwnerReset = isConceptTestAccountEmail(user.email);
    const cap = isOwnerReset ? 999 : FREE_TIER_MAX_CONCEPTS;
    user.generationsLeft = Math.min(cap, Number(count) || FREE_TIER_MAX_CONCEPTS);
    user.shoppingListsLeft = isOwnerReset ? 999 : FREE_TIER_MAX_SHOPPING_LISTS;
    db.users[user.googleId] = user;
    writeDB(db);
    res.json({ ok: true, email: user.email, generationsLeft: user.generationsLeft });
  });

  // ── POST /api/ai-vision/generate — two-step concept generation ──
  //
  // Step 1: extract style brief from reference images (or use hardcoded preset brief).
  // Step 2: generate the concept image with gemini-2.5-flash-image.
  //
  // Body (JSON):
  //   roomPhoto       string  — data URL of the room photo (required)
  //   referenceImages string[] — data URLs of reference images (may be empty)
  //   stylePreset     string  — frontend display name e.g. "Japandi" (optional)
  //   roomType        string  — frontend display name e.g. "Living Room" (optional)
  //   variationSeed   number  — increments per "Generate Variation" click (optional)
  //
  app.post("/api/ai-vision/generate", async (req, res) => {
    const googleId = requireAuth(req, res);
    if (!googleId) return;

    const {
      roomPhoto,
      referenceImages = [],
      stylePreset,
      roomType,
      variationSeed,
      isSampleRun = false,
    } = req.body ?? {};

    // ── Validate inputs ────────────────────────────────────────────────────────
    if (!roomPhoto || typeof roomPhoto !== "string") {
      return res.status(400).json({ error: "Room photo is required." });
    }
    if (
      (!Array.isArray(referenceImages) || referenceImages.length === 0) &&
      !stylePreset
    ) {
      return res
        .status(400)
        .json({
          error:
            "Please add a reference image or select a style to continue.",
        });
    }

    // ── Quota check + decrement ────────────────────────────────────────────────
    const db = readDB();
    const user = db.users[googleId];
    if (!user) return res.status(404).json({ error: "User not found." });

    if (user.generationsLeft <= 0 && !isSampleRun) {
      return res
        .status(403)
        .json({ error: "No generations left.", generationsLeft: 0 });
    }
    if (!isSampleRun && user.generationsLeft < 999) {
      user.generationsLeft -= 1;
      user.lastUsed = new Date().toISOString();
      db.users[googleId] = user;
      writeDB(db);
    } else if (isSampleRun) {
      console.log(`[AI Vision] Sample run for ${user.email} — quota not decremented (${user.generationsLeft} remaining)`);
    }

    // ── Helper: parse data URL → { data, mimeType } ───────────────────────────
    function parseDataUrl(
      dataUrl: string
    ): { data: string; mimeType: string } | null {
      const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/s);
      if (!m) return null;
      return { mimeType: m[1], data: m[2] };
    }

    try {
      // ── Resolve preset key (if any) ──────────────────────────────────────────
      const resolvedPreset = stylePreset
        ? STYLE_NAME_TO_PRESET[stylePreset as string]
        : undefined;

      // ── Parse reference image data URLs ─────────────────────────────────────
      const parsedRefs = (referenceImages as string[])
        .map(parseDataUrl)
        .filter((p): p is { data: string; mimeType: string } => p !== null);

      // References win over preset; if no parseable refs use preset only
      const hasRefs = parsedRefs.length > 0;

      // ── Step 1: Style brief (cached) ────────────────────────────────────────
      const cacheKey = getCacheKey({
        referenceImageData: parsedRefs.map((r) => r.data),
        preset: hasRefs ? undefined : resolvedPreset,
      });

      let styleBrief = getCachedBrief(cacheKey);

      if (!styleBrief) {
        styleBrief = await extractStyleBrief({
          referenceImageData: hasRefs ? parsedRefs : [],
          fallbackPreset: hasRefs ? undefined : resolvedPreset,
        });
        setCachedBrief(cacheKey, styleBrief);
      }

      // ── Step 2: Concept image ────────────────────────────────────────────────
      const parsedRoom = parseDataUrl(roomPhoto as string);
      if (!parsedRoom) {
        throw new Error("Room photo could not be parsed as a data URL.");
      }

      const resolvedRoomType = roomType
        ? ROOM_NAME_TO_TYPE[roomType as string]
        : undefined;

      const conceptDataUrl = await generateConceptImage({
        roomPhoto: parsedRoom,
        styleBrief,
        roomType: resolvedRoomType,
        variationSeed: typeof variationSeed === "number" ? variationSeed : undefined,
      });

      return res.json({
        success: true,
        conceptUrl: conceptDataUrl,
        generationsLeft: user.generationsLeft,
      });

    } catch (err: any) {
      console.error("[AI Vision] Generation failed:", err?.message ?? err);

      // Restore quota on generation failure
      try {
        const dbRetry = readDB();
        const u = dbRetry.users[googleId];
        if (u && u.generationsLeft < 999) {
          const cap = isConceptTestAccountEmail(u.email) ? 999 : FREE_TIER_MAX_CONCEPTS;
          u.generationsLeft = Math.min(cap, u.generationsLeft + 1);
          dbRetry.users[googleId] = u;
          writeDB(dbRetry);
        }
      } catch (restoreErr) {
        console.error("[AI Vision] Failed to restore quota after error:", restoreErr);
      }

      const msg: string = err?.message ?? "";
      if (msg.includes("403") || msg.toLowerCase().includes("permission")) {
        return res
          .status(500)
          .json({ error: "API key error. Please contact support." });
      }
      if (msg.toLowerCase().includes("quota") || msg.toLowerCase().includes("rate")) {
        return res
          .status(429)
          .json({ error: "Generation quota exceeded. Please try again shortly." });
      }
      if (msg.includes("incomplete brief")) {
        return res
          .status(503)
          .json({ error: "We hit a snag generating your concept. Please try again." });
      }
      return res
        .status(500)
        .json({ error: "Concept generation failed. Please try again." });
    }
  });

  // ── POST /api/room-audit/analyze — run Gemini room audit server-side ──
  app.post("/api/room-audit/analyze", async (req, res) => {
    const googleId = requireAuth(req, res);
    if (!googleId) return;

    const { imageDataUrl, goals = [] } = req.body ?? {};
    if (!imageDataUrl || typeof imageDataUrl !== "string") {
      return res.status(400).json({ error: "imageDataUrl is required." });
    }
    const matches = imageDataUrl.match(/^data:(image\/[\w+]+);base64,(.+)$/);
    if (!matches) return res.status(400).json({ error: "Invalid image format." });

    try {
      const apiKey = process.env.GEMINI_API_KEY ?? "";
      if (!apiKey) throw new Error("GEMINI_API_KEY is not set.");
      const ai = new GoogleGenAI({ apiKey });

      const goalContext = Array.isArray(goals) && goals.length > 0
        ? `\nThe homeowner's goals: ${goals.join(", ")}.`
        : "";

      const prompt = `You are an expert interior designer performing a professional room audit.
Analyze this room photo and produce a structured design audit.${goalContext}

Score each of these 6 dimensions from 1-10 and write 1-2 sentences explaining the score:
1. Layout & Flow — furniture arrangement, traffic paths, spatial balance
2. Lighting — natural light use, layered lighting, ambiance
3. Color Harmony — palette cohesion, contrast, mood
4. Clutter & Organization — visual cleanliness, storage use
5. Functionality — practical use of space, ergonomics
6. Style Cohesion — consistency of design language, intentionality

Then calculate an overall score from 1-100 (weighted average, not a simple mean — layout and functionality matter more).

Finally, list exactly 3 "Fix Now" items — the highest-impact, most actionable improvements the homeowner can make immediately.

Output ONLY valid JSON with no markdown fences, no explanation:
{"overallScore":72,"dimensions":[{"label":"Layout & Flow","score":7,"verdict":"The sofa placement creates a clear conversation zone, but the dining table blocks the path to the balcony."},{"label":"Lighting","score":5,"verdict":"..."},{"label":"Color Harmony","score":8,"verdict":"..."},{"label":"Clutter & Organization","score":6,"verdict":"..."},{"label":"Functionality","score":7,"verdict":"..."},{"label":"Style Cohesion","score":6,"verdict":"..."}],"fixNow":["Move the dining table 30cm left to open the balcony path","Add a floor lamp in the dark corner by the bookshelf","Replace the mismatched throw pillows with a cohesive neutral set"]}`;

      const geminiRes = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: {
          parts: [
            { inlineData: { mimeType: matches[1], data: matches[2] } },
            { text: prompt },
          ],
        },
      });

      const rawText: string =
        (geminiRes as any).text ??
        geminiRes?.candidates?.[0]?.content?.parts
          ?.map((p: any) => p.text ?? "")
          .join("") ?? "";
      const cleaned = rawText.replace(/```json|```/g, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return res.status(422).json({ error: "Could not parse audit results." });
      }
      const parsed = JSON.parse(jsonMatch[0]);
      return res.json({ result: parsed });

    } catch (err: any) {
      console.error("[Room Audit] analyze error:", err?.message ?? err);
      return res.status(500).json({ error: "Audit failed. Please try again." });
    }
  });

  // ── GET /api/admin/users — simple admin view (no auth for now) ──
  app.get("/api/admin/users", (req, res) => {
    const db = readDB();
    const users = Object.values(db.users).map((u) => ({
      email: u.email,
      name: u.name,
      generationsLeft: u.generationsLeft,
      createdAt: u.createdAt,
      lastUsed: u.lastUsed,
    }));
    res.json({ total: users.length, users });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    // Vite default HMR WebSocket port 24678 often conflicts.
    // If the configured port is already taken (e.g. you ran another dev server), auto-pick a free one.
    const desiredPort = Number(process.env.VITE_HMR_PORT) || 24778;
    const isPortAvailable = (port: number) =>
      new Promise<boolean>((resolve) => {
        const srv = net.createServer();
        srv.unref();
        srv.on("error", (err: any) => {
          if (err && err.code === "EADDRINUSE") return resolve(false);
          resolve(false);
        });
        // Listen on all interfaces so we detect conflicts on IPv4/IPv6/localhost.
        srv.listen(port, () => {
          srv.close(() => resolve(true));
        });
      });

    let hmrPort = desiredPort;
    // Try up to 25 ports: desiredPort..desiredPort+24
    for (let i = 0; i < 25; i++) {
      const candidate = desiredPort + i;
      // eslint-disable-next-line no-await-in-loop
      if (await isPortAvailable(candidate)) {
        hmrPort = candidate;
        break;
      }
    }
    if (hmrPort !== desiredPort) {
      console.warn(`HMR port ${desiredPort} was busy; using ${hmrPort} instead.`);
    }
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        // Force IPv4 loopback to avoid Windows localhost (IPv6) port collisions.
        hmr: { port: hmrPort, clientPort: hmrPort, host: "127.0.0.1" },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*all", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`✅ Shopping quota protection: ACTIVE (owner = ${CONCEPT_TEST_ACCOUNT_EMAIL})`);
  });
}

startServer();