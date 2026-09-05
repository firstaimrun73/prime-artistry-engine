/**
 * IMAGE gallery — Motion2AI Creation.
 * Visual-only cards: media + tiny SAMPLE label. No caption, no Info overlay.
 * Native aspect from the image itself. Click → /sample/$id.
 */
import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { getImagineOnlySamples, type R2Sample } from "@/lib/r2-catalog";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

function ImageCard({ sample, isDark }: { sample: R2Sample; isDark: boolean }) {
  const isWide =
    sample.aspectRatio === "16:9" ||
    sample.aspectRatio === "21:9" ||
    sample.aspectRatio === "3:2";

  return (
    <article
      className={cn(
        "group overflow-hidden rounded-3xl",
        isWide && "sm:col-span-2",
      )}
    >
      <Link
        to="/sample/$id"
        params={{ id: sample.id }}
        className="relative block w-full overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        aria-label={`Open ${sample.title}`}
      >
        <img
          src={sample.url}
          alt={sample.title}
          className="block h-auto w-full object-contain transition duration-300 group-hover:scale-[1.015]"
          loading="lazy"
        />
      </Link>
      <p
        className={cn(
          "px-1.5 pt-1.5 text-[9px] font-semibold uppercase tracking-[0.14em]",
          isDark ? "text-white/45" : "text-black/40",
        )}
      >
        Sample
      </p>
    </article>
  );
}

export function ImagineGallery() {
  const samples = useMemo(() => {
    const seen = new Set<string>();
    return getImagineOnlySamples().filter((s) => {
      if (seen.has(s.url)) return false;
      seen.add(s.url);
      return true;
    });
  }, []);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  if (samples.length === 0) return null;

  return (
    <section className="space-y-4" data-creation-section="image">
      <h3 className="text-[14px] font-bold tracking-tight">Image</h3>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 lg:gap-5">
        {samples.map((s) => (
          <ImageCard key={s.id} sample={s} isDark={isDark} />
        ))}
      </div>
    </section>
  );
}
