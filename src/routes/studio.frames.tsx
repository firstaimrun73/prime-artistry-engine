/**
 * Motio2edit Frames Studio — route entry.
 * UI: Apply → result (Download / Share / Watermark). Tools only after upload.
 */
import { createFileRoute } from "@tanstack/react-router";
import { FramesPage } from "@/components/frames/FramesPage";

export const Route = createFileRoute("/studio/frames")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Frames — Motio2edit" },
      { name: "description", content: "Premium photo frames — original Motio2edit designs." },
    ],
  }),
  component: FramesPage,
});
