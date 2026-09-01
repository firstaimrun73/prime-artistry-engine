/**
 * Post-login only Circle 2edit feature presentation.
 * Horizontal post-style cards (Facebook/Instagram feel on mobile).
 * Separate actions: info → feature detail page | Try Now → Circle editor.
 * No grid wall, no download icons, no Details labels, no samples wording.
 */
import { Link } from "@tanstack/react-router";
import { Info, Sparkles } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import {
  getActiveCircleSamples,
  resolveCircleSampleMediaUrl,
  circleSampleTryHref,
  type CircleSample,
} from "@/lib/circle-edit/circle-samples";
import { findAddAsset } from "@/lib/circle-edit/add-assets";
import { AssetIcon } from "@/components/circle-edit/AssetIcon";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

function circleInfoHref(sample: CircleSample): string {
  return `/studio/image/circle-info?sampleId=${encodeURIComponent(sample.id)}`;
}

function FeatureCard({ sample }: { sample: CircleSample }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [active, setActive] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const leaveTimer = useRef<number | null>(null);
  const src = useMemo(() => resolveCircleSampleMediaUrl(sample), [sample]);
  const asset = sample.assetId ? findAddAsset(sample.assetId) : null;
  const tryHref = circleSampleTryHref(sample);
  const infoHref = circleInfoHref(sample);

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
        "group relative flex w-[min(86vw,340px)] shrink-0 flex-col overflow-hidden rounded-3xl border shadow-md transition-shadow duration-300 sm:w-[320px]",
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
                  "relative rounded-full border-[3px] border-white/90 transition-transform duration-500",
                  sample.mode === "remove" ? "h-[42%] w-[42%]" : "h-[38%] w-[38%]",
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
                "pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/55 to-transparent px-4 pb-3 pt-10 transition-opacity duration-400",
                active ? "opacity-100" : "opacity-0",
              )}
            >
              <p className="text-[12px] font-semibold text-white">
                {sample.mode === "remove" ? "Object removed" : "Object added"}
              </p>
            </div>
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6">
            {asset ? (
              <span className="grid h-20 w-20 place-items-center rounded-3xl bg-[rgba(123,111,224,0.18)]">
                <AssetIcon asset={asset} size={48} isDark={isDark} selected />
              </span>
            ) : (
              <span className="grid h-16 w-16 place-items-center rounded-full border-[3px] border-[#7B6FE0]/70">
                <span className="h-3.5 w-3.5 rounded-full bg-[#7B6FE0]" />
              </span>
            )}
            <p className="text-center text-sm font-semibold text-[#7B6FE0]">{sample.title}</p>
            <p className={cn("text-center text-[11px]", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>
              Media loading from R2
            </p>
          </div>
        )}

        <Link
          to={infoHref as "/studio/image/circle-info"}
          className={cn(
            "absolute right-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full border backdrop-blur-md transition active:scale-95",
            isDark
              ? "border-white/15 bg-black/40 text-white hover:bg-black/55"
              : "border-black/10 bg-white/80 text-[#1A1C24] hover:bg-white",
          )}
          aria-label={`About ${sample.title}`}
          onClick={(e) => e.stopPropagation()}
        >
          <Info className="h-4 w-4" strokeWidth={2.25} />
        </Link>

        <span
          className={cn(
            "absolute left-2.5 top-2.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
            sample.mode === "add"
              ? "bg-[#7B6FE0] text-white"
              : isDark
                ? "bg-white/15 text-white backdrop-blur-sm"
                : "bg-black/60 text-white",
          )}
        >
          {sample.mode === "add" ? "Add" : "Remove"}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3.5 sm:p-4">
        <div className="min-w-0">
          <h3 className="text-[15px] font-bold leading-tight tracking-tight">{sample.title}</h3>
          <p className={cn("mt-0.5 line-clamp-2 text-[12px] leading-snug", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>
            {sample.description}
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

function HorizontalRow({
  title,
  subtitle,
  samples,
}: {
  title: string;
  subtitle?: string;
  samples: CircleSample[];
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  if (samples.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="px-0.5">
        <h3 className="text-[15px] font-bold tracking-tight">{title}</h3>
        {subtitle ? (
          <p className={cn("text-[12px]", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>{subtitle}</p>
        ) : null}
      </div>
      <div
        className="flex gap-3 overflow-x-auto pb-2 pt-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}
      >
        {samples.map((s) => (
          <div key={s.id} style={{ scrollSnapAlign: "start" }}>
            <FeatureCard sample={s} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CircleSampleGallery() {
  const samples = useMemo(() => getActiveCircleSamples(), []);
  const removeSamples = useMemo(() => samples.filter((s) => s.mode === "remove"), [samples]);
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
          to="/studio/image/circle-info"
          className="text-[12px] font-semibold text-[#7B6FE0] hover:underline"
        >
          How it works
        </Link>
      </div>

      <HorizontalRow
        title="Remove"
        subtitle="Circle anything you want gone"
        samples={removeSamples}
      />
      <HorizontalRow
        title="Add"
        subtitle="Place objects that match the scene"
        samples={addSamples}
      />
    </section>
  );
}
