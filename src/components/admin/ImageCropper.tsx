import { useState, useCallback, useEffect } from "react";
import Cropper from "react-easy-crop";
import getCroppedImg, { PixelCrop } from "@/lib/cropImage";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut, RotateCcw, RotateCw, FlipHorizontal2, RefreshCw } from "lucide-react";

export interface ImageCropperProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onCropCompleteAction: (croppedImageBase64: string) => void;
  aspectRatio?: number | undefined;
}

const ASPECT_OPTIONS = [
  { label: "Free", value: undefined },
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "2:1", value: 2 },
  { label: "16:9", value: 16 / 9 },
  { label: "3:4", value: 3 / 4 },
];

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.1;

/** Create a horizontally-flipped copy of imageSrc on a canvas and return its dataURL */
async function createFlippedImage(src: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.translate(img.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(src); // fallback to original
    img.src = src;
  });
}

export function ImageCropper({
  isOpen,
  onClose,
  imageSrc,
  onCropCompleteAction,
  aspectRatio,
}: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [activeAspect, setActiveAspect] = useState<number | undefined>(aspectRatio);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<PixelCrop | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Pre-processed source: original or horizontally-flipped canvas dataURL
  const [cropSrc, setCropSrc] = useState(imageSrc);

  // Rebuild source image whenever flip changes
  useEffect(() => {
    if (!flipH) {
      setCropSrc(imageSrc);
    } else {
      createFlippedImage(imageSrc).then(setCropSrc);
    }
    // Reset pan when source changes so the image re-centers
    setCrop({ x: 0, y: 0 });
  }, [flipH, imageSrc]);

  const onCropComplete = useCallback(
    (_: unknown, pixels: PixelCrop) => setCroppedAreaPixels(pixels),
    [],
  );

  const handleReset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setFlipH(false);
    setCropSrc(imageSrc);
  };

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    try {
      setIsProcessing(true);
      // Since flip is baked into cropSrc, pass flipH=false here -
      // the canvas already shows the mirrored image.
      const result = await getCroppedImg(cropSrc, croppedAreaPixels, rotation, false);
      onCropCompleteAction(result);
    } catch (e) {
      console.error("Crop error:", e);
    } finally {
      setIsProcessing(false);
    }
  };

  const adjZoom = (delta: number) =>
    setZoom((z) => parseFloat(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z + delta)).toFixed(2)));

  const adjRotation = (deg: number) => setRotation((r) => r + deg);
  const normDeg = ((rotation % 360) + 360) % 360;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-card border-stone gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-stone">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <RefreshCw className="h-4 w-4 text-gold" />
            Adjust Image
          </DialogTitle>
        </DialogHeader>

        {/* Crop canvas */}
        <div
          className="relative w-full overflow-hidden"
          style={{ height: "56vh", background: "#111" }}
        >
          <Cropper
            image={cropSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={activeAspect}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            zoomSpeed={0.5}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
            showGrid
          />

          {/* Aspect ratio pills */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {ASPECT_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setActiveAspect(opt.value)}
                className={`rounded-full px-3 py-1 text-[11px] font-semibold backdrop-blur-sm transition-all select-none ${
                  activeAspect === opt.value
                    ? "bg-white text-black shadow-md"
                    : "bg-black/55 text-white hover:bg-black/75"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Floating control bar */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10">
            <div className="flex items-center gap-1.5 bg-black/65 backdrop-blur-md rounded-full px-4 py-2 shadow-xl">
              {/* Zoom OUT */}
              <button
                type="button"
                onClick={() => adjZoom(-ZOOM_STEP)}
                className="h-8 w-8 grid place-items-center rounded-full text-white hover:bg-white/20 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>

              {/* Zoom slider */}
              <div className="w-28">
                <Slider
                  value={[zoom]}
                  min={MIN_ZOOM}
                  max={MAX_ZOOM}
                  step={ZOOM_STEP}
                  onValueChange={(v) => setZoom(v[0] ?? MIN_ZOOM)}
                  className="[&_[role=slider]]:bg-white [&_[role=slider]]:border-0 [&_[role=slider]]:shadow-md [&_.bg-primary]:bg-white/70"
                />
              </div>

              {/* Zoom IN */}
              <button
                type="button"
                onClick={() => adjZoom(ZOOM_STEP)}
                className="h-8 w-8 grid place-items-center rounded-full text-white hover:bg-white/20 transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </button>

              <div className="w-px h-5 bg-white/25 mx-1" />

              {/* Rotate left */}
              <button
                type="button"
                onClick={() => adjRotation(-90)}
                className="h-8 w-8 grid place-items-center rounded-full text-white hover:bg-white/20 transition-colors"
                title="Rotate Left 90 Degrees"
              >
                <RotateCcw className="h-4 w-4" />
              </button>

              {/* Rotate right */}
              <button
                type="button"
                onClick={() => adjRotation(90)}
                className="h-8 w-8 grid place-items-center rounded-full text-white hover:bg-white/20 transition-colors"
                title="Rotate Right 90 Degrees"
              >
                <RotateCw className="h-4 w-4" />
              </button>

              {/* Flip */}
              <button
                type="button"
                onClick={() => setFlipH((f) => !f)}
                className={`h-8 w-8 grid place-items-center rounded-full transition-colors ${
                  flipH
                    ? "bg-white/30 text-white ring-1 ring-white/50"
                    : "text-white hover:bg-white/20"
                }`}
                title="Flip Horizontal"
              >
                <FlipHorizontal2 className="h-4 w-4" />
              </button>

              <div className="w-px h-5 bg-white/25 mx-1" />

              {/* Reset */}
              <button
                type="button"
                onClick={handleReset}
                className="h-8 w-8 grid place-items-center rounded-full text-white/60 hover:text-white hover:bg-white/20 transition-colors"
                title="Reset All"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center justify-between px-6 py-2 bg-muted/40 border-t border-stone text-[11px] text-muted-foreground">
          <span>
            Zoom: <strong className="text-foreground">{zoom.toFixed(1)}x</strong>
          </span>
          <span>
            Rotation: <strong className="text-foreground">{normDeg} degrees</strong>
          </span>
          <span>
            Aspect:{" "}
            <strong className="text-foreground">
              {activeAspect
                ? (ASPECT_OPTIONS.find((o) => o.value === activeAspect)?.label ?? "Custom")
                : "Free"}
            </strong>
          </span>
          {flipH && (
            <span className="font-semibold" style={{ color: "var(--color-gold)" }}>
              Flipped
            </span>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-stone flex gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={isProcessing}
            className="mr-auto"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Reset
          </Button>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isProcessing} className="min-w-28">
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </span>
            ) : (
              "Save Image"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
