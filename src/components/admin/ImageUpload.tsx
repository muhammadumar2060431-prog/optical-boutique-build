import { useRef, useState } from "react";
import { Trash2, Upload, Eye, ImagePlus, ScanSearch } from "lucide-react";

import { uploadImageToStorage } from "@/lib/supabaseSync";
import { isSupabaseConfigured } from "@/lib/supabase";
import { ImageCropper } from "@/components/admin/ImageCropper";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ImageOptimizer } from "@/lib/image-optimizer";

// --- Image Size Guide --------------------------------------------------------
// Recommended sizes for fast loading (website smooth chale):
//   Logo              : 400x120 px  |  max 80 KB   | PNG/WebP (transparent bg)
//   Hero Slide Banner : 1440x720 px |  max 300 KB  | JPG/WebP
//   Category Icon     : 400x400 px  |  max 100 KB  | JPG/WebP (square)
//   Category Banner   : 1200x600 px |  max 250 KB  | JPG/WebP
//   Product Main Image: 800x800 px  |  max 200 KB  | JPG/WebP (square)
//   Product Gallery   : 800x800 px  |  max 150 KB  | JPG/WebP
//   Variant Image     : 600x600 px  |  max 120 KB  | JPG/WebP
//   Brand Logo        : 320x80 px   |  max 50 KB   | PNG/SVG (transparent bg)
//   Reel Thumbnail    : 480x854 px  |  max 150 KB  | JPG/WebP (9:16 vertical)
//   Testimonial Photo : 400x400 px  |  max 80 KB   | JPG/WebP
// Max upload size allowed: 5 MB per file (auto-compressed to optimized quality)
// -----------------------------------------------------------------------------

