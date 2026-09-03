import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowUp,
  HelpCircle,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { newId, useStore } from "@/lib/store";
import type { FAQItem } from "@/lib/types";

export const Route = createFileRoute("/admin/faqs")({
  component: AdminFaqs,
});

const defaultCategories = [
  "Prescription & Lenses",
  "Orders & Delivery",
  "Fitting & Showroom",
  "Warranty & Returns",
  "General",
];

const blankFaq = (): FAQItem => ({
  id: "",
  question: "",
  answer: "",
  category: "Prescription & Lenses",
  enabled: true,
});

function AdminFaqs() {
  const { faqs, saveFaq, deleteFaq, moveFaq } = useStore();
  const [draft, setDraft] = useState<FAQItem | null>(null);
  const [filterQuery, setFilterQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");

  const categories = useMemo(() => {
    const set = new Set<string>();
    defaultCategories.forEach((c) => set.add(c));
    faqs.forEach((f) => {
      if (f.category?.trim()) set.add(f.category.trim());
    });
    return ["All", ...Array.from(set)];
  }, [faqs]);

  const filteredFaqs = useMemo(() => {
    return faqs.filter((f) => {
      const matchesCategory =
        filterCategory === "All" || f.category?.trim() === filterCategory;
      const query = filterQuery.trim().toLowerCase();
      const matchesQuery =
        !query ||
        f.question.toLowerCase().includes(query) ||
        f.answer.toLowerCase().includes(query) ||
        (f.category && f.category.toLowerCase().includes(query));

      return matchesCategory && matchesQuery;
    });
  }, [faqs, filterCategory, filterQuery]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <div className="min-w-0">
          <p className="eyebrow text-gold font-bold tracking-[0.18em] uppercase text-xs">
            Customer Support & Info
          </p>
          <h1 className="mt-1 font-display text-3xl text-foreground font-semibold">
            Frequently Asked Questions (FAQs)
          </h1>
          <p className="text-xs text-ink-muted mt-1">
            Manage the FAQ section on your website. Add questions about prescriptions, frame fittings, delivery, and returns.
          </p>
        </div>
        <Button
          className="min-h-11 shrink-0 rounded-full font-semibold"
          onClick={() => setDraft(blankFaq())}
        >
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> Add FAQ
        </Button>
      </header>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card p-4 rounded-2xl border border-stone">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
          <Input
            placeholder="Search FAQs..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="pl-9 h-10 text-xs rounded-xl"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs transition-colors cursor-pointer ${
                filterCategory === cat
                  ? "bg-gold text-jet font-semibold"
                  : "bg-background border border-stone text-ink-muted hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* FAQ List */}
      {faqs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone bg-card px-6 py-16 text-center text-sm text-ink-muted">
          <HelpCircle className="h-10 w-10 text-gold mx-auto mb-3 opacity-60" />
          <p className="font-semibold text-foreground">No FAQs created yet</p>
          <p className="text-xs text-ink-muted mt-1">
            Add common questions to help your customers learn about your lenses, frames, and services.
          </p>
          <Button
            size="sm"
            className="mt-4 rounded-full"
            onClick={() => setDraft(blankFaq())}
          >
            <Plus className="mr-1.5 h-4 w-4" /> Add First Question
          </Button>
        </div>
      ) : filteredFaqs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone bg-card px-6 py-12 text-center text-xs text-ink-muted">
          No FAQs match your search query or selected category.
        </div>
      ) : (
        <ul className="space-y-3">
          {filteredFaqs.map((faq, i) => (
            <li
              key={faq.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 rounded-2xl border border-stone bg-card p-5 transition-all hover:border-gold/50 shadow-xs"
            >
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold/15 text-[10px] font-bold text-gold">
                    {i + 1}
                  </span>
                  <p className="font-semibold text-foreground text-sm sm:text-base">
                    {faq.question}
                  </p>
                  {faq.category && (
                    <span className="rounded-full bg-gold/10 text-gold border border-gold/30 px-2 py-0.5 text-[10px] font-semibold">
                      {faq.category}
                    </span>
                  )}
                  {faq.enabled === false && (
                    <span className="rounded-full bg-amber-500/10 text-amber-600 px-2 py-0.5 text-[10px] font-semibold">
                      Hidden / Draft
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-ink-muted leading-relaxed line-clamp-3">
                  {faq.answer}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex shrink-0 items-center gap-1">
                {/* Live toggle */}
                <div className="flex items-center gap-1 mr-2 bg-background px-2.5 py-1.5 rounded-lg border border-stone">
                  <span className="text-[10px] text-ink-muted font-medium">
                    {faq.enabled ? "Live" : "Draft"}
                  </span>
                  <Switch
                    checked={faq.enabled !== false}
                    onCheckedChange={(enabled) => {
                      saveFaq({ ...faq, enabled });
                      toast.success(enabled ? "FAQ published." : "FAQ hidden.");
                    }}
                  />
                </div>

                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Move up"
                  disabled={i === 0}
                  onClick={() => moveFaq(faq.id, -1)}
                >
                  <ArrowUp className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Move down"
                  disabled={i === filteredFaqs.length - 1}
                  onClick={() => moveFaq(faq.id, 1)}
                >
                  <ArrowDown className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Edit"
                  onClick={() => setDraft(faq)}
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Delete"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    if (confirm(`Delete the question "${faq.question}"?`)) {
                      deleteFaq(faq.id);
                      toast.success("FAQ deleted.");
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Add / Edit FAQ Dialog */}
      <Dialog open={!!draft} onOpenChange={(v) => !v && setDraft(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg">
          {draft && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">
                  {draft.id ? "Edit Question" : "Add New Question"}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                {/* Question */}
                <div className="space-y-2">
                  <Label htmlFor="faq-question">Question *</Label>
                  <Input
                    id="faq-question"
                    value={draft.question}
                    onChange={(e) =>
                      setDraft({ ...draft, question: e.target.value })
                    }
                    placeholder="e.g. How do I submit my prescription?"
                    className="min-h-11"
                  />
                </div>

                {/* Answer */}
                <div className="space-y-2">
                  <Label htmlFor="faq-answer">Answer *</Label>
                  <Textarea
                    id="faq-answer"
                    rows={5}
                    value={draft.answer}
                    onChange={(e) =>
                      setDraft({ ...draft, answer: e.target.value })
                    }
                    placeholder="Provide a clear, helpful answer for your customers..."
                    className="leading-relaxed"
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="faq-category">Category</Label>
                  <Input
                    id="faq-category"
                    value={draft.category || ""}
                    onChange={(e) =>
                      setDraft({ ...draft, category: e.target.value })
                    }
                    placeholder="e.g. Prescription & Lenses, Orders & Delivery"
                  />
                  {/* Quick Category Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {defaultCategories.map((c) => (
                      <button
                        type="button"
                        key={c}
                        onClick={() => setDraft({ ...draft, category: c })}
                        className={`text-[11px] px-2.5 py-0.5 rounded-full border cursor-pointer transition-colors ${
                          draft.category === c
                            ? "bg-gold text-jet border-gold font-semibold"
                            : "bg-background border-stone text-ink-muted hover:border-gold/50"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Enabled Toggle */}
                <div className="flex items-center justify-between rounded-xl border border-stone bg-card p-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="faq-live" className="text-sm font-semibold">
                      Published / Visible on Website
                    </Label>
                    <p className="text-xs text-ink-muted">
                      Turn off to save as a draft without displaying on the homepage.
                    </p>
                  </div>
                  <Switch
                    id="faq-live"
                    checked={draft.enabled}
                    onCheckedChange={(v) => setDraft({ ...draft, enabled: v })}
                  />
                </div>

                {/* Save Button */}
                <Button
                  className="min-h-11 w-full rounded-full font-semibold"
                  onClick={() => {
                    if (!draft.question.trim()) {
                      toast.error("Please enter a question.");
                      return;
                    }
                    if (!draft.answer.trim()) {
                      toast.error("Please enter an answer.");
                      return;
                    }
                    saveFaq({
                      ...draft,
                      id: draft.id || newId("faq"),
                      question: draft.question.trim(),
                      answer: draft.answer.trim(),
                      category: draft.category?.trim() || "General",
                    });
                    setDraft(null);
                    toast.success("FAQ saved successfully.");
                  }}
                >
                  Save Question
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
