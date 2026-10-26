// One-off: renders the PWA icons from public/icons/icon.svg. Run with `node scripts/generate-icons.mjs`
// after changing the SVG; the PNGs are committed and are not built on deploy.
import { readFile } from "node:fs/promises";
import sharp from "sharp";

const svg = await readFile(new URL("../public/icons/icon.svg", import.meta.url));

const outputs = [
  ["public/icons/icon-192.png", 192],
  ["public/icons/icon-512.png", 512],
  ["public/icons/maskable-512.png", 512],
  ["src/app/apple-icon.png", 180],
];

for (const [path, size] of outputs) {
  await sharp(svg, { density: 300 }).resize(size, size).png().toFile(new URL(`../${path}`, import.meta.url).pathname);
  console.log(`wrote ${path}`);
}
