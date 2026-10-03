/**
 * Motion2AI Creation — Discover (post-login).
 *
 * STRICT aspect-ratio sections (never mix ratios in one grid):
 *   - 16:9 wide  → full-width stacked cards (proper video size)
 *   - 9:16 / 3:4 → 2-column vertical grid
 *   - 1:1 / 2:3  → 2-column square grid
 *   - 4:3        → full-width (landscape stills)
 *
 * No horizontal scroll. Every active sample is shown.
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

type RatioBucket = "wide" | "vertical" | "square" | "landscape";

function normalizeAr(ar: string): string {
  return (ar || "1:1").replace(/\s/g, "");
}

function bucketFor(sample: R2Sample): RatioBucket {
  const ar = normalizeAr(sample.aspectRatio);
  if (ar === "16:9" || ar === "21:9") return "wide";
  if (ar === "9:16" || ar === "3:4") return "vertical";
  if (ar === "4:3" || ar === "3:2") return "landscape";
  // 1:1, 2:3, and anything else square-ish
  return "square";
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
      <h3 className="mb-2.5 text-[13px] font-bold tracking-tight text-foreground">{title}</h3>
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
  /** full = 16:9 / 4:3 full width; pair = 2-col for vertical/square */
  layout: "full" | "pair";
}) {
  if (samples.length === 0) return null;
  return (
    <div
      className={cn(
        layout === "full"
          ? "grid grid-cols-1 gap-3"
          : "grid grid-cols-2 gap-2.5 sm:gap-3",
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

  const images = useMemo(() => getImagineOnlySamples(), []);
  const videosOnly = useMemo(() => getVideoOnlySamples(), []);
  const all = useMemo(() => getAllDiscoverSamples(), []);

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
          {/* 16:9 — FULL WIDTH, never squeezed into half column */}
          {wide.length > 0 && (
            <Section title="Wide 16:9">
              <CardList
                samples={wide}
                likedIds={likedIds}
                onToggleLike={onToggleLike}
                onOpenViewer={setViewer}
                layout="full"
              />
            </Section>
          )}

          {/* 9:16 + 3:4 — vertical pair grid only */}
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

          {/* 1:1 — square pair grid only */}
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

          {/* 4:3 landscape stills — full width */}
          {landscape.length > 0 && (
            <Section title="Landscape 4:3">
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
  return getAllDiscoverSamples();
}
