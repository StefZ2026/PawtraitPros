import { useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, X, Image as ImageIcon, Camera } from "lucide-react";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_DIM = 1024;

interface ImageUploadProps {
  onImageUpload: (imageData: string) => void;
  currentImage: string | null;
  onClear: () => void;
}

export function ImageUpload({ onImageUpload, currentImage, onClear }: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  function processFile(file: File) {
    if (file.type && !file.type.startsWith("image/")) {
      alert("Please select an image file (JPG, PNG, or WebP).");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      alert("File too large. Please use an image under 20 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (!result) return;

      const img = new window.Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round(height * (MAX_DIM / width));
            width = MAX_DIM;
          } else {
            width = Math.round(width * (MAX_DIM / height));
            height = MAX_DIM;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          alert("Could not process the image. Please try another photo.");
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        onImageUpload(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => {
        alert("Could not load image. Try a JPG or PNG file.");
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  }

  if (currentImage) {
    return (
      <div className="relative">
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="relative aspect-square max-w-md mx-auto">
              <img
                src={currentImage}
                alt="Uploaded pet photo"
                className="w-full h-full object-contain"
                data-testid="img-uploaded-dog"
              />
            </div>
          </CardContent>
        </Card>
        <div className="flex items-center justify-center gap-3 mt-3">
          <input
            ref={replaceInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) processFile(f);
              e.target.value = "";
            }}
            data-testid="input-file-replace"
          />
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => replaceInputRef.current?.click()}
          >
            <Upload className="h-3.5 w-3.5" />
            Replace Photo
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-destructive"
            onClick={onClear}
            data-testid="button-clear-image"
          >
            <X className="h-3.5 w-3.5" />
            Remove
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className="border-2 border-dashed border-border">
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Camera className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-1" data-testid="text-upload-heading">
          Upload a photo
        </h3>
        <p className="text-sm text-muted-foreground mb-5 text-center max-w-xs">
          Click the button below to choose a photo from your computer
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) processFile(f);
            e.target.value = "";
          }}
          data-testid="input-file-upload"
        />
        <Button
          className="gap-2"
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageIcon className="h-4 w-4" />
          Choose Photo
        </Button>
        <p className="text-xs text-muted-foreground mt-5">
          JPG, PNG, or WebP up to 20 MB
        </p>
      </CardContent>
    </Card>
  );
}
