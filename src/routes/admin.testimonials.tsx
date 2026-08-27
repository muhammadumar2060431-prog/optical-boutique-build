import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ImageUpload } from "@/components/admin/ImageUpload";
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

const blank = (): Testimonial => ({ id: "", name: "", quote: "", rating: 5, photo: null });

function AdminTestimonials() {
  const { testimonials, saveTestimonial, deleteTestimonial, moveTestimonial } = useStore();
  const [draft, setDraft] = useState<Testimonial | null>(null);

  return (
    <div className="space-y-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <div className="min-w-0">
          <p className="eyebrow text-gold">Social proof</p>
          <h1 className="mt-2 font-display text-3xl">Testimonials</h1>
        </div>
        <Button className="min-h-11 shrink-0 rounded-full" onClick={() => setDraft(blank())}>
          <Plus className="mr-2 h-4 w-4" /> Add
        </Button>
      </header>

      {testimonials.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone bg-card px-6 py-16 text-center text-sm text-ink-muted">
          No testimonials yet — add a customer quote to show it on the home page.
        </p>
      ) : (
        <ul className="space-y-3">
          {testimonials.map((t, i) => (
            <li
              key={t.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 rounded-xl border border-stone bg-card p-5"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold">{t.name}</p>
                  <span className="flex">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star
                        key={s}
                        className={cn("h-3 w-3", s < t.rating ? "fill-gold text-gold" : "text-stone")}
                      />
                    ))}
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink-muted">{t.quote}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Move up"
                  disabled={i === 0}
                  onClick={() => moveTestimonial(t.id, -1)}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Move down"
                  disabled={i === testimonials.length - 1}
                  onClick={() => moveTestimonial(t.id, 1)}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => setDraft(t)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Delete"
                  onClick={() => {
                    if (confirm(`Delete the testimonial from ${t.name}?`)) {
                      deleteTestimonial(t.id);
                      toast.success("Testimonial deleted.");
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!draft} onOpenChange={(v) => !v && setDraft(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          {draft && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">
                  {draft.id ? "Edit testimonial" : "New testimonial"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="t-name">Customer name</Label>
                  <Input
                    id="t-name"
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    className="min-h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="t-quote">Quote</Label>
                  <Textarea
                    id="t-quote"
                    rows={4}
                    value={draft.quote}
                    onChange={(e) => setDraft({ ...draft, quote: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="t-rating">Rating (1–5)</Label>
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
                <ImageUpload
                  label="Photo"
                  optional
                  value={draft.photo}
                  onChange={(photo) => setDraft({ ...draft, photo })}
                />
                <Button
                  className="min-h-11 w-full rounded-full"
                  onClick={() => {
                    if (!draft.name.trim() || !draft.quote.trim()) {
                      toast.error("Name and quote are required.");
                      return;
                    }
                    saveTestimonial({ ...draft, id: draft.id || newId("tst") });
                    setDraft(null);
                    toast.success("Testimonial saved.");
                  }}
                >
                  Save
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
