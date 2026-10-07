import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { ImageUpload } from "../../src/components/admin/ImageUpload";
import { useImageUploads } from "../../src/lib/use-image-uploads";

let root: ReturnType<typeof createRoot>;
export function mount(options: Record<string, unknown> = {}) {
  if (!root) {
    document.body.innerHTML = '<div id="image-audit-root"></div>';
    root = createRoot(document.getElementById("image-audit-root")!);
  }
  function Harness() {
    const [value, setValue] = useState<string | null>((options.initialValue as string) || null);
    const [title, setTitle] = useState("before");
    const [savedTitle, setSavedTitle] = useState("");
    const { isUploading, onUploadingChange } = useImageUploads();
    return (
      <main style={{ padding: 16, maxWidth: 720 }}>
        <input
          aria-label="Draft title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <ImageUpload
          localOnly
          label="Audit image"
          value={value}
          onChange={(image) => {
            setValue(image);
            setSavedTitle(title);
          }}
          onUploadingChange={onUploadingChange}
          {...options}
        />
        <button disabled={isUploading} id="record-save">
          Save record
        </button>
        <output id="saved-title">{savedTitle}</output>
        <output id="image-result" data-source={value || ""} />
      </main>
    );
  }
  root.render(<Harness key={crypto.randomUUID()} />);
}
