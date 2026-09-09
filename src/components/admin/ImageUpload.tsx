import { useRef, useState } from "react";
import { Link2, Trash2, Upload, Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ImageUpload({
  label,
  value,
  onChange,
  optional = false,
}: {
  label: string;
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  optional?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = () => {
      const rawResult = reader.result;
      if (typeof rawResult !== "string") {
        setIsProcessing(false);
        return;
      }

      // Auto-compress large screenshot files using an in-browser canvas
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          let { width, height } = img;
          const maxDim = 1200;

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
            const compressed = canvas.toDataURL("image/jpeg", 0.88);
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

  const handleUrlSubmit = () => {
    const trimmed = urlDraft.trim();
    if (trimmed) {
      onChange(trimmed);
      setUrlDraft("");
      setShowUrlInput(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>
          {label} {optional && <span className="text-xs text-muted-foreground">(optional)</span>}
        </Label>
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="text-xs text-gold hover:underline flex items-center gap-1"
        >
          <Link2 className="h-3 w-3" />
          {showUrlInput ? "Cancel URL" : "Paste Image URL"}
        </button>
      </div>

      {showUrlInput && (
        <div className="flex gap-2">
          <Input
            placeholder="https://example.com/screenshot.jpg"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            className="text-xs h-9"
          />
          <Button type="button" size="sm" onClick={handleUrlSubmit} className="h-9">
            Apply
          </Button>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-muted">
          {value ? (
            <img src={value} alt="Preview" className="h-full w-full object-cover" />
          ) : (
            <Upload className="h-5 w-5 text-muted-foreground" />
          )}
          {isProcessing && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-[10px] text-white font-medium">
              Optimizing...
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={isProcessing}
            onClick={() => inputRef.current?.click()}
          >
            {isProcessing ? "Processing..." : value ? "Replace Screenshot" : "Upload Screenshot / Photo"}
          </Button>

          {value && (
            <>
              <Button
                type="button"
                variant="ghost"
                className="min-h-11"
                onClick={() => {
                  window.open(value, "_blank");
                }}
                title="View full image in new tab"
              >
                <Eye className="mr-1 h-4 w-4" /> View
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="min-h-11 text-destructive hover:text-destructive"
                onClick={() => onChange(null)}
              >
                <Trash2 className="mr-1 h-4 w-4" /> Remove
              </Button>
            </>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
