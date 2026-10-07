import { useCallback, useRef, useState } from "react";

/** Multiple image slots can upload concurrently; one completed slot must not unlock Save. */
export function useImageUploads() {
  const count = useRef(0);
  const [isUploading, setIsUploading] = useState(false);
  const onUploadingChange = useCallback((uploading: boolean) => {
    count.current = Math.max(0, count.current + (uploading ? 1 : -1));
    setIsUploading(count.current > 0);
  }, []);
  return { isUploading, onUploadingChange };
}
