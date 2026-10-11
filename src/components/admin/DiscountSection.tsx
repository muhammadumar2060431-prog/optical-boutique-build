import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, LoaderCircle, Percent, Power, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import {
  emptyDiscountCampaign,
  validateDiscountCampaign,
  type DiscountCampaign,
} from "@/lib/discounts";
import { isProductDataQuery } from "@/lib/product-selection-query";
import { invalidatePublicStorefront } from "@/lib/storefront-invalidate";

export function DiscountSection() {
  const { categories, isAdmin } = useStore();
  const client = useQueryClient();
  const [draft, setDraft] = useState<DiscountCampaign>(emptyDiscountCampaign);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const campaign = useQuery({
    queryKey: ["discount-campaign"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("discount_campaigns")
        .select("*")
        .eq("id", "default")
        .single();
      if (error) throw new Error("Discount settings could not be loaded. Please retry.");
      return {
        enabled: data.enabled,
        mode: data.mode,
        percentage: Number(data.percentage),
        categories: data.category_rates,
      } as DiscountCampaign;
    },
  });
  useEffect(() => {
    if (campaign.data && !dirty) setDraft(campaign.data);
  }, [campaign.data, dirty]);

  const edit = (next: DiscountCampaign) => {
    setDraft(next);
    setDirty(true);
  };
  const save = async (next: DiscountCampaign) => {
    if (saving) return;
    try {
      validateDiscountCampaign(next);
      setSaving(true);
      const categoryRates = Object.fromEntries(
        Object.entries(next.categories).filter(([id]) =>
          categories.some((category) => category.id === id),
        ),
      );
      const { data, error } = await supabase.rpc("save_discount_campaign_v1", {
        p_enabled: next.enabled,
        p_mode: next.mode,
        p_percentage: next.percentage,
        p_category_rates: categoryRates,
      });
      if (error) throw new Error(error.message);
      const saved: DiscountCampaign = {
        enabled: data.enabled,
        mode: data.mode,
        percentage: Number(data.percentage),
        categories: data.category_rates,
      };
      setDraft(saved);
      setDirty(false);
      client.setQueryData(["discount-campaign"], saved);
      const [, refreshed] = await Promise.all([
        client.invalidateQueries({
          predicate: (query) =>
            isProductDataQuery(query.queryKey) || query.queryKey[0] === "cart-products",
        }),
        invalidatePublicStorefront(supabase),
      ]);
      toast.success(
        saved.enabled
          ? "Discounts applied to all matching products."
          : "Discounts turned off. Previous product prices restored.",
      );
      if (!refreshed) toast.warning("Discounts saved. Storefront refresh is delayed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Discounts could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const unavailable = saving || !campaign.data || campaign.isError;
  return (
    <section className="border-y border-zinc-300 py-5" aria-labelledby="discount-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="discount-heading" className="flex items-center gap-2 text-lg font-semibold">
          <Percent className="h-5 w-5" /> Bulk Discounts
        </h2>
        <span className="text-sm font-medium">
          {campaign.data?.enabled
            ? `${campaign.data.mode === "upto" ? "Up to " : ""}${campaign.data.percentage}% off`
            : "Off"}
        </span>
      </div>
      {campaign.isPending ? (
        <p role="status" className="mt-4 text-sm">
          Loading discount settings...
        </p>
      ) : campaign.isError ? (
        <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 text-sm text-red-700">
          <span>{campaign.error.message}</span>
          <Button variant="outline" size="sm" onClick={() => void campaign.refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Retry
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-end gap-5">
            <div className="space-y-2">
              <Label>Discount type</Label>
              <div className="flex" role="group" aria-label="Discount type">
                {(["flat", "upto"] as const).map((mode) => (
                  <Button
                    key={mode}
                    type="button"
                    variant={draft.mode === mode ? "default" : "outline"}
                    className="rounded-none first:rounded-l-md last:rounded-r-md"
                    aria-pressed={draft.mode === mode}
                    disabled={saving}
                    onClick={() => edit({ ...draft, mode })}
                  >
                    {mode === "flat" ? "Flat" : "Up to"}
                  </Button>
                ))}
              </div>
            </div>
            <div className="w-36 space-y-2">
              <Label htmlFor="bulk-percentage">All products (%)</Label>
              <Input
                id="bulk-percentage"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={Number.isNaN(draft.percentage) ? "" : draft.percentage}
                disabled={saving}
                onChange={(event) =>
                  edit({
                    ...draft,
                    percentage: event.target.value === "" ? NaN : Number(event.target.value),
                  })
                }
              />
            </div>
            <div className="flex h-10 items-center gap-2">
              <Switch
                id="bulk-enabled"
                className="min-h-5!"
                checked={draft.enabled}
                disabled={saving}
                onCheckedChange={(enabled) => edit({ ...draft, enabled })}
              />
              <Label htmlFor="bulk-enabled">Enabled</Label>
            </div>
          </div>
          <div className="mt-5 divide-y divide-zinc-200">
            {categories.map((category) => {
              const override = Object.hasOwn(draft.categories, category.id);
              const rate = draft.categories[category.id];
              return (
                <div
                  key={category.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_180px_140px]"
                >
                  <Label htmlFor={`discount-override-${category.id}`} className="break-words">
                    {category.name}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`discount-override-${category.id}`}
                      className="min-h-5!"
                      checked={override}
                      disabled={saving}
                      onCheckedChange={(checked) => {
                        const rates = { ...draft.categories };
                        if (checked)
                          rates[category.id] = Number.isFinite(draft.percentage)
                            ? draft.percentage
                            : 0;
                        else delete rates[category.id];
                        edit({ ...draft, categories: rates });
                      }}
                    />
                    <span className="text-xs">Custom rate</span>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    {override ? (
                      <Input
                        aria-label={`${category.name} discount percentage`}
                        type="number"
                        min="0"
                        max={draft.mode === "upto" ? draft.percentage : 100}
                        step="0.01"
                        value={Number.isNaN(rate) ? "" : rate}
                        disabled={saving}
                        onChange={(event) =>
                          edit({
                            ...draft,
                            categories: {
                              ...draft.categories,
                              [category.id]:
                                event.target.value === "" ? NaN : Number(event.target.value),
                            },
                          })
                        }
                      />
                    ) : (
                      <span className="text-sm text-zinc-600">
                        {Number.isFinite(draft.percentage) ? draft.percentage : "-"}%
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button disabled={unavailable || !dirty} onClick={() => void save(draft)}>
              {saving ? (
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}{" "}
              Apply discounts
            </Button>
            <Button
              variant="outline"
              disabled={unavailable || !campaign.data?.enabled}
              onClick={() => void save({ ...campaign.data!, enabled: false })}
            >
              <Power className="mr-2 h-4 w-4" /> Turn off
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
