import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowUp,
  Bold,
  ExternalLink,
  ImagePlus,
  Italic,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { useImageUploads } from "@/lib/use-image-uploads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { blogSlug, fetchBlogPosts, removeBlogPost, saveBlogPost } from "@/lib/blog-data";
import type { BlogBlock, BlogBlockType, BlogPost } from "@/lib/blog-types";

export const Route = createFileRoute("/admin/blog")({
  head: () => ({
    meta: [
      { title: "Blog Articles | Nigah Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: BlogAdmin,
});

const emptyPost = (): BlogPost => {
  const now = new Date().toISOString();
  return {
    id: "blog-" + Math.random().toString(36).slice(2, 10),
    slug: "",
    title: "",
    excerpt: "",
    category: "Eyewear guide",
    coverImage: "",
    coverAlt: "",
    author: "Nigah Editorial",
    status: "draft",
    featured: false,
    seoTitle: "",
    seoDescription: "",
    keywords: [],
    blocks: [],
    createdAt: now,
    updatedAt: now,
    publishedAt: null,
  };
};
const newBlock = (type: BlogBlockType): BlogBlock => {
  const block: BlogBlock = {
    id: "block-" + Math.random().toString(36).slice(2, 10),
    type,
    text: "",
    alt: "",
    fontSize: "normal",
  };
  return type === "image" ? { ...block, image: "" } : block;
};

function BlogAdmin() {
  const { isUploading, onUploadingChange } = useImageUploads();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [draft, setDraft] = useState<BlogPost | null>(null);
  const [saving, setSaving] = useState(false);
  const load = async () => setPosts(await fetchBlogPosts(true));
  useEffect(() => {
    void load();
  }, []);

  const patchBlock = (id: string, patch: Partial<BlogBlock>) =>
    setDraft((current) =>
      current
        ? { ...current, blocks: current.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)) }
        : current,
    );
  const moveBlock = (index: number, direction: -1 | 1) =>
    setDraft((current) => {
      if (!current) return current;
      const target = index + direction;
      if (target < 0 || target >= current.blocks.length) return current;
      const blocks = [...current.blocks];
      [blocks[index], blocks[target]] = [blocks[target]!, blocks[index]!];
      return { ...current, blocks };
    });

  const save = async () => {
    if (
      !draft ||
      !draft.title.trim() ||
      !draft.slug.trim() ||
      !draft.excerpt.trim() ||
      !draft.coverImage
    ) {
      toast.error("Title, slug, excerpt, and cover image are required.");
      return;
    }
    if (posts.some((p) => p.slug === draft.slug && p.id !== draft.id)) {
      toast.error("This slug is already in use.");
      return;
    }
    setSaving(true);
    const now = new Date().toISOString();
    const finalPost = {
      ...draft,
      slug: blogSlug(draft.slug),
      seoTitle: draft.seoTitle || draft.title,
      seoDescription: draft.seoDescription || draft.excerpt,
      updatedAt: now,
      publishedAt: draft.status === "published" ? draft.publishedAt || now : null,
    };
    const result = await saveBlogPost(finalPost);
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error || "The article could not be saved.");
      return;
    }
    toast.success(finalPost.status === "published" ? "Article published." : "Draft saved.");
    setDraft(finalPost);
    await load();
  };

  if (!draft)
    return (
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="font-display text-3xl">Blog articles</h1>
            <p className="mt-1 text-sm text-ink-muted">
              Create SEO-ready editorial guides for your storefront.
            </p>
          </div>
          <Button onClick={() => setDraft(emptyPost())}>
            <Plus className="mr-2 h-4 w-4" />
            New article
          </Button>
        </div>
        {posts.length === 0 ? (
          <div className="border border-dashed border-stone p-12 text-center text-sm text-ink-muted">
            No articles yet.
          </div>
        ) : (
          <div className="divide-y divide-stone border border-stone">
            {posts.map((post) => (
              <div
                key={post.id}
                className="grid gap-4 p-4 sm:grid-cols-[80px_1fr_auto] sm:items-center"
              >
                <img
                  src={post.coverImage || "/placeholder.svg"}
                  alt=""
                  className="h-16 w-20 object-cover"
                />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{post.title}</h2>
                    <span className="border border-stone px-2 py-0.5 text-[10px] uppercase">
                      {post.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ink-muted">
                    /{post.slug} � {post.category}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setDraft(post)}>
                    Edit
                  </Button>
                  {post.status === "published" && (
                    <Button variant="ghost" size="icon" asChild>
                      <Link to="/blog/$slug" params={{ slug: post.slug }} target="_blank">
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={async () => {
                      if (confirm("Delete this article permanently?")) {
                        await removeBlogPost(post.id);
                        await load();
                        toast.success("Article deleted.");
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button
            onClick={() => setDraft(null)}
            className="text-xs text-ink-muted hover:text-black"
          >
            Back to articles
          </button>
          <h1 className="mt-1 font-display text-3xl">{draft.title || "New article"}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setDraft(null)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || isUploading}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save article"}
          </Button>
        </div>
      </div>

      <section className="grid gap-5 border border-stone p-5 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label>Article title</Label>
          <Input
            value={draft.title}
            onChange={(e) =>
              setDraft({
                ...draft,
                title: e.target.value,
                slug: draft.slug || blogSlug(e.target.value),
              })
            }
          />
        </div>
        <div className="space-y-2">
          <Label>URL slug</Label>
          <Input
            value={draft.slug}
            onChange={(e) => setDraft({ ...draft, slug: blogSlug(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Input
            value={draft.category}
            onChange={(e) => setDraft({ ...draft, category: e.target.value })}
            placeholder="Frame guide"
          />
        </div>
        <div className="space-y-2">
          <Label>Author</Label>
          <Input
            value={draft.author}
            onChange={(e) => setDraft({ ...draft, author: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <select
            className="h-10 w-full border border-input bg-white px-3 text-sm"
            value={draft.status}
            onChange={(e) => setDraft({ ...draft, status: e.target.value as BlogPost["status"] })}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Short excerpt</Label>
          <Textarea
            value={draft.excerpt}
            maxLength={240}
            onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })}
          />
          <p className="text-right text-xs text-ink-muted">{draft.excerpt.length}/240</p>
        </div>
        <div className="md:col-span-2">
          <ImageUpload
            label="Cover image"
            disabled={saving}
            maxBytes={350 * 1024}
            cropAspect={16 / 9}
            onUploadingChange={onUploadingChange}
            value={draft.coverImage || null}
            onChange={(image) => setDraft({ ...draft, coverImage: image || "" })}
            aspectHint="16:9 landscape"
            maxWidth={1600}
            maxHeight={900}
            outputQuality={0.86}
            storageFolder="blog"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Cover image alt text</Label>
          <Input
            value={draft.coverAlt}
            onChange={(e) => setDraft({ ...draft, coverAlt: e.target.value })}
            placeholder="Describe the image for accessibility and search"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.featured}
            onChange={(e) => setDraft({ ...draft, featured: e.target.checked })}
          />
          Feature this article
        </label>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl">Article content</h2>
            <p className="text-xs text-ink-muted">
              Build the article in readable, SEO-safe blocks.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["paragraph", "heading2", "heading3", "quote", "image"] as BlogBlockType[]).map(
              (type) => (
                <Button
                  key={type}
                  variant="outline"
                  size="sm"
                  onClick={() => setDraft({ ...draft, blocks: [...draft.blocks, newBlock(type)] })}
                >
                  {type === "image" ? (
                    <ImagePlus className="mr-1 h-4 w-4" />
                  ) : (
                    <Plus className="mr-1 h-4 w-4" />
                  )}
                  {type}
                </Button>
              ),
            )}
          </div>
        </div>
        {draft.blocks.map((block, index) => (
          <div key={block.id} className="border border-stone bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="mr-auto text-xs font-semibold uppercase text-ink-muted">
                {block.type}
              </span>
              {block.type !== "image" && (
                <>
                  <Button
                    type="button"
                    variant={block.bold ? "default" : "outline"}
                    size="icon"
                    onClick={() => patchBlock(block.id, { bold: !block.bold })}
                  >
                    <Bold className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant={block.italic ? "default" : "outline"}
                    size="icon"
                    onClick={() => patchBlock(block.id, { italic: !block.italic })}
                  >
                    <Italic className="h-4 w-4" />
                  </Button>
                  <select
                    className="h-9 border border-input px-2 text-xs"
                    value={block.fontSize || "normal"}
                    onChange={(e) =>
                      patchBlock(block.id, {
                        fontSize: e.target.value as NonNullable<BlogBlock["fontSize"]>,
                      })
                    }
                  >
                    <option value="small">Small</option>
                    <option value="normal">Normal</option>
                    <option value="large">Large</option>
                  </select>
                </>
              )}
              <Button
                variant="ghost"
                size="icon"
                disabled={index === 0}
                onClick={() => moveBlock(index, -1)}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled={index === draft.blocks.length - 1}
                onClick={() => moveBlock(index, 1)}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive"
                onClick={() =>
                  setDraft({ ...draft, blocks: draft.blocks.filter((b) => b.id !== block.id) })
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            {block.type === "image" ? (
              <div className="space-y-3">
                <ImageUpload
                  disabled={saving}
                  onUploadingChange={onUploadingChange}
                  maxBytes={300 * 1024}
                  cropAspect={16 / 9}
                  value={block.image || null}
                  onChange={(image) => patchBlock(block.id, { image: image || "" })}
                  aspectHint="16:9 landscape"
                  maxWidth={1400}
                  maxHeight={788}
                  outputQuality={0.84}
                  storageFolder="blog"
                />
                <Input
                  value={block.alt || ""}
                  onChange={(e) => patchBlock(block.id, { alt: e.target.value })}
                  placeholder="Image alt text / caption"
                />
              </div>
            ) : (
              <Textarea
                rows={block.type === "paragraph" ? 7 : 3}
                value={block.text}
                onChange={(e) => patchBlock(block.id, { text: e.target.value })}
                placeholder="Write content..."
              />
            )}
          </div>
        ))}
      </section>

      <section className="grid gap-5 border border-stone bg-zinc-50 p-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <h2 className="font-display text-2xl">Search optimization</h2>
          <p className="text-xs text-ink-muted">
            Use natural phrases customers search for. Avoid keyword stuffing.
          </p>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>SEO title</Label>
          <Input
            value={draft.seoTitle}
            maxLength={60}
            onChange={(e) => setDraft({ ...draft, seoTitle: e.target.value })}
            placeholder={draft.title}
          />
          <p className="text-right text-xs text-ink-muted">{draft.seoTitle.length}/60</p>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Meta description</Label>
          <Textarea
            value={draft.seoDescription}
            maxLength={160}
            onChange={(e) => setDraft({ ...draft, seoDescription: e.target.value })}
            placeholder={draft.excerpt}
          />
          <p className="text-right text-xs text-ink-muted">{draft.seoDescription.length}/160</p>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Keywords</Label>
          <Input
            value={draft.keywords.join(", ")}
            onChange={(e) =>
              setDraft({
                ...draft,
                keywords: e.target.value
                  .split(",")
                  .map((x) => x.trim())
                  .filter(Boolean),
              })
            }
            placeholder="eyeglasses guide, frame size, lens care"
          />
        </div>
      </section>
    </div>
  );
}
