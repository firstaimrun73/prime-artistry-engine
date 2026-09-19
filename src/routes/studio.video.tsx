/**
 * Motio2edit Video Studio v2 — route (Phase D restore).
 */
import { createFileRoute } from "@tanstack/react-router";
import { VideoStudioPage } from "@/components/video/VideoStudioPage";

export const Route = createFileRoute("/studio/video")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Video Studio — Motio2edit" },
      { name: "description", content: "Create AI video from text, image, or video." },
    ],
  }),
  component: VideoStudioPage,
});
