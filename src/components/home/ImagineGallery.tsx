/**
 * IMAGE gallery — Motion2AI Creation.
 * Visual-only cards: media defines the card. No SAMPLE caption, no title block,
 * no Info/Download/Share on the card. Native aspect. Click → /sample/$id.
 * Premium tokens: consistent radius, border, hover/active, grid gaps.
 */
import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { getImagineOnlySamples, type R2Sample } from "@/lib/r2-catalog";
import { cn } from "@/lib/utils";

function isPortrait(aspectRatio: string): boolean {
  return (
    aspectRatio === "9:16" ||
    aspectRatio === "4:5" ||
    aspectRatio === "3:4" ||
    aspectRatio === "2:3" ||
    aspectRatio === "11:15"
  );
}

function isLandscape(aspectRatio: string): boolean {
  return (
    aspectRatio === "16:9" ||
    aspectRatio === "21:9" ||
    aspectRatio === "3:2" ||
    aspectRatio === "4:3"
  );
}

function ImageCard({ sample }: { sample: R2Sample }) {
  const portrait = isPortrait(sample.aspectRatio);
  const landscape = isLandscape(sample.aspectRatio);

  return (
    <article
      className={cn(
        "group overflow-hidden rounded-2xl border border-border/60 bg-transparent shadow-sm",
        "transition-[transform,box-shadow,opacity] duration-180 ease-out",
        "hover:scale-[1.015] hover:shadow-md active:scale-[0.985] active:opacity-95",
        landscape ? "col-span-2 sm:col-span-2 lg:col-span-2" : "col-span-1",
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
          alt={sample.title || "Image sample"}
          className="block h-auto w-full object-contain"
          loading="lazy"
          style={
            sample.width && sample.height
              ? { aspectRatio: `${sample.width} / ${sample.height}` }
              : sample.aspectRatio
                ? { aspectRatio: sample.aspectRatio.replace(":", " / ") }
                : undefined
          }
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
      <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
        {samples.map((s) => (
          <ImageCard key={s.id} sample={s} />
        ))}
      </div>
    </section>
  );
}
