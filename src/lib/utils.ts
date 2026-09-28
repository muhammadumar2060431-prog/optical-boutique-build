import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getSiteUrl(path: string = ""): string {
  const base =
    import.meta.env["VITE_SITE_URL"] ||
    (typeof window !== "undefined" && window.location.origin ? window.location.origin : "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base.replace(/\/$/, "")}${cleanPath}` : cleanPath;
}
