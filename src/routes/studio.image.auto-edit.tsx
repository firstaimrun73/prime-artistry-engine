/**
 * Maluto AI 1.8 — Auto Edit product page
 */
import { createFileRoute } from "@tanstack/react-router";
import { AutoEditPage } from "@/components/auto-edit/AutoEditPage";

export const Route = createFileRoute("/studio/image/auto-edit")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Maluto AI 1.8 Auto Edit — Motio2edit" },
      {
        name: "description",
        content:
          "Maluto AI 1.8 Auto Edit — upload one photo for automatic restoration and correction powered by Motio2edit.",
      },
    ],
  }),
  component: AutoEditPage,
});
