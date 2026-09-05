/**
 * Public Watch Demo — approved marketing video for pre-login (prominent)
 * and post-login (intentionally low-discoverability via `variant`).
 * Asset: VID_20260831_011245.mp4 only.
 */
import { useRef, useCallback, useState, useEffect } from "react";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

/** Approved public Watch Demo asset — exact R2 URL required. */
const PUBLIC_WATCH_DEMO = {
  url: "https://assets.motio2edit.com/samples/video/VID_20260831_011245.mp4",
  title: "Watch Demo",
} as const;

type Props = {
  variant?: "prominent" | "quiet";
};

export function WatchDemoSection({ variant = "prominent" }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [ratio, setRatio] = useState("16 / 9");

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const onMeta = () => {
      if (v.videoWidth > 0 && v.videoHeight > 0) {
        setRatio(`${v.videoWidth} / ${v.videoHeight}`);
      }
    };
    v.addEventListener("loadedmetadata", onMeta);
    if (v.readyState >= 1) onMeta();
    return () => v.removeEventListener("loadedmetadata", onMeta);
  }, []);

  const toggle = useCallback(() => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) {
      void v.play().catch(() => {});
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  }, []);

  const quiet = variant === "quiet";

  return (
    <section
      className={cn(
        "mx-auto w-full max-w-6xl px-4",
        quiet ? "mt-16 opacity-90" : "mt-10 sm:mt-14",
      )}
      data-watch-demo={variant}
    >
      <div className={cn(quiet ? "mb-3" : "mb-4 text-center")}>
        <p
          className={cn(
            "text-[11px] font-semibold uppercase tracking-[0.16em] text-primary",
            !quiet && "text-center",
          )}
        >
          Demo
        </p>
        <h2
          className={cn(
            "mt-1 font-extrabold tracking-tight",
            quiet ? "text-[15px]" : "text-xl sm:text-2xl",
          )}
        >
          Watch Demo
        </h2>
        {!quiet && (
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            See Motio2edit Video Studio motion quality in action.
          </p>
        )}
      </div>

      <div
        className={cn(
          "relative mx-auto overflow-hidden rounded-2xl border border-border/60 bg-muted/20 shadow-sm",
          quiet ? "max-w-xl" : "max-w-4xl",
        )}
        style={{ aspectRatio: ratio }}
      >
        <video
          ref={ref}
          src={PUBLIC_WATCH_DEMO.url}
          playsInline
          preload="metadata"
          className="h-full w-full object-contain"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          aria-label={PUBLIC_WATCH_DEMO.title}
        />
        <button
          type="button"
          onClick={toggle}
          className="absolute inset-0 flex items-center justify-center bg-black/0 transition hover:bg-black/10"
          aria-label={playing ? "Pause demo" : "Play demo"}
        >
          {!playing && (
            <span className="grid h-14 w-14 place-items-center rounded-full border border-white/30 bg-black/50 text-white backdrop-blur-md">
              <Play className="h-6 w-6 fill-current" />
            </span>
          )}
        </button>
      </div>
    </section>
  );
}
