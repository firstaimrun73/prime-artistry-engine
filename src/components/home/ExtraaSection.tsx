/**
 * EXTRAA — editorial horizontal gallery for wide / cinematic media.
 * Shares global video mutex + tap-gated sound via GalleryMediaCard.
 */
import { useMemo } from "react";
import { getExtraaSamples } from "@/components/home/VisualDiscoveryGallery";
import { GalleryMediaCard } from "@/components/home/GalleryMediaCard";

export function ExtraaSection() {
  const samples = useMemo(() => getExtraaSamples(), []);

  if (samples.length === 0) return null;

  return (
    <section className="mt-10 space-y-4" data-discovery="extraa">
      <div className="space-y-1">
        <h2 className="text-[18px] font-extrabold tracking-tight sm:text-[20px]">
          EXTRAA
        </h2>
        <p className="text-[13px] text-muted-foreground">
          Cinematic and wide formats — given room to breathe.
        </p>
      </div>

      <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 scrollbar-none sm:mx-0 sm:px-0">
        {samples.map((s) => (
          <div key={s.id} className="shrink-0">
            <GalleryMediaCard sample={s} context="extraa" />
          </div>
        ))}
      </div>
    </section>
  );
}
