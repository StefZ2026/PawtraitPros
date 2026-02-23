const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function uploadToStorage(
  base64DataUri: string,
  bucket: "portraits" | "originals",
  filename: string
): Promise<string> {
  const match = base64DataUri.match(/^data:([^;]+);base64,(.+)$/s);
  if (!match) throw new Error("Invalid base64 data URI");

  const contentType = match[1];
  const buffer = Buffer.from(match[2], "base64");

  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${bucket}/${filename}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        "Content-Type": contentType,
        "x-upsert": "true",
      },
      body: buffer,
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Storage upload failed (${res.status}): ${text}`);
  }

  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${filename}`;
}

export async function fetchImageAsBuffer(urlOrDataUri: string): Promise<Buffer> {
  if (urlOrDataUri.startsWith("data:")) {
    const base64Data = urlOrDataUri.replace(/^data:image\/\w+;base64,/, "");
    return Buffer.from(base64Data, "base64");
  }

  const res = await fetch(urlOrDataUri);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export function isDataUri(value: string): boolean {
  return value.startsWith("data:");
}
