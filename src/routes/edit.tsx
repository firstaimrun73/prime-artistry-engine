import { createFileRoute } from "@tanstack/react-router";
import EditPage from "@/pages/EditPage";

export const Route = createFileRoute("/edit")({
  head: () => ({
    meta: [
      { title: "Edit — MOTIO2EDIT" },
      {
        name: "description",
        content: "AI-powered image and video editing with MOTIO2EDIT.",
      },
      { property: "og:title", content: "Edit — MOTIO2EDIT" },
      {
        property: "og:description",
        content: "AI-powered image and video editing with MOTIO2EDIT.",
      },
    ],
  }),
  component: EditPage,
});
