/**
 * Homepage card for Remove BG — same pattern as Circle Sample cards.
 * (i) → info page · Try Now → editor
 */
import { Link } from "@tanstack/react-router";
import { Info, Sparkles } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { RemoveBgHeroDemo } from "@/components/remove-bg/RemoveBgHeroDemo";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

class DemoErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[RemoveBgDemo]", error, info);
  }
  render() {
    if (this.state.failed) {
      return (
        this.props.fallback ?? (
          <div
            className="h-full w-full animate-pulse bg-gradient-to-br from-rose-100 via-pink-50 to-amber-50"
            aria-label="Loading preview"
          />
        )
      );
    }
    return this.props.children;
  }
}

const MEDIA =
  "relative z-0 aspect-square w-full isolate overflow-hidden bg-gradient-to-br from-rose-500/10 to-transparent";

export function RemoveBgHomeCard() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <section className="mt-8 space-y-0" data-remove-bg-home="card">
      <div className="overflow-hidden rounded-2xl bg-[#12141C] px-4 py-5 text-white sm:px-6 sm:py-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#F9A8D4]">What's New</p>
        <h2 className="mt-1.5 text-[18px] font-extrabold tracking-tight sm:text-[20px]">Remove BG</h2>
        <p className="mt-1 max-w-md text-[13px] leading-snug text-white/65">
          One photo. One click. Transparent background.
        </p>
      </div>

      <div className="mt-4 flex justify-start">
        <article
          className={cn(
            "group relative isolate flex h-fit w-full max-w-[380px] flex-col self-start overflow-hidden rounded-2xl border shadow-md",
            isDark ? "border-white/10 bg-[#181A22]" : "border-black/8 bg-white",
          )}
        >
          <div className={MEDIA}>
            <DemoErrorBoundary>
              <RemoveBgHeroDemo />
            </DemoErrorBoundary>

            <span
              className={cn(
                "absolute left-2.5 top-2.5 z-10 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] backdrop-blur-md",
                isDark ? "bg-black/40 text-white/90" : "bg-white/75 text-[#3A3E4C]",
              )}
            >
              Remove BG
            </span>

            <Link
              to="/studio/image/remove-bg-info"
              className={cn(
                "absolute right-2.5 top-2.5 z-50 grid h-8 w-8 place-items-center rounded-full border backdrop-blur-md transition active:scale-95",
                isDark
                  ? "border-white/15 bg-black/40 text-white hover:bg-black/55"
                  : "border-black/10 bg-white/80 text-[#1A1C24] hover:bg-white",
              )}
              aria-label="About Remove BG"
              onClick={(e) => e.stopPropagation()}
            >
              <Info className="h-4 w-4" strokeWidth={2.25} />
            </Link>
          </div>

          <div className="flex flex-col gap-2 p-3.5 sm:p-4">
            <div className="min-w-0">
              <h3 className="text-[15px] font-bold leading-tight tracking-tight">Remove background</h3>
              <p
                className={cn(
                  "mt-0.5 line-clamp-1 text-[12px] leading-snug",
                  isDark ? "text-[#9AA0B0]" : "text-[#5C6170]",
                )}
              >
                Upload · one click · download PNG cutout
              </p>
            </div>
            <Link
              to="/studio/image/remove-bg"
              search={{ from: "home" }}
              className="mt-1 inline-flex w-full items-center justify-center gap-1.5 rounded-2xl bg-rose-500 px-3 py-2.5 text-[13px] font-semibold text-white shadow-sm shadow-rose-500/30 transition active:scale-[0.98] hover:bg-rose-600"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Try Now
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}
