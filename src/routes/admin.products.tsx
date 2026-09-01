import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ImageUpload } from "@/components/admin/ImageUpload";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice, newId, useStore } from "@/lib/store";
import type { Category, Product, Variant } from "@/lib/types";

export const Route = createFileRoute("/admin/products")({
  component: AdminProducts,
});

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function blankProduct(categoryId: string): Product {
  return {
    id: "",
    slug: "",
    name: "",
    categoryId,
    price: 0,
    description: "",
    image: "",
    subImages: [],
    stock: 0,
    variants: [],
    details: { material: "", lensInfo: "", care: "" },
    featured: false,
    createdAt: new Date().toISOString(),
  };
}

function AdminProducts() {
  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow text-gold">Catalogue</p>
        <h1 className="mt-2 font-display text-3xl">Products</h1>
      </header>

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>
        <TabsContent value="products" className="pt-6">
          <ProductsTab />
        </TabsContent>
        <TabsContent value="categories" className="pt-6">
          <CategoriesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProductsTab() {
  const { products, categories, saveProduct, deleteProduct, productStock } = useStore();
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [draft, setDraft] = useState<Product | null>(null);

  const list = useMemo(
    () =>
      products.filter((p) => {
        if (query && !p.name.toLowerCase().includes(query.toLowerCase())) return false;
        if (categoryFilter !== "all" && p.categoryId !== categoryFilter) return false;
        return true;
      }),
    [products, query, categoryFilter],
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_200px_auto]">
        <Input
          placeholder="Search products"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-h-11"
        />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger aria-label="Filter by category" className="min-h-11">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          className="min-h-11 rounded-full"
          disabled={categories.length === 0}
          onClick={() => setDraft(blankProduct(categories[0]?.id ?? ""))}
        >
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> Add product
        </Button>
      </div>

      {list.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone bg-card px-6 py-16 text-center text-sm text-ink-muted">
          No products here yet — add your first piece to see it on the storefront instantly.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-stone bg-card">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-stone text-left text-xs tracking-[0.14em] uppercase text-ink-muted">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone">
              {list.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <img
                        src={p.image}
                        alt=""
                        className="h-11 w-11 shrink-0 rounded-md object-cover"
                      />
                      <span className="truncate font-semibold">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {categories.find((c) => c.id === p.categoryId)?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3">{formatPrice(p.price)}</td>
                  <td className="px-4 py-3">
                    {productStock(p)}
                    {p.variants.length ? ` (${p.variants.length} variants)` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Edit product"
                        onClick={() => setDraft(p)}
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Delete product"
                        onClick={() => {
                          if (confirm(`Delete "${p.name}"? This cannot be undone.`)) {
                            deleteProduct(p.id);
                            toast.success("Product deleted.");
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ProductDialog
        draft={draft}
        onClose={() => setDraft(null)}
        onSave={(p) => {
          saveProduct(p);
          setDraft(null);
          toast.success("Product saved.");
        }}
      />
    </div>
  );
}

function ProductDialog({
  draft,
  onClose,
  onSave,
}: {
  draft: Product | null;
  onClose: () => void;
  onSave: (product: Product) => void;
}) {
  const { categories } = useStore();
  const [form, setForm] = useState<Product | null>(draft);

  if (draft && (!form || form.id !== draft.id || form.name !== draft.name)) {
    // sync when a different product is opened
    if (!form || form.id !== draft.id) setForm(draft);
  }

  const value = form && draft && form.id === draft.id ? form : draft;

  const setVariant = (variant: Variant) => {
    if (!value) return;
    setForm({
      ...value,
      variants: value.variants.some((v) => v.id === variant.id)
        ? value.variants.map((v) => (v.id === variant.id ? variant : v))
        : [...value.variants, variant],
    });
  };

  return (
    <Dialog open={!!draft} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        {value && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">
                {value.id ? "Edit product" : "Add product"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="p-name">Name</Label>
                  <Input
                    id="p-name"
                    value={value.name}
                    onChange={(e) => setForm({ ...value, name: e.target.value })}
                    className="min-h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p-price">Price (Rs.)</Label>
                  <Input
                    id="p-price"
                    type="number"
                    value={value.price}
                    onChange={(e) => setForm({ ...value, price: Number(e.target.value) })}
                    className="min-h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p-category">Category</Label>
                  <Select
                    value={value.categoryId}
                    onValueChange={(v) => setForm({ ...value, categoryId: v })}
                  >
                    <SelectTrigger id="p-category" className="min-h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p-stock">Base stock</Label>
                  <Input
                    id="p-stock"
                    type="number"
                    value={value.stock}
                    onChange={(e) => setForm({ ...value, stock: Number(e.target.value) })}
                    className="min-h-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="p-desc">Description</Label>
                <Textarea
                  id="p-desc"
                  rows={4}
                  value={value.description}
                  onChange={(e) => setForm({ ...value, description: e.target.value })}
                />
              </div>

              <ImageUpload
                label="Base image"
                value={value.image || null}
                onChange={(img) => setForm({ ...value, image: img ?? "" })}
              />

              <div className="grid gap-4 sm:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <ImageUpload
                    key={i}
                    label={`Sub-image ${i + 1}`}
                    optional
                    value={value.subImages[i] ?? null}
                    onChange={(img) => {
                      const next = [...value.subImages];
                      if (img) next[i] = img;
                      else next.splice(i, 1);
                      setForm({ ...value, subImages: next.filter(Boolean) });
                    }}
                  />
                ))}
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="p-material">Details — material</Label>
                  <Textarea
                    id="p-material"
                    rows={3}
                    value={value.details.material}
                    onChange={(e) =>
                      setForm({ ...value, details: { ...value.details, material: e.target.value } })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p-lens">Lens info</Label>
                  <Textarea
                    id="p-lens"
                    rows={3}
                    value={value.details.lensInfo}
                    onChange={(e) =>
                      setForm({ ...value, details: { ...value.details, lensInfo: e.target.value } })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p-care">Care instructions</Label>
                  <Textarea
                    id="p-care"
                    rows={3}
                    value={value.details.care}
                    onChange={(e) =>
                      setForm({ ...value, details: { ...value.details, care: e.target.value } })
                    }
                  />
                </div>
              </div>

              <section className="space-y-3 rounded-lg border border-stone p-4">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                  <h3 className="truncate font-display text-lg">Variants</h3>
                  <Button
                    size="sm"
                    variant="outline"
                    className="min-h-11 shrink-0"
                    onClick={() =>
                      setVariant({ id: newId("var"), label: "New colour", image: "", stock: 0 })
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> Add variant
                  </Button>
                </div>

                {value.variants.length === 0 ? (
                  <p className="text-sm text-ink-muted">
                    This product has no colour/variant options — add one if needed, or leave it as a
                    single item.
                  </p>
                ) : (
                  <ul className="space-y-4">
                    {value.variants.map((v) => (
                      <li key={v.id} className="space-y-3 rounded-md bg-mist p-3">
                        <div className="grid gap-3 sm:grid-cols-[1fr_120px_auto]">
                          <Input
                            aria-label="Variant label"
                            value={v.label}
                            onChange={(e) => setVariant({ ...v, label: e.target.value })}
                            className="min-h-11"
                          />
                          <Input
                            aria-label="Variant stock"
                            type="number"
                            value={v.stock}
                            onChange={(e) => setVariant({ ...v, stock: Number(e.target.value) })}
                            className="min-h-11"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Remove variant"
                            onClick={() =>
                              setForm({
                                ...value,
                                variants: value.variants.filter((x) => x.id !== v.id),
                              })
                            }
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </div>
                        <ImageUpload
                          label="Variant image"
                          value={v.image || null}
                          onChange={(img) => setVariant({ ...v, image: img ?? "" })}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <label className="flex min-h-11 items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={value.featured}
                  onChange={(e) => setForm({ ...value, featured: e.target.checked })}
                  className="h-4 w-4 accent-[var(--color-accent-gold)]"
                />
                Show in the home page “Bestsellers” grid
              </label>

              <Button
                className="min-h-11 w-full rounded-full"
                onClick={() => {
                  if (!value.name.trim()) {
                    toast.error("A product name is required.");
                    return;
                  }
                  if (!value.image) {
                    toast.error("A base image is required.");
                    return;
                  }
                  onSave({
                    ...value,
                    id: value.id || newId("prd"),
                    slug: value.slug || slugify(value.name),
                  });
                }}
              >
                Save product
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CategoriesTab() {
  const { categories, products, saveCategory, deleteCategory } = useStore();
  const [draft, setDraft] = useState<Category | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          className="min-h-11 rounded-full"
          onClick={() => setDraft({ id: "", slug: "", name: "", banner: null })}
        >
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> Add category
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-stone bg-card">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="border-b border-stone text-left text-xs tracking-[0.14em] uppercase text-ink-muted">
            <tr>
              <th className="px-4 py-3">Banner</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Products</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone">
            {categories.map((c) => {
              const count = products.filter((p) => p.categoryId === c.id).length;
              return (
                <tr key={c.id}>
                  <td className="px-4 py-3">
                    {c.banner ? (
                      <img
                        src={c.banner.image}
                        alt=""
                        className="h-10 w-20 rounded-md object-cover"
                      />
                    ) : (
                      <span className="text-xs text-ink-muted">No banner</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold">{c.name}</td>
                  <td className="px-4 py-3">{count}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Edit category"
                        onClick={() => setDraft(c)}
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Delete category"
                        onClick={() => {
                          const warn = count
                            ? `"${c.name}" still has ${count} product(s). Deleting it removes those products too. Continue?`
                            : `Delete the "${c.name}" category?`;
                          if (confirm(warn)) {
                            deleteCategory(c.id);
                            toast.success("Category deleted.");
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={!!draft} onOpenChange={(v) => !v && setDraft(null)}>
        <DialogContent>
          {draft && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">
                  {draft.id ? "Edit category" : "New category"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="c-name">Name</Label>
                  <Input
                    id="c-name"
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    className="min-h-11"
                  />
                </div>
                <Button
                  className="min-h-11 w-full rounded-full"
                  onClick={() => {
                    if (!draft.name.trim()) {
                      toast.error("A category name is required.");
                      return;
                    }
                    saveCategory({
                      ...draft,
                      id: draft.id || newId("cat"),
                      slug: draft.slug || slugify(draft.name),
                    });
                    setDraft(null);
                    toast.success("Category saved.");
                  }}
                >
                  Save category
                </Button>
                <p className="text-xs text-ink-muted">
                  Banner artwork for this category is managed under Content → Category banners.
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