export function ImageUpload({
  label,
  value,
  onChange,
  onUploadingChange,
  optional = false,
  hint,
  aspectHint,
  compact = false,
  maxWidth = 600,
  maxHeight = 600,
  outputQuality = 0.65,
  storageFolder = "uploads",
}: {
  label?: string;
  value: string | null;
  onChange: (url: string | null) => void;
  /** Called with true when upload starts, false when done - lets parent disable Save */
  onUploadingChange?: (uploading: boolean) => void;
  optional?: boolean;
  /** Short tip shown below the uploader e.g. "9:16 vertical recommended" */
  hint?: string;
  /** Aspect ratio hint e.g. "1:1 square" */
  aspectHint?: string;
  /** Compact UI mode for tight spaces (like sub-images/gallery grids) */
  compact?: boolean;
  /** Maximum exported image width in pixels. */
  maxWidth?: number;
  /** Maximum exported image height in pixels. */
  maxHeight?: number;
  /** Canvas export quality for compressed JPG/WebP output. */
  outputQuality?: number;
  /** Supabase Storage folder/path prefix. Default: "uploads" */
  storageFolder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [rawImageToCrop, setRawImageToCrop] = useState<string | null>(null);

  // For re-adjusting an already-set image
  const [editCropOpen, setEditCropOpen] = useState(false);

  const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

  // Parse aspect hint to number (e.g. "1:1 square" -> 1, "Wide logo" -> 3.33)
  const getAspectRatio = () => {
    if (!aspectHint) return undefined;
    if (aspectHint.includes("1:1") || aspectHint.includes("square")) return 1;
    if (aspectHint.includes("2:1")) return 2;
    if (aspectHint.includes("16:9")) return 16 / 9;
    if (aspectHint.includes("9:16")) return 9 / 16;
    if (aspectHint.toLowerCase().includes("wide logo")) return 400 / 120;
    return undefined; // free-form if unknown
  };

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    setError(null);

    if (file.size > MAX_FILE_BYTES) {
      setError("The file exceeds 10 MB. Upload a smaller image.");
      return;
    }

    const supportedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
    if (!supportedTypes.has(file.type)) {
      setError("Use a JPG, PNG, WebP, or AVIF image.");
      return;
    }

    setIsProcessing(true);
    onUploadingChange?.(true);

    const reader = new FileReader();
    reader.onload = () => {
      const rawResult = reader.result;
      if (typeof rawResult !== "string") {
        setIsProcessing(false);
        onUploadingChange?.(false);
        return;
      }

      setRawImageToCrop(rawResult);
      setCropModalOpen(true);
    };

    reader.onerror = () => {
      setIsProcessing(false);
      onUploadingChange?.(false);
    };
    reader.readAsDataURL(file);
  };

  const persistImage = async (image: Blob | string) => {
    if (!isSupabaseConfigured) {
      onChange(typeof image === "string" ? image : await ImageOptimizer.toDataUrl(image));
      return;
    }

    const storageUrl = await uploadImageToStorage(image, storageFolder, { throwOnError: true });
    if (storageUrl) onChange(storageUrl);
  };

  const processAndUploadImage = async (croppedDataUrl: string) => {
    try {
      const optimizer = new ImageOptimizer({
        maxWidth,
        maxHeight,
        quality: outputQuality,
        outputType: "image/webp",
      });
      const optimizedImage = await optimizer.optimize(croppedDataUrl);
      await persistImage(optimizedImage);
    } catch (processingError) {
      setError(
        processingError instanceof Error
          ? processingError.message
          : "The image could not be processed or uploaded. Please try again.",
      );
    } finally {
      setIsProcessing(false);
      onUploadingChange?.(false);
    }
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold">
            {label}{" "}
            {optional && (
              <span className="text-[11px] font-normal text-muted-foreground">(optional)</span>
            )}
            {aspectHint && (
              <span className="ml-1.5 text-[9px] font-normal text-gold bg-gold/10 px-1.5 py-0.5 rounded-full border border-gold/20">
                {aspectHint}
              </span>
            )}
          </Label>
        </div>
      )}

      {/* Drop zone + preview */}
      <div
        className={cn(
          "relative flex items-center gap-3 rounded-xl border-2 border-dashed border-stone/70 bg-muted/20 p-2.5 transition-all hover:border-gold/60 hover:bg-gold/5 cursor-pointer overflow-hidden",
          compact ? "p-2" : "p-3",
        )}
        onClick={() => !isProcessing && inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFile(e.dataTransfer.files?.[0]);
        }}
      >
        {/* Thumbnail preview */}
        <div
          className={cn(
            "relative grid shrink-0 place-items-center overflow-hidden rounded-lg border border-stone bg-background shadow-xs",
            compact ? "h-12 w-12 sm:h-14 sm:w-14" : "h-16 w-16 sm:h-18 sm:w-18",
          )}
        >
          {value ? (
            <img src={value} alt="Preview" className="h-full w-full object-contain p-0.5" />
          ) : (
            <ImagePlus className="h-5 w-5 text-muted-foreground/70" />
          )}
          {isProcessing && (
            <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center gap-1">
              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span className="text-[8px] text-white font-medium">Uploading...</span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-1 min-w-0 flex-col gap-1 justify-center">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-xs rounded-lg font-medium bg-card hover:bg-gold/10 hover:border-gold/50 shrink-0"
              disabled={isProcessing}
              title={value ? "Replace Image" : "Upload Image"}
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
            >
              <Upload className="h-3.5 w-3.5 text-gold shrink-0" />
              {!compact && (
                <span className="ml-1.5 text-xs truncate">
                  {isProcessing ? "..." : value ? "Replace" : "Upload"}
                </span>
              )}
            </Button>

            {value && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-gold hover:bg-gold/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditCropOpen(true);
                  }}
                  title="Adjust / Re-crop image"
                  disabled={isProcessing}
                >
                  <ScanSearch className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-xs shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(value, "_blank");
                  }}
                  title="View full image"
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-xs shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(null);
                  }}
                  title="Remove image"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>

          <p className="text-[10px] text-muted-foreground leading-tight truncate">
            {hint ?? "JPG / PNG / WebP / AVIF - Transparent backgrounds supported"}
          </p>
        </div>
      </div>

      {error && (
        <p className="text-xs text-destructive font-medium rounded-md bg-destructive/10 px-2.5 py-1.5">
          Warning: {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/avif,image/webp,image/png,image/jpeg"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
        onClick={(e) => ((e.target as HTMLInputElement).value = "")}
      />

      {rawImageToCrop && (
        <ImageCropper
          isOpen={cropModalOpen}
          imageSrc={rawImageToCrop}
          aspectRatio={getAspectRatio()}
          onCropCompleteAction={(croppedImage) => {
            setCropModalOpen(false);
            processAndUploadImage(croppedImage);
            setRawImageToCrop(null);
          }}
          onClose={() => {
            setCropModalOpen(false);
            setRawImageToCrop(null);
            setIsProcessing(false);
            onUploadingChange?.(false);
          }}
        />
      )}

      {/* Re-adjust already-set image */}
      {value && editCropOpen && (
        <ImageCropper
          isOpen={editCropOpen}
          imageSrc={value}
          aspectRatio={getAspectRatio()}
          onCropCompleteAction={(croppedImage) => {
            setEditCropOpen(false);
            setIsProcessing(true);
            onUploadingChange?.(true);
            processAndUploadImage(croppedImage);
          }}
          onClose={() => setEditCropOpen(false)}
        />
      )}
    </div>
  );
}
