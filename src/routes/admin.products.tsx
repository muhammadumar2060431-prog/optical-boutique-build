import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  ChevronRight,
  FolderTree,
  Layers,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { ImageUpload } from "@/components/admin/ImageUpload";
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
import type { Category, Collection, Product, Variant } from "@/lib/types";

export const Route = createFileRoute("/admin/products")({
  component: AdminProducts,
});

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function blankProduct(categoryId: string, collectionId?: string): Product {
  return {
    id: "",
    slug: "",
    name: "",
    categoryId,
    collectionId: collectionId || null,
    price: 0,
    salePrice: null,
    sku: `OPT-${Math.floor(100 + Math.random() * 900)}`,
    status: "Published",
    description: "",
    image: "",
    subImages: [],
    stock: 0,
    variants: [],
    details: {
      frameMaterial: "Acetate",
      lensMaterial: "Polycarbonate",
      lensType: ["Single Vision"],
      uvProtection: "UV400",
      warranty: "1 Year Official Optique Guarantee",
      material: "",
      lensInfo: "",
      care: "",
    },
    featured: false,
    isNewArrival: false,
    newArrivalImage: null,
    isBestseller: false,
    scheduleLaunchDate: null,
    taxInclusive: true,
    createdAt: new Date().toISOString(),
  };
}

