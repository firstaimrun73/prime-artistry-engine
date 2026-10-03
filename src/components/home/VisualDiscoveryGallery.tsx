/**
 * Motion2AI Creation — Discover (post-login).
 * Straight responsive grid — no horizontal swipe rails.
 * Medium / large cards only. Featured wide on top, then 2-col grid.
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

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <h3 className="mb-2.5 text-[13px] font-bold text-foreground">{title}</h3>
      {children}
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
          {/* Featured wide — full width, large */}
          {wide[0] && (
            <div className="mb-6">
              <GalleryMediaCard
                sample={wide[0]}
                liked={likedIds.has(wide[0].id)}
                onToggleLike={onToggleLike}
                onOpenViewer={setViewer}
                size="large"
              />
            </div>
          )}

          {/* Vertical picks — 2-col straight grid, medium-large */}
          {vertical.length > 0 && (
            <Section title="Vertical picks">
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                {vertical.slice(0, 4).map((s) => (
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
            </Section>
          )}

          {/* Square picks — 2-col straight grid */}
          {square.length > 0 && (
            <Section title="Square picks">
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                {square.slice(0, 4).map((s) => (
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
            </Section>
          )}

          {/* More wide — full width */}
          {wide.length > 1 && (
            <Section title="Wide picks">
              <div className="grid grid-cols-1 gap-2.5 sm:gap-3">
                {wide.slice(1, 4).map((s) => (
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
            </Section>
          )}

          {/* More vertical — 2-col */}
          {vertical.length > 4 && (
            <Section title="More vertical">
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                {vertical.slice(4, 8).map((s) => (
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
            </Section>
          )}

          {/* Remaining square */}
          {square.length > 4 && (
            <Section title="More square">
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                {square.slice(4, 8).map((s) => (
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
