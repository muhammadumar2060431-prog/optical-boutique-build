import type { CreateProductReviewInput } from "./contracts.ts";

export function createReviewRecord(
  input: CreateProductReviewInput,
  id: string,
  createdAt: string,
  reviewImage: string | null,
) {
  const title = input.title || "Customer Review";
  return {
    record: {
      id,
      source: "customer",
      name: input.name,
      email: input.email,
      product_id: input.productId,
      product_name: input.productName,
      title,
      review: input.quote,
      rating: input.rating,
      avatar: reviewImage,
      verified: false,
      enabled: true,
      sort_order: 0,
      created_at: createdAt,
    },
    response: {
      id,
      source: "customer",
      name: input.name,
      productId: input.productId,
      productName: input.productName,
      title,
      quote: input.quote,
      rating: input.rating,
      photo: reviewImage,
      reviewImage,
      verified: false,
      createdAt,
    },
  };
}