function AdminProducts() {
  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow text-gold">Catalogue & Inventory</p>
        <h1 className="mt-2 font-display text-3xl">Products & Collections</h1>
      </header>

      <Tabs defaultValue="products">
        <TabsList className="flex-wrap">
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="categories">Categories & Collections</TabsTrigger>
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
  const { products, categories, collections, saveProduct, deleteProduct, productStock } =
    useStore();
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [collectionFilter, setCollectionFilter] = useState("all");
  const [draft, setDraft] = useState<Product | null>(null);

  const availableCollections = useMemo(() => {
    if (categoryFilter === "all") return collections;
    return collections.filter((c) => c.categoryId === categoryFilter);
  }, [collections, categoryFilter]);

  const list = useMemo(
    () =>
      products.filter((p) => {
        if (query && !p.name.toLowerCase().includes(query.toLowerCase()) && !p.sku?.toLowerCase().includes(query.toLowerCase()))
          return false;
        if (categoryFilter !== "all" && p.categoryId !== categoryFilter) return false;
        if (collectionFilter !== "all" && p.collectionId !== collectionFilter) return false;
        return true;
      }),
    [products, query, categoryFilter, collectionFilter],
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_180px_180px_auto]">
        <Input
          placeholder="Search by name or SKU..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-h-11"
        />
        <Select
          value={categoryFilter}
          onValueChange={(v) => {
            setCategoryFilter(v);
            setCollectionFilter("all");
          }}
        >
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

        <Select value={collectionFilter} onValueChange={setCollectionFilter}>
          <SelectTrigger aria-label="Filter by collection" className="min-h-11">
            <SelectValue placeholder="Collection" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All collections</SelectItem>
            {availableCollections.map((col) => (
              <SelectItem key={col.id} value={col.id}>
                {col.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          className="min-h-11 rounded-full"
          disabled={categories.length === 0}
          onClick={() => {
            const catId = categories[0]?.id ?? "";
            const colId = collections.find((c) => c.categoryId === catId)?.id;
            setDraft(blankProduct(catId, colId));
          }}
        >
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> Add product
        </Button>
      </div>

      {list.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone bg-card px-6 py-16 text-center text-sm text-ink-muted">
          No products found matching the criteria. Add your first piece to see it on the storefront.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-stone bg-card">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-stone text-left text-xs tracking-[0.14em] uppercase text-ink-muted">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category & Collection</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Status & Badges</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone">
              {list.map((p) => {
                const cat = categories.find((c) => c.id === p.categoryId);
                const col = collections.find((c) => c.id === p.collectionId);
                return (
                  <tr key={p.id}>
                    <td className="px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <img
                          src={p.image}
                          alt=""
                          className="h-11 w-11 shrink-0 rounded-md object-cover border border-stone"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{p.name}</p>
                          <p className="text-xs text-ink-muted">SKU: {p.sku || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      <div className="text-xs space-y-0.5">
                        <span className="font-medium text-foreground">{cat?.name ?? "—"}</span>
                        {col && <p className="text-gold">↳ {col.name}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        {p.salePrice ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-destructive">{formatPrice(p.salePrice)}</span>
                            <span className="text-xs text-ink-muted line-through">{formatPrice(p.price)}</span>
                          </div>
                        ) : (
                          <span className="font-semibold">{formatPrice(p.price)}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <Badge
                          variant={p.status === "Published" ? "default" : "secondary"}
                          className="text-[10px] uppercase tracking-wider"
                        >
                          {p.status || "Published"}
                        </Badge>
                        {p.salePrice && (
                          <Badge variant="destructive" className="text-[10px]">
                            SALE
                          </Badge>
                        )}
                        {p.isNewArrival && (
                          <Badge className="bg-amber-600 text-white text-[10px]">
                            NEW
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {productStock(p)}
                      {p.variants.length ? (
                        <span className="text-xs text-ink-muted block">({p.variants.length} variants)</span>
                      ) : null}
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
                          <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
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

      <ProductDialog
        draft={draft}
        onClose={() => setDraft(null)}
        onSave={(p) => {
          saveProduct(p);
          setDraft(null);
          toast.success("Product saved successfully.");
        }}
      />
    </div>
  );
}

const LENS_TYPE_OPTIONS = [
  "Single Vision",
  "Bifocal",
  "Progressive",
  "Blue Light",
  "Photochromic",
  "Polarized",
];

function ProductDialog({
  draft,
  onClose,
  onSave,
}: {
  draft: Product | null;
  onClose: () => void;
  onSave: (product: Product) => void;
}) {
  const { categories, collections } = useStore();
  const [form, setForm] = useState<Product | null>(draft);

  if (draft && (!form || form.id !== draft.id || form.name !== draft.name)) {
    if (!form || form.id !== draft.id) setForm(draft);
  }

  const value = form && draft && form.id === draft.id ? form : draft;

  const filteredCollections = useMemo(() => {
    if (!value?.categoryId) return [];
    return collections.filter((c) => c.categoryId === value.categoryId);
  }, [collections, value?.categoryId]);

  const setVariant = (variant: Variant) => {
    if (!value) return;
    setForm({
      ...value,
      variants: value.variants.some((v) => v.id === variant.id)
        ? value.variants.map((v) => (v.id === variant.id ? variant : v))
        : [...value.variants, variant],
    });
  };

  const toggleLensType = (type: string) => {
    if (!value) return;
    const current = value.details?.lensType || [];
    const updated = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    setForm({
      ...value,
      details: {
        ...value.details,
        lensType: updated,
      },
    });
  };

  return (
    <Dialog open={!!draft} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        {value && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl flex items-center justify-between">
                <span>{value.id ? `Edit: ${value.name}` : "Add New Product"}</span>
                {value.sku && <span className="text-xs font-sans text-ink-muted">SKU: {value.sku}</span>}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 pt-2">
              {/* Primary info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="p-name">Product Name *</Label>
                  <Input
                    id="p-name"
                    value={value.name}
                    onChange={(e) => setForm({ ...value, name: e.target.value })}
                    placeholder="e.g. Classic Aviator"
                    className="min-h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p-sku">SKU Code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="p-sku"
                      value={value.sku || ""}
                      onChange={(e) => setForm({ ...value, sku: e.target.value })}
                      placeholder="e.g. OPT-AV-890"
                      className="min-h-11"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11 text-xs"
                      onClick={() =>
                        setForm({
                          ...value,
                          sku: `OPT-${value.name ? value.name.slice(0, 2).toUpperCase() : "PR"}-${Math.floor(100 + Math.random() * 900)}`,
                        })
                      }
                    >
                      Generate
                    </Button>
                  </div>
                </div>
              </div>

              {/* Hierarchy: Category -> Collection */}
              <div className="grid gap-4 sm:grid-cols-2 rounded-xl border border-stone bg-mist/30 p-4">
                <div className="space-y-2">
                  <Label htmlFor="p-category">Category (Top level)</Label>
                  <Select
                    value={value.categoryId}
                    onValueChange={(catId) => {
                      const firstCol = collections.find((c) => c.categoryId === catId)?.id || null;
                      setForm({ ...value, categoryId: catId, collectionId: firstCol });
                    }}
                  >
                    <SelectTrigger id="p-category" className="min-h-11 bg-card">
                      <SelectValue placeholder="Select Category" />
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
                  <Label htmlFor="p-collection">Collection (Sub-category)</Label>
                  <Select
                    value={value.collectionId || "none"}
                    onValueChange={(colId) =>
                      setForm({ ...value, collectionId: colId === "none" ? null : colId })
                    }
                  >
                    <SelectTrigger id="p-collection" className="min-h-11 bg-card">
                      <SelectValue placeholder="Select Collection" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— No specific collection —</SelectItem>
                      {filteredCollections.map((col) => (
                        <SelectItem key={col.id} value={col.id}>
                          {col.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Pricing & Stock & Status */}
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="p-price">Regular Price (Rs.) *</Label>
                  <Input
                    id="p-price"
                    type="number"
                    value={value.price || ""}
                    onChange={(e) => setForm({ ...value, price: Number(e.target.value) })}
                    className="min-h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p-saleprice">Sale Price (Rs.)</Label>
                  <Input
                    id="p-saleprice"
                    type="number"
                    placeholder="Optional sale price"
                    value={value.salePrice ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...value,
                        salePrice: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="min-h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p-stock">Base Stock</Label>
                  <Input
                    id="p-stock"
                    type="number"
                    value={value.stock || 0}
                    onChange={(e) => setForm({ ...value, stock: Number(e.target.value) })}
                    className="min-h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p-status">Status</Label>
                  <Select
                    value={value.status || "Published"}
                    onValueChange={(s: any) => setForm({ ...value, status: s })}
                  >
                    <SelectTrigger id="p-status" className="min-h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Published">Published (Live)</SelectItem>
                      <SelectItem value="Draft">Draft (Hidden)</SelectItem>
                      <SelectItem value="Archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="p-desc">Description</Label>
                <Textarea
                  id="p-desc"
                  rows={3}
                  value={value.description}
                  onChange={(e) => setForm({ ...value, description: e.target.value })}
                  placeholder="Tell your customers about the design, materials, and fit..."
                />
              </div>

              {/* Image Uploads */}
              <div className="space-y-4 rounded-xl border border-stone p-4">
                <h3 className="font-display text-lg">Product Media</h3>
                <ImageUpload
                  label="Primary Base Image *"
                  value={value.image || null}
                  onChange={(img) => setForm({ ...value, image: img ?? "" })}
                />

                <ImageUpload
                  label="Hover Image (shows on cursor hover)"
                  optional
                  value={value.hoverImage ?? null}
                  onChange={(img) => setForm({ ...value, hoverImage: img ?? null })}
                />

                <div>
                  <Label className="text-xs uppercase tracking-wider text-ink-muted">
                    Sub-Images / Gallery (Up to 3 optional angles)
                  </Label>
                  <div className="grid gap-4 sm:grid-cols-3 mt-2">
                    {[0, 1, 2].map((i) => (
                      <ImageUpload
                        key={i}
                        label={`Angle ${i + 1}`}
                        optional
                        value={value.subImages?.[i] ?? null}
                        onChange={(img) => {
                          const next = [...(value.subImages || [])];
                          if (img) next[i] = img;
                          else next.splice(i, 1);
                          setForm({ ...value, subImages: next.filter(Boolean) });
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Specs Section */}
              <div className="space-y-4 rounded-xl border border-stone bg-card p-4">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-gold" />
                  <h3 className="font-display text-lg">Technical Specifications</h3>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="p-frame-mat">Frame Material</Label>
                    <Select
                      value={value.details?.frameMaterial || "Acetate"}
                      onValueChange={(val) =>
                        setForm({
                          ...value,
                          details: { ...value.details, frameMaterial: val },
                        })
                      }
                    >
                      <SelectTrigger id="p-frame-mat" className="min-h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Acetate">Acetate (Handcrafted)</SelectItem>
                        <SelectItem value="Titanium">Beta-Titanium</SelectItem>
                        <SelectItem value="Metal">Stainless Steel / Metal</SelectItem>
                        <SelectItem value="Plastic">TR-90 / Plastic</SelectItem>
                        <SelectItem value="Wood">Wood Finish</SelectItem>
                        <SelectItem value="Rimless">Rimless Featherweight</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="p-lens-mat">Lens Material</Label>
                    <Select
                      value={value.details?.lensMaterial || "Polycarbonate"}
                      onValueChange={(val) =>
                        setForm({
                          ...value,
                          details: { ...value.details, lensMaterial: val },
                        })
                      }
                    >
                      <SelectTrigger id="p-lens-mat" className="min-h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Polycarbonate">Polycarbonate (Impact resistant)</SelectItem>
                        <SelectItem value="Hydrogel">Hydrogel (Soft contact)</SelectItem>
                        <SelectItem value="Silicone Hydrogel">Silicone Hydrogel (High O2)</SelectItem>
                        <SelectItem value="Glass">Mineral Glass (Ultra clear)</SelectItem>
                        <SelectItem value="Trivex">Trivex (High Index)</SelectItem>
                        <SelectItem value="CR-39">CR-39 Optical Resin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="p-uv">UV Protection</Label>
                    <Select
                      value={value.details?.uvProtection || "UV400"}
                      onValueChange={(val) =>
                        setForm({
                          ...value,
                          details: { ...value.details, uvProtection: val },
                        })
                      }
                    >
                      <SelectTrigger id="p-uv" className="min-h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UV400">UV400 (100% Protection)</SelectItem>
                        <SelectItem value="Polarized+UV">Polarized + UV400</SelectItem>
                        <SelectItem value="BlueLight+UV">Blue Light Block + UV</SelectItem>
                        <SelectItem value="None">Standard / Non-UV</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Compatible Lens Types (Multi-select)</Label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {LENS_TYPE_OPTIONS.map((type) => {
                      const isChecked = (value.details?.lensType || []).includes(type);
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => toggleLensType(type)}
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-all ${
                            isChecked
                              ? "bg-gold text-white border-gold shadow-sm"
                              : "bg-mist/60 text-ink-muted border-stone hover:bg-mist"
                          }`}
                        >
                          {type} {isChecked && "✓"}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="p-warranty">Warranty Text</Label>
                    <Input
                      id="p-warranty"
                      value={value.details?.warranty || ""}
                      onChange={(e) =>
                        setForm({
                          ...value,
                          details: { ...value.details, warranty: e.target.value },
                        })
                      }
                      placeholder="e.g. 1 Year Comprehensive Guarantee"
                      className="min-h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="p-details-mat">Detailed Material Description</Label>
                    <Input
                      id="p-details-mat"
                      value={value.details?.material || ""}
                      onChange={(e) =>
                        setForm({
                          ...value,
                          details: { ...value.details, material: e.target.value },
                        })
                      }
                      placeholder="e.g. Hand-polished Italian acetate with titanium joints"
                      className="min-h-11"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="p-lens-info">Lens & Prescription Info</Label>
                    <Textarea
                      id="p-lens-info"
                      rows={2}
                      value={value.details?.lensInfo || ""}
                      onChange={(e) =>
                        setForm({
                          ...value,
                          details: { ...value.details, lensInfo: e.target.value },
                        })
                      }
                      placeholder="Prescription range, fitting notes..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="p-care-info">Care Instructions</Label>
                    <Textarea
                      id="p-care-info"
                      rows={2}
                      value={value.details?.care || ""}
                      onChange={(e) =>
                        setForm({
                          ...value,
                          details: { ...value.details, care: e.target.value },
                        })
                      }
                      placeholder="Rinse with lukewarm water, microfibre cloth..."
                    />
                  </div>
                </div>
              </div>

              {/* Color Swatch & Variants Section */}
              <section className="space-y-4 rounded-xl border border-stone bg-card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display text-lg">Colour Swatches & Variants</h3>
                    <p className="text-xs text-ink-muted">
                      Assign exact swatch colours (Hex code) so customers see true interactive color circles.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="min-h-10 shrink-0 rounded-full"
                    onClick={() =>
                      setVariant({
                        id: newId("var"),
                        label: "New Colour",
                        swatchColourHex: "#1b1b1d",
                        image: "",
                        stock: 5,
                        price: value.price,
                      })
                    }
                  >
                    <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" /> Add colour variant
                  </Button>
                </div>

                {value.variants.length === 0 ? (
                  <p className="text-xs text-ink-muted py-2">
                    No variant added yet. Add variants if this frame is available in multiple colours with specific photos.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {value.variants.map((v) => (
                      <li key={v.id} className="space-y-3 rounded-lg bg-mist/50 border border-stone/60 p-3.5">
                        <div className="grid gap-3 sm:grid-cols-[1fr_100px_100px_90px_auto] items-center">
                          <div className="space-y-1">
                            <span className="text-[11px] font-semibold uppercase text-ink-muted">Colour Name <span className="normal-case text-ink-muted/60">(Optional)</span></span>
                            <Input
                              value={v.label}
                              onChange={(e) => setVariant({ ...v, label: e.target.value })}
                              placeholder="e.g. Matte Black (optional)"
                              className="min-h-10 bg-card"
                            />
                          </div>

                          <div className="space-y-1">
                            <span className="text-[11px] font-semibold uppercase text-ink-muted">Swatch Colour</span>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={v.swatchColourHex || "#000000"}
                                onChange={(e) => setVariant({ ...v, swatchColourHex: e.target.value })}
                                className="h-10 w-12 rounded cursor-pointer border border-stone"
                              />
                              <span className="text-xs font-mono">{v.swatchColourHex || "#000"}</span>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[11px] font-semibold uppercase text-ink-muted">Price (Rs.)</span>
                            <Input
                              type="number"
                              value={v.price ?? ""}
                              placeholder={String(value.price)}
                              onChange={(e) =>
                                setVariant({
                                  ...v,
                                  price: e.target.value ? Number(e.target.value) : undefined,
                                })
                              }
                              className="min-h-10 bg-card"
                            />
                          </div>

                          <div className="space-y-1">
                            <span className="text-[11px] font-semibold uppercase text-ink-muted">Stock Qty</span>
                            <Input
                              type="number"
                              value={v.stock}
                              onChange={(e) => setVariant({ ...v, stock: Number(e.target.value) })}
                              className="min-h-10 bg-card"
                            />
                          </div>

                          <div className="pt-5">
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
                              <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                            </Button>
                          </div>
                        </div>

                        <ImageUpload
                          label={`Variant Image (${v.label})`}
                          optional
                          value={v.image || null}
                          onChange={(img) => setVariant({ ...v, image: img ?? "" })}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Tags & Visibility */}
              <div className="space-y-4 rounded-xl border border-stone bg-card p-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-gold" />
                  <h3 className="font-display text-lg">Badges, Tags & Launch Timing</h3>
                </div>

                <div className="space-y-4">
                  {/* New Arrival Toggle & Image */}
                  <div className="rounded-lg border border-stone/60 p-3.5 space-y-3">
                    <label className="flex items-center justify-between gap-4 cursor-pointer">
                      <div>
                        <span className="text-sm font-semibold">Mark as "New Arrival"</span>
                        <p className="text-xs text-ink-muted">
                          Enables special promotion badges and placement in the New Arrivals showcase.
                        </p>
                      </div>
                      <Switch
                        checked={!!value.isNewArrival}
                        onCheckedChange={(v) => setForm({ ...value, isNewArrival: v })}
                      />
                    </label>

                    {value.isNewArrival && (
                      <div className="pt-2 border-t border-stone/40">
                        <ImageUpload
                          label="Dedicated New Arrival Showcase Image (Optional)"
                          optional
                          value={value.newArrivalImage || null}
                          onChange={(img) => setForm({ ...value, newArrivalImage: img })}
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex items-center justify-between rounded-lg border border-stone/60 p-3.5 cursor-pointer">
                      <div>
                        <span className="text-sm font-semibold">Best Seller Badge</span>
                        <p className="text-xs text-ink-muted">Displays "Best Seller" ribbon</p>
                      </div>
                      <Switch
                        checked={!!value.isBestseller}
                        onCheckedChange={(v) => setForm({ ...value, isBestseller: v })}
                      />
                    </label>

                    <label className="flex items-center justify-between rounded-lg border border-stone/60 p-3.5 cursor-pointer">
                      <div>
                        <span className="text-sm font-semibold">Homepage Bestsellers Grid</span>
                        <p className="text-xs text-ink-muted">Feature on main home page</p>
                      </div>
                      <Switch
                        checked={!!value.featured}
                        onCheckedChange={(v) => setForm({ ...value, featured: v })}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <Button
                className="min-h-12 w-full rounded-full text-base font-semibold"
                onClick={() => {
                  if (!value.name.trim()) {
                    toast.error("A product name is required.");
                    return;
                  }
                  if (!value.image) {
                    toast.error("A primary base image is required.");
                    return;
                  }
                  onSave({
                    ...value,
                    id: value.id || newId("prd"),
                    slug: value.slug || slugify(value.name),
                  });
                }}
              >
                Save Product & Changes
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CategoriesTab() {
  const { categories, collections, products, saveCategory, deleteCategory, saveCollection, deleteCollection } =
    useStore();
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryDraft, setCategoryDraft] = useState<Category | null>(null);
  const [collectionDraft, setCollectionDraft] = useState<Collection | null>(null);

  // If a category is selected, show its Collections view (Level 2)
  if (selectedCategory) {
    const activeCategory = categories.find((c) => c.id === selectedCategory.id) || selectedCategory;
    const catCollections = collections.filter((c) => c.categoryId === activeCategory.id);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            className="gap-2"
            onClick={() => setSelectedCategory(null)}
          >
            <ArrowLeft className="h-4 w-4" /> Back to Categories
          </Button>

          <Button
            className="rounded-full"
            onClick={() =>
              setCollectionDraft({
                id: "",
                categoryId: activeCategory.id,
                slug: "",
                name: "",
                banner: null,
                description: "",
                showInNav: true,
                sortOrder: catCollections.length + 1,
              })
            }
          >
            <Plus className="mr-2 h-4 w-4" /> Add Collection to {activeCategory.name}
          </Button>
        </div>

        <div className="rounded-xl border border-stone bg-card p-6 flex items-center justify-between">
          <div>
            <p className="eyebrow text-gold">Parent Category</p>
            <h2 className="font-display text-2xl mt-1">{activeCategory.name}</h2>
            <p className="text-xs text-ink-muted mt-0.5">
              Contains {catCollections.length} collections and{" "}
              {products.filter((p) => p.categoryId === activeCategory.id).length} total products.
            </p>
          </div>
          {activeCategory.banner && (
            <img
              src={activeCategory.banner.image}
              alt=""
              className="h-14 w-28 rounded-lg object-cover border border-stone"
            />
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-stone bg-card">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="border-b border-stone text-left text-xs tracking-[0.14em] uppercase text-ink-muted">
              <tr>
                <th className="px-4 py-3">Banner</th>
                <th className="px-4 py-3">Collection Name</th>
                <th className="px-4 py-3">Products</th>
                <th className="px-4 py-3">In Nav</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone">
              {catCollections.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-ink-muted text-sm">
                    No collections in {activeCategory.name} yet. Click "Add Collection" above.
                  </td>
                </tr>
              ) : (
                catCollections.map((col) => {
                  const count = products.filter((p) => p.collectionId === col.id).length;
                  return (
                    <tr key={col.id}>
                      <td className="px-4 py-3">
                        {col.banner?.image ? (
                          <img
                            src={col.banner.image}
                            alt=""
                            className="h-10 w-20 rounded-md object-cover border border-stone"
                          />
                        ) : (
                          <span className="text-xs text-ink-muted">No banner</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold">{col.name}</p>
                        {col.description && (
                          <p className="text-xs text-ink-muted truncate max-w-xs">{col.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium">{count} products</td>
                      <td className="px-4 py-3">
                        <Switch
                          checked={!!col.showInNav}
                          onCheckedChange={(checked) => saveCollection({ ...col, showInNav: checked })}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setCollectionDraft(col)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              if (confirm(`Delete collection "${col.name}"?`)) {
                                deleteCollection(col.id);
                                toast.success("Collection deleted.");
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Collection Dialog */}
        <Dialog open={!!collectionDraft} onOpenChange={(v) => !v && setCollectionDraft(null)}>
          <DialogContent className="max-w-lg">
            {collectionDraft && (
              <>
                <DialogHeader>
                  <DialogTitle className="font-display text-2xl">
                    {collectionDraft.id ? "Edit Collection" : "Add New Collection"}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="col-name">Collection Name *</Label>
                    <Input
                      id="col-name"
                      value={collectionDraft.name}
                      onChange={(e) => setCollectionDraft({ ...collectionDraft, name: e.target.value })}
                      placeholder="e.g. Sunglasses / Kids Glasses"
                      className="min-h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="col-desc">Short Description (optional)</Label>
                    <Input
                      id="col-desc"
                      value={collectionDraft.description || ""}
                      onChange={(e) => setCollectionDraft({ ...collectionDraft, description: e.target.value })}
                      placeholder="e.g. 100% UV polarized frames"
                      className="min-h-11"
                    />
                  </div>

                  <ImageUpload
                    label="Collection Banner Image"
                    optional
                    value={collectionDraft.banner?.image || null}
                    onChange={(img) =>
                      setCollectionDraft({
                        ...collectionDraft,
                        banner: img
                          ? {
                              image: img,
                              heading: collectionDraft.banner?.heading || collectionDraft.name,
                              subtext: collectionDraft.banner?.subtext || "",
                              ctaText: "Shop Collection",
                              ctaLink: `/${activeCategory.slug}`,
                            }
                          : null,
                      })
                    }
                  />

                  {collectionDraft.banner && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Banner Heading</Label>
                        <Input
                          value={collectionDraft.banner.heading}
                          onChange={(e) =>
                            setCollectionDraft({
                              ...collectionDraft,
                              banner: { ...collectionDraft.banner!, heading: e.target.value },
                            })
                          }
                          className="min-h-10"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Banner Subtext</Label>
                        <Input
                          value={collectionDraft.banner.subtext}
                          onChange={(e) =>
                            setCollectionDraft({
                              ...collectionDraft,
                              banner: { ...collectionDraft.banner!, subtext: e.target.value },
                            })
                          }
                          className="min-h-10"
                        />
                      </div>
                    </div>
                  )}

                  <label className="flex items-center justify-between rounded-lg border border-stone p-3 cursor-pointer">
                    <span className="text-sm font-semibold">Show in Navigation Menu</span>
                    <Switch
                      checked={!!collectionDraft.showInNav}
                      onCheckedChange={(v) => setCollectionDraft({ ...collectionDraft, showInNav: v })}
                    />
                  </label>

                  <Button
                    className="min-h-11 w-full rounded-full"
                    onClick={() => {
                      if (!collectionDraft.name.trim()) {
                        toast.error("Collection name is required.");
                        return;
                      }
                      saveCollection({
                        ...collectionDraft,
                        id: collectionDraft.id || newId("col"),
                        slug: collectionDraft.slug || slugify(collectionDraft.name),
                      });
                      setCollectionDraft(null);
                      toast.success("Collection saved successfully.");
                    }}
                  >
                    Save Collection
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Level 1: Categories View
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl">Categories (Level 1)</h2>
          <p className="text-xs text-ink-muted">
            Manage your store categories (Glasses, Lenses, etc.) with custom circular icon images and internal collections.
          </p>
        </div>
        <Button
          className="min-h-11 rounded-full"
          onClick={() => setCategoryDraft({ id: "", slug: "", name: "", image: null, banner: null })}
        >
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> Add Category
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-stone bg-card">
        <table className="w-full min-w-[620px] text-sm">
          <thead className="border-b border-stone text-left text-xs tracking-[0.14em] uppercase text-ink-muted">
            <tr>
              <th className="px-4 py-3">Icon / Image</th>
              <th className="px-4 py-3">Banner</th>
              <th className="px-4 py-3">Category Name</th>
              <th className="px-4 py-3">Collections</th>
              <th className="px-4 py-3">Total Products</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone">
            {categories.map((c) => {
              const catCols = collections.filter((col) => col.categoryId === c.id);
              const count = products.filter((p) => p.categoryId === c.id).length;
              return (
                <tr key={c.id} className="hover:bg-mist/30 transition-colors">
                  <td className="px-4 py-3">
                    {c.image ? (
                      <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-gold/60 shadow-xs">
                        <img
                          src={c.image}
                          alt={c.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-stone/40 flex items-center justify-center text-xs font-semibold text-ink-muted border border-stone">
                        {c.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {c.banner ? (
                      <img
                        src={c.banner.image}
                        alt=""
                        className="h-10 w-20 rounded-md object-cover border border-stone"
                      />
                    ) : (
                      <span className="text-xs text-ink-muted">No banner</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setSelectedCategory(c)}
                      className="font-semibold text-foreground hover:text-gold flex items-center gap-1.5 group text-left"
                    >
                      <span>{c.name}</span>
                      <ChevronRight className="h-4 w-4 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-full text-xs gap-1"
                      onClick={() => setSelectedCategory(c)}
                    >
                      <FolderTree className="h-3.5 w-3.5 text-gold" />
                      {catCols.length} Collections
                    </Button>
                  </td>
                  <td className="px-4 py-3">{count} items</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Edit category"
                        onClick={() => setCategoryDraft(c)}
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
                        <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={!!categoryDraft} onOpenChange={(v) => !v && setCategoryDraft(null)}>
        <DialogContent className="max-w-md">
          {categoryDraft && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">
                  {categoryDraft.id ? "Edit Category" : "New Category"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="c-name">Category Name *</Label>
                  <Input
                    id="c-name"
                    value={categoryDraft.name}
                    onChange={(e) => setCategoryDraft({ ...categoryDraft, name: e.target.value })}
                    placeholder="e.g. Glasses, Lenses"
                    className="min-h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="c-slug">Category Slug (URL path)</Label>
                  <Input
                    id="c-slug"
                    value={categoryDraft.slug}
                    onChange={(e) => setCategoryDraft({ ...categoryDraft, slug: slugify(e.target.value) })}
                    placeholder="e.g. glasses, lenses"
                    className="min-h-11 font-mono text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <ImageUpload
                    label="Category Circular Icon / Avatar Image"
                    value={categoryDraft.image || null}
                    onChange={(img) => setCategoryDraft({ ...categoryDraft, image: img })}
                  />
                  <p className="text-[11px] text-ink-muted">
                    This image will appear in the "Shop by Category" circular icons row on the Homepage.
                  </p>
                </div>

                <Button
                  className="min-h-11 w-full rounded-full"
                  onClick={() => {
                    if (!categoryDraft.name.trim()) {
                      toast.error("A category name is required.");
                      return;
                    }
                    saveCategory({
                      ...categoryDraft,
                      id: categoryDraft.id || newId("cat"),
                      slug: categoryDraft.slug?.trim() || slugify(categoryDraft.name),
                    });
                    setCategoryDraft(null);
                    toast.success("Category saved.");
                  }}
                >
                  Save Category
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
