import { useRef, useState } from "react";
import { Trash2, Upload, Eye, ImagePlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// ─── Image Size Guide ────────────────────────────────────────────────────────
// Recommended sizes for fast loading (website smooth chale):
//   Logo              : 400×120 px  |  max 80 KB   | PNG/WebP (transparent bg)
//   Hero Slide Banner : 1440×720 px |  max 300 KB  | JPG/WebP
//   Category Icon     : 400×400 px  |  max 100 KB  | JPG/WebP (square)
//   Category Banner   : 1200×600 px |  max 250 KB  | JPG/WebP
//   Product Main Image: 800×800 px  |  max 200 KB  | JPG/WebP (square)
//   Product Gallery   : 800×800 px  |  max 150 KB  | JPG/WebP
//   Variant Image     : 600×600 px  |  max 120 KB  | JPG/WebP
//   Brand Logo        : 320×80 px   |  max 50 KB   | PNG/SVG (transparent bg)
//   Reel Thumbnail    : 480×854 px  |  max 150 KB  | JPG/WebP (9:16 vertical)
//   Testimonial Photo : 400×400 px  |  max 80 KB   | JPG/WebP
// Max upload size allowed: 5 MB per file (auto-compressed to optimized quality)
// ─────────────────────────────────────────────────────────────────────────────

export function ImageUpload({
  label,
  value,
  onChange,
  optional = false,
  hint,
  aspectHint,
  compact = false,
}: {
  label?: string;
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  optional?: boolean;
  /** Short tip shown below the uploader e.g. "9:16 vertical recommended" */
  hint?: string;
  /** Aspect ratio hint e.g. "1:1 square" */
  aspectHint?: string;
  /** Compact UI mode for tight spaces (like sub-images/gallery grids) */
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    setError(null);

    if (file.size > MAX_FILE_BYTES) {
      setError("File 10 MB se bari hai. Chhoti image upload karein.");
      return;
    }

    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = () => {
      const rawResult = reader.result;
      if (typeof rawResult !== "string") {
        setIsProcessing(false);
        return;
      }

      // Auto-compress images using canvas while preserving transparency for PNG/WebP/AVIF (background removal)
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          let { width, height } = img;
          const maxDim = 1400;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");

          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(img, 0, 0, width, height);

            // Preserve alpha transparency for background removed images (PNG / WebP / AVIF)
            const isTransparentFormat =
              file.type.includes("png") ||
              file.type.includes("webp") ||
              file.type.includes("avif") ||
              file.name.toLowerCase().endsWith(".png") ||
              file.name.toLowerCase().endsWith(".webp") ||
              file.name.toLowerCase().endsWith(".avif");

            const outputMime = isTransparentFormat ? "image/webp" : "image/jpeg";
            const compressed = canvas.toDataURL(outputMime, 0.90);
            onChange(compressed);
          } else {
            onChange(rawResult);
          }
        } catch {
          onChange(rawResult);
        } finally {
          setIsProcessing(false);
        }
      };

      img.onerror = () => {
        onChange(rawResult);
        setIsProcessing(false);
      };

      img.src = rawResult;
    };

    reader.onerror = () => setIsProcessing(false);
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold">
            {label}{" "}
            {optional && <span className="text-[11px] font-normal text-muted-foreground">(optional)</span>}
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
              <span className="text-[8px] text-white font-medium">Saving</span>
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
            {hint ?? "JPG / PNG / WebP / AVIF • Transparent BG supported"}
          </p>
        </div>
      </div>

      {error && (
        <p className="text-xs text-destructive font-medium rounded-md bg-destructive/10 px-2.5 py-1.5">
          ⚠ {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/avif,image/webp,image/png,image/jpeg,image/jpg,image/heic,image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
        onClick={(e) => ((e.target as HTMLInputElement).value = "")}
      />
    </div>
  );
}
