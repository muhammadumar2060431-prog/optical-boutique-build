import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Lock } from "lucide-react";
import { toast } from "sonner";

import { ImageUpload } from "@/components/admin/ImageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/lib/store";

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

      <Tabs defaultValue="announcement">
        <TabsList className="flex-wrap">
          <TabsTrigger value="announcement">Announcement</TabsTrigger>
          <TabsTrigger value="hero">Hero slides</TabsTrigger>
          <TabsTrigger value="banners">Category banners</TabsTrigger>
          <TabsTrigger value="video">Video</TabsTrigger>
        </TabsList>
        <TabsContent value="announcement" className="pt-6">
          <AnnouncementPanel />
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`h-eyebrow-${slide.id}`}>Eyebrow label</Label>
              <Input
                id={`h-eyebrow-${slide.id}`}
                value={slide.eyebrow}
                onChange={(e) => updateHeroSlide(slide.id, { eyebrow: e.target.value })}
                className="min-h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`h-headline-${slide.id}`}>Headline</Label>
              <Input
                id={`h-headline-${slide.id}`}
                value={slide.headline}
                onChange={(e) => updateHeroSlide(slide.id, { headline: e.target.value })}
                className="min-h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`h-sub-${slide.id}`}>Subtext</Label>
              <Input
                id={`h-sub-${slide.id}`}
                value={slide.subtext}
                onChange={(e) => updateHeroSlide(slide.id, { subtext: e.target.value })}
                className="min-h-11"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor={`h-cta-${slide.id}`}>CTA text</Label>
                <Input
                  id={`h-cta-${slide.id}`}
                  value={slide.ctaText}
                  onChange={(e) => updateHeroSlide(slide.id, { ctaText: e.target.value })}
                  className="min-h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`h-link-${slide.id}`}>CTA link</Label>
                <Input
                  id={`h-link-${slide.id}`}
                  value={slide.ctaLink}
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
            <h2 className="font-display text-xl">{c.name} banner</h2>
            <ImageUpload
              label="Banner image"
              value={banner.image || null}
              onChange={(img) => patch({ image: img ?? "" })}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`b-head-${c.id}`}>Heading</Label>
                <Input
                  id={`b-head-${c.id}`}
                  value={banner.heading}
                  onChange={(e) => patch({ heading: e.target.value })}
                  className="min-h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`b-sub-${c.id}`}>Subtext</Label>
                <Input
                  id={`b-sub-${c.id}`}
                  value={banner.subtext}
                  onChange={(e) => patch({ subtext: e.target.value })}
                  className="min-h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`b-cta-${c.id}`}>CTA text</Label>
                <Input
                  id={`b-cta-${c.id}`}
                  value={banner.ctaText}
                  onChange={(e) => patch({ ctaText: e.target.value })}
                  className="min-h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`b-link-${c.id}`}>CTA link</Label>
                <Input
                  id={`b-link-${c.id}`}
                  value={banner.ctaLink}
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
            if (confirm(`Lock the approved channel to ${channel.trim()}? This is a sensitive change.`)) {
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
