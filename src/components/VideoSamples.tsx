import { useEffect, useRef, useState } from "react";
import { Film, Play, X } from "lucide-react";

type VideoSample = {
  title: string;
  caption: string;
  duration: string;
  thumb: string;
  src: string;
};

const VIDEOS: VideoSample[] = [
  {
    title: "Cinematic Landscape",
    caption: "Text-to-video drone flight over misty peaks",
    duration: "0:10",
    thumb: "https://images.unsplash.com/photo-1536240478700-b869ad10e2ab?w=800&h=450&fit=crop&q=80",
    src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
  },
  {
    title: "Tech Visualization",
    caption: "Particles assembling into a glowing AI core",
    duration: "0:15",
    thumb: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=450&fit=crop&q=80",
    src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  },
  {
    title: "Motion Portrait",
    caption: "Image-to-video with cinematic color grading",
    duration: "0:15",
    thumb: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=450&fit=crop&q=80",
    src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  },
];

export function VideoSamples() {
  const [open, setOpen] = useState<VideoSample | null>(null);
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 text-xs font-semibold text-muted-foreground">
          <Film className="h-3.5 w-3.5 text-primary" /> Video Samples
        </span>
        <h2 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">Motion generated in Video Studio</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          Tap a card to watch it fullscreen.
        </p>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {VIDEOS.map((v, i) => (
          <button
            key={v.title}
            type="button"
            onClick={() => setOpen(v)}
            aria-label={`Play ${v.title}`}
            className="reveal-up group flex flex-col overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary hover:shadow-2xl"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <div className="relative aspect-video w-full overflow-hidden">
              {!loaded[v.title] && <div className="absolute inset-0 animate-pulse bg-secondary" />}
              <img
                src={v.thumb}
                alt={`${v.title} video thumbnail`}
                loading="lazy"
                decoding="async"
                draggable={false}
                onLoad={() => setLoaded((s) => ({ ...s, [v.title]: true }))}
                className={`protected-image h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                  loaded[v.title] ? "opacity-100" : "opacity-0"
                }`}
              />
              <span className="absolute inset-0 flex items-center justify-center bg-background/25 transition-colors group-hover:bg-background/45">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl transition-transform duration-300 group-hover:scale-110">
                  <Play className="ml-1 h-7 w-7" />
                </span>
              </span>
              <span className="absolute bottom-3 right-3 rounded-full bg-background/85 px-2.5 py-0.5 text-[11px] font-semibold backdrop-blur">
                {v.duration}
              </span>
            </div>
            <div className="p-5">
              <p className="font-bold">{v.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{v.caption}</p>
            </div>
          </button>
        ))}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 p-4 backdrop-blur-md animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-label={`${open.title} playback`}
          onClick={() => setOpen(null)}
        >
          <button
            type="button"
            onClick={() => setOpen(null)}
            aria-label="Close video"
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card transition-colors hover:border-primary"
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
            className="max-h-[85vh] w-full max-w-5xl rounded-2xl border border-border bg-black"
          />
        </div>
      )}
    </section>
  );
}
