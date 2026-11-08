/**
 * Public Watch Demo — media_4 Demo_Video for pre-login (prominent)
 * and post-login (intentionally low-discoverability via `variant`).
 * Demo is 9:16 (704×1280); desktop uses max-height so the frame stays visible without dominating the page.
 */
import { useRef, useCallback, useState, useEffect } from "react";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDemoVideoSample } from "@/lib/r2-catalog";

const DEMO = getDemoVideoSample();

const PUBLIC_WATCH_DEMO = {
  url: DEMO.url,
  title: DEMO.title,
} as const;

type Props = {
  variant?: "prominent" | "quiet";
};

export function WatchDemoSection({ variant = "prominent" }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [ratio, setRatio] = useState("9 / 16");

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
      <div className={cn(quiet ? "mb-3" : "mb-5 text-center")}>
        <p
          className={cn(
            "text-[11px] font-semibold uppercase tracking-[0.16em] text-primary",
            !quiet && "text-center",
          )}
        >
          Product demo
        </p>
        <h2
          className={cn(
            "mt-1 font-extrabold tracking-tight",
            quiet ? "text-[15px]" : "text-2xl sm:text-3xl",
          )}
        >
          Watch Motio2edit in action
        </h2>
        {!quiet && (
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            See image, video, and edit quality from the official demo reel — play fullscreen on any device.
          </p>
        )}
      </div>

      <div
        className={cn(
          "relative mx-auto overflow-hidden rounded-2xl border border-border bg-muted/30 shadow-lg",
          quiet ? "max-w-xl" : "max-w-[min(100%,420px)] sm:max-w-[min(100%,480px)]",
        )}
        style={{
          aspectRatio: ratio,
          maxHeight: quiet ? undefined : "min(72vh, 720px)",
        }}
      >
        <video
          ref={ref}
          src={PUBLIC_WATCH_DEMO.url}
          playsInline
          preload="metadata"
          className="h-full w-full object-contain bg-black"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          aria-label={PUBLIC_WATCH_DEMO.title}
        />
        <button
          type="button"
          onClick={toggle}
          className="absolute inset-0 flex items-center justify-center bg-black/0 transition hover:bg-black/15"
          aria-label={playing ? "Pause demo" : "Play demo"}
        >
          {!playing && (
            <span className="grid h-16 w-16 place-items-center rounded-full border border-white/40 bg-black/55 text-white shadow-xl backdrop-blur-md">
              <Play className="h-7 w-7 fill-current" />
            </span>
          )}
        </button>
      </div>
    </section>
  );
}
