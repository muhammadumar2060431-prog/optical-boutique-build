import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Film,
  Lock,
  Pencil,
  Play,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { ImageUpload } from "@/components/admin/ImageUpload";
import {
  isSafeUrl,
  sanitizeHref,
  sanitizeText,
  validateDestinationLink,
  validateImageUrl,
  validateSocialVideoUrl,
} from "@/lib/security";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice, newId, useStore } from "@/lib/store";
import type { SocialPlatform, SocialReel } from "@/lib/types";

export const Route = createFileRoute("/admin/content")({
  component: AdminContent,
});

function AdminContent() {
  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow text-gold">Storefront</p>
        <h1 className="mt-2 font-display text-3xl">Content</h1>
      </header>

      <Tabs defaultValue="reels">
        <TabsList className="flex-wrap">
          <TabsTrigger value="reels" className="gap-1.5">
            <Film className="h-4 w-4" />
            <span>Social Proof Reels</span>
          </TabsTrigger>
          <TabsTrigger value="announcement">Announcement</TabsTrigger>
          <TabsTrigger value="brands">Brands Bar</TabsTrigger>
          <TabsTrigger value="hero">Hero slides</TabsTrigger>
          <TabsTrigger value="banners">Category banners</TabsTrigger>
          <TabsTrigger value="video">Workshop Video</TabsTrigger>
        </TabsList>
        <TabsContent value="reels" className="pt-6">
          <SocialReelsPanel />
        </TabsContent>
        <TabsContent value="announcement" className="pt-6">
          <AnnouncementPanel />
        </TabsContent>
        <TabsContent value="brands" className="pt-6">
          <BrandsPanel />
        </TabsContent>
        <TabsContent value="hero" className="pt-6">
          <HeroPanel />
        </TabsContent>
        <TabsContent value="banners" className="pt-6">
          <BannerPanel />
        </TabsContent>
        <TabsContent value="video" className="pt-6">
          <VideoPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BrandsPanel() {
  const { brands, saveBrand, deleteBrand, moveBrand } = useStore();
  const [newName, setNewName] = useState("");
  const [newLogo, setNewLogo] = useState("");

  const handleAdd = () => {
    const name = newName.trim();
    if (!name) {
      toast.error("Brand name daalen.");
      return;
    }
    saveBrand({
      id: "",
      name,
      logo: newLogo.trim() || null,
      enabled: true,
    });
    setNewName("");
    setNewLogo("");
    toast.success(`"${name}" brands bar mein add ho gaya!`);
  };

  return (
    <div className="space-y-6">
      {/* Add new brand */}
      <div className="rounded-xl border border-stone bg-card p-6 space-y-4">
        <h2 className="font-display text-xl">Naya Brand Add Karein</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="brand-name">Brand Name</Label>
            <Input
              id="brand-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Ray-Ban"
              className="min-h-11"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brand-logo">Logo URL (optional)</Label>
            <Input
              id="brand-logo"
              value={newLogo}
              onChange={(e) => setNewLogo(e.target.value)}
              placeholder="https://... ya khaali chhod dein"
              className="min-h-11"
            />
          </div>
        </div>
        {newLogo && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-ink-muted">Preview:</span>
            <img src={newLogo} alt="logo preview" className="h-8 object-contain" />
          </div>
        )}
        <Button className="min-h-11 rounded-full" onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Brand Add Karein
        </Button>
      </div>

      {/* Existing brands list */}
      {brands.length === 0 ? (
        <p className="text-sm text-ink-muted">Abhi koi brand nahi hai.</p>
      ) : (
        <div className="space-y-3">
          {brands.map((brand, i) => (
            <div
              key={brand.id}
              className="flex items-center gap-3 rounded-xl border border-stone bg-card px-5 py-3"
            >
              {/* Logo preview */}
              <div className="w-16 flex-shrink-0 flex items-center justify-center">
                {brand.logo ? (
                  <img src={brand.logo} alt={brand.name} className="h-7 object-contain" />
                ) : (
                  <span className="text-xs text-ink-muted font-display uppercase tracking-widest">
                    {brand.name}
                  </span>
                )}
              </div>

              <span className="flex-1 font-semibold text-sm truncate">{brand.name}</span>

              {/* Enable/Disable */}
              <Switch
                checked={brand.enabled}
                onCheckedChange={(v) => saveBrand({ ...brand, enabled: v })}
                aria-label={`${brand.name} enable/disable`}
              />

              {/* Move up/down */}
              <Button
                size="icon"
                variant="ghost"
                aria-label="Upar"
                disabled={i === 0}
                onClick={() => moveBrand(brand.id, -1)}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Neeche"
                disabled={i === brands.length - 1}
                onClick={() => moveBrand(brand.id, 1)}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>

              {/* Delete */}
              <Button
                size="icon"
                variant="ghost"
                aria-label="Delete"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  deleteBrand(brand.id);
                  toast.success(`"${brand.name}" delete ho gaya.`);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Live preview strip */}
      {brands.filter((b) => b.enabled).length > 0 && (
        <div className="rounded-xl border border-stone bg-card p-4 space-y-2">
          <p className="eyebrow text-ink-muted">Live Preview</p>
          <div
            style={{
              overflow: "hidden",
              WebkitMaskImage:
                "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
              maskImage:
                "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
            }}
          >
            <div className="marquee-track py-2">
              {[...brands.filter((b) => b.enabled), ...brands.filter((b) => b.enabled)].map(
                (b, i) => (
                  <span
                    key={`prev-${b.id}-${i}`}
                    className="px-8 font-display text-base uppercase tracking-widest opacity-60"
                  >
                    {b.name}
                  </span>
                ),
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AnnouncementPanel() {
  const { announcement, updateAnnouncement } = useStore();
  const [text, setText] = useState(announcement.messages.join("\n"));

  return (
    <div className="space-y-5 rounded-xl border border-stone bg-card p-6">
      <label className="flex min-h-11 items-center justify-between gap-4">
        <span className="text-sm font-semibold">Show the announcement bar</span>
        <Switch
          checked={announcement.enabled}
          onCheckedChange={(v) => updateAnnouncement({ enabled: v })}
        />
      </label>

      <div className="space-y-2">
        <Label htmlFor="a-messages">Messages (one per line)</Label>
        <Textarea
          id="a-messages"
          rows={5}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            updateAnnouncement({
              messages: e.target.value.split("\n").filter((m) => m.trim().length > 0),
            });
          }}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="a-bg">Background colour</Label>
          <Input
            id="a-bg"
            type="color"
            value={announcement.background}
            onChange={(e) => updateAnnouncement({ background: e.target.value })}
            className="h-11 w-full"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="a-fg">Text colour</Label>
          <Input
            id="a-fg"
            type="color"
            value={announcement.textColor}
            onChange={(e) => updateAnnouncement({ textColor: e.target.value })}
            className="h-11 w-full"
          />
        </div>
      </div>

      <div className="space-y-2">
        <p className="eyebrow text-ink-muted">Live preview</p>
        <div
          className="overflow-hidden rounded-md py-2 text-xs tracking-[0.14em] uppercase"
          style={{ backgroundColor: announcement.background, color: announcement.textColor }}
        >
          <div className="marquee-track whitespace-nowrap">
            {[...announcement.messages, ...announcement.messages].map((m, i) => (
              <span key={`${m}-${i}`} className="px-6">
                {m} •
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroPanel() {
  const { heroSlides, updateHeroSlide, moveHeroSlide } = useStore();

  return (
    <div className="space-y-4">
      {heroSlides.map((slide, i) => (
        <div key={slide.id} className="space-y-4 rounded-xl border border-stone bg-card p-6">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <h2 className="truncate font-display text-xl">Slide {i + 1}</h2>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                aria-label="Move slide up"
                disabled={i === 0}
                onClick={() => moveHeroSlide(slide.id, -1)}
              >
                <ArrowUp className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Move slide down"
                disabled={i === heroSlides.length - 1}
                onClick={() => moveHeroSlide(slide.id, 1)}
              >
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Switch
                checked={slide.enabled}
                onCheckedChange={(v) => updateHeroSlide(slide.id, { enabled: v })}
              />
            </div>
          </div>

          <ImageUpload
            label="Slide image"
            value={slide.image}
            onChange={(img) => updateHeroSlide(slide.id, { image: img ?? slide.image })}
          />

          <p className="text-xs text-ink-muted">
            💡 <strong>Image-only banner tip:</strong> Agar aap text fields (Headline, Eyebrow, Subtext, CTA) khali chhodenge to storefront par bina kisi dark overlay ke pure full-image banner show hoga.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`h-eyebrow-${slide.id}`}>Eyebrow label (Optional)</Label>
              <Input
                id={`h-eyebrow-${slide.id}`}
                value={slide.eyebrow}
                placeholder="Optional"
                onChange={(e) => updateHeroSlide(slide.id, { eyebrow: e.target.value })}
                className="min-h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`h-headline-${slide.id}`}>Headline (Optional)</Label>
              <Input
                id={`h-headline-${slide.id}`}
                value={slide.headline}
                placeholder="Optional — khali chhodne par sirf image dikhegi"
                onChange={(e) => updateHeroSlide(slide.id, { headline: e.target.value })}
                className="min-h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`h-sub-${slide.id}`}>Subtext (Optional)</Label>
              <Input
                id={`h-sub-${slide.id}`}
                value={slide.subtext}
                placeholder="Optional"
                onChange={(e) => updateHeroSlide(slide.id, { subtext: e.target.value })}
                className="min-h-11"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor={`h-cta-${slide.id}`}>CTA button text (Optional)</Label>
                <Input
                  id={`h-cta-${slide.id}`}
                  value={slide.ctaText}
                  placeholder="Optional"
                  onChange={(e) => updateHeroSlide(slide.id, { ctaText: e.target.value })}
                  className="min-h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`h-link-${slide.id}`}>Banner / CTA link (Optional)</Label>
                <Input
                  id={`h-link-${slide.id}`}
                  value={slide.ctaLink}
                  placeholder="e.g. /glasses (pure image par click se ye open hoga)"
                  onChange={(e) => updateHeroSlide(slide.id, { ctaLink: e.target.value })}
                  className="min-h-11"
                />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function BannerPanel() {
  const { categories, saveCategory } = useStore();

  return (
    <div className="space-y-4">
      {categories.map((c) => {
        const banner = c.banner ?? {
          image: "",
          heading: "",
          subtext: "",
          ctaText: "Shop Now",
          ctaLink: `/${c.slug}`,
        };
        const patch = (next: Partial<typeof banner>) =>
          saveCategory({ ...c, banner: { ...banner, ...next } });

        return (
          <div key={c.id} className="space-y-4 rounded-xl border border-stone bg-card p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl">{c.name} Category & Banner</h2>
              <span className="text-xs text-ink-muted">Slug: /{c.slug}</span>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <ImageUpload
                label="Category Icon / Avatar (Circle shown on Homepage)"
                value={c.image || null}
                onChange={(img) => saveCategory({ ...c, image: img })}
              />
              <ImageUpload
                label="Category Banner Image"
                value={banner.image || null}
                onChange={(img) => patch({ image: img ?? "" })}
              />
            </div>
            <p className="text-xs text-ink-muted">
              💡 <strong>Tip:</strong> Heading aur Subtext optional hain. Agar inko khali chhodenge to category page par clean image banner dikhega.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`b-head-${c.id}`}>Heading (Optional)</Label>
                <Input
                  id={`b-head-${c.id}`}
                  value={banner.heading}
                  placeholder="Optional — khali chhodne par sirf image dikhegi"
                  onChange={(e) => patch({ heading: e.target.value })}
                  className="min-h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`b-sub-${c.id}`}>Subtext (Optional)</Label>
                <Input
                  id={`b-sub-${c.id}`}
                  value={banner.subtext}
                  placeholder="Optional"
                  onChange={(e) => patch({ subtext: e.target.value })}
                  className="min-h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`b-cta-${c.id}`}>CTA text (Optional)</Label>
                <Input
                  id={`b-cta-${c.id}`}
                  value={banner.ctaText}
                  placeholder="Optional"
                  onChange={(e) => patch({ ctaText: e.target.value })}
                  className="min-h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`b-link-${c.id}`}>CTA link (Optional)</Label>
                <Input
                  id={`b-link-${c.id}`}
                  value={banner.ctaLink}
                  placeholder={`/${c.slug}`}
                  onChange={(e) => patch({ ctaLink: e.target.value })}
                  className="min-h-11"
                />
              </div>
            </div>
            {c.banner && (
              <Button
                variant="ghost"
                className="min-h-11"
                onClick={() => {
                  saveCategory({ ...c, banner: null });
                  toast.success(`${c.name} banner removed.`);
                }}
              >
                Remove banner
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function VideoPanel() {
  const { video, lockChannel, submitVideoUrl, updateVideoCaption } = useStore();
  const [url, setUrl] = useState(video.videoUrl);
  const [channel, setChannel] = useState(video.lockedChannel);
  const [error, setError] = useState("");

  return (
    <div className="space-y-4">
      <div className="space-y-4 rounded-xl border border-stone bg-card p-6">
        <h2 className="font-display text-xl">Warehouse video</h2>
        <div className="space-y-2">
          <Label htmlFor="v-url">YouTube video URL</Label>
          <Input
            id="v-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=... (from the approved channel)"
            className="min-h-11"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          {!video.lockedChannel && (
            <p className="text-xs text-ink-muted">
              No channel is locked yet — a video won't go live until you lock an approved channel
              below. The public video section stays as a placeholder in the meantime.
            </p>
          )}
        </div>
        <Button
          className="min-h-11 rounded-full"
          onClick={() => {
            const result = submitVideoUrl(url);
            if (result.ok) {
              setError("");
              toast.success("Video published to Home and About.");
            } else {
              setError(result.error ?? "Something went wrong.");
            }
          }}
        >
          Publish video
        </Button>

        <div className="space-y-2">
          <Label htmlFor="v-caption">Caption</Label>
          <Textarea
            id="v-caption"
            rows={3}
            value={video.caption}
            onChange={(e) => updateVideoCaption(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-gold/40 bg-card p-6">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-gold" />
          <h2 className="font-display text-xl">Locked channel</h2>
        </div>
        <p className="text-sm text-ink-muted">
          Only videos from this YouTube channel handle can be published. Current:{" "}
          <strong>{video.lockedChannel || "not set"}</strong>
        </p>
        <div className="space-y-2">
          <Label htmlFor="v-channel">Channel handle</Label>
          <Input
            id="v-channel"
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            placeholder="@optiqueeyewear"
            className="min-h-11"
          />
        </div>
        <Button
          variant="outline"
          className="min-h-11 rounded-full"
          onClick={() => {
            if (!channel.trim().startsWith("@")) {
              toast.error("Enter the channel handle, starting with @.");
              return;
            }
            if (
              confirm(`Lock the approved channel to ${channel.trim()}? This is a sensitive change.`)
            ) {
              lockChannel(channel.trim());
              toast.success("Approved channel locked.");
            }
          }}
        >
          Lock channel
        </Button>
      </div>
    </div>
  );
}

function SocialPlatformBadge({ platform }: { platform: string }) {
  switch (platform) {
    case "instagram":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] px-2.5 py-1 text-xs font-semibold text-white shadow-xs">
          <svg className="h-3 w-3 fill-current" viewBox="0 0 24 24">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
          </svg>
          <span>Instagram</span>
        </span>
      );
    case "tiktok":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-black px-2.5 py-1 text-xs font-semibold text-white shadow-xs border border-zinc-700">
          <svg className="h-3 w-3 fill-current" viewBox="0 0 24 24">
            <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
          </svg>
          <span>TikTok</span>
        </span>
      );
    case "youtube":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FF0000] px-2.5 py-1 text-xs font-semibold text-white shadow-xs">
          <svg className="h-3 w-3 fill-current" viewBox="0 0 24 24">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
          <span>YouTube</span>
        </span>
      );
    case "facebook":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1877F2] px-2.5 py-1 text-xs font-semibold text-white shadow-xs">
          <span>Facebook</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800 text-zinc-200 px-2.5 py-1 text-xs font-semibold shadow-xs">
          <span className="capitalize">{platform}</span>
        </span>
      );
  }
}

function SocialReelsPanel() {
  const { socialReels, products, saveSocialReel, deleteSocialReel, moveSocialReel } = useStore();
  const [draft, setDraft] = useState<SocialReel | null>(null);

  const blankReel: SocialReel = {
    id: "",
    title: "",
    creatorName: "",
    creatorHandle: "",
    platform: "instagram",
    videoUrl: "",
    thumbnail: "",
    duration: "00:30",
    productId: null,
    enabled: true,
  };

  const handleSave = () => {
    if (!draft) return;
    if (!draft.title.trim()) {
      toast.error("Reel title/caption is required.");
      return;
    }
    if (!draft.thumbnail.trim()) {
      toast.error("Please upload or provide a thumbnail image for the reel.");
      return;
    }
    const imgCheck = validateImageUrl(draft.thumbnail);
    if (!imgCheck.valid) {
      toast.error(imgCheck.error || "Invalid thumbnail image.");
      return;
    }
    if (!draft.videoUrl.trim()) {
      toast.error("Video URL link is required.");
      return;
    }
    const videoCheck = validateSocialVideoUrl(draft.videoUrl, draft.platform);
    if (!videoCheck.valid) {
      toast.error(videoCheck.error || "Invalid video URL link.");
      return;
    }
    if (
      !window.confirm(
        "Aap is reel ko save karna chahte hain? (Are you sure you want to save this reel?)",
      )
    ) {
      return;
    }

    saveSocialReel({
      ...draft,
      id: draft.id || newId("reel"),
      videoUrl: videoCheck.sanitizedUrl || draft.videoUrl.trim(),
      platform: videoCheck.platform || draft.platform,
      creatorHandle:
        draft.creatorHandle?.trim().startsWith("@") || !draft.creatorHandle?.trim()
          ? (draft.creatorHandle?.trim() ?? "")
          : `@${draft.creatorHandle.trim()}`,
    });

    setDraft(null);
    toast.success("Social Proof Reel saved successfully!");
  };

  return (
    <div className="space-y-6">
      {/* Header info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl">Social Proof & Collaboration Reels</h2>
          <p className="text-xs text-ink-muted mt-1">
            Display scrollable UGC creator reels (Instagram, TikTok, YouTube Shorts, Facebook) on
            the homepage with custom thumbnails and product tags.
          </p>
        </div>
        <Button
          className="min-h-11 rounded-full shrink-0"
          onClick={() => setDraft({ ...blankReel })}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Reel
        </Button>
      </div>

      {/* Reels List / Table */}
      {socialReels.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone p-12 text-center bg-card">
          <Film className="h-10 w-10 mx-auto text-ink-muted opacity-40 mb-3" />
          <p className="font-display text-lg">No reels added yet</p>
          <p className="text-xs text-ink-muted mt-1 mb-4">
            Add Instagram reels, TikTok videos, or YouTube Shorts to showcase social proof on your
            homepage.
          </p>
          <Button className="min-h-11 rounded-full" onClick={() => setDraft({ ...blankReel })}>
            <Plus className="h-4 w-4 mr-2" /> Add First Reel
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#666666] bg-[#f9f9f9] shadow-sm">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="border-b-2 border-[#555555] bg-[#666666] text-left text-xs tracking-[0.14em] uppercase text-white">
              <tr>
                <th className="px-4 py-3 text-white font-semibold">Thumbnail / Duration</th>
                <th className="px-4 py-3 text-white font-semibold">Creator & Title</th>
                <th className="px-4 py-3 text-white font-semibold">Platform</th>
                <th className="px-4 py-3 text-white font-semibold">Tagged Product</th>
                <th className="px-4 py-3 text-center text-white font-semibold">Live Status</th>
                <th className="px-4 py-3 text-right text-white font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-300 bg-[#f9f9f9]">
              {socialReels.map((reel, index) => {
                const product = reel.productId
                  ? products.find((p) => p.id === reel.productId)
                  : null;

                return (
                  <tr key={reel.id} className="hover:bg-zinc-200/80 transition-colors">
                    {/* Thumbnail */}
                    <td className="px-4 py-3">
                      <div className="relative w-14 aspect-[9/16] rounded-lg overflow-hidden border border-stone bg-jet shadow-xs">
                        <img src={reel.thumbnail} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <Play className="h-3.5 w-3.5 text-white fill-current" />
                        </div>
                        {reel.duration && (
                          <span className="absolute bottom-0.5 right-0.5 text-[8px] bg-black/80 font-mono text-white px-1 rounded">
                            {reel.duration}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Creator & Title */}
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground text-sm truncate max-w-xs">
                        {reel.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-ink-muted">
                          {reel.creatorName || "Anonymous"}
                        </span>
                        {reel.creatorHandle && (
                          <span className="text-[11px] font-mono text-gold-soft">
                            {reel.creatorHandle}
                          </span>
                        )}
                      </div>
                      {reel.videoUrl && (
                        <a
                          href={sanitizeHref(reel.videoUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-ink-muted hover:text-gold mt-1 font-mono truncate max-w-[200px]"
                        >
                          <ExternalLink className="h-2.5 w-2.5" />
                          <span className="truncate">{reel.videoUrl}</span>
                        </a>
                      )}
                    </td>

                    {/* Platform */}
                    <td className="px-4 py-3">
                      <SocialPlatformBadge platform={reel.platform} />
                    </td>

                    {/* Tagged Product */}
                    <td className="px-4 py-3">
                      {product ? (
                        <div className="flex items-center gap-2">
                          <img
                            src={product.image}
                            alt=""
                            className="h-7 w-7 rounded object-cover border border-stone"
                          />
                          <div className="min-w-0 max-w-[140px]">
                            <p className="text-xs font-semibold truncate">{product.name}</p>
                            <p className="text-[10px] text-gold font-bold">
                              {formatPrice(product.salePrice ?? product.price)}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-ink-muted">—</span>
                      )}
                    </td>

                    {/* Live Status Switch */}
                    <td className="px-4 py-3 text-center">
                      <Switch
                        checked={reel.enabled}
                        onCheckedChange={(v) => saveSocialReel({ ...reel, enabled: v })}
                        aria-label={`Enable ${reel.title}`}
                      />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={index === 0}
                          onClick={() => moveSocialReel(reel.id, -1)}
                          aria-label="Move Up"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={index === socialReels.length - 1}
                          onClick={() => moveSocialReel(reel.id, 1)}
                          aria-label="Move Down"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDraft(reel)}
                          aria-label="Edit Reel"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            if (confirm(`Delete reel "${reel.title}"?`)) {
                              deleteSocialReel(reel.id);
                              toast.success("Reel deleted.");
                            }
                          }}
                          aria-label="Delete Reel"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Reel Add / Edit Dialog */}
      <Dialog open={!!draft} onOpenChange={(v) => !v && setDraft(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {draft && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">
                  {draft.id ? "Edit Social Proof Reel" : "Add New Social Proof Reel"}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="r-title">Reel Caption / Review Title *</Label>
                  <Input
                    id="r-title"
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    placeholder="e.g. Unboxing Classic Aviators in Jet Black"
                    className="min-h-11"
                  />
                </div>

                {/* Creator info */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="r-creator">Creator / Customer Name</Label>
                    <Input
                      id="r-creator"
                      value={draft.creatorName || ""}
                      onChange={(e) => setDraft({ ...draft, creatorName: e.target.value })}
                      placeholder="e.g. Ayesha Tariq"
                      className="min-h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="r-handle">Social Handle (Username)</Label>
                    <Input
                      id="r-handle"
                      value={draft.creatorHandle || ""}
                      onChange={(e) => setDraft({ ...draft, creatorHandle: e.target.value })}
                      placeholder="e.g. @ayesha.style"
                      className="min-h-11 font-mono text-sm"
                    />
                  </div>
                </div>

                {/* Platform & Duration */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="r-platform">Social Platform</Label>
                    <Select
                      value={draft.platform}
                      onValueChange={(v) => setDraft({ ...draft, platform: v as SocialPlatform })}
                    >
                      <SelectTrigger id="r-platform" className="min-h-11">
                        <SelectValue placeholder="Select platform" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="instagram">Instagram Reel</SelectItem>
                        <SelectItem value="tiktok">TikTok Video</SelectItem>
                        <SelectItem value="youtube">YouTube Shorts</SelectItem>
                        <SelectItem value="facebook">Facebook Reel</SelectItem>
                        <SelectItem value="custom">Direct Video / Custom Link</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="r-duration">Duration (e.g. 00:39)</Label>
                    <Input
                      id="r-duration"
                      value={draft.duration || ""}
                      onChange={(e) => setDraft({ ...draft, duration: e.target.value })}
                      placeholder="00:39"
                      className="min-h-11 font-mono text-sm"
                    />
                  </div>
                </div>

                {/* Video URL */}
                <div className="space-y-2">
                  <Label htmlFor="r-url">
                    Video Link / URL (Instagram, TikTok, YouTube Shorts, MP4)
                  </Label>
                  <Input
                    id="r-url"
                    value={draft.videoUrl}
                    onChange={(e) => setDraft({ ...draft, videoUrl: e.target.value })}
                    placeholder="https://www.youtube.com/shorts/... ya insta/tiktok link"
                    className="min-h-11 font-mono text-xs"
                  />
                  <p className="text-[11px] text-ink-muted">
                    Paste the reel link from Instagram, TikTok, YouTube Shorts, Facebook, or a
                    direct .mp4 video URL.
                  </p>
                </div>

                {/* Thumbnail Image */}
                <div className="space-y-2">
                  <ImageUpload
                    label="Reel Vertical Thumbnail Image *"
                    value={draft.thumbnail || null}
                    onChange={(img) => setDraft({ ...draft, thumbnail: img ?? "" })}
                  />
                  <p className="text-[11px] text-ink-muted">
                    This vertical image will be displayed on the homepage scrollable reels track.
                  </p>
                </div>

                {/* Tagged Product */}
                <div className="space-y-2">
                  <Label htmlFor="r-product">Tag a Product (Optional - "Shop This Look")</Label>
                  <Select
                    value={draft.productId || "none"}
                    onValueChange={(v) =>
                      setDraft({ ...draft, productId: v === "none" ? null : v })
                    }
                  >
                    <SelectTrigger id="r-product" className="min-h-11">
                      <SelectValue placeholder="Select a product to tag" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No product tagged</SelectItem>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({formatPrice(p.salePrice ?? p.price)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Enable / Disable */}
                <label className="flex items-center justify-between rounded-lg border border-stone p-3 cursor-pointer">
                  <span className="text-sm font-semibold">Publish & Show on Homepage</span>
                  <Switch
                    checked={draft.enabled}
                    onCheckedChange={(v) => setDraft({ ...draft, enabled: v })}
                  />
                </label>

                {/* Save Button */}
                <Button className="min-h-11 w-full rounded-full" onClick={handleSave}>
                  Save Reel
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
