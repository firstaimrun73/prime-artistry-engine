/**
 * MUSIC STUDIO — homepage discovery.
 * Real tracks from repository sample assets (track-1/2/3).
 * Glass visual cards · play · info · no invented audio URLs.
 */
import { useMemo, useRef, useState } from "react";
import { Download, Share2, Info, X, Music, Play, Pause, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import track1 from "@/assets/samples/track-1.mp3.asset.json";
import track2 from "@/assets/samples/track-2.mp3.asset.json";
import track3 from "@/assets/samples/track-3.mp3.asset.json";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const COVER_VINYL = "/demo/music/cover-vinyl.jpg";
const COVER_WAVEFORM = "/demo/music/cover-waveform.jpg";
const COVER_STUDIO = "/demo/music/cover-studio.jpg";

type MusicTrack = {
  id: string;
  title: string;
  description: string;
  genre: string;
  url: string;
  cover: string;
  format: string;
  fileSizeLabel: string;
};

const TRACKS: MusicTrack[] = [
  {
    id: "music-neon-skyline",
    title: "Neon Skyline",
    description: "Cinematic electronic bed generated in Music Studio — suitable for motion and trailers.",
    genre: "Cinematic Electronic",
    url: track1.url,
    cover: COVER_VINYL,
    format: "Audio",
    fileSizeLabel: "~4.4 MB",
  },
  {
    id: "music-golden-hour",
    title: "Golden Hour Drift",
    description: "Lo-fi chill track with soft pads — Music Studio sample for ambient and social cuts.",
    genre: "Lo-fi Chill",
    url: track2.url,
    cover: COVER_WAVEFORM,
    format: "Audio",
    fileSizeLabel: "~6.6 MB",
  },
  {
    id: "music-heritage",
    title: "Heritage Strings",
    description: "Orchestral colour from Music Studio — strings-forward mood for narrative scenes.",
    genre: "Orchestral",
    url: track3.url,
    cover: COVER_STUDIO,
    format: "Audio",
    fileSizeLabel: "~10 MB",
  },
];

function GlassIconBtn({
  onClick,
  label,
  children,
  isDark,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  isDark: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "grid h-8 w-8 place-items-center rounded-full border backdrop-blur-md transition active:scale-95",
        isDark
          ? "border-white/20 bg-black/35 text-white hover:bg-black/50"
          : "border-white/40 bg-white/55 text-[#1A1C24] hover:bg-white/80 shadow-sm",
      )}
    >
      {children}
    </button>
  );
}

function MusicDetailSheet({
  track,
  onClose,
  isDark,
}: {
  track: MusicTrack;
  onClose: () => void;
  isDark: boolean;
}) {
  return (
    <>
      <button type="button" className="fixed inset-0 z-[80] bg-black/55" aria-label="Close" onClick={onClose} />
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-[90] max-h-[88vh] overflow-y-auto rounded-t-3xl border-t px-4 py-5 shadow-2xl",
          "pb-[max(1.5rem,env(safe-area-inset-bottom))]",
          isDark ? "border-white/10 bg-[#181A22]" : "border-black/8 bg-white",
        )}
        role="dialog"
        aria-label={track.title}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[oklch(0.58_0.22_310)]">Music</p>
            <h3 className="text-[17px] font-extrabold tracking-tight">{track.title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "grid h-9 w-9 place-items-center rounded-full border",
              isDark ? "border-white/12" : "border-black/10",
            )}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="aspect-video overflow-hidden rounded-xl bg-black/5">
          <img src={track.cover} alt={`${track.title} cover`} className="h-full w-full object-cover" />
        </div>
        <audio src={track.url} controls preload="metadata" className="mt-3 w-full" />
        <p className={cn("mt-3 text-[13px] leading-relaxed", isDark ? "text-[#C5C7D0]" : "text-[#3A3E4C]")}>
          {track.description}
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
          <div>
            <dt className={isDark ? "text-[#9AA0B0]" : "text-[#5C6170]"}>Genre</dt>
            <dd className="font-semibold">{track.genre}</dd>
          </div>
          <div>
            <dt className={isDark ? "text-[#9AA0B0]" : "text-[#5C6170]"}>Format</dt>
            <dd className="font-semibold">{track.format}</dd>
          </div>
          <div>
            <dt className={isDark ? "text-[#9AA0B0]" : "text-[#5C6170]"}>Size</dt>
            <dd className="font-semibold">{track.fileSizeLabel}</dd>
          </div>
          <div>
            <dt className={isDark ? "text-[#9AA0B0]" : "text-[#5C6170]"}>Studio</dt>
            <dd className="font-semibold">Music</dd>
          </div>
        </dl>
        <p className={cn("mt-3 text-[11px]", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>
          Sample from Motio2edit Music Studio. Generation prompts are not shown.
        </p>
        <div className="mt-5">
          <Link
            to={"/studio/music" as "/studio/music"}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-2xl bg-[oklch(0.45_0.18_310)] px-4 py-3 text-[14px] font-semibold text-white shadow-sm"
          >
            <Sparkles className="h-4 w-4" />
            Try Now
          </Link>
        </div>
      </div>
    </>
  );
}

