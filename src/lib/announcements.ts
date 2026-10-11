import type { AnnouncementSettings } from "./types.ts";

export function mapAnnouncementRecord(
  raw: Record<string, unknown>,
  fallback?: AnnouncementSettings,
): AnnouncementSettings {
  const legacyText = raw["text"] || raw["message"];
  const messages = Array.isArray(raw["messages"])
    ? raw["messages"].filter((message): message is string => typeof message === "string")
    : typeof legacyText === "string"
      ? legacyText.split(/\r?\n/).filter((message) => message.trim().length > 0)
      : (fallback?.messages ?? []);
  return {
    enabled: Boolean(raw["enabled"] ?? raw["active"] ?? fallback?.enabled ?? true),
    messages,
    background: String(raw["background"] || raw["bg_color"] || fallback?.background || "#000000"),
    textColor: String(raw["text_color"] || raw["textColor"] || fallback?.textColor || "#ffffff"),
  };
}
