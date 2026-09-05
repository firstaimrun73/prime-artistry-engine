/**
 * Canonical media detail page — image / video / music.
 * Download & Share live here (not on homepage cards).
 * No provider/model names. No original prompts. No Audio/Source meta.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Download,
  Share2,
  Info,
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
} from "lucide-react";
import { getR2SampleById, type R2Sample } from "@/lib/r2-catalog";
import track1 from "@/assets/samples/track-1.mp3.asset.json";
import track2 from "@/assets/samples/track-2.mp3.asset.json";
import track3 from "@/assets/samples/track-3.mp3.asset.json";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function categoryLabel(s: R2Sample | null, isMusic: boolean): string {
  if (isMusic) return "Sample";
  if (!s) return "Sample";
  if (s.homepageCategory === "try-now") return "Try Now";
  if (s.homepageCategory === "trend") return "Trend";
  return "Sample";
}

function mediaKind(s: R2Sample | null, id: string): "image" | "video" | "music" {
  if (id.startsWith("music-")) return "music";
  if (!s) return "image";
  if (s.studio === "video" || s.format?.toUpperCase() === "MP4") return "video";
  return "image";
}

export const Route = createFileRoute("/sample/$id")({
  head: ({ params }) => {
    const s = getR2SampleById(params.id);
    const title = s ? `${s.title} — Motio2edit` : "Sample — Motio2edit";
    const description = s?.description ?? "Motio2edit media sample.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: SampleDetailPage,
});

function SampleDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const sample = getR2SampleById(id);
  const kind = mediaKind(sample, id);
  const [showInfo, setShowInfo] = useState(true);

  const musicMeta =
    kind === "music"
      ? {
          id,
          title:
            id === "music-neon-skyline"
              ? "Neon Skyline"
              : id === "music-golden-hour"
                ? "Golden Hour Drift"
                : id === "music-heritage"
                  ? "Heritage Strings"
                  : "Music sample",
          description:
            id === "music-neon-skyline"
              ? "A cinematic electronic bed from Motio2edit Music Studio — suitable for motion and trailers."
              : id === "music-golden-hour"
                ? "A lo-fi chill track with soft pads from Motio2edit Music Studio."
                : "An orchestral strings-forward mood track from Motio2edit Music Studio.",
          cover:
            id === "music-neon-skyline"
              ? "/demo/music/cover-vinyl.jpg"
              : id === "music-golden-hour"
                ? "/demo/music/cover-waveform.jpg"
                : "/demo/music/cover-studio.jpg",
          format: "Audio",
        }
      : null;

  if (!sample && kind !== "music") {
    return (
      <div className="min-h-screen bg-background">
        <header className="flex items-center justify-between px-4 py-3 border-b border-border/60">
          <button type="button" onClick={() => navigate({ to: "/" })} className="grid h-10 w-10 place-items-center rounded-full border border-border" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold">Motio2edit</span>
          <button type="button" onClick={() => navigate({ to: "/" })} className="grid h-10 w-10 place-items-center rounded-full border border-border" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </header>
        <main className="mx-auto max-w-lg px-4 py-16 text-center">
          <h1 className="text-xl font-bold">Sample not found</h1>
          <Link to="/" className="mt-4 inline-block text-primary text-sm font-semibold">Back to home</Link>
        </main>
      </div>
    );
  }

  const title = sample?.title ?? musicMeta?.title ?? "Sample";
  const description = sample?.description ?? musicMeta?.description ?? "A Motio2edit media sample.";
  const mediaUrl = sample?.url ?? "";
  const detailPath = typeof window !== "undefined" ? `${window.location.origin}/sample/${id}` : `/sample/${id}`;

  const onDownload = async () => {
    if (!mediaUrl) {
      toast.message("Download is available for image and video samples.");
      return;
    }
    try {
      const res = await fetch(mediaUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      const ext = kind === "video" ? "mp4" : sample?.format?.toLowerCase() === "jpeg" ? "jpg" : "png";
      a.download = `motio2edit-${id}.${ext}`;
      a.click();
      URL.revokeObjectURL(blobUrl);
      toast.success("Download started");
    } catch {
      toast.error("Download failed");
    }
  };

  const onShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: `${title} — Motio2edit`, text: description, url: detailPath });
      } else {
        await navigator.clipboard.writeText(detailPath);
        toast.message("Link copied");
      }
    } catch {
      /* cancelled */
    }
  };

  return (
    <div className={cn("min-h-screen", isDark ? "bg-[#0F1117]" : "bg-background")}>
      <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-border/50 bg-background/90 px-3 py-2.5 backdrop-blur-md">
        <button type="button" onClick={() => { if (window.history.length > 1) window.history.back(); else void navigate({ to: "/" }); }} className="grid h-10 w-10 place-items-center rounded-full border border-border/80" aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold tracking-tight">Motio2edit</span>
        <button type="button" onClick={() => void navigate({ to: "/" })} className="grid h-10 w-10 place-items-center rounded-full border border-border/80" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
        {kind === "video" && sample ? (
          <VideoPlayer url={sample.url} title={title} aspectRatio={sample.aspectRatio} width={sample.width} height={sample.height} />
        ) : kind === "music" ? (
          <MusicPlayer title={title} cover={musicMeta?.cover} trackId={id} />
        ) : sample ? (
          <div className="overflow-hidden rounded-2xl bg-black/5">
            <img
              src={sample.url}
              alt={title}
              className="mx-auto max-h-[72vh] w-full object-contain"
              style={sample.width && sample.height ? { aspectRatio: `${sample.width} / ${sample.height}` } : undefined}
            />
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {kind !== "music" ? (
            <button type="button" onClick={() => void onDownload()} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium">
              <Download className="h-4 w-4" /> Download
            </button>
          ) : null}
          <button type="button" onClick={() => void onShare()} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium">
            <Share2 className="h-4 w-4" /> Share
          </button>
          <button type="button" onClick={() => setShowInfo((v) => !v)} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium" aria-pressed={showInfo}>
            <Info className="h-4 w-4" /> Info
          </button>
        </div>

        {showInfo ? (
          <div className="mt-8 space-y-4">
            <div>
              <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">{title}</h1>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {kind === "video" ? "Video" : kind === "music" ? "Music" : "Image"}
              </p>
            </div>
            <dl className="grid gap-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Editor</dt>
                <dd className="font-semibold">Motio2edit</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Category</dt>
                <dd className="font-semibold">{categoryLabel(sample, kind === "music")}</dd>
              </div>
            </dl>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Description</h2>
              <p className={cn("mt-1 text-[14px] leading-relaxed", isDark ? "text-[#C5C7D0]" : "text-[#3A3E4C]")}>{description}</p>
            </div>
            {sample ? (
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Details</h2>
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
                  {sample.quality ? (
                    <div>
                      <dt className="text-muted-foreground">Quality</dt>
                      <dd className="font-semibold">{sample.quality}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="text-muted-foreground">Aspect</dt>
                    <dd className="font-semibold">{sample.aspectRatio}</dd>
                  </div>
                  {sample.width && sample.height ? (
                    <div>
                      <dt className="text-muted-foreground">Dimensions</dt>
                      <dd className="font-semibold">{sample.width}×{sample.height}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="text-muted-foreground">Format</dt>
                    <dd className="font-semibold">{sample.format}</dd>
                  </div>
                  {sample.fileSizeLabel ? (
                    <div>
                      <dt className="text-muted-foreground">File size</dt>
                      <dd className="font-semibold">{sample.fileSizeLabel}</dd>
                    </div>
                  ) : null}
                  {sample.durationLabel ? (
                    <div>
                      <dt className="text-muted-foreground">Duration</dt>
                      <dd className="font-semibold">{sample.durationLabel}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            ) : null}
          </div>
        ) : null}
      </main>
    </div>
  );
}

function VideoPlayer({
  url,
  title,
  aspectRatio,
  width,
  height,
}: {
  url: string;
  title: string;
  aspectRatio: string;
  width?: number;
  height?: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [ratio, setRatio] = useState(
    width && height ? `${width} / ${height}` : aspectRatio.replace(":", " / "),
  );

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onMeta = () => {
      if (v.videoWidth > 0 && v.videoHeight > 0) setRatio(`${v.videoWidth} / ${v.videoHeight}`);
    };
    v.addEventListener("loadedmetadata", onMeta);
    return () => v.removeEventListener("loadedmetadata", onMeta);
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const setPlayback = (r: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = r;
    setRate(r);
  };

  const goFullscreen = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.requestFullscreen) void v.requestFullscreen();
    else if ((v as HTMLVideoElement & { webkitEnterFullscreen?: () => void }).webkitEnterFullscreen) {
      (v as HTMLVideoElement & { webkitEnterFullscreen: () => void }).webkitEnterFullscreen();
    }
  };

  return (
    <div className="space-y-3">
      <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl bg-black" style={{ aspectRatio: ratio }}>
        <video ref={videoRef} src={url} playsInline className="h-full w-full object-contain" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} aria-label={title} />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button type="button" onClick={togglePlay} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-medium" aria-label={playing ? "Pause" : "Play"}>
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />} {playing ? "Pause" : "Play"}
        </button>
        <button type="button" onClick={() => setPlayback(1)} className={cn("rounded-full border px-3 py-1.5 text-sm font-medium", rate === 1 ? "border-primary bg-primary/10 text-primary" : "border-border")}>
          1x
        </button>
        <button type="button" onClick={() => setPlayback(2)} className={cn("rounded-full border px-3 py-1.5 text-sm font-medium", rate === 2 ? "border-primary bg-primary/10 text-primary" : "border-border")}>
          2x
        </button>
        <button type="button" onClick={toggleMute} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-medium" aria-label={muted ? "Unmute" : "Mute"}>
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />} Sound
        </button>
        <button type="button" onClick={goFullscreen} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-medium" aria-label="Fullscreen">
          <Maximize className="h-4 w-4" /> Fullscreen
        </button>
      </div>
    </div>
  );
}

function MusicPlayer({ title, cover, trackId }: { title: string; cover?: string; trackId: string }) {
  const urlMap: Record<string, string> = {
    "music-neon-skyline": track1.url as string,
    "music-golden-hour": track2.url as string,
    "music-heritage": track3.url as string,
  };
  const src = urlMap[trackId];
  return (
    <div className="mx-auto max-w-sm space-y-4 text-center">
      <div className="overflow-hidden rounded-2xl aspect-square bg-muted">
        {cover ? <img src={cover} alt={`${title} cover`} className="h-full w-full object-cover" /> : null}
      </div>
      {src ? (
        <audio controls src={src} className="mx-auto w-full max-w-xs" preload="metadata">
          Your browser does not support audio playback.
        </audio>
      ) : null}
    </div>
  );
}
