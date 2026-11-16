import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Dashboard removed from product nav — history lives in Studio, account in Profile.
 * Keep this route so old links do not 404.
 */
export const Route = createFileRoute("/_authenticated/dashboard")({
  beforeLoad: () => {
    throw redirect({ to: "/studio" });
  },
  component: () => null,
});
