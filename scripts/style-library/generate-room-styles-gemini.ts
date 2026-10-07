/**
 * Gemini twin of the ChatGPT style research: 3 reference rooms x 15 styles = 45 renders.
 *
 * Uses the exact filled prompts from the doc repo style files
 * (cards/redesign-my-room/styles/NN-style.html, JSON block "prompt_room_redesign")
 * and the same three reference photos, so ChatGPT and Gemini results compare 1:1.
 *
 * Run (needs GEMINI_API_KEY in .env or the environment):
 *   npx tsx scripts/style-library/generate-room-styles-gemini.ts --doc ../doc
 *   npx tsx scripts/style-library/generate-room-styles-gemini.ts --doc ../doc --rooms 01 --styles japandi,coastal
 *   npx tsx scripts/style-library/generate-room-styles-gemini.ts --doc ../doc --dry-run
 *
 * Resumable: an existing PNG is skipped unless --force.
 */
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

const FALLBACK_ENV_PATH = "E:/Secrets/Website/.env";
dotenv.config({ path: fs.existsSync(".env") ? ".env" : FALLBACK_ENV_PATH });

const argv = process.argv.slice(2);
const flag = (n: string) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };
const has = (n: string) => argv.includes(`--${n}`);
const csv = (v?: string) => (v ? v.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean) : undefined);

const DOC = path.resolve(flag("doc") ?? "../doc");
const STYLES_DIR = path.join(DOC, "cards/redesign-my-room/styles");
const RESEARCH = path.join(DOC, "research/Room Styles from chatgpt/Designature-45-Style-Renders");
const OUT = path.join(DOC, "research/Room Styles from gemini/Designature-45-Style-Renders-Gemini");
const MODEL = (process.env.GEMINI_IMAGE_MODEL || "").trim() || "gemini-3.1-flash-image";
const onlyRooms = csv(flag("rooms"));
const onlyStyles = csv(flag("styles"));
const force = has("force");
const dryRun = has("dry-run");

interface StyleData { n: string; slug: string; name: string; prompt_room_redesign: string }

function loadStyles(): StyleData[] {
  return fs.readdirSync(STYLES_DIR).filter((f) => /^\d\d-.*\.html$/.test(f)).sort().map((f) => {
    const html = fs.readFileSync(path.join(STYLES_DIR, f), "utf8");
    const m = html.match(/id="style-data">\s*([\s\S]*?)\s*<\/script>/);
    if (!m) throw new Error(`No style-data block in ${f}`);
    return JSON.parse(m[1].replace(/<\\\//g, "</")) as StyleData;
  }).filter((s) => !onlyStyles || onlyStyles.includes(s.slug) || onlyStyles.includes(s.name.toLowerCase()));
}

function findReference(room: string): { file: string; mime: string } {
  for (const ext of ["png", "jpeg", "jpg"]) {
    const file = path.join(RESEARCH, `Room-${room}`, `Reference.${ext}`);
    if (fs.existsSync(file)) return { file, mime: ext === "png" ? "image/png" : "image/jpeg" };
  }
  throw new Error(`No Reference image for Room-${room}`);
}

async function render(ai: GoogleGenAI, ref: { file: string; mime: string }, prompt: string): Promise<Buffer> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await ai.models.generateContent({
        model: MODEL,
        contents: [{ role: "user", parts: [
          { inlineData: { mimeType: ref.mime, data: fs.readFileSync(ref.file).toString("base64") } },
          { text: prompt },
        ] }],
        config: { responseModalities: ["IMAGE"] },
      });
      const part = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
      if (part?.inlineData?.data) return Buffer.from(part.inlineData.data, "base64");
      throw new Error("No image in response");
    } catch (e) {
      if (attempt === 3) throw e;
      await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
    }
  }
  throw new Error("unreachable");
}

function writeComparison(room: string, styles: StyleData[]) {
  const cards = styles.map((s) => {
    const png = `Room-${room}-${s.name.replace(/ /g, "-")}.png`;
    return `<article><h3>${s.name}</h3><a href="${png}" target="_blank"><img src="${png}" loading="lazy" alt="${s.name}"></a><details><summary>Actual prompt</summary><pre>${s.prompt_room_redesign.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</pre></details></article>`;
  }).join("");
  fs.writeFileSync(path.join(OUT, `Room-${room}`, "Comparison.html"),
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Room ${room} · 15 styles · Gemini</title><style>body{background:#f6f3ee;color:#273744;font:16px/1.6 Arial;margin:0}main{max-width:1400px;margin:auto;padding:30px}h1{font:42px Georgia}.reference{max-width:700px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}article{background:white;padding:12px;border-radius:12px}img{width:100%;height:auto;display:block}pre{white-space:pre-wrap;font:12px/1.6 Arial}@media(max-width:800px){.grid{grid-template-columns:1fr 1fr}}@media(max-width:500px){.grid{grid-template-columns:1fr}}</style><main><h1>Room ${room} · Gemini (${MODEL})</h1><img class="reference" src="${path.basename(findReference(room).file)}" alt="Reference"><div class="grid">${cards}</div></main></html>`);
}

async function main() {
  const styles = loadStyles();
  const rooms = ["01", "02", "03"].filter((r) => !onlyRooms || onlyRooms.includes(r));
  console.log(`${rooms.length} rooms x ${styles.length} styles = ${rooms.length * styles.length} renders, model ${MODEL}`);
  if (dryRun) return;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY missing. Put it in .env or the environment.");
  const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: 180000 } });
  for (const room of rooms) {
    const dir = path.join(OUT, `Room-${room}`);
    fs.mkdirSync(dir, { recursive: true });
    const ref = findReference(room);
    fs.copyFileSync(ref.file, path.join(dir, path.basename(ref.file)));
    for (const s of styles) {
      const png = path.join(dir, `Room-${room}-${s.name.replace(/ /g, "-")}.png`);
      fs.writeFileSync(path.join(dir, `${s.name.replace(/ /g, "-")}-Prompt.txt`), s.prompt_room_redesign);
      if (fs.existsSync(png) && !force) { console.log(`skip  ${room} ${s.name}`); continue; }
      try {
        fs.writeFileSync(png, await render(ai, ref, s.prompt_room_redesign));
        console.log(`done  ${room} ${s.name}`);
      } catch (e) { console.error(`FAIL  ${room} ${s.name}: ${(e as Error).message}`); }
    }
    writeComparison(room, loadStyles());
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
