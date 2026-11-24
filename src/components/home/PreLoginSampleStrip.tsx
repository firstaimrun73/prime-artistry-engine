/**
 * Homepage sample strip (images + six R2 videos).
 * Pre-login only — no ads.
 */
import { useRef, useState, useCallback, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Play } from "lucide-react";
import { getAccount2PreloginSamples } from "@/lib/r2-account2-samples";
import { getPreloginVideoSamples } from "@/lib/r2-prelogin-videos";
import type { R2Sample } from "@/lib/r2-catalog";
import { cn } from "@/lib/utils";

function aspectClass(ar: string): string {
  const n = (ar || "16:9").replace(/\s/g, "");
  if (n === "9:16" || n === "3:4" || n === "2:3" || n === "4:5") return "aspect-[9/16]";
  if (n === "1:1") return "aspect-square";
  if (n === "4:3" || n === "3:2") return "aspect-[4/3]";
  return "aspect-video";
}

function isVideoSample(s: R2Sample): boolean {
  return s.format.toUpperCase() === "MP4" || /\.mp4($|\?)/i.test(s.url);
}

function VideoCard({ sample }: { sample: R2Sample }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const w = sample.width || 16;
  const h = sample.height || 9;

  // Seek to first frame so card is not a blank black box before play
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const onMeta = () => {
      try {
        if (v.readyState >= 1) {
          v.currentTime = 0.05;
        }
      } catch {
        /* ignore seek errors */
      }
      setReady(true);
    };
    const onErr = () => setFailed(true);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("loadeddata", onMeta);
    v.addEventListener("error", onErr);
    if (v.readyState >= 1) onMeta();
    return () => {
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("loadeddata", onMeta);
      v.removeEventListener("error", onErr);
    };
  }, [sample.url]);

  const toggle = useCallback(() => {
    const v = ref.current;
    if (!v || failed) return;
    if (v.paused) {
      document.querySelectorAll<HTMLVideoElement>("[data-prelogin-sample-video]").forEach((other) => {
        if (other !== v) other.pause();
      });
      void v.play().catch(() => setFailed(true));
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  }, [failed]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div
        className="relative w-full overflow-hidden bg-muted"
        style={{ aspectRatio: `${w} / ${h}` }}
      >
        {!failed ? (
          <video
            ref={ref}
            data-prelogin-sample-video
            src={sample.url}
            playsInline
            muted
            preload="metadata"
            crossOrigin="anonymous"
            className={cn(
              "absolute inset-0 h-full w-full object-contain transition-opacity",
              ready ? "opacity-100" : "opacity-0",
            )}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            aria-label={sample.title}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-muted text-xs text-muted-foreground">
            Preview unavailable
          </div>
        )}
        {!ready && !failed && (
          <div className="absolute inset-0 animate-pulse bg-muted" aria-hidden />
        )}
        <button
          type="button"
          onClick={toggle}
          className="absolute inset-0 flex items-center justify-center bg-black/0 transition hover:bg-black/20"
          aria-label={playing ? `Pause ${sample.title}` : `Play ${sample.title}`}
          disabled={failed}
        >
          {!playing && !failed && (
            <span className="grid h-11 w-11 place-items-center rounded-full border border-white/30 bg-black/55 text-white backdrop-blur-md shadow-lg">
              <Play className="h-5 w-5 fill-current" />
            </span>
          )}
        </button>
      </div>
      <div className="flex flex-1 flex-col p-3.5">
        <p className="text-sm font-bold leading-snug">{sample.title}</p>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{sample.description}</p>
        <Link
          to="/auth"
          search={{ mode: "signup", redirect: "/studio/video" }}
          className="mt-auto pt-2 text-xs font-semibold text-primary"
        >
          Sign in to create →
        </Link>
      </div>
    </div>
  );
}

function ImageCard({ sample }: { sample: R2Sample }) {
  const portrait =
    sample.aspectRatio === "9:16" ||
    sample.aspectRatio === "3:4" ||
    sample.aspectRatio === "2:3" ||
    sample.aspectRatio === "4:5";
  return (
    <Link
      to="/auth"
      search={{ mode: "signup", redirect: "/" }}
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:border-primary/40 hover:shadow-md",
        portrait && "sm:max-w-xs sm:justify-self-center",
      )}
    >
      <div className={cn("relative overflow-hidden bg-secondary", aspectClass(sample.aspectRatio))}>
        <img
          src={sample.url}
          alt={sample.title}
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          draggable={false}
        />
      </div>
      <div className="flex flex-1 flex-col p-3.5">
        <p className="text-sm font-bold leading-snug">{sample.title}</p>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{sample.description}</p>
        <span className="mt-auto pt-2 text-xs font-semibold text-primary">Sign in to try →</span>
      </div>
    </Link>
  );
}

export function PreLoginSampleStrip() {
  const images = getAccount2PreloginSamples();
  const videos = getPreloginVideoSamples();
  const samples: R2Sample[] = [...images, ...videos];
  if (samples.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-12" aria-label="Sample results">
      <div className="mb-5 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Real samples</p>
        <h2 className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl md:text-3xl">
          See what Motio<span className="text-primary">2</span>edit can do
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
          Real creative results from our tools. Sign in to open Image, Video, Music, Circle 2edit, and
          Maluto AI restore.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {samples.map((s) =>
          isVideoSample(s) ? <VideoCard key={s.id} sample={s} /> : <ImageCard key={s.id} sample={s} />,
        )}
      </div>
    </section>
  );
}
