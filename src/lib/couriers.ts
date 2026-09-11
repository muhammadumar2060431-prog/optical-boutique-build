export interface CourierConfig {
  id: string;
  name: string;
  shortName: string;
  trackingUrlTemplate: string | null;
  website: string;
}

export const SUPPORTED_COURIERS: CourierConfig[] = [
  {
    id: "tcs",
    name: "TCS Express",
    shortName: "TCS",
    trackingUrlTemplate: "https://www.tcsexpress.com/track/{TRACKING_NO}",
    website: "https://www.tcsexpress.com",
  },
  {
    id: "leopards",
    name: "Leopards Courier",
    shortName: "Leopards",
    trackingUrlTemplate: "https://leopardscourier.com/leopards-tracking/?track_no={TRACKING_NO}",
    website: "https://leopardscourier.com",
  },
  {
    id: "trax",
    name: "Trax Logistics",
    shortName: "Trax",
    trackingUrlTemplate: "https://trax.pk/tracking/?tracking_no={TRACKING_NO}",
    website: "https://trax.pk",
  },
  {
    id: "callcourier",
    name: "Call Courier",
    shortName: "Call Courier",
    trackingUrlTemplate: "https://callcourier.com.pk/tracking/?tc={TRACKING_NO}",
    website: "https://callcourier.com.pk",
  },
  {
    id: "postex",
    name: "PostEx",
    shortName: "PostEx",
    trackingUrlTemplate: "https://postex.pk/tracking?cn={TRACKING_NO}",
    website: "https://postex.pk",
  },
  {
    id: "mnp",
    name: "M&P Express Logistics",
    shortName: "M&P",
    trackingUrlTemplate: "https://mulphilog.com/tracking?track={TRACKING_NO}",
    website: "https://mulphilog.com",
  },
  {
    id: "rider",
    name: "Direct Rider / In-City Delivery",
    shortName: "Rider",
    trackingUrlTemplate: null,
    website: "",
  },
  {
    id: "other",
    name: "Other Courier",
    shortName: "Other",
    trackingUrlTemplate: null,
    website: "",
  },
];

export function getCourierById(id?: string | null): CourierConfig | undefined {
  if (!id) return undefined;
  return SUPPORTED_COURIERS.find(
    (c) =>
      c.id.toLowerCase() === id.toLowerCase() ||
      c.name.toLowerCase() === id.toLowerCase() ||
      c.shortName.toLowerCase() === id.toLowerCase(),
  );
}

export function getCourierTrackingUrl(
  courierName?: string | null,
  trackingNumber?: string | null,
): string | null {
  if (!trackingNumber || !trackingNumber.trim()) return null;
  const cleanNumber = trackingNumber.trim();

  const courier = getCourierById(courierName);
  if (courier && courier.trackingUrlTemplate) {
    return courier.trackingUrlTemplate.replace("{TRACKING_NO}", encodeURIComponent(cleanNumber));
  }

  // If the tracking number is already a full URL
  if (cleanNumber.startsWith("http://") || cleanNumber.startsWith("https://")) {
    return cleanNumber;
  }

  return null;
}
