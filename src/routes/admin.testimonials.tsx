import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Mail,
  Pencil,
  Plus,
  Star,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { ImageUpload } from "@/components/admin/ImageUpload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { newId, useStore } from "@/lib/store";
import type { Testimonial } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/testimonials")({
  component: AdminTestimonials,
});

const blank = (): Testimonial => ({
  id: "",
  name: "",
  email: "",
  productId: null,
  productName: "",
  title: "",
  quote: "",
  rating: 5,
  photo: null,
  reviewImage: null,
  verified: true,
  createdAt: new Date().toISOString(),
});

function AdminTestimonials() {
  const { testimonials, saveTestimonial, deleteTestimonial, moveTestimonial, products } =
    useStore();
  const [draft, setDraft] = useState<Testimonial | null>(null);
  const [filterTab, setFilterTab] = useState<"all" | "good" | "bad" | "product">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Statistics calculation
  const totalCount = testimonials.length;
  const goodReviews = useMemo(() => testimonials.filter((t) => t.rating >= 4), [testimonials]);
  const badReviews = useMemo(() => testimonials.filter((t) => t.rating < 4), [testimonials]);
  const avgRating = useMemo(() => {
    if (totalCount === 0) return "5.0";
    const sum = testimonials.reduce((acc, t) => acc + t.rating, 0);
    return (sum / totalCount).toFixed(1);
  }, [testimonials, totalCount]);

  // Filtered reviews list
  const filteredList = useMemo(() => {
    return testimonials.filter((t) => {
      // Tab filter
      if (filterTab === "good" && t.rating < 4) return false;
      if (filterTab === "bad" && t.rating >= 4) return false;
      if (filterTab === "product" && !t.productId) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = t.name.toLowerCase().includes(q);
        const matchesEmail = t.email ? t.email.toLowerCase().includes(q) : false;
        const matchesProduct = t.productName ? t.productName.toLowerCase().includes(q) : false;
        const matchesQuote = t.quote.toLowerCase().includes(q);
        return matchesName || matchesEmail || matchesProduct || matchesQuote;
      }

      return true;
    });
  }, [testimonials, filterTab, searchQuery]);

  return (
    <div className="space-y-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <div className="min-w-0">
          <p className="eyebrow text-gold">Social Proof & Feedback</p>
          <h1 className="mt-2 font-display text-3xl">Customer Reviews & Testimonials</h1>
          <p className="text-xs text-ink-muted mt-1">
            Manage product reviews, customer emails, star ratings, and homepage social proof
            testimonials.
          </p>
        </div>
        <Button className="min-h-11 shrink-0 rounded-full" onClick={() => setDraft(blank())}>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> Add Manual Review
        </Button>
      </header>

      {/* ── Top Metric Cards (Good vs Bad Reviews) ── */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-stone bg-card p-4">
          <p className="text-xs text-ink-muted uppercase font-semibold">Total Reviews</p>
          <p className="mt-2 font-display text-3xl">{totalCount}</p>
          <p className="text-[11px] text-ink-muted mt-1">Average: ★ {avgRating} / 5</p>
        </div>

        <div
          onClick={() => setFilterTab("good")}
          className={cn(
            "rounded-xl border p-4 cursor-pointer transition-all",
            filterTab === "good"
              ? "border-emerald-500 bg-emerald-50/20 ring-2 ring-emerald-500/20"
              : "border-stone bg-card hover:border-emerald-400/60",
          )}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs text-emerald-700 font-semibold uppercase">Good Reviews (4-5 ★)</p>
            <ThumbsUp className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 font-display text-3xl text-emerald-600">{goodReviews.length}</p>
          <p className="text-[11px] text-emerald-700/80 mt-1">
            {totalCount > 0 ? Math.round((goodReviews.length / totalCount) * 100) : 0}% Satisfaction
            Rate
          </p>
        </div>

        <div
          onClick={() => setFilterTab("bad")}
          className={cn(
            "rounded-xl border p-4 cursor-pointer transition-all",
            filterTab === "bad"
              ? "border-amber-500 bg-amber-50/20 ring-2 ring-amber-500/20"
              : "border-stone bg-card hover:border-amber-400/60",
          )}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs text-amber-700 font-semibold uppercase">
              Bad / Low Reviews (1-3 ★)
            </p>
            <ThumbsDown className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 font-display text-3xl text-amber-600">{badReviews.length}</p>
          <p className="text-[11px] text-amber-700/80 mt-1">Requires attention / cleanup</p>
        </div>

        <div className="rounded-xl border border-stone bg-card p-4">
          <p className="text-xs text-ink-muted uppercase font-semibold">Captured Customer Emails</p>
          <p className="mt-2 font-display text-3xl text-gold">
            {testimonials.filter((t) => t.email).length}
          </p>
          <p className="text-[11px] text-ink-muted mt-1">Verified submitters</p>
        </div>
      </div>

      {/* ── Filter Bar & Search ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-card p-3 rounded-xl border border-stone">
        <div className="flex items-center gap-1 overflow-x-auto">
          <Button
            size="sm"
            variant={filterTab === "all" ? "default" : "ghost"}
            onClick={() => setFilterTab("all")}
            className="rounded-full text-xs"
          >
            All ({totalCount})
          </Button>
          <Button
            size="sm"
            variant={filterTab === "good" ? "default" : "ghost"}
            onClick={() => setFilterTab("good")}
            className="rounded-full text-xs text-emerald-700"
          >
            <ThumbsUp className="mr-1 h-3.5 w-3.5" /> Good ({goodReviews.length})
          </Button>
          <Button
            size="sm"
            variant={filterTab === "bad" ? "default" : "ghost"}
            onClick={() => setFilterTab("bad")}
            className="rounded-full text-xs text-amber-700"
          >
            <ThumbsDown className="mr-1 h-3.5 w-3.5" /> Low Rating ({badReviews.length})
          </Button>
          <Button
            size="sm"
            variant={filterTab === "product" ? "default" : "ghost"}
            onClick={() => setFilterTab("product")}
            className="rounded-full text-xs"
          >
            Product Specific
          </Button>
        </div>

        <Input
          placeholder="Search by customer name, email, or quote..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs h-9 text-xs"
        />
      </div>

      {/* ── Review Entries List ── */}
      {filteredList.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone bg-card px-6 py-16 text-center text-sm text-ink-muted">
          No customer reviews match your filter or search query.
        </p>
      ) : (
        <ul className="space-y-3">
          {filteredList.map((t, i) => {
            const isBad = t.rating < 4;
            const originalIndex = testimonials.findIndex((x) => x.id === t.id);

            return (
              <li
                key={t.id}
                className={cn(
                  "grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-4 rounded-xl border p-5 transition-all",
                  isBad ? "border-amber-300/80 bg-amber-50/10" : "border-stone bg-card",
                )}
              >
                {/* Position / Index Number */}
                <div className="flex flex-col items-center justify-center pt-1 shrink-0">
                  <span className="h-7 w-7 rounded-full bg-mist border border-stone text-xs font-mono font-bold flex items-center justify-center text-ink-muted">
                    #{originalIndex + 1}
                  </span>
                </div>

                {/* Review Details */}
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-foreground">{t.name}</h3>

                    {/* Customer Email display (Requested) */}
                    {t.email ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-2 py-0.5 text-xs text-ink-muted border border-stone font-mono">
                        <Mail className="h-3 w-3 text-gold" /> {t.email}
                      </span>
                    ) : (
                      <span className="text-[11px] text-ink-muted italic">(No email provided)</span>
                    )}

                    {/* Star Rating */}
                    <span className="flex items-center gap-0.5 ml-1">
                      {Array.from({ length: 5 }).map((_, s) => (
                        <Star
                          key={s}
                          className={cn(
                            "h-3.5 w-3.5",
                            s < t.rating ? "fill-amber-400 text-amber-400" : "text-stone-300",
                          )}
                        />
                      ))}
                      <span className="text-xs font-bold ml-1">{t.rating}.0</span>
                    </span>

                    {/* Bad vs Good Tag */}
                    {isBad ? (
                      <Badge
                        variant="outline"
                        className="text-[10px] text-amber-700 border-amber-400 bg-amber-50"
                      >
                        Low Rating
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-[10px] text-emerald-700 border-emerald-400 bg-emerald-50"
                      >
                        Good Review
                      </Badge>
                    )}

                    {t.productName && (
                      <span className="rounded-full bg-gold/10 text-gold px-2.5 py-0.5 text-[10px] font-semibold border border-gold/30">
                        Product: {t.productName}
                      </span>
                    )}
                  </div>

                  {t.title && <h4 className="text-sm font-semibold text-ink pt-0.5">{t.title}</h4>}
                  <p className="text-sm text-ink-muted line-clamp-3">“{t.quote}”</p>

                  {/* Customer Uploaded Photo Preview */}
                  {t.reviewImage && (
                    <div className="pt-2 flex items-center gap-2">
                      <div className="h-14 w-14 rounded-lg overflow-hidden border border-stone bg-jet shrink-0 shadow-xs">
                        <img src={t.reviewImage} alt="" className="h-full w-full object-cover" />
                      </div>
                      <span className="text-[11px] text-ink-muted">
                        Customer Photo / Screenshot attached
                      </span>
                    </div>
                  )}

                  {t.createdAt && (
                    <p className="text-[10px] text-ink-muted pt-1">
                      Submitted on: {new Date(t.createdAt).toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Actions: Re-order numbering, Edit, Delete */}
                <div className="flex shrink-0 gap-1 items-center">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Move up"
                    disabled={originalIndex === 0}
                    onClick={() => moveTestimonial(t.id, -1)}
                    title="Move up (change ordering)"
                  >
                    <ArrowUp className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Move down"
                    disabled={originalIndex === testimonials.length - 1}
                    onClick={() => moveTestimonial(t.id, 1)}
                    title="Move down (change ordering)"
                  >
                    <ArrowDown className="h-4 w-4" aria-hidden="true" />
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Edit"
                    onClick={() => setDraft(t)}
                    title="Edit Review"
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </Button>

                  {/* Delete Review button (Requested) */}
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Delete"
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete the review from ${t.name}?`)) {
                        deleteTestimonial(t.id);
                        toast.success("Review deleted successfully from website.");
                      }
                    }}
                    title="Delete from website"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* ── Add / Edit Review Modal ── */}
      <Dialog open={!!draft} onOpenChange={(v) => !v && setDraft(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg">
          {draft && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">
                  {draft.id ? "Edit Customer Review" : "Add Customer Review"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="t-name">Customer Name *</Label>
                  <Input
                    id="t-name"
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    placeholder="e.g. Kristin Watson"
                    className="min-h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="t-email">Customer Email Address</Label>
                  <Input
                    id="t-email"
                    type="email"
                    value={draft.email || ""}
                    onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                    placeholder="e.g. kristin@example.com"
                    className="min-h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="t-product">Associated Product (Optional)</Label>
                  <select
                    id="t-product"
                    value={draft.productId || "none"}
                    onChange={(e) => {
                      const pId = e.target.value === "none" ? null : e.target.value;
                      const selectedP = products.find((p) => p.id === pId);
                      setDraft({
                        ...draft,
                        productId: pId,
                        productName: selectedP ? selectedP.name : "",
                      });
                    }}
                    className="w-full rounded-md border border-stone bg-card p-2.5 text-sm"
                  >
                    <option value="none">— General Site Testimonial —</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku || p.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="t-title">Review Headline / Summary</Label>
                  <Input
                    id="t-title"
                    value={draft.title || ""}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    placeholder="e.g. Love It: My Recent Eyewear Purchase"
                    className="min-h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="t-quote">Customer Quote / Review Message *</Label>
                  <Textarea
                    id="t-quote"
                    rows={4}
                    value={draft.quote}
                    onChange={(e) => setDraft({ ...draft, quote: e.target.value })}
                    placeholder="Write customer review..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="t-rating">Rating (1–5 Stars)</Label>
                  <Input
                    id="t-rating"
                    type="number"
                    min={1}
                    max={5}
                    value={draft.rating}
                    onChange={(e) => setDraft({ ...draft, rating: Number(e.target.value) })}
                    className="min-h-11"
                  />
                </div>

                {/* Review Screenshot / Proof Image */}
                <div className="space-y-2">
                  <ImageUpload
                    label="Customer Photo or Review Screenshot"
                    optional
                    value={draft.reviewImage || draft.photo || null}
                    onChange={(img) => setDraft({ ...draft, reviewImage: img, photo: img })}
                  />
                  <p className="text-[11px] text-ink-muted">
                    💡 Screenshot upload karne par ye storefront review section par proof card ke tor par display hoga.
                  </p>
                </div>

                <Button
                  className="min-h-11 w-full rounded-full"
                  onClick={() => {
                    if (!draft.name.trim()) {
                      toast.error("Customer name is required.");
                      return;
                    }
                    if (!draft.quote.trim()) {
                      toast.error("Please provide review text.");
                      return;
                    }
                    if (
                      !window.confirm(
                        "Aap is review/testimonial ko save karna chahte hain? (Are you sure you want to save this review?)",
                      )
                    ) {
                      return;
                    }
                    const finalImg = draft.reviewImage || draft.photo || null;
                    saveTestimonial({
                      ...draft,
                      id: draft.id || newId("tst"),
                      quote: draft.quote.trim(),
                      photo: finalImg,
                      reviewImage: finalImg,
                      createdAt: draft.createdAt || new Date().toISOString(),
                    });
                    setDraft(null);
                    toast.success("Review saved successfully.");
                  }}
                >
                  Save Review
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
