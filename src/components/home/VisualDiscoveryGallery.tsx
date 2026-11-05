/**
 * Discovery feed: mixed aspect grid.
 * - 9:16 / 3:4 / 1:1 share columns
 * - 16:9 and wide items span full width (not squeezed side-by-side)
 * - Dedupe near-duplicate titles across image/video
 * - No reel system (viewer is single-item)
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

function titleKey(s: R2Sample): string {
  return (s.title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function dedupe(samples: R2Sample[]): R2Sample[] {
  const seenUrl = new Set<string>();
  const seenTitleMedia = new Set<string>();
  const out: R2Sample[] = [];
  for (const s of samples) {
    if (!s.active) continue;
    if (seenUrl.has(s.url)) continue;
    seenUrl.add(s.url);
    // Avoid stacking same creative as both image and video back-to-back
    const tk = titleKey(s);
    const media = s.format === "MP4" || s.url.endsWith(".mp4") ? "v" : "i";
    if (tk) {
      const pairKey = `${tk}`;
      // Prefer keeping the first occurrence of a title; skip exact title+format dupes
      const full = `${pairKey}|${media}`;
      if (seenTitleMedia.has(full)) continue;
      seenTitleMedia.add(full);
      // If we already showed an image with this title, skip video of same title (and vice versa)
      const other = media === "v" ? "i" : "v";
      if (seenTitleMedia.has(`${pairKey}|${other}`)) continue;
    }
    out.push(s);
  }
  return out.sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Prefer pairing portrait shorts; place wide items so they get full row. */
function buildFeed(pool: R2Sample[]): R2Sample[] {
  const isWide = (s: R2Sample) => {
    const ar = normalizeAr(s.aspectRatio);
    if (ar === "16:9" || ar === "21:9") return true;
    const m = /^(\d+):(\d+)$/.exec(ar);
    if (!m) return false;
    return Number(m[1]) / Number(m[2]) >= 1.35;
  };
  const isShort = (s: R2Sample) => normalizeAr(s.aspectRatio) === "9:16";

  const shorts = pool.filter(isShort);
  const wides = pool.filter(isWide);
  const mids = pool.filter((s) => !isShort(s) && !isWide(s));

  const out: R2Sample[] = [];
  let si = 0;
  let mi = 0;
  let wi = 0;
  while (si < shorts.length || mi < mids.length || wi < wides.length) {
    for (let n = 0; n < 2 && si < shorts.length; n++, si++) out.push(shorts[si]);
    for (let n = 0; n < 2 && mi < mids.length; n++, mi++) out.push(mids[mi]);
    if (wi < wides.length) out.push(wides[wi++]);
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
