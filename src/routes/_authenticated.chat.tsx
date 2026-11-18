import { createFileRoute, redirect } from "@tanstack/react-router";

/** Chat page removed from Motio2edit product navigation. */
export const Route = createFileRoute("/_authenticated/chat")({
  beforeLoad: () => {
    throw redirect({ to: "/support" });
  },
  component: () => null,
});
