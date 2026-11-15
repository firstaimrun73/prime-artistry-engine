import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy Video Studio URL → unified Motion2AI workspace */
export const Route = createFileRoute("/studio/video")({
  beforeLoad: () => {
    throw redirect({ to: "/motion2ai", search: { mode: "video" } });
  },
  component: () => null,
});
