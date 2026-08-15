import { createFileRoute, redirect } from "@tanstack/react-router";

// EMERGENCY STUB — full editor restored in next commit
export const Route = createFileRoute("/_authenticated/editor")({
  beforeLoad: () => {
    throw redirect({ to: "/studio/image" });
  },
  component: () => null,
});
