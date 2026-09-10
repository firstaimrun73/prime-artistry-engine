import { createFileRoute } from "@tanstack/react-router";
import { FramesStudio } from "@/components/frames/FramesStudio";

export const Route = createFileRoute("/studio/frames")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Frames — Motio2edit" },
      {
        name: "description",
        content:
          "Frame · Glass — turn your photo into a finished framed presentation. Deterministic composition, no AI regeneration.",
      },
      { property: "og:title", content: "Frames — Motio2edit" },
    ],
  }),
  component: FramesPage,
});

function FramesPage() {
  return <FramesStudio />;
}
