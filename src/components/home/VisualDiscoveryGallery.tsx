/**
 * Unified editorial Discover feed — images + videos, native ratios.
 * Whats New strip on top. Media-first cards (see GalleryMediaCard).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Aperture, Circle, Sparkles } from "lucide-react";
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

const WHATS_NEW = [
  {
    to: "/studio/image/circle-remove" as const,
    label: "Circle 2edit",
    hint: "Remove objects",
    icon: Circle,
  },
  {
    to: "/studio/image/auto-edit" as const,
    label: "Maluto AI",
    hint: "One-click enhance",
    icon: Sparkles,
  },
  {
    to: "/studio/image/lens-editor" as const,
    label: "Lens",
    hint: "Camera software",
    icon: Aperture,
  },
] as const;

function WhatsNewStrip() {
  return (
    <section className="space-y-2.5" aria-label="What's new">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-extrabold tracking-tight sm:text-[16px]">What's new</h2>
        <span className="text-[11px] text-muted-foreground">Try these next</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
        {WHATS_NEW.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              to={item.to}
              className="flex min-w-[140px] shrink-0 items-center gap-2.5 rounded-2xl border border-border/70 bg-card/80 px-3 py-2.5 transition hover:border-primary/40 hover:bg-muted/30"
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[12px] font-semibold leading-tight">{item.label}</span>
                <span className="block truncate text-[10px] text-muted-foreground">{item.hint}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
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

  if (samples.length === 0) {
    return (
      <div className="space-y-6">
        <WhatsNewStrip />
      </div>
    );
  }

  return (
    <div className="space-y-7" data-discovery="unified-feed">
      <WhatsNewStrip />

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-[18px] font-extrabold tracking-tight sm:text-[20px]">Discover</h2>
          <p className="text-[11px] text-muted-foreground sm:text-[12px]">
            Photos · videos · samples
          </p>
        </div>

        <div
          className={cn(
            "mx-auto grid max-w-[1200px] items-start",
            "gap-2 sm:gap-2.5 md:gap-3",
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
      </section>

      <DiscoveryMediaViewer
        sample={viewer}
        open={!!viewer}
        onClose={() => setViewer(null)}
      />
    </div>
  );
}

/** @deprecated EXTRAA retired — all ratios live in the unified feed. */
export function getExtraaSamples(): R2Sample[] {
  return [];
}

export function isExtraaCandidate(_s: R2Sample): boolean {
  return false;
}
