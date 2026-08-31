import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Video, Music, Zap, Play, X, ArrowRight, Upload, Wand2, Download } from "lucide-react";

const DEMO_VIDEO = "/demo/video/motio2edit-demo.mp4";
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
            <Zap className="h-3.5 w-3.5 text-primary" /> <span className="notranslate" translate="no">Motio2edit</span> · Credit-based AI studio
          </span>
          <h1 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            AI Image & Video Editing,{" "}
            <span className="text-primary">Made Simple</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg lg:mx-0">
            Edit images and videos with AI in one workspace. Remove objects, enhance portraits,
            change outfits, generate video — upload, describe, and generate.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <Button asChild size="lg" className="gap-2">
              <Link to="/studio">
                Open Studio <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="gap-2">
              <Link to="/pricing">View pricing</Link>
            </Button>
            <Button
              type="button"
              size="lg"
              variant="ghost"
              className="gap-2"
              onClick={() => setDemoOpen(true)}
            >
              <Play className="h-4 w-4" /> Watch demo
            </Button>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground lg:justify-start">
            {VALUE_PROPS.map(({ icon: Icon, label }) => (
              <span key={label} className="inline-flex items-center gap-1.5">
                <Icon className="h-4 w-4 text-primary" />
                {label}
              </span>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs font-medium text-muted-foreground lg:justify-start">
            {STEPS.map(({ icon: Icon, label }, i) => (
              <span key={label} className="inline-flex items-center gap-1.5">
                {i > 0 && <span className="mx-1 text-border">→</span>}
                <Icon className="h-3.5 w-3.5" />
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="reveal-up relative min-w-0">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
            <button
              type="button"
              className="group relative block w-full"
              onClick={() => setDemoOpen(true)}
              aria-label="Motio2edit product demo"
            >
              <img
                src={DEMO_POSTER}
                alt=""
                className="aspect-video w-full object-cover"
              />
              <span className="absolute inset-0 flex items-center justify-center bg-black/30 transition group-hover:bg-black/40">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                  <Play className="h-6 w-6 fill-current" />
                </span>
              </span>
            </button>
          </div>
        </div>
      </div>

      {demoOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-black shadow-2xl">
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
              className="w-full max-h-[min(70vh,720px)] object-contain bg-black"
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
