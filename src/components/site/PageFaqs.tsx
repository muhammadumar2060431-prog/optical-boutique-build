import { useId } from "react";
import { ChevronDown } from "lucide-react";
import { useStore } from "@/lib/store";
import { faqsForPage } from "@/lib/faq-pages";
import type { FAQPage } from "@/lib/types";

export function PageFaqs({ page }: { page: FAQPage }) {
  const { faqs } = useStore();
  const headingId = useId();
  const selected = faqsForPage(faqs, page);
  if (!selected.length) return null;

  return (
    <section aria-labelledby={headingId} className="mt-6 min-w-0 text-foreground">
      <h2 id={headingId} className="mb-3 text-lg font-semibold">
        Frequently Asked Questions
      </h2>
      <div className="divide-y divide-stone">
        {selected.map((faq) => (
          <details key={faq.id} className="group py-3">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
              <span className="min-w-0 break-words">{faq.question}</span>
              <ChevronDown
                className="mt-0.5 h-4 w-4 shrink-0 transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-ink-muted">
              {faq.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
