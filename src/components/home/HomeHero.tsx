import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Video, Music, Zap, Play, X, ArrowRight, Upload, Wand2, Download } from "lucide-react";

const DEMO_VIDEO = "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4";
const DEMO_POSTER = "/demo/video/poster-landscape.jpg";

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

export function HomeHero() {
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <section className="relative mx-auto w-full max-w-6xl px-4 pb-10 pt-10 sm:pb-16 sm:pt-16">
      <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="reveal-up min-w-0 text-center lg:text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 text-xs font-semibold text-muted-foreground">
            <Zap className="h-3.5 w-3.5 text-primary" /> Motio2edit · Credit-based AI studio
          </span>
          <h1 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            AI Image & Video Editing,{" "}
            <span className="text-primary">Made Simple</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg lg:mx-0">
            Edit images and videos with AI in one workspace. Remove objects, enhance portraits,
            change outfits, generate video — upload, describe, and generate.
          </p>

          <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Button asChild size="lg" className="btn-animate">
              <Link to="/studio/image">
                Start Editing <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="btn-animate">
              <Link to="/features">Explore Features</Link>
            </Button>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <span key={s.label} className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  {i > 0 && <span className="mx-1 text-border">→</span>}
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                    {s.label}
                  </span>
                </span>
              );
            })}
          </div>

          <ul className="mt-7 grid grid-cols-2 gap-2 sm:gap-3">
            {VALUE_PROPS.map((v) => {
              const Icon = v.icon;
              return (
                <li
                  key={v.label}
                  className="flex min-w-0 items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-left"
                >
                  <Icon className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate text-xs font-semibold sm:text-sm">{v.label}</span>
                </li>
              );
            })}
          </ul>

          <p className="mt-4 text-xs text-muted-foreground">
            Free credits on signup. No card required to start.{" "}
            <button
              type="button"
              className="font-medium text-primary hover:underline"
              onClick={() => setDemoOpen(true)}
            >
              Watch demo
            </button>
          </p>
        </div>

        <div className="reveal-up relative min-w-0" style={{ animationDelay: "120ms" }}>
          <div className="pointer-events-none absolute -inset-6 -z-10 rounded-full gradient-hero opacity-20 blur-3xl" />
          <div className="relative aspect-video w-full overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
            <video
              className="h-full w-full object-cover"
              src={DEMO_VIDEO}
              poster={DEMO_POSTER}
              autoPlay
              muted
              loop
              playsInline
              preload="none"
              aria-label="Motio2edit product demo"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/80 to-transparent p-4">
              <span className="rounded-full bg-primary/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-primary-foreground">
                Live demo
              </span>
            </div>
          </div>
        </div>
      </div>

      {demoOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 p-3 backdrop-blur-md sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Product demo video"
          onClick={() => setDemoOpen(false)}
        >
          <button
            type="button"
            aria-label="Close demo"
            onClick={() => setDemoOpen(false)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <video
              className="aspect-video w-full rounded-2xl border border-border"
              src={DEMO_VIDEO}
              poster={DEMO_POSTER}
              controls
              autoPlay
              playsInline
            />
          </div>
        </div>
      )}
    </section>
  );
}
