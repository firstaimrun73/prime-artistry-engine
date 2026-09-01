/**
 * Post-login only Circle 2edit sample cards (25+).
 * Media from R2 public URL when configured; SVG placeholder otherwise.
 * Try Now preserves exact assetId + mode.
 */
import { Link } from "@tanstack/react-router";
import { Download, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
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

function SampleCard({ sample }: { sample: CircleSample }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [hovered, setHovered] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const src = useMemo(() => resolveCircleSampleMediaUrl(sample), [sample]);
  const asset = sample.assetId ? findAddAsset(sample.assetId) : null;
  const tryHref = circleSampleTryHref(sample);

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border shadow-sm transition-transform duration-200",
        isDark ? "border-white/10 bg-[#181A22]" : "border-black/8 bg-white",
        hovered && "scale-[1.02] shadow-md",
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={() => setHovered(true)}
      onTouchEnd={() => setTimeout(() => setHovered(false), 200)}
    >
      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-[#7B6FE0]/15 to-transparent">
        {!imgFailed ? (
          <img
            src={src}
            alt={sample.title}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4">
            {asset ? (
              <span className="grid h-16 w-16 place-items-center rounded-2xl bg-[rgba(123,111,224,0.18)]">
                <AssetIcon asset={asset} size={40} isDark={isDark} selected />
              </span>
            ) : (
              <span className="grid h-14 w-14 place-items-center rounded-full border-2 border-[#7B6FE0]">
                <span className="h-3 w-3 rounded-full bg-[#7B6FE0]" />
              </span>
            )}
            <p className="text-center text-xs font-semibold text-[#7B6FE0]">{sample.title}</p>
          </div>
        )}
        <span
          className={cn(
            "absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
            sample.mode === "add"
              ? "bg-[#7B6FE0] text-white"
              : isDark
                ? "bg-white/15 text-white"
                : "bg-black/70 text-white",
          )}
        >
          {sample.mode}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="text-[13px] font-bold leading-tight tracking-tight">{sample.title}</h3>
        <p className={cn("line-clamp-2 text-[11px]", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>
          {sample.description}
        </p>
        <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
          <Link
            to={tryHref as "/studio/image/circle-remove"}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-[#7B6FE0] px-2.5 py-1.5 text-[11px] font-semibold text-white"
          >
            <Sparkles className="h-3 w-3" />
            Try Now
          </Link>
          <a
            href={src}
            download={`${sample.id}.jpg`}
            className={cn(
              "inline-flex items-center justify-center rounded-xl border px-2 py-1.5 text-[11px] font-medium",
              isDark ? "border-white/12 text-[#C5C7D0]" : "border-black/10 text-[#3A3E4C]",
            )}
            onClick={(e) => {
              if (src.startsWith("data:")) e.preventDefault();
            }}
          >
            <Download className="h-3 w-3" />
          </a>
          <Link
            to="/studio/image/circle-info"
            className={cn(
              "inline-flex items-center justify-center rounded-xl border px-2.5 py-1.5 text-[11px] font-medium",
              isDark ? "border-white/12 text-[#C5C7D0]" : "border-black/10 text-[#3A3E4C]",
            )}
          >
            Details
          </Link>
        </div>
      </div>
    </article>
  );
}

export function CircleSampleGallery() {
  const samples = useMemo(() => getActiveCircleSamples(), []);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <section className="mt-8" data-circle-samples="post-login-only">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Circle 2edit samples
          </h2>
          <p className={cn("mt-0.5 text-sm font-semibold", isDark ? "text-[#F2F2F5]" : "text-[#1A1C24]")}>
            Mark · Remove · Add — try a preset
          </p>
        </div>
        <Link
          to="/studio/image/circle-info"
          className="text-xs font-semibold text-[#7B6FE0] hover:underline"
        >
          How it works
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {samples.map((s) => (
          <SampleCard key={s.id} sample={s} />
        ))}
      </div>
    </section>
  );
}
