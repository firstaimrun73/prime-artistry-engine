/**
 * Unified editorial Discover feed — all ratios in one composition.
 * EXTRAA is retired as a separate section; 21:9 / 16:9 are first-class here.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  getImagineOnlySamples,
  getActiveR2VideoSamples,
  type R2Sample,
} from "@/lib/r2-catalog";
import { GalleryMediaCard } from "@/components/home/GalleryMediaCard";
import { DiscoveryMediaViewer } from "@/components/home/DiscoveryMediaViewer";
import { useAuth } from "@/lib/auth";
import {
  getMyFavouriteIds,
  toggleSampleFavourite,
} from "@/lib/sample-favourites.functions";
import { cn } from "@/lib/utils";

function ratioValue(ar: string): number {
  const m = /^(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/.exec(ar.trim());
  if (!m) return 1;
  return Number(m[1]) / Number(m[2]);
}

/** Single mixed feed: images + videos, all ratios. Content-aware interleave. */
export function getAllDiscoverySamples(): R2Sample[] {
  const images = getImagineOnlySamples();
  const videos = getActiveR2VideoSamples();
  const seen = new Set<string>();
  const out: R2Sample[] = [];

  const wide = [...videos, ...images].filter((s) => ratioValue(s.aspectRatio) >= 1.5);
  const rest = [...images, ...videos].filter((s) => ratioValue(s.aspectRatio) < 1.5);

  const push = (s: R2Sample) => {
    if (seen.has(s.url) || seen.has(s.id)) return;
    seen.add(s.url);
    seen.add(s.id);
    out.push(s);
  };

  let wi = 0;
  let ri = 0;
  while (ri < rest.length || wi < wide.length) {
    for (let k = 0; k < 2 && ri < rest.length; k++) push(rest[ri++]);
    if (wi < wide.length) push(wide[wi++]);
    if (ri < rest.length) push(rest[ri++]);
  }
  return out;
}

export function VisualDiscoveryGallery() {
  const { user } = useAuth();
  const samples = useMemo(() => getAllDiscoverySamples(), []);
  const [viewer, setViewer] = useState<R2Sample | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const toggleFn = useServerFn(toggleSampleFavourite);
  const listIdsFn = useServerFn(getMyFavouriteIds);

  useEffect(() => {
    if (!user) {
      setLikedIds(new Set());
      return;
    }
    let cancelled = false;
    void listIdsFn()
      .then((res) => {
        if (!cancelled) setLikedIds(new Set(res.ids ?? []));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user, listIdsFn]);

  const onToggleLike = useCallback(
    async (sample: R2Sample) => {
      if (!user) {
        toast.message("Sign in to save favourites");
        return;
      }
      const wasLiked = likedIds.has(sample.id);
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (wasLiked) next.delete(sample.id);
        else next.add(sample.id);
        return next;
      });
      try {
        const isVideo = sample.format === "MP4" || sample.url.endsWith(".mp4");
        const res = await toggleFn({
          data: {
            sampleId: sample.id,
            sampleTitle: sample.title,
            sampleUrl: sample.url,
            sampleKind: isVideo ? "video" : "image",
            sampleAspect: sample.aspectRatio,
          },
        });
        setLikedIds((prev) => {
          const next = new Set(prev);
          if (res.liked) next.add(sample.id);
          else next.delete(sample.id);
          return next;
        });
      } catch (err) {
        setLikedIds((prev) => {
          const next = new Set(prev);
          if (wasLiked) next.add(sample.id);
          else next.delete(sample.id);
          return next;
        });
        toast.error(err instanceof Error ? err.message : "Could not update favourite");
      }
    },
    [user, likedIds, toggleFn],
  );

  if (samples.length === 0) return null;

  return (
    <section className="space-y-4" data-discovery="unified-feed">
      <div className="space-y-1">
        <h2 className="text-[18px] font-extrabold tracking-tight sm:text-[20px]">Discover</h2>
        <p className="text-[13px] text-muted-foreground">
          Creative visuals from Motio2edit — browse, then open any card to explore.
        </p>
      </div>

      <div
        className={cn(
          "mx-auto grid max-w-[1200px] items-start gap-2.5 sm:gap-3",
          "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
        )}
      >
        {samples.map((s) => (
          <GalleryMediaCard
            key={s.id}
            sample={s}
            liked={likedIds.has(s.id)}
            onToggleLike={onToggleLike}
            onOpenViewer={setViewer}
          />
        ))}
      </div>

      <DiscoveryMediaViewer
        sample={viewer}
        open={!!viewer}
        onClose={() => setViewer(null)}
      />
    </section>
  );
}

/** @deprecated EXTRAA retired — all ratios live in the unified feed. */
export function getExtraaSamples(): R2Sample[] {
  return [];
}

export function isExtraaCandidate(_s: R2Sample): boolean {
  return false;
}
