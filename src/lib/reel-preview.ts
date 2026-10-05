import { sanitizeHref, sanitizeImageSrc } from "./security.ts";

export type ReelPreviewSource = { kind: "image" | "video" | "iframe"; src: string };

export function getReelPreview(videoUrl: string, thumbnail: string): ReelPreviewSource | null {
  const custom = sanitizeImageSrc(thumbnail);
  if (custom) return { kind: "image", src: custom };
  const safeUrl = sanitizeHref(videoUrl, "");
  if (!safeUrl) return null;

  let url: URL;
  try {
    url = new URL(safeUrl);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (/\.(mp4|webm|mov|ogg)$/i.test(url.pathname)) return { kind: "video", src: safeUrl };

  if (host === "instagram.com") {
    const id = /^\/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)(?:\/|$)/.exec(url.pathname)?.[1];
    if (id) return { kind: "iframe", src: `https://www.instagram.com/reel/${id}/embed/` };
  }
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be") {
    const id =
      host === "youtu.be"
        ? url.pathname.slice(1).split("/")[0]
        : url.searchParams.get("v") || /^\/(?:shorts|embed)\/([^/]+)/.exec(url.pathname)?.[1];
    if (id && /^[A-Za-z0-9_-]{11}$/.test(id)) {
      return { kind: "image", src: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` };
    }
  }
  if (host === "tiktok.com") {
    const id = /^\/@[^/]+\/video\/(\d+)/.exec(url.pathname)?.[1];
    if (id) return { kind: "iframe", src: `https://www.tiktok.com/player/v1/${id}?autoplay=0` };
  }
  if (host === "facebook.com" || host === "m.facebook.com" || host === "fb.watch") {
    return {
      kind: "iframe",
      src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(safeUrl)}&show_text=false&autoplay=false`,
    };
  }
  return null;
}
