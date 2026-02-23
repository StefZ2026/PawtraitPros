import { useState, useRef, useCallback, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Move } from "lucide-react";

interface LogoCropDialogProps {
  open: boolean;
  imageSrc: string | null;
  onApply: (croppedDataUrl: string) => void;
  onCancel: () => void;
}

const VIEWPORT_SIZE = 256;
const OUTPUT_SIZE = 256;

export function LogoCropDialog({ open, imageSrc, onApply, onCancel }: LogoCropDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const offsetStart = useRef({ x: 0, y: 0 });

  // Load image when source changes
  useEffect(() => {
    if (!imageSrc) { setImg(null); return; }
    const image = new Image();
    image.onload = () => {
      setImg(image);
      // Fit image so shortest side fills the viewport
      const scale = VIEWPORT_SIZE / Math.min(image.width, image.height);
      setZoom(scale);
      setOffset({
        x: (VIEWPORT_SIZE - image.width * scale) / 2,
        y: (VIEWPORT_SIZE - image.height * scale) / 2,
      });
    };
    image.src = imageSrc;
  }, [imageSrc]);

  // Draw preview
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !img) return;

    ctx.clearRect(0, 0, VIEWPORT_SIZE, VIEWPORT_SIZE);

    // Draw image
    ctx.save();
    ctx.beginPath();
    ctx.arc(VIEWPORT_SIZE / 2, VIEWPORT_SIZE / 2, VIEWPORT_SIZE / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, offset.x, offset.y, img.width * zoom, img.height * zoom);
    ctx.restore();

    // Draw circular border
    ctx.beginPath();
    ctx.arc(VIEWPORT_SIZE / 2, VIEWPORT_SIZE / 2, VIEWPORT_SIZE / 2 - 1, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(139, 92, 246, 0.5)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [img, zoom, offset]);

  useEffect(() => { draw(); }, [draw]);

  // Drag handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    offsetStart.current = { ...offset };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setOffset({
      x: offsetStart.current.x + (e.clientX - dragStart.current.x),
      y: offsetStart.current.y + (e.clientY - dragStart.current.y),
    });
  };

  const handlePointerUp = () => setDragging(false);

  // Zoom
  const handleZoom = (delta: number) => {
    if (!img) return;
    const minZoom = VIEWPORT_SIZE / Math.max(img.width, img.height) * 0.5;
    const maxZoom = VIEWPORT_SIZE / Math.min(img.width, img.height) * 4;
    const newZoom = Math.max(minZoom, Math.min(maxZoom, zoom + delta));

    // Zoom toward center
    const cx = VIEWPORT_SIZE / 2;
    const cy = VIEWPORT_SIZE / 2;
    const ratio = newZoom / zoom;
    setOffset({
      x: cx - (cx - offset.x) * ratio,
      y: cy - (cy - offset.y) * ratio,
    });
    setZoom(newZoom);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    handleZoom(e.deltaY < 0 ? 0.05 : -0.05);
  };

  // Apply crop
  const handleApply = () => {
    if (!img) return;
    const outCanvas = document.createElement("canvas");
    outCanvas.width = OUTPUT_SIZE;
    outCanvas.height = OUTPUT_SIZE;
    const ctx = outCanvas.getContext("2d");
    if (!ctx) return;

    ctx.beginPath();
    ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, offset.x, offset.y, img.width * zoom, img.height * zoom);

    onApply(outCanvas.toDataURL("image/png"));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crop Logo</DialogTitle>
          <DialogDescription>
            Drag to reposition. Scroll or use buttons to zoom. Your logo will be displayed as a circle.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          {/* Crop viewport */}
          <div
            className="relative rounded-full overflow-hidden border-2 border-primary/30 bg-muted"
            style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE, cursor: dragging ? "grabbing" : "grab", touchAction: "none" }}
          >
            <canvas
              ref={canvasRef}
              width={VIEWPORT_SIZE}
              height={VIEWPORT_SIZE}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onWheel={handleWheel}
            />
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-3 w-full max-w-[256px]">
            <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => handleZoom(-0.1)}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <input
              type="range"
              min={img ? VIEWPORT_SIZE / Math.max(img.width, img.height) * 0.5 : 0.1}
              max={img ? VIEWPORT_SIZE / Math.min(img.width, img.height) * 4 : 5}
              step={0.01}
              value={zoom}
              onChange={(e) => {
                const newZoom = parseFloat(e.target.value);
                const cx = VIEWPORT_SIZE / 2;
                const cy = VIEWPORT_SIZE / 2;
                const ratio = newZoom / zoom;
                setOffset({
                  x: cx - (cx - offset.x) * ratio,
                  y: cy - (cy - offset.y) * ratio,
                });
                setZoom(newZoom);
              }}
              className="w-full accent-primary"
            />
            <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => handleZoom(0.1)}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Move className="h-3 w-3" /> Drag to position, scroll to zoom
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleApply}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
