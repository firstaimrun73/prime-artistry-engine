/**
 * Motion2AI Creation — Discover (post-login).
 * Horizontal strips: fixed height, width follows aspect ratio.
 * Images + Video only — no Music category / no Filters on homepage.
 * Likes: local UI state only.
 */
import { useCallback, useMemo, useState } from "react";
import {
  getAllDiscoverSamples,
  getImagineOnlySamples,
  getVideoOnlySamples,
  type R2Sample,
} from "@/lib/r2-catalog";
import { GalleryMediaCard } from "@/components/home/GalleryMediaCard";
import { DiscoveryMediaViewer } from "@/components/home/DiscoveryMediaViewer";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

type TabId = "all" | "img" | "video";

const TABS: { id: TabId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "img", label: "Img" },
  { id: "video", label: "Video" },
];

function HorizontalStrip({
  title,
  samples,
  likedIds,
  onToggleLike,
  onOpenViewer,
}: {
  title: string;
  samples: R2Sample[];
  likedIds: Set<string>;
  onToggleLike: (s: R2Sample) => void;
  onOpenViewer: (s: R2Sample) => void;
}) {
  if (samples.length === 0) return null;
  return (
    <div className="space-y-2.5">
      <h3 className="px-0.5 text-[12px] font-bold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <div
        className="gallery-row -mx-1 flex items-end gap-2 overflow-x-auto px-1 pb-2 scrollbar-none"
        style={
          {
            scrollSnapType: "x mandatory",
            ["--strip-h" as string]: "200px",
          } as React.CSSProperties
        }
      >
        {samples.map((s) => (
          <div
            key={s.id}
            className="shrink-0"
            style={{ scrollSnapAlign: "start" }}
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
      </div>
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

  const gridSamples = tab === "img" ? images : tab === "video" ? videosOnly : [];

  return (
    <section className="space-y-5" data-discovery="motion2ai-creation">
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-zinc-950 text-white shadow-sm dark:border-white/10">
        <div className="px-4 py-3.5 sm:px-5 sm:py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
            Motion2AI creation
          </p>
          <h2 className="mt-0.5 text-[18px] font-extrabold tracking-tight sm:text-[20px]">
            Discover
          </h2>
          <p className="mt-1 text-[12px] text-white/60">Images · videos</p>
        </div>
        <div className="flex gap-1 overflow-x-auto border-t border-white/10 px-2 py-2 scrollbar-none">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition",
                tab === t.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-white/10 text-white/70 hover:bg-white/15",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "all" && (
        <div className="space-y-6">
          <HorizontalStrip
            title="Images"
            samples={images}
            likedIds={likedIds}
            onToggleLike={onToggleLike}
            onOpenViewer={setViewer}
          />
          <HorizontalStrip
            title="Video"
            samples={videosOnly}
            likedIds={likedIds}
            onToggleLike={onToggleLike}
            onOpenViewer={setViewer}
          />
        </div>
      )}

      {tab !== "all" && (
        <div className="space-y-4">
          <HorizontalStrip
            title={tab === "img" ? "Images" : "Video"}
            samples={gridSamples}
            likedIds={likedIds}
            onToggleLike={onToggleLike}
            onOpenViewer={setViewer}
          />
          {gridSamples.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No samples in this section yet.
            </p>
          )}
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
  return getAllDiscoverSamples();
}
