/**
 * Circle 2edit — SEE ARTIFACT CRITICAL-circle-remove-FULL.tsx if this is still a stub.
 * Temporary bootstrap until full file lands.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

type CircleSearch = {
  mode?: "add" | "remove";
  assetId?: string;
  sampleId?: string;
  from?: "home" | "info" | "sample";
};

export const Route = createFileRoute("/studio/image/circle-remove")({
  ssr: false,
  validateSearch: (raw: Record<string, unknown>): CircleSearch => {
    const mode = raw.mode === "add" || raw.mode === "remove" ? raw.mode : undefined;
    const assetId =
      typeof raw.assetId === "string" && raw.assetId.length > 0 && raw.assetId.length <= 120
        ? raw.assetId
        : undefined;
    const sampleId =
      typeof raw.sampleId === "string" && raw.sampleId.length > 0 && raw.sampleId.length <= 80
        ? raw.sampleId
        : undefined;
    const from =
      raw.from === "home" || raw.from === "info" || raw.from === "sample" ? raw.from : undefined;
    return { mode, assetId, sampleId, from };
  },
  component: Circle2editBootstrap,
  head: () => ({
    meta: [
      { title: "Circle 2edit — Motio2edit" },
      { name: "description", content: "Circle 2edit — circle to remove or add objects." },
    ],
  }),
});

/**
 * Bootstrap only — the complete 817-line editor is in repo history at
 * ee3e08fda2c2d5a1a10ffecd39e6a59a837f27c8 and in agent artifacts
 * CRITICAL-circle-remove-FULL.tsx. Replace this file with that content.
 */
function Circle2editBootstrap() {
  useEffect(() => {
    console.error(
      "[Circle 2edit] Full editor file not deployed. Replace studio.image.circle-remove.tsx with CRITICAL-circle-remove-FULL.tsx from the agent artifacts or git show ee3e08f:src/routes/studio.image.circle-remove.tsx",
    );
  }, []);
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <h1 className="text-xl font-bold text-[#7B6FE0]">Circle 2edit</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Editor source is ready in deployment artifacts. Apply the full route file from
        commit ee3e08f (817 lines) to enable the complete Circle 2edit experience.
      </p>
      <a
        className="text-sm font-semibold text-[#7B6FE0] underline"
        href="https://github.com/firstaimrun73/prime-artistry-engine/blob/ee3e08fda2c2d5a1a10ffecd39e6a59a837f27c8/src/routes/studio.image.circle-remove.tsx"
      >
        View known-good source on GitHub
      </a>
    </div>
  );
}
