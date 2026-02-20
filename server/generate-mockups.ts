import sharp from "sharp";
import { storage } from "./storage";

const WIDTH = 1200;
const HEIGHT = 630;

const CREAM_BG = { r: 253, g: 250, b: 245 };
const ORANGE = { r: 234, g: 121, b: 35 };
const DARK_TEXT = { r: 51, g: 38, b: 25 };
const WHITE = { r: 255, g: 255, b: 255 };
const MUTED_TEXT = { r: 120, g: 100, b: 80 };

function roundedRectSvg(w: number, h: number, r: number, fill: string): string {
  return `<svg width="${w}" height="${h}"><rect x="0" y="0" width="${w}" height="${h}" rx="${r}" ry="${r}" fill="${fill}"/></svg>`;
}

function textSvg(text: string, fontSize: number, color: string, maxWidth: number, fontWeight = "bold"): Buffer {
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${maxWidth}" height="${Math.round(fontSize * 1.4)}">
    <text x="0" y="${fontSize}" font-family="sans-serif" font-size="${fontSize}" font-weight="${fontWeight}" fill="${color}">${escaped}</text>
  </svg>`;
  return Buffer.from(svg);
}

function pawtraitPalsLogoSvg(height: number): { svg: Buffer; width: number; height: number } {
  const iconSize = Math.round(height * 0.6);
  const fontSize = Math.round(height * 0.45);
  const textWidth = Math.ceil(fontSize * 0.6 * 13);
  const totalWidth = iconSize * 2 + 8 + textWidth + 8;
  const orange = `rgb(${ORANGE.r},${ORANGE.g},${ORANGE.b})`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}">
    <g transform="translate(0, ${Math.round(height * 0.15)})">
      <svg x="0" y="0" width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="${orange}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 5.172C10 3.782 8.423 2.679 6.5 3c-2.823.47-4.113 6.006-4 7 .08.703 1.725 1.722 3.656 1 1.261-.472 1.96-1.45 2.344-2.5"/>
        <path d="M14.267 5.172c0-1.39 1.577-2.493 3.5-2.172 2.823.47 4.113 6.006 4 7-.08.703-1.725 1.722-3.656 1-1.261-.472-1.855-1.45-2.239-2.5"/>
        <path d="M8 14v.5"/>
        <path d="M16 14v.5"/>
        <path d="M11.25 16.25h1.5L12 17l-.75-.75Z"/>
        <path d="M4.42 11.247A13.152 13.152 0 0 0 4 14.556C4 18.728 7.582 21 12 21s8-2.272 8-6.444c0-1.061-.162-2.2-.493-3.309m-9.243-6.082A8.801 8.801 0 0 1 12 5c.78 0 1.5.108 2.161.306"/>
      </svg>
      <svg x="${iconSize + 2}" y="0" width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="${orange}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 5c.67 0 1.35.09 2 .26 1.78-2 5.03-2.2 6.71-.56 1.73 1.69 1.97 4.5.56 6.71a9.5 9.5 0 0 1 .03 5.09c-.27 1.61-1.54 2.84-3.3 2.84H6c-1.76 0-3.03-1.23-3.3-2.84A9.5 9.5 0 0 1 2.73 11.41C1.34 9.72 1.56 6.91 3.29 5.26 4.97 3.56 8.22 3.76 10 5.76A6.01 6.01 0 0 1 12 5Z"/>
        <path d="M8 14v.5"/>
        <path d="M16 14v.5"/>
        <path d="M11.25 16.25h1.5L12 17l-.75-.75Z"/>
      </svg>
    </g>
    <text x="${iconSize * 2 + 10}" y="${Math.round(height * 0.65)}" font-family="Georgia, serif" font-size="${fontSize}" font-weight="bold" fill="${orange}">Pawtrait Pros</text>
  </svg>`;
  return { svg: Buffer.from(svg), width: totalWidth, height };
}

