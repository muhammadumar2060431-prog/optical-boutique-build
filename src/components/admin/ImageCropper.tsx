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
import { ZoomIn, ZoomOut, RefreshCw } from "lucide-react";

export interface ImageCropperProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onCropCompleteAction: (croppedImageBase64: string) => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.1;

export function ImageCropper({
  isOpen,
  onClose,
  imageSrc,
  onCropCompleteAction,
}: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<PixelCrop | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageAspect, setImageAspect] = useState<number | null>(null);

  useEffect(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setImageAspect(null);
    setCroppedAreaPixels(null);
  }, [imageSrc, isOpen]);

  const onCropComplete = useCallback(
    (_: unknown, pixels: PixelCrop) => setCroppedAreaPixels(pixels),
    [],
  );

  const handleReset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  const handleSave = async () => {
    if (!imageAspect || (zoom > MIN_ZOOM && !croppedAreaPixels)) return;
    try {
      setIsProcessing(true);
      // At 1x preserve the source instead of exporting a rounded crop region.
      const result =
        zoom === MIN_ZOOM ? imageSrc : await getCroppedImg(imageSrc, croppedAreaPixels!);
      onCropCompleteAction(result);
    } catch (e) {
      console.error("Crop error:", e);
    } finally {
      setIsProcessing(false);
    }
  };

  const adjZoom = (delta: number) =>
    setZoom((z) => parseFloat(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z + delta)).toFixed(2)));

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
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={imageAspect ?? 1}
            objectFit="contain"
            onMediaLoaded={({ naturalWidth, naturalHeight }) => {
              setImageAspect(naturalWidth / naturalHeight);
            }}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            zoomSpeed={0.5}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
            showGrid
          />

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
          <Button
            onClick={handleSave}
            disabled={isProcessing || !imageAspect || !croppedAreaPixels}
            className="min-w-28"
          >
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
