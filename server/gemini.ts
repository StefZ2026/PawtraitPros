// Portrait generation engine — fal.ai Nano Banana 2 (primary)
// Fallback 1: FLUX Kontext Pro via Replicate
// Fallback 2: Gemini 3 Pro Image Preview
import Replicate from "replicate";
import { GoogleGenAI, Modality } from "@google/genai";
import { Semaphore } from "./semaphore";

// --- fal.ai setup (primary) ---
const FAL_KEY = process.env.FAL_KEY;

// --- Replicate (FLUX) setup (fallback 1) ---
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// --- Gemini setup (fallback 2) ---
export const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const generationSemaphore = new Semaphore(10);

// --- Helpers ---

function parseBase64(dataUrl: string): { mimeType: string; data: string } {
  const data = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
  const mimeType = (dataUrl.match(/data:([^;]+);/) || [])[1] || "image/jpeg";
  return { mimeType, data };
}

/** Convert a URL to a data URI */
async function urlToDataUri(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") || "image/png";
  return `data:${contentType};base64,${buffer.toString("base64")}`;
}

/** Extract the output URL from Replicate's response */
function extractReplicateUrl(output: unknown): string | null {
  if (typeof output === "string") return output;
  if (Array.isArray(output) && typeof output[0] === "string") return output[0];
  // Some models return { url: "..." } or similar
  if (output && typeof output === "object" && "url" in output) return (output as any).url;
  return null;
}

function isRetryableError(err: any): boolean {
  const status = err?.status || err?.httpStatusCode || err?.code;
  if (status === 429 || status === 503) return true;
  const msg = String(err?.message || "").toLowerCase();
  return msg.includes("rate limit") || msg.includes("overloaded") || msg.includes("unavailable") || msg.includes("resource_exhausted");
}

async function callWithRetry<T>(fn: () => Promise<T>, label: string, maxRetries = 2): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      if (attempt < maxRetries && isRetryableError(err)) {
        const delay = Math.pow(2, attempt + 1) * 1000 + Math.random() * 1000;
        console.warn(`[flux] ${label} attempt ${attempt + 1} failed (${err?.message || err}), retrying in ${Math.round(delay)}ms...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error(`${label}: all retries exhausted`);
}

// --- fal.ai Nano Banana 2: Primary generator ---
// Stefanie's proven prompt — DO NOT MODIFY THIS WORDING (20+ iterations to get right)
function buildFalPrompt(styleName: string): string {
  return `Create a ${styleName} scene using the EXACT dog from the first image. Note that the first dog does NOT have standard breed features so do not substitute or make this dog pretty. Ensure all ORIGINAL dog features are EXACTLY COPIED / PRESERVED (snout length and shape and slope, width of face (wide or narrow and fox-like), eye color and shape, ear shape and direction they point, fur color and texture, height)`;
}

export interface FalOptions {
  dogImageUrl: string;     // Public URL of the dog's photo
  styleImageUrl: string;   // Public URL of the style reference image
  styleName: string;       // e.g. "Garden Party", "Renaissance Noble"
}

async function generateWithFal(options: FalOptions): Promise<string> {
  const prompt = buildFalPrompt(options.styleName);
  console.log(`[fal] Generating "${options.styleName}" portrait via Nano Banana 2...`);

  // Submit to queue
  const submitRes = await fetch("https://queue.fal.run/fal-ai/nano-banana-2/edit", {
    method: "POST",
    headers: {
      "Authorization": `Key ${FAL_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      image_urls: [options.dogImageUrl, options.styleImageUrl],
    }),
  });

  if (!submitRes.ok) {
    const errText = await submitRes.text();
    throw new Error(`fal.ai submit failed (${submitRes.status}): ${errText}`);
  }
  const { request_id } = await submitRes.json();
  console.log(`[fal] Queued request: ${request_id}`);

  // Poll for completion (timeout after 120s)
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 1500));
    const statusRes = await fetch(
      `https://queue.fal.run/fal-ai/nano-banana-2/requests/${request_id}/status`,
      { headers: { "Authorization": `Key ${FAL_KEY}` } },
    );
    const statusData = await statusRes.json();
    if (statusData.status === "COMPLETED") break;
    if (statusData.status === "FAILED") {
      throw new Error(`fal.ai generation failed: ${JSON.stringify(statusData)}`);
    }
  }

  // Get result
  const resultRes = await fetch(
    `https://queue.fal.run/fal-ai/nano-banana-2/requests/${request_id}`,
    { headers: { "Authorization": `Key ${FAL_KEY}` } },
  );
  if (!resultRes.ok) throw new Error(`fal.ai result fetch failed: ${resultRes.status}`);
  const result = await resultRes.json();
  const imageUrl = result.images?.[0]?.url;
  if (!imageUrl) throw new Error("fal.ai returned no image in response");

  console.log(`[fal] Portrait generated successfully`);
  // Convert to data URI for consistency with rest of codebase
  return urlToDataUri(imageUrl);
}

