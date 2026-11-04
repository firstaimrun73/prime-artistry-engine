/**
 * Discover feed — mobile: compact Shorts pairs; desktop: multi-column Shorts
 * with 1:1 / 3:4 photos interleaved and wide clips in a proper landscape row.
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

function isSquareLike(sample: R2Sample): boolean {
  const ar = normalizeAr(sample.aspectRatio);
  return ar === "1:1" || ar === "4:3" || ar === "3:2";
}

function isWide(sample: R2Sample): boolean {
  const ar = normalizeAr(sample.aspectRatio);
  return ar === "16:9" || ar === "21:9";
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

/**
 * Desktop: rows of up to 4 shorts, then photo strip, then wide.
 * Mobile keeps pairs of 2 shorts.
 */
function buildMixedRows(pool: R2Sample[]): { type: "shorts" | "photos" | "wide"; items: R2Sample[] }[] {
  const shorts = pool.filter((s) => normalizeAr(s.aspectRatio) === "9:16");
  const photos = pool.filter((s) => isSquareLike(s) || normalizeAr(s.aspectRatio) === "3:4");
  const wide = pool.filter((s) => isWide(s));
  const rows: { type: "shorts" | "photos" | "wide"; items: R2Sample[] }[] = [];

  let si = 0;
  let pi = 0;
  let wi = 0;

  while (si < shorts.length || pi < photos.length || wi < wide.length) {
    if (si < shorts.length) {
      const pair: R2Sample[] = [];
      // Up to 4 for desktop grid (CSS shows 2 on mobile, 4 on lg)
      for (let n = 0; n < 4 && si < shorts.length; n++, si++) {
        pair.push(shorts[si]);
      }
      if (pair.length) rows.push({ type: "shorts", items: pair });
    }

    if (pi < photos.length) {
      const batch: R2Sample[] = [];
      for (let n = 0; n < 4 && pi < photos.length; n++, pi++) {
        batch.push(photos[pi]);
      }
      if (batch.length) rows.push({ type: "photos", items: batch });
    }

    if (wi < wide.length) {
      const batch: R2Sample[] = [];
      for (let n = 0; n < 2 && wi < wide.length; n++, wi++) {
        batch.push(wide[wi]);
      }
      if (batch.length) rows.push({ type: "wide", items: batch });
    }
  }

  return rows;
}

export function VisualDiscoveryGallery() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabId>("all");
  const [viewer, setViewer] = useState<R2Sample | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

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
  const rows = useMemo(() => buildMixedRows(pool), [pool]);

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
        <div className="space-y-4 md:space-y-5">
          {rows.map((row, idx) => {
            if (row.type === "shorts") {
              return (
                <div
                  key={`shorts-${idx}`}
                  className={cn(
                    "grid gap-2 sm:gap-3",
                    // Mobile: 2 Shorts side-by-side; tablet 3; desktop 4
                    "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
                    // Keep Shorts compact — not full viewport height
                    "mx-auto w-full max-w-5xl",
                  )}
                >
                  {row.items.map((s) => (
                    <GalleryMediaCard
                      key={s.id}
                      sample={s}
                      liked={likedIds.has(s.id)}
                      onToggleLike={onToggleLike}
                      onOpenViewer={setViewer}
                      size="default"
                      className="!max-w-none justify-self-stretch"
                    />
                  ))}
                </div>
              );
            }
            if (row.type === "photos") {
              return (
                <div
                  key={`photos-${idx}`}
                  className="mx-auto grid w-full max-w-5xl grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4"
                >
                  {row.items.map((s) => (
                    <GalleryMediaCard
                      key={s.id}
                      sample={s}
                      liked={likedIds.has(s.id)}
                      onToggleLike={onToggleLike}
                      onOpenViewer={setViewer}
                      size="default"
                      className="!max-w-none justify-self-stretch"
                    />
                  ))}
                </div>
              );
            }
            // Wide 16:9 — side by side on desktop, full width on mobile
            return (
              <div
                key={`wide-${idx}`}
                className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3"
              >
                {row.items.map((s) => (
                  <GalleryMediaCard
                    key={s.id}
                    sample={s}
                    liked={likedIds.has(s.id)}
                    onToggleLike={onToggleLike}
                    onOpenViewer={setViewer}
                    size="default"
                    className="!max-w-none justify-self-stretch"
                  />
                ))}
              </div>
            );
          })}
        </div>
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
  return dedupe([
    ...getAccount2SignedInVideos(),
    ...getAccount2SignedInImages(),
    ...getAllDiscoverSamples(),
  ]);
}
