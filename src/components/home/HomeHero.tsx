import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Video, Music, Zap, Play, ArrowRight, Upload, Wand2, Download } from "lucide-react";

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

/** Pre-login hero — never deep-link into product editors (Circle, Lens, etc.). */
const AUTH_THEN_CIRCLE =
  "/studio/image/circle-remove?mode=remove&from=home";

function scrollToWatchDemo() {
  const el = document.querySelector("[data-watch-demo]");
  if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
}

/**
 * Hero copy + CTAs only. The old local mountain demo (/demo/video/motio2edit-demo.mp4)
 * was removed — the single official demo is WatchDemoSection (R2 Demo_Video.mp4).
 */
export function HomeHero() {
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
        <p className="mx-auto mt-3 max-w-xl text-sm font-medium text-foreground/90">
          Most AI tools learn from your uploads. Motio2edit keeps your creativity yours.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" className="gap-2">
            <Link to="/auth" search={{ redirect: AUTH_THEN_CIRCLE }}>
              Try Now <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="gap-2">
            <Link to="/pricing">View pricing</Link>
          </Button>
          <Button type="button" size="lg" variant="ghost" className="gap-2" onClick={scrollToWatchDemo}>
            <Play className="h-4 w-4" /> Watch demo
          </Button>
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
