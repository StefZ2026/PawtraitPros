import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Image as ImageIcon, ArrowLeft, Loader2 } from "lucide-react";

/**
 * Lightweight upload page — iOS Safari evicts heavy pages (like /create)
 * when the photo picker opens. This page has no queries, no complex state,
 * so iOS won't kill it. The file is read here, stored in sessionStorage,
 * then we navigate back to /create.
 */
export default function UploadPhoto() {
  const [, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const handleChange = () => {
      const file = input.files?.[0];
      if (!file) return;
      setProcessing(true);

      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (!result) { setProcessing(false); return; }

        try {
          sessionStorage.setItem("pending_upload_image", result);
          goBack();
        } catch {
          // sessionStorage full — resize and try again
          resizeAndStore(file);
        }
      };
      reader.readAsDataURL(file);
    };

    input.addEventListener("change", handleChange);
    return () => input.removeEventListener("change", handleChange);
  }, []);

  function goBack() {
    const returnUrl = sessionStorage.getItem("upload_return_url") || "/create";
    sessionStorage.removeItem("upload_return_url");
    navigate(returnUrl);
  }

  function resizeAndStore(file: File) {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const max = 1200;
      let w = img.width, h = img.height;
      if (w > max || h > max) {
        if (w > h) { h = h * max / w; w = max; }
        else { w = w * max / h; h = max; }
      }
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      const resized = canvas.toDataURL("image/jpeg", 0.85);
      try {
        sessionStorage.setItem("pending_upload_image", resized);
      } catch {
        // Still too large — shouldn't happen after resize
      }
      URL.revokeObjectURL(url);
      goBack();
    };
    img.src = url;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center py-12">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <ImageIcon className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Select a Photo</h2>
          <p className="text-sm text-muted-foreground mb-6 text-center">
            Choose a photo from your library
          </p>
          {processing ? (
            <div className="flex items-center gap-2 text-primary">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading photo...</span>
            </div>
          ) : (
            <div className="relative inline-flex">
              <Button size="lg" className="gap-2">
                <ImageIcon className="h-5 w-5" />
                Browse Library
              </Button>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          )}
          <Button
            variant="ghost"
            className="mt-6 gap-1"
            onClick={goBack}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
