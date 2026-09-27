/**
 * Home Frames — 16:9 horizontal sliding carousel under Music.
 * Uses real sample image; explains glassy-on-frame look.
 */
import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { Frame, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const SAMPLE =
  "https://assets.motio2edit.com/samples/circle-2edit/file_00000000ba00821088b9323f82326857.png";

/** Showcase slides — photo + frame story in 16:9 cards */
const SLIDES: {
  id: string;
  title: string;
  subtitle: string;
  frameLabel: string;
  tier: "Free" | "AI+" | "Premium";
  border: string;
  pad: string;
}[] = [
  {
    id: "glass",
    title: "Glassy on the frame",
    subtitle: "Toggle glass panel for real photo-under-glass shine — not a digital overlay.",
    frameLabel: "Clear glass",
    tier: "Free",
    border: "linear-gradient(145deg,#e8eef5,#c8d4e0)",
    pad: "6%",
  },
  {
    id: "baroque",
    title: "Royal texture frames",
    subtitle: "Carved gold moulding · museum-ready detail",
    frameLabel: "Baroque gold",
    tier: "Premium",
    border: "linear-gradient(145deg,#e8c86a,#a88840 45%,#7a6028)",
    pad: "9%",
  },
  {
    id: "velvet",
    title: "Velvet & wood realism",
    subtitle: "Deep materials that feel physical, not flat",
    frameLabel: "Burgundy velvet",
    tier: "Premium",
    border: "linear-gradient(145deg,#5a1830,#2a0c18)",
    pad: "8%",
  },
  {
    id: "film",
    title: "Film & instant classics",
    subtitle: "1970s instant print · cinema strip · polaroid",
    frameLabel: "Vintage film",
    tier: "AI+",
    border: "linear-gradient(90deg,#111 10%,#e8e0d0 14%,#e8e0d0 86%,#111 90%)",
    pad: "10%",
  },
  {
    id: "walnut",
    title: "Natural wood grain",
    subtitle: "Walnut · oak · driftwood — real texture, not a tint",
    frameLabel: "Walnut grain",
    tier: "Free",
    border: "linear-gradient(135deg,#8b5a2b,#4a2e16 50%,#2a180c)",
    pad: "7%",
  },
];

function TierChip({ tier }: { tier: string }) {
  if (tier === "Free") {
    return (
      <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/90 bg-white/15">
        Free
      </span>
    );
  }
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-[9px] font-bold text-white",
        tier === "AI+" ? "bg-[#FF5A1F]" : "bg-gradient-to-r from-amber-600 to-yellow-500",
      )}
    >
      {tier}
    </span>
  );
}

export function FramesStudioGallery() {
  const scroller = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: -1 | 1) => {
    const el = scroller.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-slide]");
    const step = card ? card.offsetWidth + 12 : el.clientWidth * 0.85;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  return (
    <section className="mt-10 space-y-3" data-creation-section="frames">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-[16px] font-extrabold tracking-tight sm:text-[18px]">
          <Frame className="h-4 w-4" />
          Frames
        </h2>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            className="grid h-8 w-8 place-items-center rounded-full border border-border/60 bg-card/80 text-muted-foreground hover:text-foreground"
            aria-label="Previous"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            className="grid h-8 w-8 place-items-center rounded-full border border-border/60 bg-card/80 text-muted-foreground hover:text-foreground"
            aria-label="Next"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <Link
            to="/studio/frames"
            className="ml-1 text-[11px] font-semibold text-primary hover:underline"
          >
            Open Studio →
          </Link>
        </div>
      </div>

      <div
        ref={scroller}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {SLIDES.map((s) => (
          <Link
            key={s.id}
            to="/studio/frames"
            data-slide
            className="relative w-[min(92vw,520px)] shrink-0 snap-center overflow-hidden rounded-2xl ring-1 ring-border/40"
          >
            {/* 16:9 card */}
            <div className="relative aspect-video w-full bg-neutral-900">
              {/* framed photo area */}
              <div
                className="absolute inset-[8%] flex items-center justify-center"
                style={{ background: s.border, padding: s.pad }}
              >
                <img
                  src={SAMPLE}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                {/* glassy highlight on photo */}
                {s.id === "glass" && (
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(125deg,rgba(255,255,255,0.28) 0%,rgba(255,255,255,0.04) 40%,transparent 55%)",
                    }}
                  />
                )}
              </div>

              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3.5 pb-3 pt-12">
                <div className="mb-1 flex items-center gap-2">
                  <TierChip tier={s.tier} />
                  <span className="text-[10px] font-medium text-white/70">{s.frameLabel}</span>
                </div>
                <p className="text-[13px] font-bold leading-tight text-white sm:text-sm">{s.title}</p>
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-white/75">{s.subtitle}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <p className="text-center text-[11px] text-muted-foreground">
        Swipe for styles · Glassy panel optional in studio · Preview free · Apply by plan
      </p>
    </section>
  );
}
