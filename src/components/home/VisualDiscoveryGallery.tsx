/**
 * Unified visual discovery feed — one editorial gallery (not Image/Video/Music sections).
 * Media defines the card. Ultra-wide / cinematic 16:9 routed to EXTRAA separately.
 */
import { useMemo } from "react";
import {
  getImagineOnlySamples,
  getActiveR2VideoSamples,
  type R2Sample,
} from "@/lib/r2-catalog";
import { GalleryMediaCard } from "@/components/home/GalleryMediaCard";
import { cn } from "@/lib/utils";

function ratioValue(ar: string): number {
  const m = /^(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/.exec(ar.trim());
  if (!m) return 1;
  return Number(m[1]) / Number(m[2]);
}

/** Items that belong in the mixed feed (not EXTRAA). */
export function isExtraaCandidate(s: R2Sample): boolean {
  const r = ratioValue(s.aspectRatio);
  if (r >= 2.2) return true;
  if ((s.format === "MP4" || s.url.endsWith(".mp4")) && r >= 1.7 && r < 2.2) {
    return true;
  }
  return false;
}

export function getFeedSamples(): R2Sample[] {
  const images = getImagineOnlySamples();
  const videos = getActiveR2VideoSamples().filter((s) => !isExtraaCandidate(s));
  const seen = new Set<string>();
  const mixed: R2Sample[] = [];
  const imgQ = [...images];
  const vidQ = [...videos];
  let i = 0;
  while (imgQ.length || vidQ.length) {
    if (imgQ.length && (i % 3 !== 2 || !vidQ.length)) {
      const s = imgQ.shift()!;
      if (!seen.has(s.url)) {
        seen.add(s.url);
        mixed.push(s);
      }
    } else if (vidQ.length) {
      const s = vidQ.shift()!;
      if (!seen.has(s.url)) {
        seen.add(s.url);
        mixed.push(s);
      }
    } else if (imgQ.length) {
      const s = imgQ.shift()!;
      if (!seen.has(s.url)) {
        seen.add(s.url);
        mixed.push(s);
      }
    }
    i++;
  }
  return mixed;
}

export function getExtraaSamples(): R2Sample[] {
  const videos = getActiveR2VideoSamples().filter(isExtraaCandidate);
  const images = getImagineOnlySamples().filter((s) => ratioValue(s.aspectRatio) >= 2.2);
  const seen = new Set<string>();
  const out: R2Sample[] = [];
  for (const s of [...videos, ...images]) {
    if (seen.has(s.url)) continue;
    seen.add(s.url);
    out.push(s);
  }
  return out.sort((a, b) => a.sortOrder - b.sortOrder);
}

export function VisualDiscoveryGallery() {
  const samples = useMemo(() => getFeedSamples(), []);

  if (samples.length === 0) return null;

  return (
    <section className="space-y-4" data-discovery="unified-feed">
      <div className="space-y-1">
        <h2 className="text-[18px] font-extrabold tracking-tight sm:text-[20px]">
          Discover
        </h2>
        <p className="text-[13px] text-muted-foreground">
          Creative visuals from Motio2edit — browse, then open any card to explore.
        </p>
      </div>

      <div
        className={cn(
          "mx-auto grid max-w-[1200px] items-start justify-items-center gap-3 sm:gap-4",
          "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
        )}
      >
        {samples.map((s) => (
          <GalleryMediaCard key={s.id} sample={s} context="feed" />
        ))}
      </div>
    </section>
  );
}
