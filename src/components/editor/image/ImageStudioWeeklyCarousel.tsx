/**
 * Image Studio weekly Top-10 — large looping carousel BELOW existing Output.
 * Image + mode label only. Click → full-screen lightbox. No download/share/actions.
 */
import { useEffect, useRef, useState } from "react";
import {
  getActiveDailySet,
  modeIcon,
  ratioToCss,
  type DailyImage,
  type DailySet,
} from "@/data/motion2ai-daily";

function Card({
  img,
  ratio,
  onOpen,
  lazy,
}: {
  img: DailyImage;
  ratio: string;
  onOpen: (url: string) => void;
  lazy: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(img.url)}
      className="relative shrink-0 overflow-hidden rounded-2xl border border-border/50 bg-muted/20 shadow-sm transition hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      style={{
        width: "min(220px, 42vw)",
        aspectRatio: ratioToCss(ratio),
      }}
      aria-label={`${img.label} generation`}
    >
      <img
        src={img.url}
        alt=""
        loading={lazy ? "lazy" : "eager"}
        decoding="async"
        className="h-full w-full object-cover"
        draggable={false}
      />
      <span className="absolute bottom-2 left-2 z-10 flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
        <span aria-hidden>{modeIcon(img.mode)}</span>
        {img.label}
      </span>
    </button>
  );
}

function LoopTrack({ set, onOpen }: { set: DailySet; onOpen: (url: string) => void }) {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    let raf = 0;
    let x = 0;
    const speed = 0.45;
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

  const loop = [...set.images, ...set.images];

  return (
    <div className="overflow-hidden leading-none">
      <div ref={trackRef} className="flex w-max gap-3 will-change-transform sm:gap-4">
        {loop.map((img, i) => (
          <Card
            key={`${set.date}-${i}-${img.url}`}
            img={img}
            ratio={set.dailyRatio}
            onOpen={onOpen}
            lazy={i >= set.images.length}
          />
        ))}
      </div>
    </div>
  );
}

export function ImageStudioWeeklyCarousel() {
  const active = getActiveDailySet();
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (!active || active.images.length === 0) return null;

  return (
    <section className="mt-5 border-t border-border/40 pt-4 pb-0 sm:mt-6 sm:pt-5">
      <h2 className="mb-2 text-center text-sm font-semibold tracking-wide text-muted-foreground sm:text-base">
        Try Something New
      </h2>
      <LoopTrack set={active} onOpen={setLightbox} />
      {lightbox && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Top 10 preview"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt="Weekly Top 10"
            className="max-h-[90vh] max-w-full rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/20"
            onClick={() => setLightbox(null)}
          >
            Close
          </button>
        </div>
      )}
    </section>
  );
}
