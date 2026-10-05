import { z } from "zod";

import { sendMetaEvent } from "../meta-capi.server.ts";
import { metaEventNames } from "../meta-events.types.ts";
import { json, readJsonBody } from "./http.server.ts";

const optionalUserValue = z.string().trim().min(1).max(320).optional();

export const metaEventSchema = z.object({
  eventName: z.enum(metaEventNames),
  eventId: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9._:-]{8,128}$/),
  eventSourceUrl: z.string().url().max(2_048),
  userData: z
    .object({
      email: optionalUserValue,
      phone: optionalUserValue,
      firstName: optionalUserValue,
      lastName: optionalUserValue,
      city: optionalUserValue,
      state: optionalUserValue,
      zip: optionalUserValue,
      country: optionalUserValue,
      externalId: optionalUserValue,
    })
    .optional(),
  customData: z
    .object({
      value: z.number().finite().nonnegative().optional(),
      currency: z.string().trim().min(3).max(3).optional(),
      contentIds: z.array(z.string().trim().min(1).max(200)).max(100).optional(),
      contentType: z.string().trim().min(1).max(100).optional(),
      contentName: z.string().trim().min(1).max(300).optional(),
      numItems: z.number().int().nonnegative().max(10_000).optional(),
    })
    .optional(),
});

export async function metaEventHandler(request: Request) {
  const input = metaEventSchema.parse(await readJsonBody(request, 50_000));
  const result = await sendMetaEvent(input, request);
  return json({ accepted: result.ok, eventId: input.eventId }, { status: result.ok ? 202 : 502 });
}
