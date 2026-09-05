/**
 * MUSIC gallery — Motion2AI Creation.
 * Visual covers + tiny SAMPLE label. No caption, no Info, no provider names.
 * Click → /sample/$id.
 */
import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Music } from "lucide-react";
import track1 from "@/assets/samples/track-1.mp3.asset.json";
import track2 from "@/assets/samples/track-2.mp3.asset.json";
import track3 from "@/assets/samples/track-3.mp3.asset.json";
import { useTheme } from "@/lib/theme";
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
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <section className="space-y-4" data-creation-section="music">
      <h3 className="flex items-center gap-1.5 text-[14px] font-bold tracking-tight">
        <Music className="h-4 w-4" />
        Music
      </h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
        {tracks.map((t) => (
          <article key={t.id} className="group overflow-hidden rounded-3xl">
            <Link
              to="/sample/$id"
              params={{ id: t.id }}
              className="relative block aspect-square overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              aria-label={`Open ${t.title}`}
            >
              <img
                src={t.cover}
                alt={`${t.title} cover`}
                className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                loading="lazy"
              />
            </Link>
            <p
              className={cn(
                "px-1.5 pt-1.5 text-[9px] font-semibold uppercase tracking-[0.14em]",
                isDark ? "text-white/45" : "text-black/40",
              )}
            >
              Sample
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
