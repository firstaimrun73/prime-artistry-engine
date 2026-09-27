/**
 * Remove BG info page — /studio/image/remove-bg-info
 * Like Circle info: explain product, rose carousel, then Try Now → editor.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Sparkles, Download } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { REMOVE_BG_CREDITS } from "@/lib/remove-bg/constants";
import { REMOVE_BG_INFO_CAROUSEL } from "@/lib/remove-bg/samples";

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

function RemoveBgInfoPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { user } = useAuth();
  const navigate = useNavigate();
  const [slide, setSlide] = useState(0);
  const current = REMOVE_BG_INFO_CAROUSEL[slide] ?? REMOVE_BG_INFO_CAROUSEL[0];

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
        <section className="relative overflow-hidden rounded-3xl border border-rose-500/35 bg-gradient-to-br from-rose-500/18 via-transparent to-transparent p-6 sm:p-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-rose-500">Remove BG</p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
            One-click background removal
          </h1>
          <p className={cn("mt-2 max-w-md text-[14px] leading-relaxed", isDark ? "text-[#C5C7D0]" : "text-[#3A3E4C]")}>
            Upload any photo. AI removes the background and returns a clean transparent PNG — ready for
            product shots, social posts, and design work.
          </p>
          <button
            type="button"
            onClick={start}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-rose-500 px-5 py-3 text-[14px] font-semibold text-white shadow-lg shadow-rose-500/35 transition active:scale-[0.98] hover:bg-rose-600"
          >
            <Sparkles className="h-4 w-4" />
            {user ? "Try Now" : "Start Now"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </section>

        {/* Before / After carousel — user rose pair, keep natural aspect */}
        <section className="space-y-3">
          <h2 className="text-[15px] font-bold tracking-tight">Before & after</h2>
          <div
            className={cn(
              "overflow-hidden rounded-2xl border",
              isDark ? "border-white/10 bg-white/5" : "border-black/6 bg-white",
            )}
          >
            <div
              className="relative aspect-square w-full"
              style={{
                backgroundImage:
                  current.label === "After"
                    ? "linear-gradient(45deg,#e5e7eb 25%,transparent 25%),linear-gradient(-45deg,#e5e7eb 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e5e7eb 75%),linear-gradient(-45deg,transparent 75%,#e5e7eb 75%)"
                    : undefined,
                backgroundSize: current.label === "After" ? "14px 14px" : undefined,
                backgroundPosition: current.label === "After" ? "0 0,0 7px,7px -7px,-7px 0" : undefined,
                backgroundColor: current.label === "After" ? "#f8fafc" : undefined,
              }}
            >
              <img
                src={current.src}
                alt={current.caption}
                className="h-full w-full object-contain"
                draggable={false}
              />
              <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md">
                {current.label}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 px-4 py-3">
              <p className={cn("text-[12px]", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>
                {current.caption}
              </p>
              <div className="flex gap-1.5">
                {REMOVE_BG_INFO_CAROUSEL.map((item, i) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSlide(i)}
                    className={cn(
                      "h-2 w-2 rounded-full transition",
                      i === slide ? "bg-rose-500" : isDark ? "bg-white/25" : "bg-black/20",
                    )}
                    aria-label={item.label}
                  />
                ))}
              </div>
            </div>
            <div className="flex border-t border-border/60">
              {REMOVE_BG_INFO_CAROUSEL.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSlide(i)}
                  className={cn(
                    "flex-1 py-2.5 text-[12px] font-semibold transition",
                    i === slide
                      ? "bg-rose-500/10 text-rose-600"
                      : isDark
                        ? "text-[#9AA0B0] hover:bg-white/5"
                        : "text-[#5C6170] hover:bg-black/5",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
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
