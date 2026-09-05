/**
 * MUSIC gallery — Motion2AI Creation.
 * Cover art only. No SAMPLE caption. Premium tokens shared with image/video.
 */
import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Music } from "lucide-react";
import track1 from "@/assets/samples/track-1.mp3.asset.json";
import track2 from "@/assets/samples/track-2.mp3.asset.json";
import track3 from "@/assets/samples/track-3.mp3.asset.json";
import { cn } from "@/lib/utils";

type TrackCard = {
  id: string;
  title: string;
  description: string;
  url: string;
  cover: string;
};

const TRACKS: TrackCard[] = [
  {
    id: "music-neon-skyline",
    title: "Neon Skyline",
    description:
      "A cinematic electronic bed from Music Studio — suitable for motion and trailers.",
    url: track1.url as string,
    cover: "/demo/music/cover-vinyl.jpg",
  },
  {
    id: "music-golden-hour",
    title: "Golden Hour Drift",
    description:
      "A lo-fi chill track with soft pads from Music Studio for ambient and social cuts.",
    url: track2.url as string,
    cover: "/demo/music/cover-waveform.jpg",
  },
  {
    id: "music-heritage",
    title: "Heritage Strings",
    description:
      "Orchestral colour from Music Studio — strings-forward mood for narrative scenes.",
    url: track3.url as string,
    cover: "/demo/music/cover-studio.jpg",
  },
];

export function MusicStudioGallery() {
  const tracks = useMemo(() => TRACKS, []);

  return (
    <section className="space-y-4" data-creation-section="music">
      <h3 className="flex items-center gap-1.5 text-[14px] font-bold tracking-tight">
        <Music className="h-4 w-4" />
        Music
      </h3>
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
        {tracks.map((t) => (
          <article
            key={t.id}
            className={cn(
              "group overflow-hidden rounded-2xl border border-border/60 bg-transparent shadow-sm",
              "transition-[transform,box-shadow,opacity] duration-180 ease-out",
              "hover:scale-[1.015] hover:shadow-md active:scale-[0.985] active:opacity-95",
            )}
          >
            <Link
              to="/sample/$id"
              params={{ id: t.id }}
              className="relative block aspect-square overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              aria-label={`Open ${t.title}`}
            >
              <img
                src={t.cover}
                alt={`${t.title} cover`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
