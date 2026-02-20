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

async function generateWithImage(prompt: string, sourceImage: string): Promise<string | null> {
  const { mimeType, data } = parseBase64(sourceImage);
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: [{ role: "user", parts: [{ inlineData: { mimeType, data } }, { text: prompt }] }],
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
