import { useEffect, useRef, useState } from "react";
import { Film, Play, X } from "lucide-react";

type VideoSample = {
  title: string;
  caption: string;
  duration: string;
  resolution: string;
  category: string;
  thumb: string;
  src: string;
};

// Demo-only assets bundled with the app — never user uploads or generated output.
const VIDEOS: VideoSample[] = [
  {
    title: "Cinematic Landscape",
    caption: "Text-to-video drone flight over misty peaks",
    duration: "0:10",
    resolution: "1080p",
    category: "Text to Video",
    thumb: "/demo/video/poster-landscape.jpg",
    src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
  },
  {
    title: "Tech Visualization",
    caption: "Particles assembling into a glowing AI core",
    duration: "0:15",
    resolution: "1080p",
    category: "Text to Video",
    thumb: "/demo/video/poster-tech.jpg",
    src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  },
  {
    title: "Motion Portrait",
    caption: "Image-to-video with cinematic color grading",
    duration: "0:15",
    resolution: "1080p",
    category: "Image to Video",
    thumb: "/demo/video/poster-portrait.jpg",
    src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  },
];

export function VideoSamples() {
  const [open, setOpen] = useState<VideoSample | null>(null);
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.dataset.modalOpen = "1";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      delete document.body.dataset.modalOpen;
    };
  }, [open]);

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-14">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 text-xs font-semibold text-muted-foreground">
          <Film className="h-3.5 w-3.5 text-primary" /> Video Samples
        </span>
        <h2 className="mt-4 text-xl font-extrabold tracking-tight sm:text-3xl">Motion generated in Video Studio</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">Tap a card to watch it fullscreen.</p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:mt-8 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
        {VIDEOS.map((v, i) => (
          <button
            key={v.title}
            type="button"
            onClick={() => setOpen(v)}
            aria-label={`Play ${v.title}`}
            className="reveal-up group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary hover:shadow-2xl"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <div className="relative aspect-video w-full overflow-hidden bg-secondary">
              {!loaded[v.title] && !failed[v.title] && <div className="absolute inset-0 animate-pulse bg-secondary" />}
              {failed[v.title] ? (
                <div className="absolute inset-0 flex items-center justify-center bg-secondary text-muted-foreground">
                  <Film className="h-8 w-8" />
                </div>
              ) : (
                <img
                  src={v.thumb}
                  alt={`${v.title} video poster`}
                  loading="lazy"
                  decoding="async"
                  width={1024}
                  height={576}
                  draggable={false}
                  onLoad={() => setLoaded((s) => ({ ...s, [v.title]: true }))}
                  onError={() => setFailed((s) => ({ ...s, [v.title]: true }))}
                  className={`protected-image absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                    loaded[v.title] ? "opacity-100" : "opacity-0"
                  }`}
                />
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-background/25 transition-colors group-hover:bg-background/45">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl transition-transform duration-300 group-hover:scale-110 sm:h-16 sm:w-16">
                  <Play className="ml-1 h-6 w-6 sm:h-7 sm:w-7" />
                </span>
              </span>
              <span className="absolute left-2 top-2 max-w-[70%] truncate rounded-full bg-background/85 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide backdrop-blur">
                {v.category}
              </span>
              <span className="absolute bottom-2 right-2 flex gap-1.5">
                <span className="rounded-full bg-background/85 px-2 py-0.5 text-[10px] font-semibold backdrop-blur">
                  {v.resolution}
                </span>
                <span className="rounded-full bg-background/85 px-2 py-0.5 text-[10px] font-semibold backdrop-blur">
                  {v.duration}
                </span>
              </span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
              <p className="truncate font-bold">{v.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{v.caption}</p>
            </div>
          </button>
        ))}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 p-3 backdrop-blur-md animate-in fade-in duration-200 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`${open.title} playback`}
          onClick={() => setOpen(null)}
        >
          <button
            type="button"
            onClick={() => setOpen(null)}
            aria-label="Close video"
            className="absolute right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card transition-colors hover:border-primary"
            style={{ top: "calc(0.75rem + env(safe-area-inset-top))" }}
          >
            <X className="h-5 w-5" />
          </button>
          <video
            ref={videoRef}
            src={open.src}
            poster={open.thumb}
            controls
            autoPlay
            playsInline
            preload="metadata"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[80vh] w-full max-w-[min(100%,64rem)] rounded-2xl border border-border bg-black object-contain"
          />
        </div>
      )}
    </section>
  );
}
