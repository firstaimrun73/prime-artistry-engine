import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * In-app Chat page removed from the product.
 * Keep the authenticated route slot; send users to Support.
 */
export const Route = createFileRoute("/_authenticated/chat")({
  beforeLoad: () => {
    throw redirect({ to: "/support" });
  },
  component: () => null,
});