// --- Identity-preservation prompt prefix for FLUX Kontext ---
const FLUX_PREFIX = `CRITICAL: The reference photo is the ONLY authority for this animal's appearance. You MUST reproduce this EXACT individual animal — not a generic or idealized version of its breed.

Study the reference photo carefully. Every facial feature, every marking, every proportion of THE ANIMAL ITSELF must match EXACTLY:
- The precise shape and length of the muzzle/snout — not a breed-typical version
- The exact angle, direction, and position of the ears — copy them precisely from the photo
- Eye color, shape, size, and spacing — as they appear, not as they "should" look
- Coat colors, patterns, and markings in their exact locations and proportions
- Body build, size, and proportions

IGNORE everything in the photo that is NOT the animal — collars, leashes, tags, toys, clothing, backgrounds. Only the animal's physical appearance matters. The scene, costume, and accessories come from the style prompt below, NOT from the reference photo.

The photo is ground truth for the animal's appearance ONLY. If any physical feature of the animal in the generated image doesn't match the photo, it's wrong. Do NOT idealize, normalize, or "fix" any feature. Do NOT default to breed-standard appearance.

Depict ONLY this one animal (no duplicates or extra animals).

Now place this exact animal in the following scene:\n\n`;

const FLUX_GROUP_PREFIX = `Multiple reference photos are provided. Each photo shows a different animal. Depict ALL of these exact animals together in one scene. For EACH animal, preserve its exact face, markings, coloring, ear shape, eye color, fur texture, and body proportions as seen in its reference photo. Position them so each is clearly visible. Place all of these animals together in the following scene:\n\n`;

// --- FLUX Kontext Pro: Single portrait ---

async function generateWithFlux(prompt: string, sourceImage: string): Promise<string> {
  const enhancedPrompt = FLUX_PREFIX + prompt;

  const output = await replicate.run("black-forest-labs/flux-kontext-pro", {
    input: {
      prompt: enhancedPrompt,
      input_image: sourceImage,
      aspect_ratio: "1:1",
    },
  });

  const outputUrl = extractReplicateUrl(output);
  if (!outputUrl) throw new Error("FLUX Kontext Pro returned no image output");

  // Convert URL to data URI (matches expected return format for uploadToStorage)
  return urlToDataUri(outputUrl);
}

async function generateTextOnlyFlux(prompt: string): Promise<string> {
  const output = await replicate.run("black-forest-labs/flux-kontext-pro", {
    input: {
      prompt,
      aspect_ratio: "1:1",
    },
  });

  const outputUrl = extractReplicateUrl(output);
  if (!outputUrl) throw new Error("FLUX text-only generation returned no output");
  return urlToDataUri(outputUrl);
}

// --- Gemini fallback functions ---

