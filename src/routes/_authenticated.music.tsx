import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { MusicStudioPage } from "@/components/music/MusicStudioPage";

const searchSchema = z.object({
  mode: z.enum(["song", "instrumental", "voiceover", "sfx", "video-music"]).optional(),
  videoUrl: z.string().url().optional(),
});

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
      { title: "Music Studio — MOTIO2EDIT" },
      {
        name: "description",
        content: "Create songs, instrumentals, voiceovers and sound effects with AI.",
      },
    ],
  }),
  component: MusicStudioPage,
});
