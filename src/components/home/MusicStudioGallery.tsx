/**
 * MUSIC gallery — Motion2AI Creation.
 * Larger editorial cards. Click → /sample/$id. No provider names.
 */
import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Info, Music } from "lucide-react";
import track1 from "@/assets/samples/track-1.mp3.asset.json";
import track2 from "@/assets/samples/track-2.mp3.asset.json";
import track3 from "@/assets/samples/track-3.mp3.asset.json";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const TRACKS = [
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
    <section className="space-y-3" data-creation-section="music">
      <h3 className="flex items-center gap-1.5 text-[13px] font-bold tracking-tight">
        <Music className="h-3.5 w-3.5" />
        Music
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {tracks.map((t) => (
          <article
            key={t.id}
            className={cn(
              "overflow-hidden rounded-2xl border",
              isDark ? "border-white/10 bg-white/[0.02]" : "border-black/5 bg-white/80",
            )}
          >
            <Link
              to="/sample/$id"
              params={{ id: t.id }}
              className="relative block aspect-square overflow-hidden bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              aria-label={`Open ${t.title}`}
            >
              <img
                src={t.cover}
                alt={`${t.title} cover`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
              <span
                className={cn(
                  "pointer-events-none absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full border backdrop-blur-md",
                  isDark
                    ? "border-white/15 bg-black/35 text-white/90"
                    : "border-white/50 bg-white/60 text-[#1A1C24]",
                )}
                aria-hidden
              >
                <Info className="h-3 w-3" strokeWidth={2.25} />
              </span>
            </Link>
            <div className="px-2.5 py-2">
              <h3 className="text-[12px] font-semibold leading-tight line-clamp-1">{t.title}</h3>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
