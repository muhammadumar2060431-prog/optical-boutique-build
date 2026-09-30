import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

import { supabase } from "@/lib/supabase";

const BASE_URL = import.meta.env["VITE_SITE_URL"]?.replace(/\/$/, "") || "https://www.nigah.store";

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
          { path: "/blog", changefreq: "weekly", priority: "0.8" },
          { path: "/contact", changefreq: "monthly", priority: "0.6" },
          { path: "/faqs", changefreq: "monthly", priority: "0.6" },
          { path: "/frame-size-guide", changefreq: "monthly", priority: "0.6" },
          { path: "/lens-guide", changefreq: "monthly", priority: "0.6" },
          { path: "/prescription-guide", changefreq: "monthly", priority: "0.6" },
          { path: "/shipping-policy", changefreq: "yearly", priority: "0.3" },
          { path: "/returns-policy", changefreq: "yearly", priority: "0.3" },
          { path: "/warranty", changefreq: "yearly", priority: "0.3" },
          { path: "/privacy-policy", changefreq: "yearly", priority: "0.2" },
          { path: "/terms", changefreq: "yearly", priority: "0.2" },
        ];

        try {
          const [{ data: categories }, { data: products }, { data: blogPosts }] = await Promise.all(
            [
              supabase.from("categories").select("slug"),
              supabase.from("products").select("slug").eq("enabled", true),
              supabase.from("blog_posts").select("slug").eq("status", "published"),
            ],
          );

          if (categories) {
            for (const category of categories) {
              if (!category.slug || category.slug === "glasses" || category.slug === "lenses")
                continue;
              entries.push({
                path: `/category/${encodeURIComponent(category.slug)}`,
                changefreq: "weekly",
                priority: "0.7",
              });
            }
          }

          if (blogPosts) {
            for (const post of blogPosts) {
              if (!post.slug) continue;
              entries.push({
                path: "/blog/" + encodeURIComponent(post.slug),
                changefreq: "monthly",
                priority: "0.7",
              });
            }
          }
          if (products) {
            for (const product of products) {
              if (!product.slug) continue;
              entries.push({
                path: `/product/${encodeURIComponent(product.slug)}`,
                changefreq: "weekly",
                priority: "0.8",
              });
            }
          }
        } catch (err) {
          console.error("Failed to generate dynamic sitemap entries:", err);
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
