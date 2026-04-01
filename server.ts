import dotenv from "dotenv";
import express from "express";
import { createServer as createViteServer } from "vite";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { createHash } from "crypto";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import path from "path";

dotenv.config();

// ─── Simple JSON "database" stored in users.json ───────────────────────────
const DB_PATH = "./users.json";
const DB_SEED_PATH = "./users.seed.json";

interface User {
  email: string;
  name: string;
  picture: string;
  googleId: string;
  generationsLeft: number;
  createdAt: string;
  lastUsed: string;
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

  // ── POST /api/auth/google — exchange Google ID token for session ──
  app.post("/api/auth/google", async (req, res) => {
    try {
      const { credential } = req.body;
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
        // New user — give 3 free generations
        user = {
          email,
          name: name || email,
          picture: picture || "",
          googleId,
          generationsLeft: 3,
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

      const token = createSession(googleId);

      res.json({
        token,
        user: {
          email: user.email,
          name: user.name,
          picture: user.picture,
          generationsLeft: user.generationsLeft,
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
    const user = db.users[googleId];
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      email: user.email,
      name: user.name,
      picture: user.picture,
      generationsLeft: user.generationsLeft,
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

    // Never restore above 3
    user.generationsLeft = Math.min(3, user.generationsLeft + count);
    db.users[googleId] = user;
    writeDB(db);

    res.json({ generationsLeft: user.generationsLeft });
  });

  // ── POST /api/shopping/search — Serper.dev Google Shopping API ──
  app.post("/api/shopping/search", async (req, res) => {
    try {
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

      res.json({ results: searchResults });

    } catch (err: any) {
      console.error("Shopping search error:", err);
      res.status(500).json({ error: "Shopping search failed: " + (err.message || "unknown error") });
    }
  });

  // ── POST /api/admin/reset-user — reset generations for testing ──
  app.post("/api/admin/reset-user", (req, res) => {
    const { email, count = 3 } = req.body;
    const db = readDB();
    const user = Object.values(db.users).find((u: User) => u.email === email);
    if (!user) return res.status(404).json({ error: "User not found" });
    user.generationsLeft = count;
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
    const vite = await createViteServer({
      server: { middlewareMode: true },
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