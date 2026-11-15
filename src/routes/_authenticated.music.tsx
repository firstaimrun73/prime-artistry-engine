import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy /music → unified Motion2AI workspace */
export const Route = createFileRoute("/_authenticated/music")({
  beforeLoad: () => {
    throw redirect({ to: "/motion2ai", search: { mode: "music" } });
  },
  component: () => null,
});
