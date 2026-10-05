import { useEffect, useState, type ImgHTMLAttributes } from "react";
import { sanitizeImageSrc } from "@/lib/security";

const DEFAULT_FALLBACK = "/placeholder.svg";

type ProductImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "onError"> & {
  src?: string | null;
  fallbackSrc?: string;
};

export function ProductImage({
  src,
  fallbackSrc = DEFAULT_FALLBACK,
  alt,
  ...props
}: ProductImageProps) {
  const safeFallback = sanitizeImageSrc(fallbackSrc, DEFAULT_FALLBACK);
  const preferredSrc = sanitizeImageSrc(src, safeFallback);
  const [currentSrc, setCurrentSrc] = useState(preferredSrc);

  useEffect(() => {
    setCurrentSrc(preferredSrc);
  }, [preferredSrc]);

  useEffect(() => {
    const retryPreferredImage = () => setCurrentSrc(preferredSrc);
    window.addEventListener("online", retryPreferredImage);
    return () => window.removeEventListener("online", retryPreferredImage);
  }, [preferredSrc]);

  return (
    <img
      loading="lazy"
      decoding="async"
      {...props}
      src={currentSrc}
      alt={alt}
      data-fallback={currentSrc === safeFallback ? "true" : undefined}
      onError={() => {
        if (currentSrc !== safeFallback) setCurrentSrc(safeFallback);
      }}
    />
  );
}
