import { useRef, useCallback, useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Image as ImageIcon,
  Video,
  Music,
  Zap,
  Play,
  ArrowRight,
  Upload,
  Wand2,
  Download,
} from "lucide-react";
import { getDemoVideoSample } from "@/lib/r2-catalog";

const VALUE_PROPS = [
  { icon: ImageIcon, label: "AI Image Editing" },
  { icon: Video, label: "AI Video Editing" },
  { icon: Music, label: "AI Music Generation" },
  { icon: Zap, label: "Fast Cloud Processing" },
];

const STEPS = [
  { icon: Upload, label: "Upload" },
  { icon: Wand2, label: "Describe" },
  { icon: Download, label: "Generate" },
];

const AUTH_THEN_CIRCLE = "/studio/image/circle-remove?mode=remove&from=home";

const DEMO = getDemoVideoSample();

function scrollToHeroDemo() {
  const el = document.querySelector("[data-watch-demo]");
  if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
}

export function HomeHero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [ratio, setRatio] = useState("9 / 16");
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onMeta = () => {
      if (v.videoWidth > 0 && v.videoHeight > 0) {
        setRatio(`${v.videoWidth} / ${v.videoHeight}`);
      }
      try {
        v.currentTime = 0.05;
      } catch {
        /* ignore */
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
  }, []);

  const toggle = useCallback(() => {
    const v = videoRef.current;
    if (!v || failed) return;
    if (v.paused) {
      void v.play().catch(() => setFailed(true));
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  }, [failed]);

  const onWatchDemo = useCallback(() => {
    scrollToHeroDemo();
    const v = videoRef.current;
    if (v && v.paused && !failed) {
      void v.play().catch(() => setFailed(true));
      setPlaying(true);
    }
  }, [failed]);

  return (
    <section className="relative mx-auto w-full max-w-6xl px-4 pb-10 pt-10 sm:pb-16 sm:pt-16">
      <div className="reveal-up mx-auto max-w-3xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 text-xs font-semibold text-muted-foreground">
          <Zap className="h-3.5 w-3.5 text-primary" />{" "}
          <span className="notranslate" translate="no">
            Motio2edit
          </span>{" "}
          · Credit-based AI studio
        </span>
        <h1 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          AI Image & Video Editing, <span className="text-primary">Made Simple</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
          Edit images and videos with AI in one workspace. Remove objects, enhance portraits,
          change outfits, generate video — upload, describe, and generate.
        </p>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          Your generations stay tied to your account. Clear credits, one studio for image, video, and music.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" className="gap-2">
            <Link to="/auth" search={{ redirect: AUTH_THEN_CIRCLE, mode: "signup" }}>
              Try Now <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="gap-2">
            <Link to="/pricing">View pricing</Link>
          </Button>
          <Button type="button" size="lg" variant="ghost" className="gap-2" onClick={onWatchDemo}>
            <Play className="h-4 w-4" /> Watch demo
          </Button>
        </div>

        <div className="mx-auto mt-8 max-w-[280px] sm:max-w-[320px]" data-watch-demo="hero">
          <div
            className="relative overflow-hidden rounded-2xl border border-border/60 bg-muted shadow-md"
            style={{ aspectRatio: ratio }}
          >
            {!failed ? (
              <video
                ref={videoRef}
                src={DEMO.url}
                playsInline
                muted
                preload="metadata"
                crossOrigin="anonymous"
                className={`h-full w-full object-contain transition-opacity ${ready ? "opacity-100" : "opacity-0"}`}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
                aria-label={DEMO.title}
              />
            ) : (
              <div className="flex h-full min-h-[200px] items-center justify-center text-xs text-muted-foreground">
                Demo unavailable
              </div>
            )}
            {!ready && !failed && <div className="absolute inset-0 animate-pulse bg-muted" aria-hidden />}
            <button
              type="button"
              onClick={toggle}
              className="absolute inset-0 flex items-center justify-center bg-black/0 transition hover:bg-black/10"
              aria-label={playing ? "Pause demo" : "Play demo"}
              disabled={failed}
            >
              {!playing && !failed && (
                <span className="grid h-12 w-12 place-items-center rounded-full border border-white/30 bg-black/50 text-white backdrop-blur-md">
                  <Play className="h-5 w-5 fill-current" />
                </span>
              )}
            </button>
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">Product demo · Motio2edit</p>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          {VALUE_PROPS.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground"
            >
              <Icon className="h-3.5 w-3.5 text-primary" />
              {label}
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-center gap-3 text-xs text-muted-foreground">
          {STEPS.map(({ icon: Icon, label }, i) => (
            <span key={label} className="inline-flex items-center gap-1.5">
              {i > 0 && <span className="mx-1 text-border">→</span>}
              <Icon className="h-3.5 w-3.5" />
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
