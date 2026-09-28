import { z } from "zod";

import { metaEventSchema } from "./meta-event-handler.server.ts";

const identifier = z.string().trim().min(1).max(100);
const nullableIdentifier = identifier.nullable();

export const orderSourceSchema = z.enum(["cart", "whatsapp"]);
export const orderStatusSchema = z.enum([
  "New",
  "Contacted",
  "Dispatched",
  "Completed",
  "Cancelled",
]);

export const orderCreateItemSchema = z.object({
  id: identifier,
  reference: z.string().trim().min(9).max(32),
  customerName: z.string().trim().min(2).max(120),
  contact: z.string().trim().min(3).max(320),
  productId: nullableIdentifier,
  productName: z.string().trim().min(1).max(200),
  variantId: nullableIdentifier,
  variantLabel: z.string().trim().max(200).nullable(),
  message: z.string().trim().min(1).max(2_000),
  source: orderSourceSchema,
});

export const createOrdersSchema = z
  .object({
    orders: z.array(orderCreateItemSchema).min(1).max(50),
    metaEvent: metaEventSchema.optional(),
  })
  .superRefine(({ orders }, ctx) => {
    const first = orders[0];
    if (!first) return;
    for (const [index, order] of orders.entries()) {
      if (order.reference !== first.reference) {
        ctx.addIssue({
          code: "custom",
          path: ["orders", index, "reference"],
          message: "All order items must share one reference.",
        });
      }
      if (order.customerName !== first.customerName || order.contact !== first.contact) {
        ctx.addIssue({
          code: "custom",
          path: ["orders", index],
          message: "All order items must belong to one customer.",
        });
      }
    }
  });

export const updateOrderSchema = z
  .object({
    status: orderStatusSchema.optional(),
    courierName: z.string().trim().max(100).nullable().optional(),
    trackingNumber: z.string().trim().max(150).nullable().optional(),
    stockDeducted: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one order field is required.",
  });

export type CreateOrdersInput = z.infer<typeof createOrdersSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    requestId: string;
  };
}