function pillSvg(text: string, fontSize: number, bgColor: string, textColor: string, paddingX: number, paddingY: number): { svg: Buffer; width: number; height: number } {
  const charWidth = fontSize * 0.6;
  const textWidth = Math.ceil(text.length * charWidth);
  const width = textWidth + paddingX * 2;
  const height = Math.round(fontSize * 1.3) + paddingY * 2;
  const radius = height / 2;
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect x="0" y="0" width="${width}" height="${height}" rx="${radius}" ry="${radius}" fill="${bgColor}"/>
    <text x="${width / 2}" y="${height / 2 + fontSize * 0.35}" font-family="sans-serif" font-size="${fontSize}" font-weight="bold" fill="${textColor}" text-anchor="middle">${escaped}</text>
  </svg>`;
  return { svg: Buffer.from(svg), width, height };
}

async function extractImageFromDataUri(dataUri: string): Promise<Buffer> {
  const base64Data = dataUri.replace(/^data:image\/\w+;base64,/, "");
  return Buffer.from(base64Data, "base64");
}

async function resizeToFit(imageBuffer: Buffer, maxW: number, maxH: number): Promise<Buffer> {
  return sharp(imageBuffer)
    .resize(maxW, maxH, { fit: "cover", position: "center" })
    .png()
    .toBuffer();
}

async function makeRoundedImage(imageBuffer: Buffer, w: number, h: number, radius: number): Promise<Buffer> {
  const resized = await resizeToFit(imageBuffer, w, h);
  const mask = Buffer.from(
    `<svg width="${w}" height="${h}"><rect x="0" y="0" width="${w}" height="${h}" rx="${radius}" ry="${radius}" fill="white"/></svg>`
  );
  return sharp(resized)
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

export async function generateShowcaseMockup(orgId: number): Promise<Buffer> {
  const org = await storage.getOrganization(orgId);
  if (!org) throw new Error("Organization not found");

  const dogs = await storage.getDogsByOrganization(orgId);
  const dogsWithPortraits: Array<{ name: string; breed: string; species: string; portraitBuffer: Buffer }> = [];

  for (const dog of dogs) {
    const portrait = await storage.getSelectedPortraitByDog(dog.id);
    if (portrait && portrait.generatedImageUrl) {
      try {
        const buf = await extractImageFromDataUri(portrait.generatedImageUrl);
        dogsWithPortraits.push({
          name: dog.name,
          breed: dog.breed || "Unknown",
          species: dog.species || "dog",
          portraitBuffer: buf,
        });
      } catch (e) {
        // skip invalid images
      }
    }
  }

  const petCount = dogsWithPortraits.length;
  if (petCount === 0) throw new Error("No pets with portraits found");

  const petsToShow = dogsWithPortraits.slice(0, 4);

  // Build the image
  const composites: sharp.OverlayOptions[] = [];

  // Cream background
  const bg = await sharp({
    create: { width: WIDTH, height: HEIGHT, channels: 4, background: CREAM_BG },
  }).png().toBuffer();

  // Orange accent bar at top
  const topBar = await sharp(Buffer.from(roundedRectSvg(WIDTH, 6, 0, `rgb(${ORANGE.r},${ORANGE.g},${ORANGE.b})`))).png().toBuffer();
  composites.push({ input: topBar, top: 0, left: 0 });

  // Rescue org logo at top
  const orgLogoSize = 70;
  let orgLogoWidth = 0;
  if (org.logoUrl) {
    try {
      const orgLogoBuf = await extractImageFromDataUri(org.logoUrl);
      const orgLogo = await makeRoundedImage(orgLogoBuf, orgLogoSize, orgLogoSize, 8);
      composites.push({ input: orgLogo, top: 18, left: 30 });
      orgLogoWidth = orgLogoSize + 14;
    } catch (e) {}
  }

  // Org name
  const orgNameText = textSvg(org.name, 36, `rgb(${DARK_TEXT.r},${DARK_TEXT.g},${DARK_TEXT.b})`, 700);
  composites.push({ input: orgNameText, top: 25, left: 30 + orgLogoWidth });

  // "Available for Adoption" pill
  const adoptPill = pillSvg("Available for Adoption", 16, `rgb(${ORANGE.r},${ORANGE.g},${ORANGE.b})`, "white", 16, 8);
  composites.push({ input: adoptPill.svg, top: 70, left: 30 + orgLogoWidth });

  // Pet portraits area
  const portraitAreaTop = 130;
  const portraitAreaHeight = HEIGHT - portraitAreaTop - 60;
  const maxPortraitW = Math.floor((WIDTH - 60 - (petsToShow.length - 1) * 20) / petsToShow.length);
  const portraitImgH = portraitAreaHeight - 70;
  const portraitW = Math.min(maxPortraitW, 280);

  const totalWidth = petsToShow.length * portraitW + (petsToShow.length - 1) * 20;
  let startX = Math.floor((WIDTH - totalWidth) / 2);

  for (let i = 0; i < petsToShow.length; i++) {
    const pet = petsToShow[i];
    const x = startX + i * (portraitW + 20);

    // Card background
    const cardBg = await sharp(Buffer.from(roundedRectSvg(portraitW, portraitAreaHeight, 12, "white"))).png().toBuffer();
    composites.push({ input: cardBg, top: portraitAreaTop, left: x });

    // Portrait image
    const rounded = await makeRoundedImage(pet.portraitBuffer, portraitW - 16, portraitImgH - 8, 8);
    composites.push({ input: rounded, top: portraitAreaTop + 8, left: x + 8 });

    // Pet name
    const nameText = textSvg(pet.name, 20, `rgb(${DARK_TEXT.r},${DARK_TEXT.g},${DARK_TEXT.b})`, portraitW - 16);
    composites.push({ input: nameText, top: portraitAreaTop + portraitImgH + 8, left: x + 12 });

    // Breed
    const breedText = textSvg(pet.breed, 14, `rgb(${MUTED_TEXT.r},${MUTED_TEXT.g},${MUTED_TEXT.b})`, portraitW - 16, "normal");
    composites.push({ input: breedText, top: portraitAreaTop + portraitImgH + 34, left: x + 12 });
  }

  // Bottom: "Powered by" + dog/cat icons + "Pawtrait Pros" (matching the site header)
  const poweredByText = textSvg("Powered by", 13, `rgb(${MUTED_TEXT.r},${MUTED_TEXT.g},${MUTED_TEXT.b})`, 200, "normal");
  composites.push({ input: poweredByText, top: HEIGHT - 38, left: WIDTH - 370 });
  const ppLogo = pawtraitPalsLogoSvg(40);
  composites.push({ input: ppLogo.svg, top: HEIGHT - 48, left: WIDTH - 280 });

  return sharp(bg).composite(composites).png().toBuffer();
}

export async function generatePawfileMockup(dogId: number): Promise<Buffer> {
  const dog = await storage.getDog(dogId);
  if (!dog) throw new Error("Dog not found");

  const org = await storage.getOrganization(dog.organizationId);
  if (!org) throw new Error("Organization not found");

  const portrait = await storage.getSelectedPortraitByDog(dog.id);
  if (!portrait || !portrait.generatedImageUrl) throw new Error("No portrait found");

  const portraitBuffer = await extractImageFromDataUri(portrait.generatedImageUrl);

  const composites: sharp.OverlayOptions[] = [];

  // Cream background
  const bg = await sharp({
    create: { width: WIDTH, height: HEIGHT, channels: 4, background: CREAM_BG },
  }).png().toBuffer();

  // Orange accent bar at top
  const topBar = await sharp(Buffer.from(roundedRectSvg(WIDTH, 6, 0, `rgb(${ORANGE.r},${ORANGE.g},${ORANGE.b})`))).png().toBuffer();
  composites.push({ input: topBar, top: 0, left: 0 });

  // Left side: portrait (large)
  const portraitW = 420;
  const portraitH = 480;
  const portraitTop = 80;
  const portraitLeft = 40;

  const rounded = await makeRoundedImage(portraitBuffer, portraitW, portraitH, 16);
  composites.push({ input: rounded, top: portraitTop, left: portraitLeft });

  // Right side: info
  const infoLeft = portraitLeft + portraitW + 40;

  // Rescue org logo at top right
  const orgLogoSize = 60;
  if (org.logoUrl) {
    try {
      const orgLogoBuf = await extractImageFromDataUri(org.logoUrl);
      const orgLogo = await makeRoundedImage(orgLogoBuf, orgLogoSize, orgLogoSize, 8);
      composites.push({ input: orgLogo, top: 20, left: WIDTH - orgLogoSize - 30 });
    } catch (e) {}
  }

  // Pet name - large
  const nameText = textSvg(dog.name, 48, `rgb(${DARK_TEXT.r},${DARK_TEXT.g},${DARK_TEXT.b})`, 600);
  composites.push({ input: nameText, top: 100, left: infoLeft });

  // Breed
  const breedText = textSvg(dog.breed || "Unknown Breed", 22, `rgb(${MUTED_TEXT.r},${MUTED_TEXT.g},${MUTED_TEXT.b})`, 500, "normal");
  composites.push({ input: breedText, top: 160, left: infoLeft });

  // Age
  const ageStr = dog.age ? `${dog.age}` : "";
  if (ageStr) {
    const ageText = textSvg(ageStr, 20, `rgb(${MUTED_TEXT.r},${MUTED_TEXT.g},${MUTED_TEXT.b})`, 400, "normal");
    composites.push({ input: ageText, top: 195, left: infoLeft });
  }

  // Species pill
  const speciesLabel = (dog.species || "dog") === "cat" ? "Cat" : "Dog";
  const speciesPill = pillSvg(speciesLabel, 16, `rgb(${ORANGE.r},${ORANGE.g},${ORANGE.b})`, "white", 16, 8);
  composites.push({ input: speciesPill.svg, top: 240, left: infoLeft });

  // "Available for Adoption" pill
  const adoptPill = pillSvg("Available for Adoption", 16, `rgb(34,139,34)`, "white", 16, 8);
  composites.push({ input: adoptPill.svg, top: 240, left: infoLeft + speciesPill.width + 12 });

  // Org name
  const orgText = textSvg(`From ${org.name}`, 18, `rgb(${MUTED_TEXT.r},${MUTED_TEXT.g},${MUTED_TEXT.b})`, 500, "normal");
  composites.push({ input: orgText, top: 300, left: infoLeft });

  // Description snippet if available
  if (dog.description) {
    const desc = dog.description.length > 120 ? dog.description.substring(0, 117) + "..." : dog.description;
    const descText = textSvg(desc, 16, `rgb(${MUTED_TEXT.r},${MUTED_TEXT.g},${MUTED_TEXT.b})`, 550, "normal");
    composites.push({ input: descText, top: 340, left: infoLeft });
  }

  // Bottom: "Powered by" + dog/cat icons + "Pawtrait Pros" (matching the site header)
  const poweredByText2 = textSvg("Powered by", 13, `rgb(${MUTED_TEXT.r},${MUTED_TEXT.g},${MUTED_TEXT.b})`, 200, "normal");
  composites.push({ input: poweredByText2, top: HEIGHT - 38, left: WIDTH - 370 });
  const ppLogo2 = pawtraitPalsLogoSvg(40);
  composites.push({ input: ppLogo2.svg, top: HEIGHT - 48, left: WIDTH - 280 });

  return sharp(bg).composite(composites).png().toBuffer();
}
