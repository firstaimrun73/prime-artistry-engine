/**
 * Remove BG info — /studio/image/remove-bg-info
 * Header → Before & After (animated) → How it works → Details → one Try Now
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Sparkles, Download } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { REMOVE_BG_CREDITS } from "@/lib/remove-bg/constants";
import {
  REMOVE_BG_ROSE_AFTER,
  REMOVE_BG_ROSE_BEFORE,
  REMOVE_BG_GALLERY,
} from "@/lib/remove-bg/samples";
import { CompareSlider } from "@/components/CompareSlider";

const ROSE_ACCENT = "#f43f5e";

export const Route = createFileRoute("/studio/image/remove-bg-info")({
  ssr: false,
  component: RemoveBgInfoPage,
  head: () => ({
    meta: [
      { title: "Remove BG — Motio2edit" },
      {
        name: "description",
        content: "One-click background removal. Transparent PNG cutout for any photo.",
      },
    ],
  }),
});

const CHECKER = {
  backgroundImage:
    "linear-gradient(45deg,#e5e7eb 25%,transparent 25%),linear-gradient(-45deg,#e5e7eb 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e5e7eb 75%),linear-gradient(-45deg,transparent 75%,#e5e7eb 75%)",
  backgroundSize: "14px 14px",
  backgroundPosition: "0 0,0 7px,7px -7px,-7px 0",
  backgroundColor: "#f8fafc",
} as const;

/** Auto-looping before → scan → after with progressive clip reveal */
function AnimatedBeforeAfter() {
  const [phase, setPhase] = useState<"before" | "scanning" | "after">("before");
  const [reveal, setReveal] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const wait = (ms: number) =>
      new Promise<void>((r) => {
        window.setTimeout(r, reduced ? Math.min(ms, 400) : ms);
      });

    const animateReveal = (from: number, to: number, duration: number) =>
      new Promise<void>((resolve) => {
        if (reduced) {
          setReveal(to);
          resolve();
          return;
        }
        const start = performance.now();
        const tick = (now: number) => {
          if (cancelled) return;
          const t = Math.min(1, (now - start) / duration);
          const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
          setReveal(from + (to - from) * eased);
          if (t < 1) raf = requestAnimationFrame(tick);
          else resolve();
        };
        raf = requestAnimationFrame(tick);
      });

    const loop = async () => {
      while (!cancelled) {
        setPhase("before");
        setReveal(0);
        await wait(2400);
        if (cancelled) break;
        setPhase("scanning");
        await animateReveal(0, 1, 1800);
        if (cancelled) break;
        setPhase("after");
        await wait(2800);
        if (cancelled) break;
        setPhase("before");
        await animateReveal(1, 0, 1000);
      }
    };
    void loop();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, []);

  const clipPct = Math.max(0, Math.min(100, (1 - reveal) * 100));

  return (
    <div className="relative aspect-square w-full overflow-hidden">
      <style>{`
        @keyframes rbg-info-scan {
          0% { opacity: 0.35; }
          50% { opacity: 1; }
          100% { opacity: 0.35; }
        }
      `}</style>
      <div className="absolute inset-0" style={CHECKER} />
      <img
        src={REMOVE_BG_ROSE_AFTER}
        alt="Transparent cutout"
        className="absolute inset-0 h-full w-full object-contain"
        draggable={false}
      />
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${clipPct}% 0 0)` }}
      >
        <img
          src={REMOVE_BG_ROSE_BEFORE}
          alt="Original with background"
          className="absolute inset-0 h-full w-full object-contain"
          draggable={false}
        />
      </div>
      {phase === "scanning" && (
        <div
          className="pointer-events-none absolute inset-y-0 z-10 w-0.5 bg-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.7)]"
          style={{
            left: `${reveal * 100}%`,
            animation: "rbg-info-scan 0.8s ease-in-out infinite",
          }}
        />
      )}
      <span className="absolute left-3 top-3 z-10 rounded-full bg-black/55 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md">
        {phase === "before" ? "Before" : phase === "scanning" ? "Removing…" : "After"}
      </span>
    </div>
  );
}

function RemoveBgInfoPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { user } = useAuth();
  const navigate = useNavigate();

  const start = () => {
    if (user) {
      void navigate({ to: "/studio/image/remove-bg", search: { from: "info" } });
    } else {
      void navigate({
        to: "/auth",
        search: { redirect: "/studio/image/remove-bg?from=info" },
      });
    }
  };

  const squareItems = REMOVE_BG_GALLERY.filter((g) => g.aspect === "1:1");
  const wideItems = REMOVE_BG_GALLERY.filter((g) => g.aspect === "16:9");

  return (
    <div
      className={cn(
        "min-h-[100dvh] pb-28",
        isDark ? "bg-[#12141A] text-[#F2F2F5]" : "bg-[#F4F5F8] text-[#1A1C24]",
      )}
    >
      <header
        className={cn(
          "sticky top-0 z-10 flex items-center gap-3 border-b px-4 py-3 backdrop-blur-xl",
          isDark ? "border-white/8 bg-[#181A22]/90" : "border-black/6 bg-white/85",
        )}
      >
        <button
          type="button"
          onClick={() => navigate({ to: "/", replace: true })}
          className={cn(
            "grid h-9 w-9 place-items-center rounded-xl border",
            isDark ? "border-white/10" : "border-black/8",
          )}
          aria-label="Back to home"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold tracking-tight text-rose-500">Remove BG</p>
          <p className={cn("text-[10px] font-medium tracking-wide", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>
            One click · transparent cutout
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-10 px-4 py-8">
        {/* Animated Before & After — primary visual */}
        <section className="space-y-3">
          <h2 className="text-[15px] font-bold tracking-tight">Before & after</h2>
          <div
            className={cn(
              "overflow-hidden rounded-2xl border",
              isDark ? "border-white/10 bg-white/5" : "border-black/6 bg-white",
            )}
          >
            <AnimatedBeforeAfter />
            <p
              className={cn(
                "px-4 py-3 text-[12px]",
                isDark ? "text-[#9AA0B0]" : "text-[#5C6170]",
              )}
            >
              Original photo → AI removes the background → transparent PNG cutout
            </p>
          </div>
        </section>

        {/* Real examples — 1:1 two-up, 16:9 full width */}
        <section className="space-y-3">
          <h2 className="text-[15px] font-bold tracking-tight">Examples</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {squareItems.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "overflow-hidden rounded-2xl border",
                  isDark ? "border-white/10 bg-white/5" : "border-black/6 bg-white",
                )}
              >
                <div className="relative aspect-square w-full">
                  <CompareSlider
                    before={item.before}
                    after={item.after}
                    accentColor={ROSE_ACCENT}
                    transparentAfter
                    className="h-full w-full"
                  />
                </div>
                <p className="px-2.5 py-1.5 text-center text-[11px] font-semibold text-muted-foreground">
                  {item.title}
                </p>
              </div>
            ))}
          </div>
          {wideItems.map((item) => (
            <div
              key={item.id}
              className={cn(
                "overflow-hidden rounded-2xl border",
                isDark ? "border-white/10 bg-white/5" : "border-black/6 bg-white",
              )}
            >
              <div className="relative aspect-video w-full">
                <CompareSlider
                  before={item.before}
                  after={item.after}
                  accentColor={ROSE_ACCENT}
                  transparentAfter
                  className="h-full w-full"
                />
              </div>
              <p className="px-2.5 py-1.5 text-center text-[11px] font-semibold text-muted-foreground">
                {item.title}
              </p>
            </div>
          ))}
        </section>

        <section className="space-y-3">
          <h2 className="text-[15px] font-bold tracking-tight">How it works</h2>
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: ImagePlus, label: "Upload", body: "Any photo" },
              { icon: Sparkles, label: "Remove", body: "One tap" },
              { icon: Download, label: "Download", body: "PNG cutout" },
            ].map(({ icon: Icon, label, body }) => (
              <div
                key={label}
                className={cn(
                  "rounded-2xl border p-3 text-center backdrop-blur-md",
                  isDark ? "border-white/10 bg-white/5" : "border-black/6 bg-white/80",
                )}
              >
                <span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-rose-500/15 text-rose-500">
                  <Icon className="h-5 w-5" />
                </span>
                <p className="mt-2 text-[12px] font-bold">{label}</p>
                <p className={cn("text-[11px]", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section
          className={cn(
            "rounded-2xl border p-4",
            isDark ? "border-white/10 bg-white/5" : "border-black/6 bg-white/90",
          )}
        >
          <h2 className="mb-3 text-[14px] font-bold tracking-tight">Details</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
            <div>
              <dt className={isDark ? "text-[#9AA0B0]" : "text-[#5C6170]"}>Credits</dt>
              <dd className="font-semibold">{REMOVE_BG_CREDITS} per photo</dd>
            </div>
            <div>
              <dt className={isDark ? "text-[#9AA0B0]" : "text-[#5C6170]"}>Output</dt>
              <dd className="font-semibold">Transparent PNG</dd>
            </div>
            <div>
              <dt className={isDark ? "text-[#9AA0B0]" : "text-[#5C6170]"}>Aspect</dt>
              <dd className="font-semibold">Any</dd>
            </div>
            <div>
              <dt className={isDark ? "text-[#9AA0B0]" : "text-[#5C6170]"}>Quality</dt>
              <dd className="font-semibold">SD / HD</dd>
            </div>
          </dl>
        </section>

        {/* Single Try Now CTA */}
        <Link
          to="/studio/image/remove-bg"
          search={{ from: "info" }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-500 px-5 py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-rose-500/35 transition active:scale-[0.98] hover:bg-rose-600"
          onClick={(e) => {
            if (!user) {
              e.preventDefault();
              start();
            }
          }}
        >
          <Sparkles className="h-4 w-4" />
          Try Now
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
