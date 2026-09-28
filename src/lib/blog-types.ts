export type BlogBlockType = "paragraph" | "heading2" | "heading3" | "quote" | "image";

export interface BlogBlock {
  id: string;
  type: BlogBlockType;
  text: string;
  image?: string;
  alt?: string;
  bold?: boolean;
  italic?: boolean;
  fontSize?: "small" | "normal" | "large";
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  coverImage: string;
  coverAlt: string;
  author: string;
  status: "draft" | "published";
  featured: boolean;
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
  blocks: BlogBlock[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}
