/**
 * Security & Input Sanitization Suite
 * OPTIQUE Control Panel & Storefront Security Guard
 */

// Regex patterns for platform verification
const INSTAGRAM_REGEX =
  /^https?:\/\/(?:www\.)?instagram\.com\/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/i;
const TIKTOK_REGEX =
  /^https?:\/\/(?:www\.|vm\.|vt\.)?tiktok\.com\/(?:@[A-Za-z0-9._-]+\/video\/\d+|v\/\d+|[A-Za-z0-9_-]+)/i;
const YOUTUBE_REGEX =
  /^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i;
const FACEBOOK_REGEX =
  /^https?:\/\/(?:www\.|web\.|m\.)?(?:facebook\.com\/(?:reel|reels|watch|videos|\w+\/videos)|fb\.watch)\/([A-Za-z0-9._-]+)/i;
const DIRECT_VIDEO_EXT_REGEX = /\.(mp4|webm|mov|ogg)(\?.*)?$/i;
const KNOWN_VIDEO_CDNS = [
  "mixkit.co",
  "cloudinary.com",
  "vimeo.com",
  "player.vimeo.com",
  "supabase.co",
  "imgur.com",
  "giphy.com",
];

/**
 * Strips hidden control characters and whitespace tricks used for XSS evasion.
 * Preserves tabs (\x09), newlines (\x0A), and carriage returns (\x0D).
 */
export function sanitizeRawInput(input: string): string {
  if (!input) return "";

  const withoutControlCharacters = Array.from(input)
    .filter((character) => {
      const code = character.charCodeAt(0);
      const isAllowedWhitespace = code === 9 || code === 10 || code === 13;
      const isControlCharacter =
        (code < 32 && !isAllowedWhitespace) || (code >= 127 && code <= 159);
      return !isControlCharacter;
    })
    .join("");

  return withoutControlCharacters.trim();
}

/**
 * Validates whether a URL uses HTTPS or a relative path.
 * Strictly blocks javascript:, data:, vbscript:, file:, blob:, about: etc.
 */
export function isSafeUrl(url: string): boolean {
  if (!url) return false;
  const clean = sanitizeRawInput(url).toLowerCase();

  // Block dangerous schemes
  if (
    clean.startsWith("javascript:") ||
    clean.startsWith("data:") ||
    clean.startsWith("vbscript:") ||
    clean.startsWith("file:") ||
    clean.startsWith("blob:") ||
    clean.startsWith("about:")
  ) {
    return false;
  }

  if (clean.startsWith("/") || clean.startsWith("https://")) return true;
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(?:\/|$)/i.test(clean);
}

/**
 * Returns a safe href attribute string. Returns "#" if the link is malicious or invalid.
 */
export function sanitizeHref(url: string | null | undefined, fallback = "#"): string {
  if (!url) return fallback;
  const cleaned = sanitizeRawInput(url);
  if (isSafeUrl(cleaned)) {
    return cleaned;
  }
  return fallback;
}

/**
 * Returns a safe image source. Allows the same safe URLs as links plus uploaded data images.
 */
export function sanitizeImageSrc(url: string | null | undefined, fallback = ""): string {
  if (!url) return fallback;
  const cleaned = sanitizeRawInput(url);
  const imageCheck = validateImageUrl(cleaned);
  return imageCheck.valid ? cleaned : fallback;
}

/**
 * Sanitizes plain text input to prevent XSS string injections.
 */
