/**
 * Motion2AI Creation — Discover (post-login).
 * Aspect-ratio rails matching approved home HTML:
 * vertical 9:16 strips, wide 16:9, square pairs, featured card.
 * Images + Video only. Likes: local UI state.
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

function byRatio(samples: R2Sample[], want: string): R2Sample[] {
  return samples.filter((s) => {
    const ar = (s.aspectRatio || "1:1").replace(/\s/g, "");
    if (want === "9:16") return ar === "9:16" || ar === "3:4";
    if (want === "16:9") return ar === "16:9" || ar === "4:3";
    if (want === "1:1") return ar === "1:1" || ar === "2:3";
    return true;
  });
}

function Rail({
  title,
  samples,
  likedIds,
  onToggleLike,
  onOpenViewer,
  cardClass,
}: {
  title?: string;
  samples: R2Sample[];
  likedIds: Set<string>;
  onToggleLike: (s: R2Sample) => void;
  onOpenViewer: (s: R2Sample) => void;
  cardClass: string;
}) {
  if (samples.length === 0) return null;
  return (
    <div className="mb-5">
      {title ? (
        <div className="mb-2 flex items-center justify-between px-0.5">
          <h3 className="text-[13px] font-bold text-foreground">{title}</h3>
          <span className="text-[11px] text-muted-foreground">Swipe →</span>
        </div>
      ) : null}
      <div
        className="gallery-row -mx-1 flex gap-2.5 overflow-x-auto px-1 pb-2 scrollbar-none"
        style={{ scrollSnapType: "x mandatory", scrollPadding: "0 14px" }}
      >
        {samples.map((s) => (
          <div
            key={s.id}
            className={cn("shrink-0 snap-start", cardClass)}
            data-ratio={s.aspectRatio}
          >
            <GalleryMediaCard
              sample={s}
              liked={likedIds.has(s.id)}
              onToggleLike={onToggleLike}
              onOpenViewer={onOpenViewer}
              stripMode
              size="large"
            />
          </div>
        ))}
        <div className="w-1 shrink-0" aria-hidden />
      </div>
    </div>
  );
}

function PairGrid({
  samples,
  likedIds,
  onToggleLike,
  onOpenViewer,
}: {
  samples: R2Sample[];
  likedIds: Set<string>;
  onToggleLike: (s: R2Sample) => void;
  onOpenViewer: (s: R2Sample) => void;
}) {
  if (samples.length === 0) return null;
  return (
    <div className="mb-5 grid grid-cols-2 gap-2.5">
      {samples.slice(0, 2).map((s) => (
        <GalleryMediaCard
          key={s.id}
          sample={s}
          liked={likedIds.has(s.id)}
          onToggleLike={onToggleLike}
          onOpenViewer={onOpenViewer}
          size="large"
        />
      ))}
    </div>
  );
}

export function VisualDiscoveryGallery() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabId>("all");
  const [viewer, setViewer] = useState<R2Sample | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  const images = useMemo(() => getImagineOnlySamples(), []);
  const videosOnly = useMemo(() => getVideoOnlySamples(), []);
  const all = useMemo(
    () => getAllDiscoverSamples().filter((s) => s.homepageCategory !== "demo"),
    [],
  );

  const pool = tab === "img" ? images : tab === "video" ? videosOnly : all;

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

  const vertical = byRatio(pool, "9:16");
  const wide = byRatio(pool, "16:9");
  const square = byRatio(pool, "1:1");

  return (
    <section className="space-y-4" data-discovery="motion2ai-creation">
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
          {wide[0] && (
            <div className="mb-5">
              <GalleryMediaCard
                sample={wide[0]}
                liked={likedIds.has(wide[0].id)}
                onToggleLike={onToggleLike}
                onOpenViewer={setViewer}
                size="large"
              />
            </div>
          )}

          <Rail
            title="Vertical picks"
            samples={vertical.slice(0, 6)}
            likedIds={likedIds}
            onToggleLike={onToggleLike}
            onOpenViewer={setViewer}
            cardClass="w-[42%] min-w-[140px] max-w-[180px]"
          />

          <PairGrid
            samples={square.slice(0, 2)}
            likedIds={likedIds}
            onToggleLike={onToggleLike}
            onOpenViewer={setViewer}
          />

          <Rail
            title="Wide to swipe"
            samples={wide.slice(1, 5)}
            likedIds={likedIds}
            onToggleLike={onToggleLike}
            onOpenViewer={setViewer}
            cardClass="w-[82%] min-w-[240px] max-w-[360px]"
          />

          {vertical[6] && (
            <div className="mx-auto mb-5 w-[72%] max-w-[280px]">
              <GalleryMediaCard
                sample={vertical[6]}
                liked={likedIds.has(vertical[6].id)}
                onToggleLike={onToggleLike}
                onOpenViewer={setViewer}
                stripMode
                size="large"
              />
            </div>
          )}

          <Rail
            title="Square picks"
            samples={square.slice(2, 8)}
            likedIds={likedIds}
            onToggleLike={onToggleLike}
            onOpenViewer={setViewer}
            cardClass="w-[58%] min-w-[160px] max-w-[220px]"
          />

          <Rail
            title="More vertical"
            samples={vertical.slice(7, 12)}
            likedIds={likedIds}
            onToggleLike={onToggleLike}
            onOpenViewer={setViewer}
            cardClass="w-[42%] min-w-[140px] max-w-[180px]"
          />
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
