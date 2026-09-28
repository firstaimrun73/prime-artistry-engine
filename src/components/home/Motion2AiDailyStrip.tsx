/**
 * Homepage compact horizontal strip for Motion2Ai daily Top 10.
 * Slow auto-scroll, seamless loop, per-image mode labels, data-driven ratio.
 * No download/share/controls on cards.
 */
import { useEffect, useRef } from "react";
import {
  getActiveDailySet,
  getArchiveDailySets,
  modeIcon,
  ratioToCss,
  type DailyImage,
  type DailySet,
} from "@/data/motion2ai-daily";

function ImageCard({
  img,
  ratio,
  lazy,
}: {
  img: DailyImage;
  ratio: string;
  lazy: boolean;
}) {
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-xl border border-border/60 bg-muted/20"
      style={{
        width: "min(160px, 28vw)",
        aspectRatio: ratioToCss(ratio),
      }}
    >
      <img
        src={img.url}
        alt={`${img.label} edit`}
        loading={lazy ? "lazy" : "eager"}
        decoding="async"
        className="h-full w-full object-cover"
        draggable={false}
      />
      <span className="absolute bottom-1.5 left-1.5 z-10 flex items-center gap-1 rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
        <span aria-hidden>{modeIcon(img.mode)}</span>
        {img.label}
      </span>
    </div>
  );
}

function MarqueeStrip({ set }: { set: DailySet }) {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    let raf = 0;
    let x = 0;
    const speed = 0.35; // px per frame ~ slow
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const tick = () => {
      x -= speed;
      const half = el.scrollWidth / 2;
      if (half > 0 && Math.abs(x) >= half) x = 0;
      el.style.transform = `translateX(${x}px)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [set.date]);

  // Duplicate list for seamless loop
  const loop = [...set.images, ...set.images];

  return (
    <div className="overflow-hidden">
      <div ref={trackRef} className="flex w-max gap-3 will-change-transform">
        {loop.map((img, i) => (
          <ImageCard
            key={`${set.date}-${i}-${img.url}`}
            img={img}
            ratio={set.dailyRatio}
            lazy={i >= set.images.length}
          />
        ))}
      </div>
    </div>
  );
}

function ArchiveBlock({ sets }: { sets: DailySet[] }) {
  if (sets.length === 0) return null;
  return (
    <div className="mt-6 space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground">Archive</h3>
      {sets.map((s) => (
        <div key={s.date}>
          <p className="mb-2 text-xs text-muted-foreground">
            {s.date} · {s.dailyRatio}
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {s.images.map((img) => (
              <ImageCard key={img.url} img={img} ratio={s.dailyRatio} lazy />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Motion2AiDailyStrip() {
  const active = getActiveDailySet();
  if (!active || active.images.length === 0) return null;
  const archive = getArchiveDailySets();

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
      <div className="mb-4 text-center">
        <h2 className="text-lg font-bold sm:text-xl">
          Motion2Ai — Make Every Day Top 10 Edits
        </h2>
      </div>
      <MarqueeStrip set={active} />
      <ArchiveBlock sets={archive} />
    </section>
  );
}