export function sanitizeText(text: string): string {
  if (!text) return "";
  return sanitizeRawInput(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

export interface VideoUrlValidationResult {
  valid: boolean;
  platform: "instagram" | "tiktok" | "youtube" | "facebook" | "custom";
  error?: string;
  sanitizedUrl?: string;
}

/**
 * Comprehensive security validation for Social Proof Reels and Video Links.
 * Ensures the link is a legitimate social reel/video or valid MP4 link, not a fake or phishing link.
 */
export function validateSocialVideoUrl(
  url: string,
  preferredPlatform?: string,
): VideoUrlValidationResult {
  const cleanUrl = sanitizeRawInput(url);

  if (!cleanUrl) {
    return {
      valid: false,
      platform: "custom",
      error: "Video URL link is required.",
    };
  }

  if (!isSafeUrl(cleanUrl)) {
    return {
      valid: false,
      platform: "custom",
      error: "🔒 Security Alert: Unsafe protocol detected (javascript/data URLs are blocked).",
    };
  }

  // Check Instagram
  if (INSTAGRAM_REGEX.test(cleanUrl)) {
    return {
      valid: true,
      platform: "instagram",
      sanitizedUrl: cleanUrl,
    };
  }

  // Check TikTok
  if (TIKTOK_REGEX.test(cleanUrl)) {
    return {
      valid: true,
      platform: "tiktok",
      sanitizedUrl: cleanUrl,
    };
  }

  // Check YouTube / Shorts
  if (YOUTUBE_REGEX.test(cleanUrl)) {
    return {
      valid: true,
      platform: "youtube",
      sanitizedUrl: cleanUrl,
    };
  }

  // Check Facebook
  if (FACEBOOK_REGEX.test(cleanUrl)) {
    return {
      valid: true,
      platform: "facebook",
      sanitizedUrl: cleanUrl,
    };
  }

  // Check Direct Video (.mp4, .webm) or Approved Video CDNs
  const isDirectFile = DIRECT_VIDEO_EXT_REGEX.test(cleanUrl);
  const isApprovedCdn = KNOWN_VIDEO_CDNS.some((cdn) => cleanUrl.toLowerCase().includes(cdn));

  if (isDirectFile || isApprovedCdn) {
    return {
      valid: true,
      platform: "custom",
      sanitizedUrl: cleanUrl,
    };
  }

  // Tailored platform error feedback
  if (preferredPlatform === "instagram") {
    return {
      valid: false,
      platform: "instagram",
      error:
        "Invalid Instagram Reel link. Must be a valid link like https://www.instagram.com/reel/...",
    };
  }

  if (preferredPlatform === "tiktok") {
    return {
      valid: false,
      platform: "tiktok",
      error:
        "Invalid TikTok video link. Must be a valid link like https://www.tiktok.com/@user/video/...",
    };
  }

  if (preferredPlatform === "youtube") {
    return {
      valid: false,
      platform: "youtube",
      error:
        "Invalid YouTube link. Must be a valid YouTube Shorts or video link like https://www.youtube.com/shorts/...",
    };
  }

  if (preferredPlatform === "facebook") {
    return {
      valid: false,
      platform: "facebook",
      error:
        "Invalid Facebook Reel link. Must be a valid link like https://www.facebook.com/reel/...",
    };
  }

  return {
    valid: false,
    platform: "custom",
    error:
      "Invalid video link format. Provide a valid Instagram Reel, TikTok, YouTube Shorts, Facebook Reel, or direct .mp4 URL.",
  };
}

/**
 * Validates image asset URLs (supports HTTPS, relative paths, or uploaded data images).
 */
export function validateImageUrl(url: string): { valid: boolean; error?: string } {
  const cleanUrl = sanitizeRawInput(url);
  if (!cleanUrl) {
    return { valid: false, error: "Image URL or file is required." };
  }

  // Block dangerous protocols
  const safeRasterData = /^data:image\/(?:png|jpe?g|webp|avif|gif);base64,/i.test(cleanUrl);
  if (!isSafeUrl(cleanUrl) && !safeRasterData) {
    return {
      valid: false,
      error: "🔒 Security Alert: Unsafe image protocol detected.",
    };
  }

  // Block dangerous executable extensions in image parameters
  const lower = cleanUrl.toLowerCase();
  if (
    lower.includes(".js") ||
    lower.includes(".html") ||
    lower.includes(".php") ||
    lower.includes(".exe") ||
    lower.includes(".sh")
  ) {
    return {
      valid: false,
      error: "🔒 Security Alert: Executable file formats are not allowed as images.",
    };
  }

  return { valid: true };
}

/**
 * Validates destination/CTA links for slides, banners, and buttons.
 */
export function escapePostgrestFilter(term: string): string {
  if (!term) return "";
  return sanitizeRawInput(term)
    .replace(/\0/g, "") // null bytes
    .replace(/['";\\]/g, "") // quotes and semicolons
    .replace(/[(),]/g, "") // PostgREST composite filter tokens
    .replace(/[%_]/g, "\\$&") // SQL LIKE wildcard escapes
    .slice(0, 200); // boundary protection
}

/**
 * Sanitizes input before insertion or update in database.
 * Removes null bytes, dangerous control characters, and limits boundary length.
 */
export function sanitizeDbInput<T>(input: T): T {
  if (typeof input === "string") {
    return sanitizeRawInput(input).replace(/\0/g, "") as unknown as T;
  }
  if (Array.isArray(input)) {
    return input.map(sanitizeDbInput) as unknown as T;
  }
  if (input !== null && typeof input === "object") {
    const sanitizedObj: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(input)) {
      sanitizedObj[key] = sanitizeDbInput(val);
    }
    return sanitizedObj as T;
  }
  return input;
}
