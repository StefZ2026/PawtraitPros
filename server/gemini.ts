import { GoogleGenAI, Modality } from "@google/genai";
import sharp from "sharp";
import { Semaphore } from "./semaphore";

export const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const geminiSemaphore = new Semaphore(10);

function extractImageFromResponse(response: any): string | null {
  const part = response.candidates?.[0]?.content?.parts?.find(
    (p: { inlineData?: { data?: string } }) => p.inlineData
  );
  if (!part?.inlineData?.data) return null;
  const mime = part.inlineData.mimeType || "image/png";
  return `data:${mime};base64,${part.inlineData.data}`;
}

function parseBase64(dataUrl: string): { mimeType: string; data: string } {
  const data = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
  const mimeType = (dataUrl.match(/data:([^;]+);/) || [])[1] || "image/jpeg";
  return { mimeType, data };
}

function isRetryableError(err: any): boolean {
  const status = err?.status || err?.httpStatusCode || err?.code;
  if (status === 429 || status === 503) return true;
  const msg = String(err?.message || "").toLowerCase();
  return msg.includes("resource_exhausted") || msg.includes("rate limit") || msg.includes("overloaded") || msg.includes("unavailable");
}

async function callWithRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  const MAX_RETRIES = 2;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      if (attempt < MAX_RETRIES && isRetryableError(err)) {
        const delay = Math.pow(2, attempt + 1) * 1000 + Math.random() * 1000;
        console.warn(`[gemini] ${label} attempt ${attempt + 1} failed (${err?.message || err}), retrying in ${Math.round(delay)}ms...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error(`${label}: all retries exhausted`);
}

export async function generateImage(prompt: string, sourceImage?: string): Promise<string> {
  if (sourceImage) {
    // When we have a reference photo, NEVER fall back to text-only —
    // a portrait of a random dog is worse than an error the user can retry
    const result = await generateWithImage(prompt, sourceImage);
    if (result) return result;
    throw new Error("Image generation with reference photo returned no result. Please try again.");
  }
  return generateTextOnly(prompt);
}

const FIDELITY_PREFIX = `REFERENCE PHOTO ATTACHED — YOU MUST DEPICT THIS EXACT ANIMAL.

MANDATORY RULES (violating any rule = total failure):
1. SINGLE ANIMAL ONLY — depict ONLY the one animal from the reference photo. Never add extra animals, companions, or duplicates to the scene.
2. PHOTO OVERRIDES TEXT — if the text mentions a breed that doesn't match the photo, depict what you SEE in the photo. The photo is always the sole authority.
3. EXACT COLORS AND PATTERNS — reproduce each color exactly where it appears on the body. White chest stays white, dark back stays dark, patches stay in the same locations and proportions. Do NOT simplify a multi-colored coat into one uniform tone. Do NOT shift colors to match "typical breed" palettes or scene lighting.
4. PRESERVE UNIQUE FEATURES — floppy ears stay floppy, perked ears stay perked. If ears are asymmetric (one up, one down; one folded, one straight), keep them asymmetric. Underbites, crooked tails, scars, heterochromia, unusual markings — reproduce them ALL exactly. Do NOT "fix" or normalize any feature to match breed standard.
5. PRESERVE FACE AND BODY — match this animal's exact muzzle shape, eye color, ear shape and position, fur texture and length, and body proportions from the photo.
6. PHOTOREALISTIC ANIMAL — the animal must look like a real, living creature with photorealistic fur, natural eyes, and real anatomy. Apply the artistic style to the scene, costume, and background — but the animal itself must always look like a genuine photograph of a real animal.

Now apply the following artistic style to this exact animal:

`;

async function resizeForGemini(dataUri: string): Promise<{ mimeType: string; data: string }> {
  const { mimeType, data } = parseBase64(dataUri);
  const inputBuffer = Buffer.from(data, "base64");
  const resized = await sharp(inputBuffer)
    .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();
  return { mimeType: "image/jpeg", data: resized.toString("base64") };
}

async function generateWithImage(prompt: string, sourceImage: string): Promise<string | null> {
  const { mimeType, data } = await resizeForGemini(sourceImage);
  const enhancedPrompt = FIDELITY_PREFIX + prompt;
  return geminiSemaphore.run(() =>
    callWithRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3-pro-image-preview",
        contents: [{ role: "user", parts: [{ text: enhancedPrompt }, { inlineData: { mimeType, data } }] }],
        config: { responseModalities: [Modality.TEXT, Modality.IMAGE] },
      });
      return extractImageFromResponse(response);
    }, "generateWithImage")
  );
}

async function generateTextOnly(prompt: string): Promise<string> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await geminiSemaphore.run(() =>
      callWithRetry(async () => {
        const response = await ai.models.generateContent({
          model: "gemini-3-pro-image-preview",
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: { responseModalities: [Modality.TEXT, Modality.IMAGE] },
        });
        return extractImageFromResponse(response);
      }, "generateTextOnly")
    );
    if (result) return result;
  }
  throw new Error("Failed to generate image after retries");
}

const GROUP_FIDELITY_PREFIX = `MULTIPLE REFERENCE PHOTOS ATTACHED — YOU MUST DEPICT ALL OF THESE EXACT ANIMALS TOGETHER IN ONE SCENE.

MANDATORY RULES (violating any rule = total failure):
1. DEPICT ALL ANIMALS — every reference photo represents a different animal. ALL of them must appear in the final image. Do not omit any.
2. PHOTO OVERRIDES TEXT — if the text mentions breeds that don't match the photos, depict what you SEE in each photo. Each photo is the authority for its animal.
3. EXACT COLORS AND PATTERNS — for EACH animal, reproduce its exact coat colors, patterns, markings, and proportions as seen in its reference photo. Do NOT simplify multi-colored coats or shift colors.
4. PRESERVE UNIQUE FEATURES — for each animal, maintain its exact ear shape, muzzle shape, eye color, fur texture, body proportions, and any unique features. Do NOT normalize any feature.
5. DIFFERENTIATE CLEARLY — each animal must be clearly distinguishable from the others. Position them so viewers can see each one fully. No animal should be obscured or hidden behind another.
6. PHOTOREALISTIC ANIMALS — every animal must look like a real, living creature with photorealistic fur, natural eyes, and real anatomy. Apply the artistic style to the scene, costumes, and background — but each animal itself must always look like a genuine photograph of a real animal.
7. NATURAL INTERACTION — the animals should appear together naturally, as friends or companions sharing the scene. They can be side by side, playing, or posed together.

Reference photos are provided in order. Now apply the following artistic style to ALL of these animals together:

`;

export async function generateGroupPortrait(
  prompt: string,
  sourceImages: string[]
): Promise<string> {
  const resizedImages = await Promise.all(
    sourceImages.map(img => resizeForGemini(img))
  );

  const enhancedPrompt = GROUP_FIDELITY_PREFIX + prompt;

  const parts: any[] = [{ text: enhancedPrompt }];
  for (const { mimeType, data } of resizedImages) {
    parts.push({ inlineData: { mimeType, data } });
  }

  const result = await geminiSemaphore.run(() =>
    callWithRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3-pro-image-preview",
        contents: [{ role: "user", parts }],
        config: {
          responseModalities: [Modality.TEXT, Modality.IMAGE],
        },
      });
      return extractImageFromResponse(response);
    }, "generateGroupPortrait")
  );

  if (!result) throw new Error("Group portrait generation returned no result");
  return result;
}

export async function editImage(currentImage: string, editPrompt: string): Promise<string> {
  const { mimeType, data } = parseBase64(currentImage);
  return geminiSemaphore.run(() =>
    callWithRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3-pro-image-preview",
        contents: [{
          role: "user",
          parts: [
            { inlineData: { mimeType, data } },
            { text: `Edit this image: ${editPrompt}. Keep the same overall style and subject, just apply the requested modifications.` },
          ],
        }],
        config: { responseModalities: [Modality.TEXT, Modality.IMAGE] },
      });
      const result = extractImageFromResponse(response);
      if (!result) throw new Error("Failed to edit image");
      return result;
    }, "editImage")
  );
}
