import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Music page consolidation: the Music Studio editor at /music is the single
 * music page. This legacy route keeps old links working by redirecting.
 */
export const Route = createFileRoute("/studio/music")({
  beforeLoad: () => {
    throw redirect({ to: "/music" });
  },
  component: () => null,
});
