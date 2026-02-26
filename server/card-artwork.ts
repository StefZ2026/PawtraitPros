/**
 * Pawtrait Pros — Card Artwork Generator
 *
 * Composites pet portraits onto occasion-themed card templates using sharp.
 * Follows the same pattern as generate-mockups.ts (SVG text, rounded images, composites).
 *
 * Card dimensions: 5R = 5×7" = 1500×2100px at 300 DPI (vertical / portrait orientation).
 */

import sharp from "sharp";
sharp.cache(false);
import { fetchImageAsBuffer } from "./supabase-storage";
import type { CardOccasion } from "./gelato-config";
import { CARD_DIMENSIONS } from "./gelato-config";

// --- SVG HELPERS (same pattern as generate-mockups.ts) ---

function roundedRectSvg(w: number, h: number, r: number, fill: string): string {
  return `<svg width="${w}" height="${h}"><rect x="0" y="0" width="${w}" height="${h}" rx="${r}" ry="${r}" fill="${fill}"/></svg>`;
}

function textSvg(
  text: string,
  fontSize: number,
  color: string,
  maxWidth: number,
  fontWeight = "bold",
  align: "start" | "middle" = "start",
): Buffer {
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const anchor = align === "middle" ? "middle" : "start";
  const x = align === "middle" ? maxWidth / 2 : 0;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${maxWidth}" height="${Math.round(fontSize * 1.5)}">
    <text x="${x}" y="${fontSize}" font-family="Georgia, 'Times New Roman', serif" font-size="${fontSize}" font-weight="${fontWeight}" fill="${color}" text-anchor="${anchor}">${escaped}</text>
  </svg>`;
  return Buffer.from(svg);
}

function multiLineTextSvg(
  lines: string[],
  fontSize: number,
  color: string,
  maxWidth: number,
  fontWeight = "normal",
  lineHeight = 1.6,
  align: "start" | "middle" = "middle",
): Buffer {
  const anchor = align === "middle" ? "middle" : "start";
  const x = align === "middle" ? maxWidth / 2 : 0;
  const totalHeight = Math.round(fontSize * lineHeight * lines.length);
  const escapedLines = lines.map((l) => l.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"));
  const tspans = escapedLines
    .map((l, i) => `<tspan x="${x}" dy="${i === 0 ? fontSize : Math.round(fontSize * lineHeight)}">${l}</tspan>`)
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${maxWidth}" height="${totalHeight + 20}">
    <text font-family="Georgia, 'Times New Roman', serif" font-size="${fontSize}" font-weight="${fontWeight}" fill="${color}" text-anchor="${anchor}">${tspans}</text>
  </svg>`;
  return Buffer.from(svg);
}

