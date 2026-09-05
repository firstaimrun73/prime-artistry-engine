/**
 * WHAT'S NEW — Circle 2edit feature presentation (post-login homepage).
 * Circle to Remove: frozen Giza animation (CircleRemoveHeroDemo — DO NOT modify).
 * Circle to Add: CircleAddHeroDemo (deer sequence).
 * Try Now deep-links: mode=remove|add & from=home.
 * Info (i) goes to detail page, not slider.
 */
import { Link } from "@tanstack/react-router";
import { Info, Sparkles } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { CircleRemoveHeroDemo } from "@/components/circle-edit/CircleRemoveHeroDemo";
import { CircleAddHeroDemo } from "@/components/circle-edit/CircleAddHeroDemo";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

/** Isolates demo render failures so the rest of the signed-in homepage stays up. */
class DemoErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[CircleDemo]", error, info);
  }
  render() {
    if (this.state.failed) {
      return (
        this.props.fallback ?? (
          <div
            className="h-full w-full animate-pulse bg-gradient-to-br from-[#E8E4FF] via-[#F4F1FF] to-[#DDD6FE]"
            aria-label="Loading preview"
          />
        )
      );
    }
    return this.props.children;
  }
}

function RemoveCard() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const tryHref = "/studio/image/circle-remove?mode=remove&from=home";
  const infoHref = "/studio/image/circle-info?sampleId=img-giza-remove";

  return (
    <article
      className={cn(
        "group relative isolate flex w-full max-w-[380px] flex-col overflow-hidden rounded-2xl border shadow-md",
        isDark ? "border-white/10 bg-[#181A22]" : "border-black/8 bg-white",
      )}
    >
      <div className="relative z-0 aspect-[4/5] w-full isolate overflow-hidden bg-gradient-to-br from-[#7B6FE0]/12 to-transparent">
        <DemoErrorBoundary>
          <CircleRemoveHeroDemo />
        </DemoErrorBoundary>

        <Link
          to={infoHref as "/studio/image/circle-info"}
          className={cn(
            "absolute right-2.5 top-2.5 z-50 grid h-8 w-8 place-items-center rounded-full border backdrop-blur-md transition active:scale-95",
            isDark
              ? "border-white/15 bg-black/40 text-white hover:bg-black/55"
              : "border-black/10 bg-white/80 text-[#1A1C24] hover:bg-white",
          )}
          aria-label="About Circle to Remove sample"
          onClick={(e) => e.stopPropagation()}
        >
          <Info className="h-4 w-4" strokeWidth={2.25} />
        </Link>

        <span
          className={cn(
            "absolute left-2.5 top-2.5 z-10 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
            isDark ? "bg-white/15 text-white backdrop-blur-sm" : "bg-black/60 text-white",
          )}
        >
          Remove
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3.5 sm:p-4">
        <div className="min-w-0">
          <h3 className="text-[15px] font-bold leading-tight tracking-tight">Circle to Remove</h3>
          <p
            className={cn(
              "mt-0.5 line-clamp-2 text-[12px] leading-snug",
              isDark ? "text-[#9AA0B0]" : "text-[#5C6170]",
            )}
          >
            Paint over people, objects, or clutter you want removed. Circle 2edit reconstructs the scene while preserving the surrounding image.
          </p>
        </div>
        <Link
          to={tryHref as "/studio/image/circle-remove"}
          className="mt-1 inline-flex w-full items-center justify-center gap-1.5 rounded-2xl bg-[#7B6FE0] px-3 py-2.5 text-[13px] font-semibold text-white shadow-sm shadow-[rgba(123,111,224,0.3)] transition active:scale-[0.98]"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Try Now
        </Link>
      </div>
    </article>
  );
}

function AddCard() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const tryHref = "/studio/image/circle-remove?mode=add&from=home";
  const infoHref = "/studio/image/circle-info?sampleId=img-deer-add";

  return (
    <article
      className={cn(
        "group relative isolate flex w-full max-w-[380px] flex-col overflow-hidden rounded-2xl border shadow-md",
        isDark ? "border-white/10 bg-[#181A22]" : "border-black/8 bg-white",
      )}
    >
      <div className="relative z-0 aspect-[4/5] w-full isolate overflow-hidden bg-gradient-to-br from-[#7B6FE0]/12 to-transparent">
        <DemoErrorBoundary>
          <CircleAddHeroDemo />
        </DemoErrorBoundary>

        <Link
          to={infoHref as "/studio/image/circle-info"}
          className={cn(
            "absolute right-2.5 top-2.5 z-50 grid h-8 w-8 place-items-center rounded-full border backdrop-blur-md transition active:scale-95",
            isDark
              ? "border-white/15 bg-black/40 text-white hover:bg-black/55"
              : "border-black/10 bg-white/80 text-[#1A1C24] hover:bg-white",
          )}
          aria-label="About Circle to Add sample"
          onClick={(e) => e.stopPropagation()}
        >
          <Info className="h-4 w-4" strokeWidth={2.25} />
        </Link>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3.5 sm:p-4">
        <div className="min-w-0">
          <h3 className="text-[15px] font-bold leading-tight tracking-tight">Circle to Add</h3>
          <p
            className={cn(
              "mt-0.5 line-clamp-2 text-[12px] leading-snug",
              isDark ? "text-[#9AA0B0]" : "text-[#5C6170]",
            )}
          >
            Paint where the new object should sit. AI matches lighting, scale, perspective, and scene integration.
          </p>
        </div>
        <Link
          to={tryHref as "/studio/image/circle-remove"}
          className="mt-1 inline-flex w-full items-center justify-center gap-1.5 rounded-2xl bg-[#7B6FE0] px-3 py-2.5 text-[13px] font-semibold text-white shadow-sm shadow-[rgba(123,111,224,0.3)] transition active:scale-[0.98]"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Try Now
        </Link>
      </div>
    </article>
  );
}

export function CircleSampleGallery() {
  return (
    <section className="mt-8 space-y-0" data-circle-samples="whats-new">
      <div className="overflow-hidden rounded-2xl bg-[#12141C] px-4 py-5 text-white sm:px-6 sm:py-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#A89BFF]">What's New</p>
        <h2 className="mt-1.5 text-[18px] font-extrabold tracking-tight sm:text-[20px]">
          Circle 2edit
        </h2>
        <p className="mt-1 max-w-xl text-[13px] leading-snug text-white/70">
          New ways to remove and add objects — mark a region, generate, keep the rest of the frame.
        </p>
      </div>

      <div
        className={cn(
          "mt-4 flex flex-col gap-4",
          "sm:flex-row sm:gap-4 sm:overflow-x-auto sm:pb-2",
          "sm:snap-x sm:snap-mandatory",
        )}
      >
        <div className="sm:snap-start sm:w-[min(100%,340px)] sm:shrink-0">
          <RemoveCard />
        </div>
        <div className="sm:snap-start sm:w-[min(100%,340px)] sm:shrink-0">
          <AddCard />
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <Link
          to="/about"
          hash="circle-2edit"
          className="text-[12px] font-semibold text-[#7B6FE0] hover:underline"
        >
          How it works
        </Link>
      </div>
    </section>
  );
}
