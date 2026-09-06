/**
 * Maluto AI — Auto Edit product page
 */
import { createFileRoute } from "@tanstack/react-router";
import { AutoEditPage } from "@/components/auto-edit/AutoEditPage";

export const Route = createFileRoute("/studio/image/auto-edit")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Maluto AI Auto Edit — Motio2edit" },
      {
        name: "description",
        content:
          "Maluto AI Auto Edit — upload one photo, one click enhancement powered by Motio2edit.",
      },
    ],
  }),
  component: AutoEditPage,
});
