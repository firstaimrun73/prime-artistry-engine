/**
 * Motion2AI Creation — Discover (post-login).
 * Shows EVERY active sample in a straight 2-col grid.
 * Each card uses the sample's real aspect ratio — no wrong AR, no hidden slices.
 */
import { useCallback, useMemo, useState } from "react";
import {
  getImagineOnlySamples,
  getVideoOnlySamples,
  getAllDiscoverSamples,
  type R2Sample,
} from "@/lib/r2-catalog";
import { GalleryMediaCard } from "@/components/home/GalleryMediaCard";
import { DiscoveryMediaViewer } from "@/components/home/DiscoveryMediaViewer";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

type TabId = "all" | "img" | "video";

const TABS: { id: TabId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "img", label: "Images" },
  { id: "video", label: "Videos" },
];

function parseRatio(ar: string): number {
  const m = /^(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/.exec((ar || "1:1").trim());
  if (!m) return 1;
  const w = Number(m[1]);
  const h = Number(m[2]);
  if (!w || !h) return 1;
  return w / h;
}

/** Featured = first wide item; rest fill the grid in sort order. */
function splitFeatured(pool: R2Sample[]): { featured: R2Sample | null; rest: R2Sample[] } {
  const wideIdx = pool.findIndex((s) => parseRatio(s.aspectRatio) >= 1.4);
  if (wideIdx < 0) return { featured: null, rest: pool };
  const featured = pool[wideIdx]!;
  const rest = pool.filter((_, i) => i !== wideIdx);
  return { featured, rest };
}

export function VisualDiscoveryGallery() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabId>("all");
  const [viewer, setViewer] = useState<R2Sample | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  const images = useMemo(() => getImagineOnlySamples(), []);
  const videosOnly = useMemo(() => getVideoOnlySamples(), []);
  const all = useMemo(() => getAllDiscoverSamples(), []);

  const pool = tab === "img" ? images : tab === "video" ? videosOnly : all;

  const { featured, rest } = useMemo(() => splitFeatured(pool), [pool]);

  const onToggleLike = useCallback(
    (sample: R2Sample) => {
      if (!user) return;
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (next.has(sample.id)) next.delete(sample.id);
        else next.add(sample.id);
        return next;
      });
    },
    [user],
  );

  return (
    <section className="space-y-1" data-discovery="motion2ai-creation">
      <div className="sticky top-0 z-10 -mx-1 bg-background/95 px-1 pb-2 pt-1 backdrop-blur">
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition",
                tab === t.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/70 bg-card/80 text-foreground hover:border-primary/40",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {pool.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Nothing here yet. Tap + to create.
        </p>
      ) : (
        <>
          {featured ? (
            <div className="mb-4">
              <GalleryMediaCard
                sample={featured}
                liked={likedIds.has(featured.id)}
                onToggleLike={onToggleLike}
                onOpenViewer={setViewer}
                size="large"
              />
            </div>
          ) : null}

          {/* All remaining samples — full list, native aspect, 2-col straight grid */}
          <div className="grid grid-cols-2 items-start gap-2.5 sm:gap-3">
            {rest.map((s) => (
              <GalleryMediaCard
                key={s.id}
                sample={s}
                liked={likedIds.has(s.id)}
                onToggleLike={onToggleLike}
                onOpenViewer={setViewer}
                size="large"
              />
            ))}
          </div>
        </>
      )}

      <DiscoveryMediaViewer sample={viewer} open={!!viewer} onClose={() => setViewer(null)} />
    </section>
  );
}

export function getExtraaSamples(): R2Sample[] {
  return [];
}
export function isExtraaCandidate(_s: R2Sample): boolean {
  return false;
}
export function getAllDiscoverySamples(): R2Sample[] {
  return getAllDiscoverSamples();
}