function extractImageFromResponse(response: any): string | null {
  const part = response.candidates?.[0]?.content?.parts?.find(
    (p: { inlineData?: { data?: string } }) => p.inlineData
  );
  if (!part?.inlineData?.data) return null;
  const mime = part.inlineData.mimeType || "image/png";
  return `data:${mime};base64,${part.inlineData.data}`;
}

const GEMINI_FIDELITY_PREFIX = `REFERENCE PHOTO ATTACHED — YOU MUST DEPICT THIS EXACT ANIMAL.

MANDATORY RULES (violating any rule = total failure):
1. SINGLE ANIMAL ONLY — depict ONLY the one animal from the reference photo. Never add extra animals, companions, or duplicates to the scene.
2. PHOTO OVERRIDES TEXT — if the text mentions a breed that doesn't match the photo, depict what you SEE in the photo. The photo is always the sole authority.
3. EXACT COLORS AND PATTERNS — reproduce each color exactly where it appears on the body. White chest stays white, dark back stays dark, patches stay in the same locations and proportions. Do NOT simplify a multi-colored coat into one uniform tone. Do NOT shift colors to match "typical breed" palettes or scene lighting.
4. PRESERVE UNIQUE FEATURES — floppy ears stay floppy, perked ears stay perked. If ears are asymmetric (one up, one down; one folded, one straight), keep them asymmetric. Underbites, crooked tails, scars, heterochromia, unusual markings — reproduce them ALL exactly. Do NOT "fix" or normalize any feature to match breed standard.
5. PRESERVE FACE AND BODY — match this animal's exact muzzle shape, eye color, ear shape and position, fur texture and length, and body proportions from the photo.
6. PHOTOREALISTIC ANIMAL — the animal must look like a real, living creature with photorealistic fur, natural eyes, and real anatomy. Apply the artistic style to the scene, costume, and background — but the animal itself must always look like a genuine photograph of a real animal.

Now apply the following artistic style to this exact animal:

`;

async function generateWithGemini(prompt: string, sourceImage: string): Promise<string | null> {
  const { mimeType, data } = parseBase64(sourceImage);
  const enhancedPrompt = GEMINI_FIDELITY_PREFIX + prompt;
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-image-preview",
    contents: [{ role: "user", parts: [{ text: enhancedPrompt }, { inlineData: { mimeType, data } }] }],
    config: { responseModalities: [Modality.TEXT, Modality.IMAGE] },
  });
  return extractImageFromResponse(response);
}

async function generateTextOnlyGemini(prompt: string): Promise<string | null> {
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-image-preview",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { responseModalities: [Modality.TEXT, Modality.IMAGE] },
  });
  return extractImageFromResponse(response);
}

// --- PUBLIC API (same signatures as before) ---

export async function generateImage(prompt: string, sourceImage?: string, falOptions?: FalOptions): Promise<string> {
  const useFlux = !!process.env.REPLICATE_API_TOKEN;

  // Try fal.ai first if configured and style info provided
  if (FAL_KEY && falOptions?.dogImageUrl && falOptions?.styleImageUrl && falOptions?.styleName) {
    try {
      return await generationSemaphore.run(() =>
        callWithRetry(
          () => generateWithFal(falOptions),
          "generateWithFal"
        )
      );
    } catch (falErr: any) {
      console.error("[fal] Generation failed, falling back to FLUX/Gemini:", falErr.message);
      // Fall through to FLUX/Gemini
    }
  }

  if (sourceImage) {
    return generationSemaphore.run(() =>
      callWithRetry(async () => {
        if (useFlux) {
          try {
            return await generateWithFlux(prompt, sourceImage);
          } catch (fluxErr: any) {
            console.error("[flux] Primary generation failed, falling back to Gemini:", fluxErr.message);
            const geminiResult = await generateWithGemini(prompt, sourceImage);
            if (geminiResult) return geminiResult;
            throw new Error("Both FLUX and Gemini failed to generate image");
          }
        }
        const result = await generateWithGemini(prompt, sourceImage);
        if (result) return result;
        throw new Error("Image generation with reference photo returned no result. Please try again.");
      }, "generateImage")
    );
  }

  // Text-only (no reference photo)
  return generationSemaphore.run(() =>
    callWithRetry(async () => {
      if (useFlux) {
        try {
          return await generateTextOnlyFlux(prompt);
        } catch (fluxErr: any) {
          console.error("[flux] Text-only generation failed, falling back to Gemini:", fluxErr.message);
          const geminiResult = await generateTextOnlyGemini(prompt);
          if (geminiResult) return geminiResult;
          throw new Error("Both FLUX and Gemini failed for text-only generation");
        }
      }
      const result = await generateTextOnlyGemini(prompt);
      if (result) return result;
      throw new Error("Failed to generate image after retries");
    }, "generateTextOnly")
  );
}

