/**
 * IMAGE gallery — Motion2AI Creation.
 * Media intrinsic size drives card height — no forced aspect wrapper,
 * no letterbox, no leftover white strip. Hide card if asset fails to load.
 * Desktop: more columns of same-sized cards (max-w cap), not larger cards.
 */
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { getImagineOnlySamples, type R2Sample } from "@/lib/r2-catalog";
import { cn } from "@/lib/utils";

function isLandscape(aspectRatio: string): boolean {
  return (
    aspectRatio === "16:9" ||
    aspectRatio === "21:9" ||
    aspectRatio === "3:2" ||
    aspectRatio === "4:3"
  );
}

function ImageCard({ sample }: { sample: R2Sample }) {
  const [failed, setFailed] = useState(false);
  const landscape = isLandscape(sample.aspectRatio);

  if (failed) return null;

  return (
    <article
      className={cn(
        "group w-full overflow-hidden rounded-2xl border border-border/50 bg-transparent",
        "transition-[transform,opacity] duration-200 ease-out",
        "hover:scale-[1.01] active:scale-[0.98] active:opacity-90",
        // A7: hard pixel-ish caps — desktop gets more columns, not bigger cards
        landscape ? "max-w-[400px]" : "max-w-[280px]",
      )}
    >
      <Link
        to="/sample/$id"
        params={{ id: sample.id }}
        className="relative block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        aria-label={`Open ${sample.title}`}
      >
        {/* No aspectRatio style — intrinsic size only (A1/A3) */}
        <img
          src={sample.url}
          alt={sample.title || "Image sample"}
          className="block h-auto w-full"
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      </Link>
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

  if (samples.length === 0) return null;

  return (
    <section className="space-y-4" data-creation-section="image">
      <h3 className="text-[14px] font-bold tracking-tight">Image</h3>
      {/* justify-items-center so max-w cards don't stretch to fill grid tracks */}
      <div className="mx-auto grid max-w-[1200px] grid-cols-2 justify-items-center gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
        {samples.map((s) => (
          <ImageCard key={s.id} sample={s} />
        ))}
      </div>
    </section>
  );
}
