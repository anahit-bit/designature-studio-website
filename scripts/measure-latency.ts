/**
 * How long does "Reading the photo…" actually take, and what is it spent on?
 *
 * The upload is not the cost: the server already shrinks every photo to 1100 px
 * before the call, and sending a 12 MP original instead of a 1100 px one changed
 * the round trip by ~2 s. The rest is the model. This bench times the model
 * configurations against real room photos and prints what each one found, so a
 * faster setting is only chosen if it still names the same things.
 *
 *   npx tsx scripts/measure-latency.ts <photo> [<photo> …]
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { GoogleGenAI } from "@google/genai";
import { parseFound } from "../services/measure/identify.js";

const ENV = "E:\\Secrets\\Website\\.env";

function apiKey(): string {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  for (const line of fs.readFileSync(ENV, "utf8").split(/\r?\n/)) {
    const m = /^\s*GEMINI_API_KEY\s*=\s*(.*)$/.exec(line);
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  throw new Error(`GEMINI_API_KEY not found in ${ENV}`);
}

/** The prompt lives in identify.ts; keep this bench honest by using that file's. */
const PROMPT = fs
  .readFileSync(path.join(import.meta.dirname, "..", "services", "measure", "identify.ts"), "utf8")
  .split("const PROMPT = `")[1]
  .split("`;")[0];

interface Variant {
  label: string;
  model: string;
  /** Gemini 2.5 thinks before answering unless told not to. */
  thinking?: number;
}

const VARIANTS: Variant[] = [
  { label: "flash (today)", model: "gemini-2.5-flash" },
  { label: "thinking 0", model: "gemini-2.5-flash", thinking: 0 },
  { label: "thinking 128", model: "gemini-2.5-flash", thinking: 128 },
  { label: "thinking 256", model: "gemini-2.5-flash", thinking: 256 },
  { label: "thinking 512", model: "gemini-2.5-flash", thinking: 512 },
];

async function main() {
  const photos = process.argv.slice(2);
  if (!photos.length) throw new Error("give me at least one photo path");
  const ai = new GoogleGenAI({ apiKey: apiKey() });

  for (const photo of photos) {
    const jpeg = await sharp(fs.readFileSync(photo))
      .rotate()
      .resize({ width: 1100, height: 1100, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    console.log(`\n${path.basename(photo)}  (${Math.round(jpeg.length / 1024)} kB sent)`);

    for (const v of VARIANTS) {
      const t0 = Date.now();
      try {
        const res = await ai.models.generateContent({
          model: v.model,
          contents: [
            {
              role: "user",
              parts: [
                { inlineData: { mimeType: "image/jpeg", data: jpeg.toString("base64") } },
                { text: PROMPT },
              ],
            },
          ],
          config: {
            temperature: 0,
            responseMimeType: "application/json",
            ...(v.thinking === undefined ? {} : { thinkingConfig: { thinkingBudget: v.thinking } }),
          },
        });
        const items = parseFound(res.text ?? "");
        const known = items.filter((i) => i.knownId && i.wholeInFrame).map((i) => i.name);
        console.log(
          `  ${v.label.padEnd(24)} ${((Date.now() - t0) / 1000).toFixed(1).padStart(5)} s  ` +
            `${String(items.length).padStart(2)} found  sized+whole: ${known.join(", ") || "none"}`,
        );
      } catch (e) {
        console.log(`  ${v.label.padEnd(24)} FAILED  ${(e as Error).message.slice(0, 90)}`);
      }
    }
  }
}

await main();
