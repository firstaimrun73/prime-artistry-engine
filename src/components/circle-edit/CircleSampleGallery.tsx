/**
 * Post-login only Circle 2edit feature presentation.
 * ONE Remove hero card with premium Giza people-removal animated demo.
 * Add cards: compact horizontal row.
 */
import { Link } from "@tanstack/react-router";
import { Info, Sparkles } from "lucide-react";
import { Component, useMemo, useRef, useState, type ErrorInfo, type ReactNode } from "react";
import {
  getActiveCircleSamples,
  getRemoveDemoSamples,
  resolveCircleSampleMediaUrl,
  circleSampleTryHref,
  circleInfoHref,
  type CircleSample,
} from "@/lib/circle-edit/circle-samples";
import { findAddAsset } from "@/lib/circle-edit/add-assets";
import { CircleRemoveHeroDemo } from "@/components/circle-edit/CircleRemoveHeroDemo";
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
    console.error("[CircleRemoveHeroDemo]", error, info);
  }
  render() {
    if (this.state.failed) {
      return this.props.fallback ?? (
        <div
          className="h-full w-full animate-pulse bg-gradient-to-br from-[#E8E4FF] via-[#F4F1FF] to-[#DDD6FE]"
          aria-label="Loading preview"
        />
      );
    }
    return this.props.children;
  }
}

