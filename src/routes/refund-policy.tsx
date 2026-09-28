import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/refund-policy")({
  beforeLoad: () => {
    throw redirect({ to: "/returns-policy", replace: true });
  },
});
