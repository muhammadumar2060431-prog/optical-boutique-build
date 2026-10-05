import assert from "node:assert/strict";
import { it } from "node:test";
import { faqPages, faqsForPage, setFaqPage } from "../src/lib/faq-pages.ts";
import type { FAQItem } from "../src/lib/types.ts";

const faq: FAQItem = { id: "faq-1", question: "Delivery?", answer: "Nationwide.", enabled: true };

it("only shows enabled FAQs on their selected pages", () => {
  const selected = setFaqPage(setFaqPage(faq, "contact", true), "checkout", true);
  assert.deepEqual(faqsForPage([selected], "contact"), [selected]);
  assert.deepEqual(faqsForPage([selected], "checkout"), [selected]);
  assert.deepEqual(faqsForPage([selected], "cart"), []);
  assert.deepEqual(faqsForPage([{ ...selected, enabled: false }], "contact"), []);
  assert.deepEqual(faqsForPage([faq], "home"), []);
});

it("preserves legacy homepage selections without overriding explicit empty selections", () => {
  assert.deepEqual(faqPages({ showOnHome: true }), ["home"]);
  assert.deepEqual(faqPages({ showOnHome: true, showOnPages: [] }), []);
});

it("switching a page off preserves all other placements and keeps home in sync", () => {
  const selected = setFaqPage(setFaqPage(faq, "home", true), "tracking", true);
  const updated = setFaqPage(selected, "home", false);
  assert.deepEqual(faqPages(updated), ["tracking"]);
  assert.equal(updated.showOnHome, false);
});
