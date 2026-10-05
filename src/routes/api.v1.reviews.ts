import { createFileRoute } from "@tanstack/react-router";

import { productReviewHandler } from "@/lib/api/engagement.server";
import { withApi } from "@/lib/api/http.server";

const createReview = withApi(({ request }) => productReviewHandler(request), {
  name: "api.v1.reviews.create",
  methods: ["POST"],
  rateLimit: { max: 3, windowMs: 60 * 60_000 },
});

export const Route = createFileRoute("/api/v1/reviews")({
  server: {
    handlers: {
      POST: createReview,
      OPTIONS: createReview,
    },
  },
});
