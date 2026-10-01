import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { MusicStudioPage } from "@/components/music/MusicStudioPage";

const searchSchema = z.object({
  mode: z.enum(["song", "instrumental", "bgm", "voiceover", "sfx", "video-music", "video_music"]).optional(),
  videoUrl: z.string().url().optional(),
});

function MusicRoutePage() {
  return <MusicStudioPage />;
}

export const Route = createFileRoute("/_authenticated/music")({
  validateSearch: (s) => {
    try {
      return searchSchema.parse(s);
    } catch {
      return {};
    }
  },
  head: () => ({
    meta: [
      { title: "Music Studio — Motio2edit" },
      {
        name: "description",
        content:
          "Motio2edit Music Studio: create songs, instrumentals, BGM, AI voice narration, sound effects, and video soundtracks — with plan-based quality, duration, and voice limits.",
      },
    ],
  }),
  component: MusicRoutePage,
});
