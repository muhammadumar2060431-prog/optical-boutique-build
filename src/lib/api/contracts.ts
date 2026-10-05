import { z } from "zod";

import { metaEventSchema } from "./meta-event-handler.server.ts";

const identifier = z.string().trim().min(1).max(100);
const nullableIdentifier = identifier.nullable();

const orderSourceSchema = z.enum(["cart", "whatsapp"]);
const orderStatusSchema = z.enum(["New", "Contacted", "Dispatched", "Completed", "Cancelled"]);

const contactMethodSchema = z
  .string()
  .trim()
  .min(3)
  .max(320)
  .refine(
    (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) || /^[+0-9][0-9\s-]{7,}$/.test(value),
    "Enter a valid phone number or email address.",
  );

export const createContactQuerySchema = z.object({
  name: z.string().trim().min(2).max(120),
  contact: contactMethodSchema,
  productId: identifier.nullable().optional().default(null),
  productName: z.string().trim().min(1).max(200),
  message: z.string().trim().min(8).max(2_000),
});

export type CreateContactQueryInput = z.infer<typeof createContactQuerySchema>;
export const createSubscriberSchema = z.object({
  email: z.string().trim().email().max(320),
});

export type CreateSubscriberInput = z.infer<typeof createSubscriberSchema>;

export const createProductReviewSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(320),
  productId: identifier,
  productName: z.string().trim().min(1).max(200),
  title: z.string().trim().max(140).optional().default("Customer Review"),
  quote: z.string().trim().min(8).max(2_000),
  rating: z.number().int().min(1).max(5),
  reviewImage: z
    .string()
    .trim()
    .max(7_000_000)
    .nullable()
    .optional()
    .refine(
      (value) => !value || value.startsWith("data:image/") || /^https?:\/\//i.test(value),
      "Review image must be an image upload or URL.",
    )
    .default(null),
});

export type CreateProductReviewInput = z.infer<typeof createProductReviewSchema>;

const orderCreateItemSchema = z.object({
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
  quantity: z.number().int().min(1).max(999).optional(),
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
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one order field is required.",
  });

export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
