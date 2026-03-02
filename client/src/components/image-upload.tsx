import { useCallback, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, X, Image as ImageIcon, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ACCEPT_STRING = ACCEPTED_TYPES.join(",");
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_DIM = 1024;

interface ImageUploadProps {
  onImageUpload: (imageData: string) => void;
  currentImage: string | null;
  onClear: () => void;
}

export function ImageUpload({ onImageUpload, currentImage, onClear }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const handleFile = useCallback((file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast({ title: "Unsupported format", description: "Please use JPG, PNG, or WebP.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: "File too large", description: "Please use an image under 20 MB.", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (!result) return;

      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width <= MAX_DIM && height <= MAX_DIM) {
          onImageUpload(result);
          return;
        }
        if (width > height) {
          height = Math.round(height * (MAX_DIM / width));
          width = MAX_DIM;
        } else {
          width = Math.round(width * (MAX_DIM / height));
          height = MAX_DIM;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        onImageUpload(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  }, [onImageUpload, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  if (currentImage) {
    return (
      <div className="relative">
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="relative max-w-md mx-auto flex items-center justify-center" style={{ maxHeight: "500px" }}>
              <img
                src={currentImage}
                alt="Uploaded pet photo"
                className="max-w-full max-h-[500px] object-contain"
                data-testid="img-uploaded-dog"
              />
            </div>
          </CardContent>
        </Card>
        <div className="flex items-center justify-center gap-3 mt-3">
          <label>
            <input
              type="file"
              accept={ACCEPT_STRING}
              className="hidden"
              onChange={handleInputChange}
              data-testid="input-file-replace"
            />
            <Button asChild variant="outline" size="sm" className="gap-1 cursor-pointer">
              <span>
                <Upload className="h-3.5 w-3.5" />
                Replace Photo
              </span>
            </Button>
          </label>
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
    <Card
      className={`border-2 border-dashed transition-colors ${
        isDragging ? "border-primary bg-primary/5" : "border-border"
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          {isDragging ? (
            <Upload className="h-8 w-8 text-primary animate-bounce" />
          ) : (
            <Camera className="h-8 w-8 text-primary" />
          )}
        </div>
        <h3 className="text-lg font-semibold mb-1" data-testid="text-upload-heading">
          {isDragging ? "Drop it right here!" : "Drag & drop a photo here"}
        </h3>
        <p className="text-sm text-muted-foreground mb-5 text-center max-w-xs">
          or click the button below to browse your files
        </p>
        <label>
          <input
            type="file"
            accept={ACCEPT_STRING}
            className="hidden"
            onChange={handleInputChange}
            data-testid="input-file-upload"
          />
          <Button asChild className="gap-2 cursor-pointer">
            <span>
              <ImageIcon className="h-4 w-4" />
              Choose Photo
            </span>
          </Button>
        </label>
        <p className="text-xs text-muted-foreground mt-5">
          JPG, PNG, or WebP up to 20 MB
        </p>
      </CardContent>
    </Card>
  );
}
