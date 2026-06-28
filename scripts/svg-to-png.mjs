// Render the OG card SVG to a real PNG (social platforms don't reliably render SVG).
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(path.join(root, "public/og.svg"));

await sharp(svg, { density: 200 })
  .resize(1200, 630)
  .png({ quality: 90 })
  .toFile(path.join(root, "public/og.png"));

console.log("Wrote public/og.png (1200x630)");
