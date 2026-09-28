import type {
  MetaCustomDataInput,
  MetaEventInput,
  MetaEventName,
  MetaUserDataInput,
} from "./meta-events.types";

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
  const customData = input.customData ?? {};

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: "meta_event",
    event_name: input.eventName,
    event_id: eventId,
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

  void fetch("/api/v1/meta/events", {
    method: "POST",
    credentials: "same-origin",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
  }).catch(() => {
    // Analytics must never interrupt the customer action.
  });

  return eventId;
}
