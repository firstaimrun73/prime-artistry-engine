/**
 * Circle 2edit — /studio/image/circle-remove
 * Full implementation in studio.image.circle-remove.impl.tsx (restored from ee3e08f).
 */
import { createFileRoute } from "@tanstack/react-router";
import { Circle2editPage } from "./studio.image.circle-remove.impl";

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
  component: Circle2editPage,
  head: () => ({
    meta: [
      { title: "Circle 2edit — Motio2edit" },
      { name: "description", content: "Circle 2edit — circle to remove or add objects." },
    ],
  }),
});
