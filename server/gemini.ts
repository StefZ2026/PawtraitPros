import { GoogleGenAI, Modality } from "@google/genai";

export const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

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

export async function generateImage(prompt: string, sourceImage?: string): Promise<string> {
  if (sourceImage) {
    try {
      const result = await generateWithImage(prompt, sourceImage);
      if (result) return result;
    } catch {
      // fall through to text-only
    }
  }
  return generateTextOnly(prompt);
}

const FIDELITY_PREFIX = `REFERENCE PHOTO ATTACHED — THE PHOTO IS THE GROUND TRUTH.
Study the attached photo carefully. This is the EXACT animal you must depict.

CRITICAL RULE — PHOTO OVERRIDES TEXT:
The style description below may mention a breed name (e.g., "Beagle", "Labrador", "Persian cat"). IGNORE any breed name in the text if it does not match what you see in the photo. The PHOTO is the sole authority on what this animal looks like. If the text says "Beagle" but the photo shows a Chow Chow, you MUST depict a Chow Chow. If the text says "Tabby" but the photo shows a Siamese, you MUST depict a Siamese. NEVER generate an animal that matches the text breed instead of the photo — the photo always wins.

COLOR AND PATTERN MATCHING IS THE #1 PRIORITY:
Most animals are NOT one uniform color. Study WHERE each color appears on this specific animal's body:
- Note which areas are lighter vs darker (chest, belly, legs, face, back, ears, tail)
- Note any two-tone or multi-tone patterns — e.g., white chest with reddish back, dark face with lighter body, tabby stripes, tuxedo markings, brindle patterns
- Note the EXACT boundaries where one color transitions to another
You must reproduce the PRECISE color of EACH body area — not a uniform "average" color, not a "typical" breed color, not a slightly different shade. If the chest is white and the back is reddish, the portrait must show a white chest and a reddish back in those same proportions. If there are patches, spots, or gradients, they must appear in the same locations. Do NOT simplify a multi-colored coat into one uniform tone. Do NOT let the artistic style, scene lighting, or background colors influence or shift the animal's actual coat colors.

You MUST also faithfully reproduce THIS SPECIFIC animal's:
- Face shape, muzzle, and facial structure
- Ear shape, size, and positioning
- Fur/coat texture and length
- Eye color and shape
- Body size and proportions
- Any unique distinguishing features (spots, patches, scars, etc.)

DO NOT substitute a generic or different-looking animal. DO NOT default to a "breed typical" appearance. The generated portrait must be unmistakably recognizable as the SAME individual animal in the reference photo.

Now apply the following artistic style while preserving this exact animal's appearance, coloring, and color distribution:

`;

async function generateWithImage(prompt: string, sourceImage: string): Promise<string | null> {
  const { mimeType, data } = parseBase64(sourceImage);
  const enhancedPrompt = FIDELITY_PREFIX + prompt;
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: [{ role: "user", parts: [{ inlineData: { mimeType, data } }, { text: enhancedPrompt }] }],
    config: { responseModalities: [Modality.TEXT, Modality.IMAGE] },
  });
  return extractImageFromResponse(response);
}

async function generateTextOnly(prompt: string): Promise<string> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { responseModalities: [Modality.TEXT, Modality.IMAGE] },
    });
    const result = extractImageFromResponse(response);
    if (result) return result;
  }
  throw new Error("Failed to generate image after retries");
}

export async function editImage(currentImage: string, editPrompt: string): Promise<string> {
  const { mimeType, data } = parseBase64(currentImage);
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
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
}
