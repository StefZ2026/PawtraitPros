import type { Express } from "express";
import multer from "multer";
import sharp from "sharp";
import { uploadToStorage } from "../supabase-storage";
import rateLimit from "express-rate-limit";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: "Too many uploads, please try again later",
});

export function registerUploadRoutes(app: Express) {
  app.post("/api/upload-temp", uploadLimiter, upload.single("photo"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).send("No file uploaded");
      }

      // Resize with sharp: max 1500px, JPEG 85%
      const resized = await sharp(req.file.buffer)
        .resize(1500, 1500, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();

      // Convert to base64 data URI for uploadToStorage
      const base64 = `data:image/jpeg;base64,${resized.toString("base64")}`;
      const filename = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      const url = await uploadToStorage(base64, "originals", filename);

      // Redirect to /create with the image URL
      res.redirect(302, `/create?pending_image=${encodeURIComponent(url)}`);
    } catch (err: any) {
      console.error("[upload-temp] Error:", err);
      res.status(500).send("Upload failed. Please try again.");
    }
  });
}
