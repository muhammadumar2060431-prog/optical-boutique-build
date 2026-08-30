import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

import { seedCategories, seedProducts } from "@/lib/seed";

const BASE_URL = "https://optical-boutique-build.lovable.app";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/glasses", changefreq: "weekly", priority: "0.9" },
          { path: "/lenses", changefreq: "weekly", priority: "0.9" },
          { path: "/about", changefreq: "monthly", priority: "0.6" },
          { path: "/contact", changefreq: "monthly", priority: "0.6" },
          { path: "/order-status", changefreq: "monthly", priority: "0.4" },
        ];

        for (const category of seedCategories) {
          if (category.slug === "glasses" || category.slug === "lenses") continue;
          entries.push({
            path: `/category/${encodeURIComponent(category.slug)}`,
            changefreq: "weekly",
            priority: "0.7",
          });
        }

        for (const product of seedProducts) {
          entries.push({
            path: `/product/${encodeURIComponent(product.slug)}`,
            changefreq: "weekly",
            priority: "0.8",
          });
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
