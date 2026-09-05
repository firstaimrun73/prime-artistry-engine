/**
 * MUSIC gallery — Motion2AI Creation.
 * Cover + title only. Max-w cap. Hide on cover load failure.
 */
import { useMemo, useState } from "react";
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
    description: "Cinematic electronic bed for motion and trailers.",
    url: track1.url as string,
    cover: "/demo/music/cover-vinyl.jpg",
  },
  {
    id: "music-golden-hour",
    title: "Golden Hour Drift",
    description: "Lo-fi chill with soft pads for ambient and social cuts.",
    url: track2.url as string,
    cover: "/demo/music/cover-waveform.jpg",
  },
  {
    id: "music-heritage",
    title: "Heritage Strings",
    description: "Orchestral strings-forward mood for narrative scenes.",
    url: track3.url as string,
    cover: "/demo/music/cover-studio.jpg",
  },
];

function MusicCard({ t }: { t: TrackCard }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <article
      className={cn(
        "group w-full max-w-[280px] self-start overflow-hidden rounded-2xl border border-border/50 bg-transparent",
        "transition-[transform,opacity] duration-200 ease-out",
        "hover:scale-[1.01] active:scale-[0.98] active:opacity-90",
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
          onError={() => setFailed(true)}
        />
      </Link>
      <p className="truncate px-1.5 pt-1.5 text-[11px] font-medium leading-tight text-foreground/80">
        {t.title}
      </p>
    </article>
  );
}

export function MusicStudioGallery() {
  const tracks = useMemo(() => TRACKS, []);

  return (
    <section className="space-y-4" data-creation-section="music">
      <h3 className="flex items-center gap-1.5 text-[14px] font-bold tracking-tight">
        <Music className="h-4 w-4" />
        Music
      </h3>
      <div className="mx-auto grid max-w-[1200px] grid-cols-2 items-start justify-items-center gap-3 sm:grid-cols-3 sm:gap-5">
        {tracks.map((t) => (
          <MusicCard key={t.id} t={t} />
        ))}
      </div>
    </section>
  );
}