function MusicCard({
  track,
  isDark,
  playingId,
  setPlayingId,
}: {
  track: MusicTrack;
  isDark: boolean;
  playingId: string | null;
  setPlayingId: (id: string | null) => void;
}) {
  const [detail, setDetail] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlaying = playingId === track.id;

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
      setPlayingId(null);
    } else {
      void el.play().catch(() => setPlayingId(null));
      setPlayingId(track.id);
    }
  };

  const onDownload = async () => {
    try {
      const res = await fetch(track.url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `motio2edit-${track.id}.mp3`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Download started");
    } catch {
      toast.error("Download failed");
    }
  };

  const onShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: track.title, text: track.description, url: track.url });
      } else {
        await navigator.clipboard.writeText(window.location.origin + track.url);
        toast.message("Link copied");
      }
    } catch {
      /* cancelled */
    }
  };

  return (
    <>
      <article
        className={cn(
          "flex w-[min(100%,280px)] shrink-0 flex-col overflow-hidden rounded-2xl border shadow-[0_8px_30px_rgba(0,0,0,0.06)]",
          isDark ? "border-white/10 bg-white/[0.03]" : "border-black/5 bg-white/70 backdrop-blur-sm",
        )}
      >
        <div className="relative aspect-video w-full overflow-hidden bg-muted">
          <img src={track.cover} alt={`${track.title} cover`} className="h-full w-full object-cover" loading="lazy" />
          <span
            className={cn(
              "absolute left-2 top-2 z-10 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] backdrop-blur-md",
              isDark ? "bg-black/45 text-white/90" : "bg-white/70 text-[#3A3E4C]",
            )}
          >
            Music
          </span>
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
            className="absolute inset-0 z-[5] flex items-center justify-center"
          >
            <span className="grid h-10 w-10 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm">
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
            </span>
          </button>
          <div className="absolute right-2 top-2 z-10 flex flex-col gap-1.5">
            <GlassIconBtn onClick={() => setDetail(true)} label={`About ${track.title}`} isDark={isDark}>
              <Info className="h-3.5 w-3.5" strokeWidth={2.25} />
            </GlassIconBtn>
            <GlassIconBtn onClick={() => void onDownload()} label="Download" isDark={isDark}>
              <Download className="h-3.5 w-3.5" strokeWidth={2.25} />
            </GlassIconBtn>
            <GlassIconBtn onClick={() => void onShare()} label="Share" isDark={isDark}>
              <Share2 className="h-3.5 w-3.5" strokeWidth={2.25} />
            </GlassIconBtn>
          </div>
          <audio
            ref={audioRef}
            src={track.url}
            preload="metadata"
            onEnded={() => setPlayingId(null)}
            onPause={() => {
              if (playingId === track.id) setPlayingId(null);
            }}
          />
        </div>
        <div className="px-2.5 py-2">
          <h3 className="text-[12px] font-semibold leading-tight line-clamp-1">{track.title}</h3>
          <p className={cn("text-[10px]", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>{track.genre}</p>
        </div>
      </article>
      {detail ? <MusicDetailSheet track={track} onClose={() => setDetail(false)} isDark={isDark} /> : null}
    </>
  );
}

export function MusicStudioGallery() {
  const tracks = useMemo(() => TRACKS, []);
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [playingId, setPlayingId] = useState<string | null>(null);

  if (tracks.length === 0) return null;

  return (
    <section
      className="mt-10 space-y-4 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      data-music-studio-section="homepage"
    >
      <div>
        <h2 className="flex items-center gap-2 text-[17px] font-extrabold tracking-tight">
          <Music className="h-4 w-4 text-[oklch(0.58_0.22_310)]" />
          Music Studio
        </h2>
        <p className={cn("mt-0.5 text-[13px]", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>
          Real tracks · play · download
        </p>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
        {tracks.map((t) => (
          <div key={t.id} className="snap-start">
            <MusicCard track={t} isDark={isDark} playingId={playingId} setPlayingId={setPlayingId} />
          </div>
        ))}
      </div>
    </section>
  );
}
