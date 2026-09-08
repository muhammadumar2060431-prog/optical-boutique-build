import { useMemo, useState } from "react";
import { ChevronDown, HelpCircle, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { Reveal } from "./Reveal";

export function FaqSection() {
  const { faqs } = useStore();
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const publishedFaqs = useMemo(() => {
    return faqs.filter((f) => f.enabled !== false);
  }, [faqs]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    publishedFaqs.forEach((f) => {
      if (f.category?.trim()) set.add(f.category.trim());
    });
    return ["All", ...Array.from(set)];
  }, [publishedFaqs]);

  const filteredFaqs = useMemo(() => {
    return publishedFaqs.filter((f) => {
      const matchesCategory = activeCategory === "All" || f.category?.trim() === activeCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q || f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [publishedFaqs, activeCategory, searchQuery]);

  const [openId, setOpenId] = useState<string | null>(filteredFaqs[0]?.id ?? null);

  if (!publishedFaqs.length) return null;

  return (
    <section className="bg-white py-20 sm:py-28 relative overflow-hidden border-b border-zinc-200 text-black">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <Reveal>
            <h2 className="font-display text-3xl sm:text-5xl font-semibold text-black tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="mt-4 text-sm sm:text-base text-zinc-600 leading-relaxed">
              Everything you need to know about our prescription lenses, bespoke frame fitting,
              doorstep delivery, and optical guarantees.
            </p>
          </Reveal>
        </div>

        {/* Search & Category Tabs */}
        <Reveal delay={100}>
          <div className="space-y-4 mb-10">
            {/* Search Input */}
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                type="search"
                placeholder="Search questions (e.g. prescription, delivery, blue light)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 h-11 bg-white border border-zinc-300 text-black font-semibold placeholder:text-zinc-500 placeholder:font-normal rounded-full shadow-sm focus-visible:ring-2 focus-visible:ring-black/20 focus-visible:border-black transition-all"
              />
            </div>

            {/* Category Filter Pills */}
            {categories.length > 1 && (
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                {categories.map((cat) => {
                  const isActive = activeCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer border ${
                        isActive
                          ? "bg-black text-white border-black shadow-md scale-105"
                          : "bg-[#9da3a8] border-[#8d9398] text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)] hover:bg-black hover:border-black hover:scale-105"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </Reveal>

        {/* FAQ Accordion List */}
        <Reveal delay={200}>
          {filteredFaqs.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 max-w-xl mx-auto">
              <HelpCircle className="h-8 w-8 text-zinc-500 mx-auto mb-2 opacity-80" />
              <p className="text-sm font-medium text-black">No matching questions found</p>
              <p className="text-xs text-zinc-500 mt-1">
                Try searching for another keyword or reach out directly to our optician helpline.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setActiveCategory("All");
                }}
                className="mt-4 rounded-full text-xs border-zinc-300 bg-white text-black hover:bg-zinc-100"
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredFaqs.map((faq, index) => {
                const isOpen = openId === faq.id;
                return (
                  <div
                    key={faq.id}
                    className={`rounded-2xl border transition-all duration-300 px-5 sm:px-6 ${
                      isOpen
                        ? "border-zinc-300 bg-white text-black shadow-xl ring-1 ring-zinc-200/50"
                        : "border-[#8d9398] bg-[#9da3a8] text-white hover:bg-[#8e9499] shadow-sm"
                    }`}
                  >
                    {/* Question Trigger */}
                    <button
                      type="button"
                      onClick={() => setOpenId(isOpen ? null : faq.id)}
                      className="w-full flex items-center justify-between py-4.5 text-left cursor-pointer transition-colors"
                      aria-expanded={isOpen}
                    >
                      <div className="flex items-center gap-3.5 pr-4 min-w-0">
                        {/* Number Badge */}
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                            isOpen
                              ? "bg-black text-white"
                              : "bg-black/30 text-white border border-white/30"
                          }`}
                        >
                          {index + 1 < 10 ? `0${index + 1}` : index + 1}
                        </span>

                        {/* Question Text */}
                        <span
                          className={`text-sm sm:text-base font-semibold transition-colors duration-300 ${
                            isOpen
                              ? "text-black"
                              : "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
                          }`}
                        >
                          {faq.question}
                        </span>
                      </div>

                      {/* Chevron Circle Icon */}
                      <div
                        className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center transition-all duration-300 ${
                          isOpen ? "bg-black text-white rotate-180" : "bg-black/30 text-white"
                        }`}
                      >
                        <ChevronDown className="h-4 w-4 transition-transform duration-300" />
                      </div>
                    </button>

                    {/* Animated Answer Body (CSS Grid 0fr -> 1fr) */}
                    <div
                      className={`grid transition-all duration-300 ease-in-out ${
                        isOpen
                          ? "grid-rows-[1fr] opacity-100 pb-5"
                          : "grid-rows-[0fr] opacity-0 pb-0"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="pt-3 border-t border-zinc-200 text-xs sm:text-sm text-zinc-800 leading-relaxed space-y-3">
                          <p>{faq.answer}</p>
                          {faq.category && (
                            <div className="pt-1">
                              <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-zinc-200 bg-zinc-900 px-3 py-1 rounded-full shadow-xs">
                                {faq.category}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Reveal>
      </div>
    </section>
  );
}
