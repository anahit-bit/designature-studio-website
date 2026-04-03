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

dotenv.config();

/** Free tier caps (UI + API). Paid tier can be added later with an `isPaid` flag. */
const FREE_TIER_MAX_CONCEPTS = 3;
const FREE_TIER_MAX_SHOPPING_LISTS = 3;

/** This account keeps a higher `generationsLeft` in DB for internal testing (not clamped to 3). */
const CONCEPT_TEST_ACCOUNT_EMAIL = "anahit@designature.studio";

function isConceptTestAccountEmail(email: string): boolean {
  return email.trim().toLowerCase() === CONCEPT_TEST_ACCOUNT_EMAIL;
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
  createdAt: string;
  lastUsed: string;
}

function normalizeUserForFreeTier(user: User): { user: User; changed: boolean } {
  let changed = false;
  const u = { ...user };
  const isOwner = isConceptTestAccountEmail(u.email);
  if (!isOwner && u.generationsLeft > FREE_TIER_MAX_CONCEPTS) {
    u.generationsLeft = FREE_TIER_MAX_CONCEPTS;
    changed = true;
  }
  if (isOwner) {
    // Owner account gets unlimited everything — never clamp
    if (u.generationsLeft !== 999) { u.generationsLeft = 999; changed = true; }
    if (u.shoppingListsLeft !== 999) { u.shoppingListsLeft = 999; changed = true; }
  } else {
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
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

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
    res.json({
      email: user.email,
      name: user.name,
      picture: user.picture,
      generationsLeft: user.generationsLeft,
      shoppingListsLeft: user.shoppingListsLeft,
      isPaid: ownerAccount ? true : false,
      auditsLeft: ownerAccount ? 999 : 0,
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

    user.generationsLeft -= count;
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
      const SERPER_API_KEY = (process.env.SERPER_API_KEY || "").trim();
      if (!SERPER_API_KEY) return res.status(500).json({ error: "SERPER_API_KEY not set — add it in AI Studio Secrets" });

      // ── Retailer filter ──────────────────────────────────────────────────────
      // List the shops you want results from. Leave empty [] to search all shops.
      // Serper searches Google Shopping — adding shop names biases results toward them.
      // Tip: keep this list to 4-5 shops max for best diversity. Wayfair dominates
      // if included alongside others, so it's intentionally excluded here.
      const PREFERRED_SHOPS: string[] = [
        "west elm",
        "cb2",
        "ikea",
        "pottery barn",
        "article",
        "crate and barrel",
        "room and board",
      ];

      // Build optional site filter — appended to query only if list is non-empty
      const shopFilter = PREFERRED_SHOPS.length > 0
        ? PREFERRED_SHOPS.map(s => `"${s}"`).join(" OR ")
        : "";

      const searchResults = await Promise.all(
        items.slice(0, 4).map(async (item: any) => {
          try {
            // Clean product query — no retailer names = more diverse natural results
            // Shop filter is appended separately so Google matches it as a preference not a requirement
            const query = shopFilter
              ? `${item.search_query} furniture (${shopFilter})`
              : `${item.search_query} furniture buy`;
            console.log(`Serper shopping search: "${query}"`);

            const serperRes = await fetch("https://google.serper.dev/shopping", {
              method: "POST",
              headers: {
                "X-API-KEY": SERPER_API_KEY,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                q: query,
                gl: gl,
                hl: "en",
                num: 6,
              }),
            });

            const serperData = await serperRes.json();

            if (!serperRes.ok) {
              console.error(`Serper error for "${item.search_query}":`, JSON.stringify(serperData));
              return { item: { category: item.category, description: item.description }, products: [], error: serperData.message || "Search failed" };
            }

             const shoppingItems = serperData.shopping || [];
             if (shoppingItems.length > 0) {
               const s = shoppingItems[0];
               console.log('SERPER RAW FIELDS:', JSON.stringify({
                 link: s.link,
                 productLink: s.productLink,
                 merchantLink: s.merchantLink,
                 source: s.source,
                 allKeys: Object.keys(s),
               }));
             }

             // Extract best direct URL from Serper result
             const extractDirectLink = (r: any): string => {
               // 1. If we have a direct productLink that isn't a google redirect, use it
               if (r.productLink && !r.productLink.includes('google.com/url')) return r.productLink;
               
               // 2. If we have a merchantLink that isn't a google redirect, use it
               if (r.merchantLink && !r.merchantLink.includes('google.com/url')) return r.merchantLink;
               
               // 3. Try decoding the 'adurl' or 'url' param from the Google redirect link
               if (r.link) {
                 try {
                   const urlObj = new URL(r.link);
                   const adUrl = urlObj.searchParams.get('adurl') || urlObj.searchParams.get('url') || urlObj.searchParams.get('q');
                   if (adUrl && adUrl.startsWith('http') && !adUrl.includes('google.com')) {
                     return adUrl;
                   }
                 } catch (e) {
                   // Fallback to regex if URL parsing fails
                   const m = r.link.match(/[?&](?:adurl|url|q)=([^&]+)/i);
                   if (m) {
                     const decoded = decodeURIComponent(m[1]);
                     if (decoded.startsWith('http') && !decoded.includes('google.com')) return decoded;
                   }
                 }
               }
               
               // 4. Final fallback: use the link as is if it's not a known redirect, otherwise return #
               return (r.link && !r.link.includes('google.com/url')) ? r.link : (r.productLink || r.merchantLink || r.link || "#");
             };

             const products = shoppingItems.slice(0, 3).map((r: any) => {
               // Clean source name (e.g. "wayfair.com" -> "Wayfair")
               let source = (r.source || "")
                 .replace(/^https?:\/\//i, "")
                 .replace(/^www\./i, "")
                 .split(/[/?#]/)[0] // Get domain only
                 .replace(/\.(com|org|net|edu|gov|io|co|uk|ca|au|de|fr|am|ae)$/i, "") // Remove common TLDs
                 .split(/[-_.]/).map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
                 .trim();
               
               if (!source) source = "Shop";

               return {
                 title: r.title || "Product",
                 price: r.price || null,
                 source,
                 link: extractDirectLink(r),
                 thumbnail: r.imageUrl || null,
                 rating: r.rating || null,
                 reviews: r.ratingCount || null,
               };
             });

            return { item: { category: item.category, description: item.description }, products };

          } catch (err) {
            console.error("Serper search error for", item.category, err);
            return { item: { category: item.category, description: item.description }, products: [] };
          }
        })
      );

      shopUser.shoppingListsLeft -= 1;
      shopUser.lastUsed = new Date().toISOString();
      dbShop.users[googleIdShopping] = shopUser;
      writeDB(dbShop);

      res.json({ results: searchResults, shoppingListsLeft: shopUser.shoppingListsLeft });

    } catch (err: any) {
      console.error("Shopping search error:", err);
      res.status(500).json({ error: "Shopping search failed: " + (err.message || "unknown error") });
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

  // ── POST /api/admin/reset-user — reset generations for testing ──
  app.post("/api/admin/reset-user", (req, res) => {
    const { email, count = 3 } = req.body;
    const db = readDB();
    const user = Object.values(db.users).find((u: User) => u.email === email);
    if (!user) return res.status(404).json({ error: "User not found" });
    const cap = isConceptTestAccountEmail(user.email) ? 999 : FREE_TIER_MAX_CONCEPTS;
    user.generationsLeft = Math.min(cap, Number(count) || FREE_TIER_MAX_CONCEPTS);
    user.shoppingListsLeft = FREE_TIER_MAX_SHOPPING_LISTS;
    db.users[user.googleId] = user;
    writeDB(db);
    res.json({ ok: true, email: user.email, generationsLeft: user.generationsLeft });
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
  });
}

startServer();