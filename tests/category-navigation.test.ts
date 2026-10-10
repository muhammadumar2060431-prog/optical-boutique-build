import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { categoryNavigation } from "../src/lib/category-navigation.ts";
import type { Category } from "../src/lib/types.ts";

const glasses: Category = { id: "glasses", slug: "glasses", name: "Glasses", banner: null };
const lenses: Category = { id: "lenses", slug: "lenses", name: "Lenses", banner: null };

describe("admin-managed storefront categories", () => {
  it("hides the selector and category navigation when no categories exist", () => {
    const result = categoryNavigation([]);
    assert.equal(result.showSelector, false);
    assert.deepEqual(result.links, []);
  });

  for (const category of [glasses, lenses]) {
    it(`shows only ${category.name} navigation without a selector for one category`, () => {
      const result = categoryNavigation([category]);
      assert.equal(result.showSelector, false);
      assert.deepEqual(result.links, [
        { to: `/${category.slug}`, params: { slug: category.slug }, label: category.name },
      ]);
    });
  }

  it("updates visibility when an admin adds or deletes a second category", () => {
    assert.equal(categoryNavigation([glasses]).showSelector, false);
    const multiple = categoryNavigation([glasses, lenses]);
    assert.equal(multiple.showSelector, true);
    assert.deepEqual(
      multiple.links.map((link) => link.to),
      ["/glasses", "/lenses"],
    );
    assert.equal(categoryNavigation([lenses]).showSelector, false);
  });

  it("uses admin names, ordering, and working routes for custom categories", () => {
    const custom: Category = {
      id: "accessories",
      slug: "accessories",
      name: "Eyewear Accessories",
      banner: null,
      sortOrder: -1,
    };
    const input = [glasses, custom, lenses];
    const result = categoryNavigation(input);
    assert.equal(result.showSelector, true);
    assert.deepEqual(result.links[0], {
      to: "/category/$slug",
      params: { slug: "accessories" },
      label: "Eyewear Accessories",
    });
    assert.deepEqual(
      input.map((category) => category.id),
      ["glasses", "accessories", "lenses"],
    );
  });
});
