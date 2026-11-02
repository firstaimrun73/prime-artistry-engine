import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Image as ImageIcon,
  Video,
  Music,
  Zap,
  Play,
  X,
  ArrowRight,
  Upload,
  Wand2,
  Download,
  Sparkles,
} from "lucide-react";

const DEMO_VIDEO = "/demo/video/motio2edit-demo.mp4";
const DEMO_POSTER = "/demo/video/poster-landscape.jpg";

const VALUE_PROPS = [
  { icon: ImageIcon, label: "Restore & enhance" },
  { icon: Video, label: "AI video studio" },
  { icon: Music, label: "Music generation" },
  { icon: Sparkles, label: "Maluto AI free restore" },
];

const STEPS = [
  { icon: Upload, label: "Upload" },
  { icon: Wand2, label: "Describe" },
  { icon: Download, label: "Get result" },
];

/** Pre-login hero — never deep-link into product editors (Circle, Lens, etc.). */
const AUTH_THEN_RESTORE =
  "/studio/image/auto-edit?from=home";

export function HomeHero() {
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <section className="relative mx-auto w-full max-w-7xl px-4 pb-12 pt-10 sm:px-6 sm:pb-20 sm:pt-16 lg:px-8">
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-14">
        {/* Left copy — F-pattern, left-aligned on desktop */}
        <div className="reveal-up min-w-0 text-center lg:col-span-6 lg:text-left xl:col-span-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-secondary/80 px-4 py-1.5 text-xs font-semibold text-muted-foreground backdrop-blur-sm">
            <Zap className="h-3.5 w-3.5 text-primary" />
            <span className="notranslate" translate="no">
              Motio2edit
            </span>
            <span className="text-border">·</span>
            <span>AI photo & video studio</span>
          </span>

          <h1 className="mt-5 text-3xl font-extrabold leading-[1.15] tracking-tight sm:text-4xl lg:text-5xl xl:text-[3.25rem]">
            Your photo will be fully restored and edited here
            <span className="mt-1 block text-primary">— completely.</span>
          </h1>

          <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg lg:mx-0">
            Upload once. Motio2edit restores old photos, removes objects, enhances portraits,
            and generates video — in one clean workspace. Real results, not hope.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <Button asChild size="lg" className="gap-2 px-6 shadow-md shadow-primary/20">
              <Link to="/auth" search={{ redirect: AUTH_THEN_RESTORE }}>
                Start free restore
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="gap-2"
              onClick={() => setDemoOpen(true)}
            >
              <Play className="h-4 w-4" />
              Watch restore demo
            </Button>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5 lg:justify-start">
            {VALUE_PROPS.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/80 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-sm"
              >
                <Icon className="h-3.5 w-3.5 text-primary" />
                {label}
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground lg:justify-start">
            {STEPS.map(({ icon: Icon, label }, i) => (
              <span key={label} className="inline-flex items-center gap-1.5">
                {i > 0 && <span className="mx-0.5 text-border">→</span>}
                <Icon className="h-3.5 w-3.5 opacity-70" />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Right demo — larger on desktop, glass frame */}
        <div className="reveal-up relative mx-auto w-full max-w-xl lg:col-span-6 lg:max-w-none xl:col-span-7">
          <div className="glass-panel relative overflow-hidden rounded-2xl shadow-2xl shadow-black/20 ring-1 ring-white/10">
            <button
              type="button"
              className="group relative block w-full"
              onClick={() => setDemoOpen(true)}
              aria-label="Play restore demo video"
            >
              <img
                src={DEMO_POSTER}
                alt="Motio2edit photo restore demo"
                className="aspect-video w-full object-cover"
              />
              <span className="absolute inset-0 flex items-center justify-center bg-black/30 transition group-hover:bg-black/40">
                <span className="grid h-16 w-16 place-items-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/40 transition group-hover:scale-105">
                  <Play className="h-7 w-7 fill-current" />
                </span>
              </span>
              <span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                Real restore example
              </span>
            </button>
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground lg:text-left">
            See a full before → after restore in under a minute.
          </p>
        </div>
      </div>

      {demoOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Restore demo video"
        >
          <div className="relative w-full max-w-5xl overflow-hidden rounded-2xl bg-black shadow-2xl">
            <button
              type="button"
              className="absolute right-3 top-3 z-10 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
              onClick={() => setDemoOpen(false)}
              aria-label="Close demo"
            >
              <X className="h-5 w-5" />
            </button>
            <video
              key={demoOpen ? "demo-open" : "demo-closed"}
              src={DEMO_VIDEO}
              poster={DEMO_POSTER}
              controls
              autoPlay
              playsInline
              preload="metadata"
              className="w-full max-h-[min(75vh,800px)] object-contain bg-black"
            >
              <source src={DEMO_VIDEO} type="video/mp4" />
              Your browser does not support this demo video.
            </video>
          </div>
        </div>
      )}
    </section>
  );
}
