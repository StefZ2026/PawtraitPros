import { GoogleGenAI, Modality } from "@google/genai";
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
  const MAX_RETRIES = 3;
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

async function generateWithImage(prompt: string, sourceImage: string): Promise<string | null> {
  const { mimeType, data } = parseBase64(sourceImage);
  const enhancedPrompt = FIDELITY_PREFIX + prompt;
  return geminiSemaphore.run(() =>
    callWithRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3-pro-image-preview",
        contents: [{ role: "user", parts: [{ text: enhancedPrompt }, { inlineData: { mimeType, data } }] }],
        config: { responseModalities: [Modality.TEXT, Modality.IMAGE], imageConfig: { imageSize: "2K" } },
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
