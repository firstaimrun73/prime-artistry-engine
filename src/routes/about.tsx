import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * About Product page removed from the public product surface.
 * Keep the route file so the route tree stays valid; send visitors home.
 */
export const Route = createFileRoute("/about")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  component: () => null,
});
