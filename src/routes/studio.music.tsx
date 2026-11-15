import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy Music Studio URL → unified Motion2AI workspace */
export const Route = createFileRoute("/studio/music")({
  beforeLoad: () => {
    throw redirect({ to: "/motion2ai", search: { mode: "music" } });
  },
  component: () => null,
});
