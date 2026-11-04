/**
 * YouTube-style discovery: dense grid, no empty holes.
 * Mobile: 2-col mixed. Desktop: 2 Shorts side-by-side rows + photo grid.
 */
import { useCallback, useMemo, useState } from "react";
import {
  getImagineOnlySamples,
  getVideoOnlySamples,
  getAllDiscoverSamples,
  type R2Sample,
} from "@/lib/r2-catalog";
import {
  getAccount2SignedInVideos,
  getAccount2SignedInImages,
} from "@/lib/r2-account2-samples";
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

function normalizeAr(ar: string): string {
  return (ar || "1:1").replace(/\s/g, "");
}

function dedupe(samples: R2Sample[]): R2Sample[] {
  const seen = new Set<string>();
  const out: R2Sample[] = [];
  for (const s of samples) {
    if (!s.active) continue;
    if (seen.has(s.url)) continue;
    seen.add(s.url);
    out.push(s);
  }
  return out.sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Interleave shorts (9:16) with photos so the grid never looks sparse. */
function buildFeed(pool: R2Sample[]): R2Sample[] {
  const shorts = pool.filter((s) => normalizeAr(s.aspectRatio) === "9:16");
  const others = pool.filter((s) => normalizeAr(s.aspectRatio) !== "9:16");
  const out: R2Sample[] = [];
  let si = 0;
  let oi = 0;
  while (si < shorts.length || oi < others.length) {
    // pair of shorts
    for (let n = 0; n < 2 && si < shorts.length; n++, si++) out.push(shorts[si]);
    // then a few photos/wide
    for (let n = 0; n < 2 && oi < others.length; n++, oi++) out.push(others[oi]);
  }
  return out;
}

export function VisualDiscoveryGallery() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabId>("all");
  const [viewer, setViewer] = useState<R2Sample | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(24);

  const account2Videos = useMemo(() => getAccount2SignedInVideos(), []);
  const account2Images = useMemo(() => getAccount2SignedInImages(), []);
  const images = useMemo(
    () => dedupe([...account2Images, ...getImagineOnlySamples()]),
    [account2Images],
  );
  const videosOnly = useMemo(
    () => dedupe([...account2Videos, ...getVideoOnlySamples()]),
    [account2Videos],
  );
  const all = useMemo(
    () => dedupe([...account2Videos, ...account2Images, ...getAllDiscoverSamples()]),
    [account2Videos, account2Images],
  );

  const pool = tab === "img" ? images : tab === "video" ? videosOnly : all;
  const feed = useMemo(() => buildFeed(pool), [pool]);
  const shown = feed.slice(0, visibleCount);
  const hasMore = visibleCount < feed.length;

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
              onClick={() => {
                setTab(t.id);
                setVisibleCount(24);
              }}
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

      {shown.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Nothing here yet. Tap + to create.
        </p>
      ) : (
        <>
          {/* Dense YouTube-like grid: 2 cols mobile, 2–3 desktop for balanced Shorts */}
          <div className="mx-auto grid w-full max-w-4xl grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-2 lg:grid-cols-3 lg:max-w-5xl">
            {shown.map((s) => (
              <GalleryMediaCard
                key={s.id}
                sample={s}
                liked={likedIds.has(s.id)}
                onToggleLike={onToggleLike}
                onOpenViewer={setViewer}
                size="default"
              />
            ))}
          </div>

          {hasMore ? (
            <div className="flex justify-center pt-4">
              <button
                type="button"
                onClick={() => setVisibleCount((c) => c + 16)}
                className="rounded-full border border-border bg-card px-5 py-2 text-sm font-semibold text-foreground hover:border-primary/40"
              >
                Load more
              </button>
            </div>
          ) : null}
        </>
      )}

      <DiscoveryMediaViewer
        sample={viewer}
        open={!!viewer}
        onClose={() => setViewer(null)}
        playlist={feed}
        onSelect={setViewer}
      />
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
  return dedupe([
    ...getAccount2SignedInVideos(),
    ...getAccount2SignedInImages(),
    ...getAllDiscoverSamples(),
  ]);
}
