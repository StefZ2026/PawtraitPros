import { useCallback, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, X, Image as ImageIcon, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);

interface ImageUploadProps {
  onImageUpload: (imageData: string) => void;
  currentImage: string | null;
  onClear: () => void;
}

export function ImageUpload({ onImageUpload, currentImage, onClear }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const processFile = useCallback((file: File) => {
    if (file.type && !file.type.startsWith("image/")) {
      toast({ title: "Not an image", description: "Please select a photo.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: "File too large", description: "Please use an image under 20 MB.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      if (result) onImageUpload(result);
    };
    reader.readAsDataURL(file);
  }, [onImageUpload, toast]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  }, [processFile]);

  // On iOS, navigate to the static upload page (no React bundle, can't be evicted)
  const handleiOSUpload = useCallback(() => {
    window.location.href = "/upload.html";
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

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
          {isIOS ? (
            <Button variant="outline" size="sm" className="gap-1" onClick={handleiOSUpload}>
              <Upload className="h-3.5 w-3.5" />
              Replace Photo
            </Button>
          ) : (
            <div className="relative">
              <Button variant="outline" size="sm" className="gap-1">
                <Upload className="h-3.5 w-3.5" />
                Replace Photo
              </Button>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                data-testid="input-file-replace"
              />
            </div>
          )}
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
          or tap the button below to browse your photos
        </p>
        {isIOS ? (
          <Button className="gap-2" onClick={handleiOSUpload}>
            <ImageIcon className="h-4 w-4" />
            Choose Photo
          </Button>
        ) : (
          <div className="relative inline-flex">
            <Button className="gap-2">
              <ImageIcon className="h-4 w-4" />
              Choose Photo
            </Button>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              data-testid="input-file-upload"
            />
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-5">
          JPG, PNG, or WebP up to 20 MB
        </p>
      </CardContent>
    </Card>
  );
}
