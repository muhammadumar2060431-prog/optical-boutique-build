/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase blog rows are normalized into BlogPost values here. */
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { BlogPost } from "@/lib/blog-types";
import { sampleBlogPost } from "@/lib/blog-seed";

const CACHE_KEY = "optique_blog_posts";

function readCache(): BlogPost[] {
  if (typeof window === "undefined") return [sampleBlogPost];
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (stored === null) return [sampleBlogPost];
    const parsed = JSON.parse(stored) as BlogPost[];
    return parsed.length > 0 ? parsed : [sampleBlogPost];
  } catch {
    return [sampleBlogPost];
  }
}

function writeCache(posts: BlogPost[]) {
  if (typeof window !== "undefined") localStorage.setItem(CACHE_KEY, JSON.stringify(posts));
}

export function mapDbBlogPost(raw: any): BlogPost {
  return {
    id: String(raw.id),
    slug: raw.slug || "",
    title: raw.title || "",
    excerpt: raw.excerpt || "",
    category: raw.category || "Eyewear guide",
    coverImage: raw.cover_image || "",
    coverAlt: raw.cover_alt || raw.title || "",
    author: raw.author || "OPTIQUE Editorial",
    status: raw.status === "published" ? "published" : "draft",
    featured: Boolean(raw.featured),
    seoTitle: raw.seo_title || raw.title || "",
    seoDescription: raw.seo_description || raw.excerpt || "",
    keywords: Array.isArray(raw.keywords) ? raw.keywords : [],
    blocks: Array.isArray(raw.blocks) ? raw.blocks : [],
    createdAt: raw.created_at || new Date().toISOString(),
    updatedAt: raw.updated_at || new Date().toISOString(),
    publishedAt: raw.published_at || null,
  };
}

function toDb(post: BlogPost) {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    category: post.category,
    cover_image: post.coverImage,
    cover_alt: post.coverAlt,
    author: post.author,
    status: post.status,
    featured: post.featured,
    seo_title: post.seoTitle,
    seo_description: post.seoDescription,
    keywords: post.keywords,
    blocks: post.blocks,
    created_at: post.createdAt,
    updated_at: post.updatedAt,
    published_at: post.status === "published" ? post.publishedAt || post.updatedAt : null,
  };
}

export async function fetchBlogPosts(includeDrafts = false): Promise<BlogPost[]> {
  if (isSupabaseConfigured) {
    const query = supabase
      .from("blog_posts")
      .select("*")
      .order("published_at", { ascending: false });
    const { data, error } = includeDrafts ? await query : await query.eq("status", "published");
    if (!error && data) {
      const posts = data.map(mapDbBlogPost);
      if (posts.length > 0) {
        writeCache(posts);
        return posts;
      }
    }
  }
  const posts = readCache();
  return includeDrafts ? posts : posts.filter((post) => post.status === "published");
}

export async function fetchBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    if (!error && data) return mapDbBlogPost(data);
  }
  return (
    readCache().find((post) => post.slug === slug && post.status === "published") ||
    (sampleBlogPost.slug === slug ? sampleBlogPost : null)
  );
}

export async function saveBlogPost(post: BlogPost): Promise<{ ok: boolean; error?: string }> {
  const cached = readCache();
  writeCache([...cached.filter((item) => item.id !== post.id), post]);
  if (!isSupabaseConfigured) return { ok: true };
  const { error } = await supabase.from("blog_posts").upsert(toDb(post));
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function removeBlogPost(id: string): Promise<{ ok: boolean; error?: string }> {
  writeCache(readCache().filter((post) => post.id !== id));
  if (!isSupabaseConfigured) return { ok: true };
  const { error } = await supabase.from("blog_posts").delete().eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export function blogReadingMinutes(post: BlogPost) {
  const words = post.blocks.reduce(
    (total, block) => total + block.text.trim().split(/\s+/).filter(Boolean).length,
    0,
  );
  return Math.max(1, Math.ceil(words / 220));
}

export function blogSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}
