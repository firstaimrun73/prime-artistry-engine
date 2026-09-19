/**
 * Horizontal style strip — R2 thumbnails, tier badges, locks, selected preview loop.
 * Phase U: ring not clipped; scroll-driven edge fade (no solid white).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Lock, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  videoStylesForStrip,
  canUseStyle,
  STYLE_FALLBACK_GRADIENT,
  type VideoStyleUi,
  type StyleTier,
} from "@/lib/videoStyles";

const GLASS =
  "border border-white/70 bg-white/55 shadow-[0_8px_32px_rgba(80,60,140,0.12)] backdrop-blur-xl saturate-150 ring-1 ring-black/5 dark:border-white/[0.12] dark:bg-white/[0.06] dark:ring-white/[0.06]";

function tierBadgeLabel(tier: StyleTier): string | null {
  if (tier === "ai_plus") return "AI+";
  if (tier === "premium") return "Premium";
  return null;
}

function unlockCopy(tier: StyleTier): string {
  if (tier === "ai_plus") return "Unlock AI+ styles with Plus and above";
  if (tier === "premium") return "Premium styles come with Pro and above";
  return "Upgrade to unlock this style";
}

export function VideoStyleStrip({
  styleId,
  onSelect,
  plan,
  isAdmin = false,
  disabled,
}: {
  styleId: string;
  onSelect: (id: string) => void;
  plan: string | null | undefined;
  isAdmin?: boolean;
  disabled?: boolean;
}) {
  const styles = videoStylesForStrip();
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const [lockedStyle, setLockedStyle] = useState<VideoStyleUi | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [fadeL, setFadeL] = useState(false);
  const [fadeR, setFadeR] = useState(true);

  const updateFades = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const { scrollLeft, clientWidth, scrollWidth } = el;
    setFadeL(scrollLeft > 2);
    setFadeR(scrollLeft + clientWidth < scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateFades();
    el.addEventListener("scroll", updateFades, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateFades) : null;
    ro?.observe(el);
    return () => {
      el.removeEventListener("scroll", updateFades);
      ro?.disconnect();
    };
  }, [updateFades, styles.length]);

  const maskImage =
    fadeL && fadeR
      ? "linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)"
      : fadeL
        ? "linear-gradient(to right, transparent, black 16px, black 100%)"
        : fadeR
          ? "linear-gradient(to right, black 0%, black calc(100% - 16px), transparent)"
          : "none";

  return (
    <section className="mb-4">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
        Style
      </p>
      <div className="relative">
        <div
          ref={scrollerRef}
          className="studio-hide-scroll -mx-1 -my-2 flex gap-2.5 overflow-x-auto px-1 py-2 snap-x snap-mandatory"
          style={{
            WebkitMaskImage: maskImage === "none" ? undefined : maskImage,
            maskImage: maskImage === "none" ? undefined : maskImage,
            paddingRight: 20,
          }}
          onScroll={updateFades}
        >
          {styles.map((s) => {
            const active = styleId === s.id;
            const locked = !canUseStyle(plan, s.tier, isAdmin);
            const badge = tierBadgeLabel(s.tier);
            const imgFailed = failed[s.id];
            const grad = STYLE_FALLBACK_GRADIENT[s.id] ?? STYLE_FALLBACK_GRADIENT.none;
            const showPreview = active && !!s.preview && !locked;

            return (
              <button
                key={s.id}
                type="button"
                disabled={disabled}
                onClick={() => {
                  if (locked) {
                    setLockedStyle(s);
                    return;
                  }
                  onSelect(s.id);
                }}
                className={cn(
                  "flex min-w-[104px] w-[104px] shrink-0 snap-start flex-col items-center gap-1 transition-transform duration-200",
                  active && !locked && "scale-[1.04]",
                  locked && "opacity-85",
                )}
              >
                <span
                  className={cn(
                    "relative block h-[54px] w-[96px] rounded-xl",
                    active &&
                      !locked &&
                      "ring-2 ring-[#F43F5E] shadow-[0_6px_18px_rgba(244,63,94,0.35)]",
                    s.id === "none" && GLASS,
                  )}
                >
                  <span className="absolute inset-0 overflow-hidden rounded-xl">
                    {s.id === "none" ? (
                      <span className="flex h-full w-full items-center justify-center">
                        <X className="h-5 w-5 text-slate-400" aria-hidden />
                      </span>
                    ) : showPreview ? (
                      <video
                        key={s.preview}
                        src={s.preview}
                        poster={s.thumb ?? undefined}
                        className="h-full w-full object-cover"
                        muted
                        loop
                        playsInline
                        autoPlay
                      />
                    ) : s.thumb && !imgFailed ? (
                      <img
                        src={s.thumb}
                        alt=""
                        width={96}
                        height={54}
                        loading="lazy"
                        className="h-full w-full object-cover"
                        onError={() => setFailed((prev) => ({ ...prev, [s.id]: true }))}
                      />
                    ) : (
                      <span className={cn("block h-full w-full bg-gradient-to-br", grad)} />
                    )}

                    <span className="absolute left-1 top-1 flex items-center gap-0.5">
                      {locked && (
                        <span className="grid h-5 w-5 place-items-center rounded-full bg-black/55 text-white">
                          <Lock className="h-3 w-3" aria-hidden />
                        </span>
                      )}
                      {badge && (
                        <span className="rounded-full border border-white/70 bg-white/80 px-1.5 py-0.5 text-[9px] font-bold text-slate-700 dark:border-white/20 dark:bg-black/55 dark:text-white">
                          {badge}
                        </span>
                      )}
                    </span>
                  </span>
                </span>
                <span
                  className={cn(
                    "w-full truncate px-0.5 text-center text-[10px] font-semibold leading-tight",
                    active && !locked
                      ? "bg-gradient-to-r from-[#FF7A45] to-[#F43F5E] bg-clip-text text-transparent"
                      : "text-slate-700 dark:text-zinc-200",
                  )}
                >
                  {s.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {lockedStyle && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            aria-label="Close"
            onClick={() => setLockedStyle(null)}
          />
          <div className={cn("relative z-10 w-full max-w-lg rounded-t-[24px] p-5 sm:rounded-[24px]", GLASS)}>
            <div className="flex gap-3">
              <div className="h-[54px] w-[96px] shrink-0 overflow-hidden rounded-xl">
                {lockedStyle.thumb ? (
                  <img
                    src={lockedStyle.thumb}
                    alt=""
                    className="h-full w-full object-cover opacity-90"
                  />
                ) : (
                  <span
                    className={cn(
                      "block h-full w-full bg-gradient-to-br",
                      STYLE_FALLBACK_GRADIENT[lockedStyle.id],
                    )}
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-bold text-slate-800 dark:text-white">
                    {lockedStyle.name}
                  </p>
                  {tierBadgeLabel(lockedStyle.tier) && (
                    <span className="rounded-full border border-white/70 bg-white/70 px-1.5 py-0.5 text-[9px] font-bold dark:border-white/20 dark:bg-black/50">
                      {tierBadgeLabel(lockedStyle.tier)}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[12px] text-slate-500 dark:text-zinc-400">
                  {unlockCopy(lockedStyle.tier)}
                </p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Link
                to="/pricing"
                className="flex h-11 flex-1 items-center justify-center rounded-2xl bg-gradient-to-r from-[#FF7A45] to-[#F43F5E] text-sm font-semibold text-white shadow-[0_6px_18px_rgba(244,63,94,0.35)]"
                onClick={() => setLockedStyle(null)}
              >
                See plans
              </Link>
              <button
                type="button"
                onClick={() => setLockedStyle(null)}
                className={cn(
                  "h-11 rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-600",
                  "dark:border-white/15 dark:text-zinc-300",
                )}
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
