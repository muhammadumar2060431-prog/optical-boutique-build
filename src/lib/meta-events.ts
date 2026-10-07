import type {
  MetaCustomDataInput,
  MetaEventInput,
  MetaEventName,
  MetaUserDataInput,
} from "./meta-events.types";
import { buildMetaCustomData } from "./meta-custom-data.ts";

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    fbq?: (...args: unknown[]) => void;
  }
}

interface TrackMetaEventOptions {
  eventName: MetaEventName;
  eventId?: string;
  eventSourceUrl?: string;
  userData?: MetaUserDataInput;
  customData?: MetaCustomDataInput;
}

export function createMetaEventId(prefix: string) {
  const id =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}:${id}`;
}

export function splitMetaName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

export function trackMetaBrowserEvent(input: TrackMetaEventOptions) {
  const eventId = input.eventId ?? createMetaEventId(input.eventName.toLowerCase());
  const customData = buildMetaCustomData(input.customData);

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: "meta_event",
    event_name: input.eventName,
    event_id: eventId,
    ...input.customData,
    ...customData,
  });

  if (typeof window.fbq === "function") {
    window.fbq("track", input.eventName, customData, { eventID: eventId });
  }
  return eventId;
}

export function trackMetaEvent(input: TrackMetaEventOptions) {
  const eventId = trackMetaBrowserEvent(input);
  const event: MetaEventInput = {
    eventName: input.eventName,
    eventId,
    eventSourceUrl: input.eventSourceUrl ?? window.location.href,
    ...(input.userData ? { userData: input.userData } : {}),
    ...(input.customData ? { customData: input.customData } : {}),
  };

  void (async () => {
    // The GTM Pixel loads asynchronously; let its existing matching cookie arrive.
    const hasCustomerData =
      input.userData?.email || input.userData?.phone || input.userData?.externalId;
    if (!hasCustomerData) {
      for (let attempt = 0; attempt < 15; attempt++) {
        if (/(?:^|;\s*)_fb[pc]=/.test(document.cookie)) break;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    await fetch("/api/v1/meta/events", {
      method: "POST",
      credentials: "same-origin",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });
  })().catch(() => {
    // Analytics must never interrupt the customer action.
  });

  return eventId;
}
