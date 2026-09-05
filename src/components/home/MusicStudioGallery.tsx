/**
 * MUSIC gallery — Motion2AI Creation.
 * Large editorial cover cards. Click → /sample/$id.
 * No provider names. No Download/Share/Audio meta on homepage.
 */
import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Info, Music } from "lucide-react";
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
      "A cinematic electronic bed from Motio2edit Music Studio — suitable for motion and trailers.",
    url: track1.url as string,
    cover: "/demo/music/cover-vinyl.jpg",
  },
  {
    id: "music-golden-hour",
    title: "Golden Hour Drift",
    description:
      "A lo-fi chill track with soft pads from Motio2edit Music Studio for ambient and social cuts.",
    url: track2.url as string,
    cover: "/demo/music/cover-waveform.jpg",
  },
  {
    id: "music-heritage",
    title: "Heritage Strings",
    description:
      "Orchestral colour from Motio2edit Music Studio — strings-forward mood for narrative scenes.",
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
      {/* 1 col mobile (large cover), 2–3 on larger screens */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
        {tracks.map((t) => (
          <article
            key={t.id}
            className={cn(
              "overflow-hidden rounded-3xl",
              isDark ? "bg-white/[0.03]" : "bg-black/[0.03]",
            )}
          >
            <Link
              to="/sample/$id"
              params={{ id: t.id }}
              className="relative block aspect-square overflow-hidden bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              aria-label={`Open ${t.title}`}
            >
              <img
                src={t.cover}
                alt={`${t.title} cover`}
                className="h-full w-full object-cover transition duration-300 hover:scale-[1.02]"
                loading="lazy"
              />
              <span
                className={cn(
                  "pointer-events-none absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full border backdrop-blur-md",
                  isDark
                    ? "border-white/15 bg-black/40 text-white/90"
                    : "border-white/60 bg-white/70 text-[#1A1C24]",
                )}
                aria-hidden
              >
                <Info className="h-3.5 w-3.5" strokeWidth={2.25} />
              </span>
            </Link>
            <div className="px-3 py-2.5">
              <h3 className="text-[13px] font-semibold leading-tight line-clamp-1">
                {t.title}
              </h3>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