function RemoveHeroCard({ samples }: { samples: CircleSample[] }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const sample = samples.find((s) => /people|crowd|tourist/i.test(s.title + s.id)) ?? samples[0];
  const tryHref = sample ? circleSampleTryHref(sample, "home") : "/studio/image/circle-remove?from=home";
  const infoHref = sample ? circleInfoHref(sample.id) : circleInfoHref();

  if (!sample) return null;

  return (
    <article
      className={cn(
        "group relative flex w-full max-w-[420px] flex-col overflow-hidden rounded-3xl border shadow-md",
        isDark ? "border-white/10 bg-[#181A22]" : "border-black/8 bg-white",
      )}
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-gradient-to-br from-[#7B6FE0]/12 to-transparent">
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
          aria-label="About this sample"
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
          <h3 className="text-[15px] font-bold leading-tight tracking-tight">Clear a crowded view</h3>
          <p className={cn("mt-0.5 line-clamp-2 text-[12px] leading-snug", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>
            Mark people and clutter in cultural scenes — keep the landmark, open the frame.
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

function AddFeatureCard({ sample }: { sample: CircleSample }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [active, setActive] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const leaveTimer = useRef<number | null>(null);
  const src = useMemo(() => resolveCircleSampleMediaUrl(sample), [sample]);
  const tryHref = circleSampleTryHref(sample, "home");
  const infoHref = circleInfoHref(sample.id);

  const startInteraction = () => {
    if (leaveTimer.current) {
      window.clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
    setActive(true);
  };
  const endInteraction = () => {
    if (leaveTimer.current) window.clearTimeout(leaveTimer.current);
    leaveTimer.current = window.setTimeout(() => setActive(false), 180);
  };

  return (
    <article
      className={cn(
        "group relative flex w-[min(72vw,240px)] shrink-0 flex-col overflow-hidden rounded-3xl border shadow-md transition-shadow duration-300 sm:w-[220px]",
        isDark ? "border-white/10 bg-[#181A22]" : "border-black/8 bg-white",
        active && "shadow-lg shadow-[rgba(123,111,224,0.18)]",
      )}
      onMouseEnter={startInteraction}
      onMouseLeave={endInteraction}
      onTouchStart={startInteraction}
      onTouchEnd={endInteraction}
      onTouchCancel={endInteraction}
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-gradient-to-br from-[#7B6FE0]/12 to-transparent">
        {!imgFailed ? (
          <>
            <img
              src={src}
              alt={sample.title}
              className={cn(
                "absolute inset-0 h-full w-full object-cover transition-all duration-500 ease-out",
                active ? "scale-[1.03] brightness-[0.92]" : "scale-100",
              )}
              loading="lazy"
              onError={() => setImgFailed(true)}
            />
            <div
              className={cn(
                "pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-400",
                active ? "opacity-100" : "opacity-0",
              )}
            >
              <div
                className={cn(
                  "relative h-[38%] w-[38%] rounded-full border-[3px] border-white/90 transition-transform duration-500",
                  active ? "scale-100" : "scale-75",
                )}
                style={{
                  boxShadow:
                    "0 0 0 9999px rgba(255,255,255,0.22), 0 0 24px rgba(123,111,224,0.35)",
                }}
              >
                <span className="absolute inset-[18%] rounded-full border-2 border-dashed border-white/70" />
              </div>
            </div>
            <div
              className={cn(
                "pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/55 to-transparent px-3 pb-2.5 pt-8 transition-opacity duration-400",
                active ? "opacity-100" : "opacity-0",
              )}
            >
              <p className="text-[11px] font-semibold text-white">Object added</p>
            </div>
          </>
        ) : (
          <div
            className="h-full w-full animate-pulse bg-gradient-to-br from-[#E8E4FF] via-[#F4F1FF] to-[#DDD6FE]"
            aria-label="Loading sample"
          />
        )}

        <Link
          to={infoHref as "/studio/image/circle-info"}
          className={cn(
            "absolute right-2 top-2 z-50 grid h-7 w-7 place-items-center rounded-full border backdrop-blur-md",
            isDark
              ? "border-white/15 bg-black/40 text-white"
              : "border-black/10 bg-white/80 text-[#1A1C24]",
          )}
          aria-label={`About ${sample.title}`}
          onClick={(e) => e.stopPropagation()}
        >
          <Info className="h-3.5 w-3.5" strokeWidth={2.25} />
        </Link>

        <span className="absolute left-2 top-2 z-10 rounded-full bg-[#7B6FE0] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          Add
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="text-[13px] font-bold leading-tight tracking-tight">{sample.title}</h3>
        <Link
          to={tryHref as "/studio/image/circle-remove"}
          className="mt-auto inline-flex w-full items-center justify-center gap-1 rounded-xl bg-[#7B6FE0] px-2.5 py-2 text-[12px] font-semibold text-white"
        >
          <Sparkles className="h-3 w-3" />
          Try Now
        </Link>
      </div>
    </article>
  );
}

export function CircleSampleGallery() {
  const samples = useMemo(() => getActiveCircleSamples(), []);
  const removeDemos = useMemo(() => getRemoveDemoSamples(), []);
  const addSamples = useMemo(() => samples.filter((s) => s.mode === "add"), [samples]);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <section className="mt-8 space-y-7" data-circle-samples="post-login-only">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-1.5 text-[17px] font-extrabold tracking-tight">
            <span className="text-[18px]" aria-hidden>
              ⭕
            </span>
            Circle{" "}
            <span style={{ color: "#7B6FE0", fontStyle: "italic", fontWeight: 800 }}>2</span>
            edit
          </h2>
          <p className={cn("mt-0.5 text-[13px] font-medium", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>
            Mark · Remove · Add
          </p>
        </div>
        <Link
          to="/about"
          hash="circle-2edit"
          className="text-[12px] font-semibold text-[#7B6FE0] hover:underline"
        >
          How it works
        </Link>
      </div>

      <div className="space-y-3">
        <div className="px-0.5">
          <h3 className="text-[15px] font-bold tracking-tight">Remove</h3>
          <p className={cn("text-[12px]", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>
            Circle anything you want gone
          </p>
        </div>
        <div className="flex justify-center sm:justify-start">
          <RemoveHeroCard samples={removeDemos.length ? removeDemos : samples.filter((s) => s.mode === "remove")} />
        </div>
      </div>

      <div className="space-y-3">
        <div className="px-0.5">
          <h3 className="text-[15px] font-bold tracking-tight">Add</h3>
          <p className={cn("text-[12px]", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>
            Place objects that match the scene
          </p>
        </div>
        <div
          className="flex gap-3 overflow-x-auto pb-2 pt-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}
        >
          {addSamples.map((s) => (
            <div key={s.id} style={{ scrollSnapAlign: "start" }}>
              <AddFeatureCard sample={s} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
