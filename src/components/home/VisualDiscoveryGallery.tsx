/**
 * Motion2AI Creation — Discover (post-login).
 * Primary catalog + R2 account-2 videos/images (Video-1 included).
 * Aspect ratios drive layout buckets; qualityTier shows Standard/Premium badges.
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

type RatioBucket = "wide" | "vertical" | "square" | "landscape";

function normalizeAr(ar: string): string {
  return (ar || "1:1").replace(/\s/g, "");
}

function bucketFor(sample: R2Sample): RatioBucket {
  const ar = normalizeAr(sample.aspectRatio);
  if (ar === "16:9" || ar === "21:9") return "wide";
  if (ar === "9:16" || ar === "3:4") return "vertical";
  if (ar === "4:3" || ar === "3:2") return "landscape";
  return "square";
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

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-7">
      <h3 className="mb-2.5 text-[13px] font-bold tracking-tight text-foreground md:text-sm">
        {title}
      </h3>
      {children}
    </div>
  );
}

function CardList({
  samples,
  likedIds,
  onToggleLike,
  onOpenViewer,
  layout,
}: {
  samples: R2Sample[];
  likedIds: Set<string>;
  onToggleLike: (s: R2Sample) => void;
  onOpenViewer: (s: R2Sample) => void;
  layout: "full" | "pair" | "desktopWide";
}) {
  if (samples.length === 0) return null;
  return (
    <div
      className={cn(
        layout === "full" && "grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4",
        layout === "pair" && "grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 lg:grid-cols-4",
        layout === "desktopWide" &&
          "grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 md:gap-4",
      )}
    >
      {samples.map((s) => (
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

  const { wide, vertical, square, landscape } = useMemo(() => {
    const wide: R2Sample[] = [];
    const vertical: R2Sample[] = [];
    const square: R2Sample[] = [];
    const landscape: R2Sample[] = [];
    for (const s of pool) {
      const b = bucketFor(s);
      if (b === "wide") wide.push(s);
      else if (b === "vertical") vertical.push(s);
      else if (b === "landscape") landscape.push(s);
      else square.push(s);
    }
    return { wide, vertical, square, landscape };
  }, [pool]);

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
          {wide.length > 0 && (
            <Section title="Wide 16:9">
              <CardList
                samples={wide}
                likedIds={likedIds}
                onToggleLike={onToggleLike}
                onOpenViewer={setViewer}
                layout="desktopWide"
              />
            </Section>
          )}

          {vertical.length > 0 && (
            <Section title="Vertical 9:16">
              <CardList
                samples={vertical}
                likedIds={likedIds}
                onToggleLike={onToggleLike}
                onOpenViewer={setViewer}
                layout="pair"
              />
            </Section>
          )}

          {square.length > 0 && (
            <Section title="Square 1:1">
              <CardList
                samples={square}
                likedIds={likedIds}
                onToggleLike={onToggleLike}
                onOpenViewer={setViewer}
                layout="pair"
              />
            </Section>
          )}

          {landscape.length > 0 && (
            <Section title="Landscape">
              <CardList
                samples={landscape}
                likedIds={likedIds}
                onToggleLike={onToggleLike}
                onOpenViewer={setViewer}
                layout="full"
              />
            </Section>
          )}
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
  return dedupe([
    ...getAccount2SignedInVideos(),
    ...getAccount2SignedInImages(),
    ...getAllDiscoverSamples(),
  ]);
}
