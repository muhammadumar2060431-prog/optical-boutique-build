import type { MetaCustomDataInput } from "./meta-events.types.ts";

export function buildMetaCustomData(input: MetaCustomDataInput | undefined) {
  const data: Record<string, unknown> = {};
  if (!input) return data;
  if (input.value !== undefined) data["value"] = input.value;
  if (input.currency) data["currency"] = input.currency.trim().toUpperCase();
  if (input.contentIds?.length) data["content_ids"] = input.contentIds;
  if (input.contentType) data["content_type"] = input.contentType;
  if (input.contentName) data["content_name"] = input.contentName;
  if (input.numItems !== undefined) data["num_items"] = input.numItems;
  return data;
}
