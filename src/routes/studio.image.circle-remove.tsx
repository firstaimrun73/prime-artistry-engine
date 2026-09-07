/**
 * Circle 2edit — /studio/image/circle-remove
 * TEMP RESTORE MARKER - full content follows in next commit if truncated
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/studio/image/circle-remove")({
  ssr: false,
  validateSearch: (raw: Record<string, unknown>) => ({
    mode: raw.mode === "add" || raw.mode === "remove" ? raw.mode : undefined,
    assetId: typeof raw.assetId === "string" ? raw.assetId : undefined,
    sampleId: typeof raw.sampleId === "string" ? raw.sampleId : undefined,
    from: raw.from === "home" || raw.from === "info" || raw.from === "sample" ? raw.from : undefined,
  }),
  beforeLoad: () => {
    // Emergency: do not land on broken partial — send user home until full restore
    throw redirect({ to: "/" });
  },
  component: () => null,
});
