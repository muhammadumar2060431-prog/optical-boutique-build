export const metaEventNames = [
  "PageView",
  "ViewContent",
  "AddToCart",
  "InitiateCheckout",
  "Purchase",
  "Lead",
  "CompleteRegistration",
] as const;

export type MetaEventName = (typeof metaEventNames)[number];

export interface MetaUserDataInput {
  email?: string | undefined;
  phone?: string | undefined;
  firstName?: string | undefined;
  lastName?: string | undefined;
  city?: string | undefined;
  state?: string | undefined;
  zip?: string | undefined;
  country?: string | undefined;
  externalId?: string | undefined;
}

export interface MetaCustomDataInput {
  value?: number | undefined;
  currency?: string | undefined;
  contentIds?: string[] | undefined;
  contentType?: string | undefined;
  contentName?: string | undefined;
  numItems?: number | undefined;
}

export interface MetaEventInput {
  eventName: MetaEventName;
  eventId: string;
  eventSourceUrl: string;
  userData?: MetaUserDataInput | undefined;
  customData?: MetaCustomDataInput | undefined;
}