function decorativeBorderSvg(w: number, h: number, color: string, thickness: number, radius: number): Buffer {
  const inset = thickness / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <rect x="${inset}" y="${inset}" width="${w - thickness}" height="${h - thickness}" rx="${radius}" ry="${radius}" fill="none" stroke="${color}" stroke-width="${thickness}"/>
  </svg>`;
  return Buffer.from(svg);
}

async function resizeToFit(imageBuffer: Buffer, maxW: number, maxH: number): Promise<Buffer> {
  return sharp(imageBuffer)
    .resize(maxW, maxH, { fit: "cover", position: "top" })
    .png()
    .toBuffer();
}

async function makeRoundedImage(imageBuffer: Buffer, w: number, h: number, radius: number): Promise<Buffer> {
  const resized = await resizeToFit(imageBuffer, w, h);
  const mask = Buffer.from(
    `<svg width="${w}" height="${h}"><rect x="0" y="0" width="${w}" height="${h}" rx="${radius}" ry="${radius}" fill="white"/></svg>`,
  );
  return sharp(resized).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
}

// --- FLAT CARD ARTWORK ---

/**
 * Generate front artwork for a flat 5×7 greeting card.
 * Layout: occasion-colored background, decorative border, portrait centered,
 * greeting text above, pet name below.
 */
export async function generateFlatCardArtwork(
  portraitUrl: string,
  occasion: CardOccasion,
  petName: string,
  orgName: string,
): Promise<Buffer> {
  const { width: W, height: H } = CARD_DIMENSIONS.flat_front;
  const { primary, secondary, textColor } = occasion.templateColors;

  const portraitBuf = await fetchImageAsBuffer(portraitUrl);
  const composites: sharp.OverlayOptions[] = [];

  // Background
  const bg = await sharp({
    create: { width: W, height: H, channels: 4, background: hexToRgb(secondary) },
  }).png().toBuffer();

  // Decorative border
  composites.push({ input: decorativeBorderSvg(W, H, primary, 16, 24), top: 0, left: 0 });

  // Inner decorative border
  composites.push({ input: decorativeBorderSvg(W - 60, H - 60, primary, 4, 16), top: 30, left: 30 });

  // Greeting text at top
  const greetingText = textSvg(occasion.greetingText, 72, textColor, W - 120, "bold", "middle");
  composites.push({ input: greetingText, top: 80, left: 60 });

  // Portrait (centered, with rounded corners)
  const portraitW = W - 200;
  const portraitH = H - 550;
  const roundedPortrait = await makeRoundedImage(portraitBuf, portraitW, portraitH, 20);
  const portraitLeft = Math.round((W - portraitW) / 2);
  composites.push({ input: roundedPortrait, top: 220, left: portraitLeft });

  // Pet name below portrait
  const nameText = textSvg(petName, 52, textColor, W - 120, "bold", "middle");
  composites.push({ input: nameText, top: 220 + portraitH + 30, left: 60 });

  // Small "from [OrgName]" at bottom
  const fromText = textSvg(`from ${orgName}`, 24, primary, W - 120, "normal", "middle");
  composites.push({ input: fromText, top: H - 80, left: 60 });

  return sharp(bg).composite(composites).png().toBuffer();
}

/**
 * Generate back artwork for a flat 5×7 greeting card.
 * Simple: org branding + "Powered by Pawtrait Pros"
 */
export async function generateFlatCardBack(orgName: string): Promise<Buffer> {
  const { width: W, height: H } = CARD_DIMENSIONS.flat_back;
  const composites: sharp.OverlayOptions[] = [];

  const bg = await sharp({
    create: { width: W, height: H, channels: 4, background: { r: 255, g: 255, b: 255 } },
  }).png().toBuffer();

  // Org name centered
  const orgText = textSvg(orgName, 32, "#666666", W - 200, "normal", "middle");
  composites.push({ input: orgText, top: Math.round(H / 2) - 40, left: 100 });

  // "Powered by Pawtrait Pros" below
  const poweredText = textSvg("Powered by Pawtrait Pros", 22, "#999999", W - 200, "normal", "middle");
  composites.push({ input: poweredText, top: Math.round(H / 2) + 10, left: 100 });

  return sharp(bg).composite(composites).png().toBuffer();
}

// --- FOLDED CARD ARTWORK ---

/**
 * Generate outside artwork for a folded 5×7 greeting card.
 * This is what you see when the card is closed:
 * - Front cover (top half when printed): portrait + greeting text
 * - Back (bottom half when printed): org branding
 *
 * For a vertically-folded card, the artwork is one page that gets folded in half.
 * Top half = front cover, bottom half = back cover.
 */
export async function generateFoldedOutsideArtwork(
  portraitUrl: string,
  occasion: CardOccasion,
  petName: string,
  orgName: string,
): Promise<Buffer> {
  const { width: W, height: H } = CARD_DIMENSIONS.folded_outside;
  const { primary, secondary, textColor } = occasion.templateColors;

  const portraitBuf = await fetchImageAsBuffer(portraitUrl);
  const composites: sharp.OverlayOptions[] = [];

  const bg = await sharp({
    create: { width: W, height: H, channels: 4, background: { r: 255, g: 255, b: 255 } },
  }).png().toBuffer();

  // === TOP HALF: Front Cover ===
  const halfH = Math.round(H / 2);

  // Front cover background
  const frontBg = await sharp(Buffer.from(roundedRectSvg(W, halfH, 0, secondary))).png().toBuffer();
  composites.push({ input: frontBg, top: 0, left: 0 });

  // Border on front cover
  composites.push({ input: decorativeBorderSvg(W - 40, halfH - 40, primary, 4, 12), top: 20, left: 20 });

  // Greeting text (compact to give portrait more room)
  const greetingText = textSvg(occasion.greetingText, 42, textColor, W - 120, "bold", "middle");
  composites.push({ input: greetingText, top: 30, left: 60 });

  // Portrait (square area so portrait-oriented pet photos don't get severely cropped)
  const portraitSize = halfH - 200;  // ~850px square
  const roundedPortrait = await makeRoundedImage(portraitBuf, portraitSize, portraitSize, 16);
  composites.push({ input: roundedPortrait, top: 95, left: Math.round((W - portraitSize) / 2) });

  // Pet name
  const nameText = textSvg(petName, 34, textColor, W - 120, "bold", "middle");
  composites.push({ input: nameText, top: 95 + portraitSize + 10, left: 60 });

  // === BOTTOM HALF: Back Cover ===
  const backTop = halfH;

  // Org name centered on back
  const orgText = textSvg(orgName, 28, "#666666", W - 200, "normal", "middle");
  composites.push({ input: orgText, top: backTop + Math.round(halfH / 2) - 30, left: 100 });

  const poweredText = textSvg("Powered by Pawtrait Pros", 20, "#999999", W - 200, "normal", "middle");
  composites.push({ input: poweredText, top: backTop + Math.round(halfH / 2) + 10, left: 100 });

  return sharp(bg).composite(composites).png().toBuffer();
}

/**
 * Generate inside artwork for a folded 5×7 greeting card.
 * Left panel (top half): blank or subtle color
 * Right panel (bottom half): greeting text + sub-text with pet name
 */
export async function generateFoldedInsideArtwork(
  occasion: CardOccasion,
  petName: string,
): Promise<Buffer> {
  const { width: W, height: H } = CARD_DIMENSIONS.folded_inside;
  const { primary, textColor } = occasion.templateColors;
  const composites: sharp.OverlayOptions[] = [];

  const bg = await sharp({
    create: { width: W, height: H, channels: 4, background: { r: 255, g: 255, b: 255 } },
  }).png().toBuffer();

  const halfH = Math.round(H / 2);

  // === TOP HALF: Left panel (blank / subtle) ===
  // Subtle decorative line
  const lineSvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W - 200}" height="4"><rect x="0" y="0" width="${W - 200}" height="4" rx="2" ry="2" fill="${primary}" opacity="0.3"/></svg>`,
  );
  composites.push({ input: lineSvg, top: halfH - 20, left: 100 });

  // === BOTTOM HALF: Greeting text ===
  const greetingTop = halfH + 80;

  // Main greeting
  const greetingText = textSvg(occasion.greetingText, 64, textColor, W - 160, "bold", "middle");
  composites.push({ input: greetingText, top: greetingTop, left: 80 });

  // Sub text with pet name
  const personalizedSub = occasion.subText.replace(/\b(your|you)\b/gi, petName + "'s");
  const subLines = wrapText(personalizedSub, 35);
  const subText = multiLineTextSvg(subLines, 32, primary, W - 160, "normal", 1.6, "middle");
  composites.push({ input: subText, top: greetingTop + 110, left: 80 });

  // Decorative small elements
  const heartSvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="${primary}" opacity="0.4">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>`,
  );
  composites.push({ input: heartSvg, top: greetingTop + 280, left: Math.round(W / 2) - 20 });

  return sharp(bg).composite(composites).png().toBuffer();
}

// --- UTILITIES ---

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { r: 255, g: 255, b: 255 };
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";
  for (const word of words) {
    if (currentLine.length + word.length + 1 > maxCharsPerLine && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = currentLine ? `${currentLine} ${word}` : word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * Convert a Buffer to a base64 data URI (for uploadToStorage).
 */
export function bufferToDataUri(buffer: Buffer, mimeType = "image/png"): string {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}
