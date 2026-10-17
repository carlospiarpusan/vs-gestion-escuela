import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assets = path.join(root, "mobile/assets");
const store = path.join(assets, "play-store");
const resources = path.join(root, "mobile/android/app/src/main/res");
const background = "#fbfbfd";
const original = await fs.readFile(path.join(root, "public/brand/condusoft-mark.svg"), "utf8");
const parser = new DOMParser();
const serializer = new XMLSerializer();
const trimmed = await sharp(Buffer.from(original), { density: 1152 }).trim().png()
  .toBuffer({ resolveWithObject: true });
const bounds = {
  x: -trimmed.info.trimOffsetLeft / 16,
  y: -trimmed.info.trimOffsetTop / 16,
  width: trimmed.info.width / 16,
  height: trimmed.info.height / 16,
};

function markElement(document, height, centerX, centerY) {
  const mark = document.importNode(parser.parseFromString(original, "image/svg+xml").documentElement, true);
  const width = height * bounds.width / bounds.height;
  mark.setAttribute("viewBox", `${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`);
  mark.setAttribute("width", String(width));
  mark.setAttribute("height", String(height));
  mark.setAttribute("x", String(centerX - width / 2));
  mark.setAttribute("y", String(centerY - height / 2));
  return mark;
}

function source(width, height, markHeight, opaque = true) {
  const document = parser.parseFromString(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none"/>`,
    "image/svg+xml"
  );
  if (opaque) {
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("width", String(width));
    rect.setAttribute("height", String(height));
    rect.setAttribute("fill", background);
    document.documentElement.appendChild(rect);
  }
  document.documentElement.appendChild(markElement(document, markHeight, width / 2, height / 2));
  return serializer.serializeToString(document);
}

const iconSource = source(1024, 1024, 656);
// Keep the foreground inside Android's central 66/108 safe-zone circle.
const adaptiveSource = source(1024, 1024, 448, false);
const splashSource = source(1024, 1024, 656, false);
const featureSource = source(1024, 500, 292);
await fs.writeFile(path.join(store, "icon-source.svg"), iconSource + "\n");
await fs.writeFile(path.join(store, "adaptive-icon-source.svg"), adaptiveSource + "\n");
await fs.writeFile(path.join(store, "feature-graphic-source.svg"), featureSource + "\n");

async function png(svg, size, target) {
  const renderer = sharp(Buffer.from(svg), { density: 192 }).resize(size, size);
  await renderer.png().toFile(target);
}

await png(iconSource, 1024, path.join(assets, "icon.png"));
await png(adaptiveSource, 1024, path.join(assets, "adaptive-icon.png"));
await png(splashSource, 1024, path.join(assets, "splash-icon.png"));
await png(iconSource, 48, path.join(assets, "favicon.png"));
await png(iconSource, 512, path.join(store, "icon-store.png"));
await sharp(Buffer.from(featureSource), { density: 192 }).resize(1024, 500)
  .removeAlpha().png().toFile(path.join(store, "feature-graphic.png"));

for (const [density, launcher, foreground, splash] of [
  ["mdpi", 48, 108, 288], ["hdpi", 72, 162, 432], ["xhdpi", 96, 216, 576],
  ["xxhdpi", 144, 324, 864], ["xxxhdpi", 192, 432, 1152],
]) {
  const mipmap = path.join(resources, `mipmap-${density}`);
  await png(iconSource, launcher, path.join(mipmap, "ic_launcher.png"));
  await png(iconSource, launcher, path.join(mipmap, "ic_launcher_round.png"));
  await png(adaptiveSource, foreground, path.join(mipmap, "ic_launcher_foreground.png"));
  await png(splashSource, splash, path.join(resources, `drawable-${density}/splashscreen_logo.png`));
}

const preview = await sharp({ create: { width: 900, height: 300, channels: 3, background: "#eef0f3" } })
  .composite([
    { input: await sharp(path.join(store, "icon-store.png")).resize(240, 240).toBuffer(), left: 30, top: 30 },
    { input: await sharp(Buffer.from(source(1024, 1024, 672))).resize(240, 240).png().toBuffer(), left: 330, top: 30 },
    { input: await sharp(Buffer.from(source(1024, 1024, 672))).resize(240, 240)
      .composite([{ input: Buffer.from('<svg width="240" height="240"><circle cx="120" cy="120" r="120" fill="white"/></svg>'), blend: "dest-in" }])
      .png().toBuffer(), left: 630, top: 30 },
  ]).png().toBuffer();
await fs.mkdir(path.join(root, "output/android"), { recursive: true });
await fs.writeFile(path.join(root, "output/android/brand-icons-preview.png"), preview);
console.log("Generated store, Expo and native Android icons from public/brand/condusoft-mark.svg.");
