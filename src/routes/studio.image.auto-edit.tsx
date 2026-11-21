/**
 * Maluto AI — Auto Edit product page
 */
import { createFileRoute } from "@tanstack/react-router";
import { AutoEditPage } from "@/components/auto-edit/AutoEditPage";

export const Route = createFileRoute("/studio/image/auto-edit")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Maluto AI — Motio2edit" },
      {
        name: "description",
        content:
          "Maluto AI — upload one photo for automatic intelligent restoration powered by Motio2edit.",
      },
    ],
  }),
  component: AutoEditPage,
});
