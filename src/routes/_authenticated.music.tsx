import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { MusicStudioPage } from "@/components/music/MusicStudioPage";
import { StudioBackLink } from "@/components/StudioBackLink";

const searchSchema = z.object({
  mode: z.enum(["song", "instrumental", "voiceover", "sfx", "video-music"]).optional(),
  videoUrl: z.string().url().optional(),
});

function MusicRoutePage() {
  return (
    <>
      <div className="mx-auto w-full min-w-0 max-w-6xl px-4 pt-4 sm:px-6 lg:max-w-7xl lg:px-8">
        <StudioBackLink />
      </div>
      <MusicStudioPage />
    </>
  );
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
      { title: "Music Studio — MOTIO2EDIT" },
      {
        name: "description",
        content: "Create songs, instrumentals, voiceovers and sound effects with AI.",
      },
    ],
  }),
  component: MusicRoutePage,
});
