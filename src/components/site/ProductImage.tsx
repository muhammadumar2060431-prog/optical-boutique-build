import { useEffect, useState, type ImgHTMLAttributes } from "react";

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
  const preferredSrc = src?.trim() && src !== DEFAULT_FALLBACK ? src : fallbackSrc;
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
      {...props}
      src={currentSrc}
      alt={alt}
      data-fallback={currentSrc === fallbackSrc ? "true" : undefined}
      onError={() => {
        if (currentSrc !== fallbackSrc) setCurrentSrc(fallbackSrc);
      }}
    />
  );
}