export async function editImage(currentImage: string, editPrompt: string): Promise<string> {
  const useFlux = !!process.env.REPLICATE_API_TOKEN;

  return generationSemaphore.run(() =>
    callWithRetry(async () => {
      if (useFlux) {
        try {
          const output = await replicate.run("black-forest-labs/flux-kontext-pro", {
            input: {
              prompt: `Edit this image: ${editPrompt}. Keep the same overall style and subject, just apply the requested modifications.`,
              input_image: currentImage,
            },
          });
          const outputUrl = extractReplicateUrl(output);
          if (!outputUrl) throw new Error("FLUX edit returned no output");
          return urlToDataUri(outputUrl);
        } catch (fluxErr: any) {
          console.error("[flux] Edit failed, falling back to Gemini:", fluxErr.message);
        }
      }

      // Gemini fallback for edits
      const { mimeType, data } = parseBase64(currentImage);
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

export async function generateGroupPortrait(
  prompt: string,
  sourceImages: string[]
): Promise<string> {
  const useFlux = !!process.env.REPLICATE_API_TOKEN;

  return generationSemaphore.run(() =>
    callWithRetry(async () => {
      if (useFlux) {
        try {
          // FLUX.2 max supports up to 8 reference images via input_image, input_image_2, etc.
          const input: Record<string, any> = {
            prompt: FLUX_GROUP_PREFIX + prompt,
            aspect_ratio: "1:1",
          };
          // Map source images to input_image, input_image_2, input_image_3, etc.
          sourceImages.forEach((img, i) => {
            const key = i === 0 ? "input_image" : `input_image_${i + 1}`;
            input[key] = img;
          });

          const output = await replicate.run("black-forest-labs/flux-2-max", { input });
          const outputUrl = extractReplicateUrl(output);
          if (!outputUrl) throw new Error("FLUX.2 max group portrait returned no output");
          return urlToDataUri(outputUrl);
        } catch (fluxErr: any) {
          console.error("[flux] Group portrait failed, falling back to Gemini:", fluxErr.message);
        }
      }

      // Gemini fallback for group portraits
      const parsedImages = sourceImages.map(img => parseBase64(img));
      const geminiGroupPrefix = `MULTIPLE REFERENCE PHOTOS ATTACHED — YOU MUST DEPICT ALL OF THESE EXACT ANIMALS TOGETHER IN ONE SCENE.

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
      const enhancedPrompt = geminiGroupPrefix + prompt;
      const parts: any[] = [{ text: enhancedPrompt }];
      for (const { mimeType, data } of parsedImages) {
        parts.push({ inlineData: { mimeType, data } });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-pro-image-preview",
        contents: [{ role: "user", parts }],
        config: { responseModalities: [Modality.TEXT, Modality.IMAGE] },
      });
      const result = extractImageFromResponse(response);
      if (!result) throw new Error("Group portrait generation returned no result");
      return result;
    }, "generateGroupPortrait")
  );
}
