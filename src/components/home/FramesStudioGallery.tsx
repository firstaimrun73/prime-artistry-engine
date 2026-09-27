/**
 * Home Frames section — sits directly under Music.
 * Hero shows framed photo concept; grid shows limited textured frames with tier labels.
 */
import { Link } from "@tanstack/react-router";
import { Frame } from "lucide-react";
import { FRAMES, type FrameTier } from "@/lib/frame-studio/frames-compose";
import { cn } from "@/lib/utils";

/** Curated home display — textured / distinctive only, not the full catalog. */
const HOME_FRAME_IDS = [
  "baroqueGold",
  "velvetHibiscus",
  "lotusPolaroid",
  "filmVintage",
  "galleryGoldBead",
  "mahoganyLuxury",
  "polaroid",
  "walnut",
  "oak",
  "marbleW",
  "leatherSt",
  "rosegold",
  "g-clear",
  "cinemaStrip",
  "palaceGold",
  "instantLuxury",
  "museumShadow",
  "kraft",
  "linen",
  "brass",
  "ebony",
  "g-frost",
  "driftwood",
  "blackGoldInlay",
  "watercolor",
  "galleryDouble",
  "film",
  "camera1",
  "velvetRoyalDeep",
  "emeraldVelvet",
  "rococoGold",
  "paper",
  "silver",
  "bamboo",
  "c-ivory",
];

function TierChip({ tier }: { tier: FrameTier }) {
  if (tier === "common") {
    return (
      <span className="rounded px-1 py-px text-[8px] font-bold uppercase tracking-wide text-muted-foreground">
        Free
      </span>
    );
  }
  return (
    <span
      className={cn(
        "rounded px-1 py-px text-[8px] font-bold text-white",
        tier === "aiplus" ? "bg-[#FF5A1F]" : "bg-gradient-to-r from-amber-600 to-yellow-500",
      )}
    >
      {tier === "aiplus" ? "AI+" : "Premium"}
    </span>
  );
}

function frameSwatch(f: (typeof FRAMES)[0]): string {
  if (f.texture === "museumGold" || f.texture === "goldfoil" || f.texture === "brass") {
    return "linear-gradient(135deg,#e8c86a,#a88840 45%,#7a6028)";
  }
  if (f.texture === "velvet" || f.color?.startsWith("#4") || f.color?.startsWith("#3")) {
    return `linear-gradient(145deg,${f.color ?? "#4a0e18"},#1a060a)`;
  }
  if (f.texture === "walnut" || f.texture === "oak" || f.texture === "ebony") {
    return "linear-gradient(135deg,#8b5a2b,#4a2e16 50%,#2a180c)";
  }
  if (f.texture === "marbleW") return "linear-gradient(135deg,#f8f4f0,#e0d8d0)";
  if (f.texture === "marbleB") return "linear-gradient(135deg,#3a3a42,#1a1a20)";
  if (f.filmVintage || f.filmreel) return "linear-gradient(90deg,#111 8%,#e8e0d0 12%,#e8e0d0 88%,#111 92%)";
  if (f.kind === "glass") return "linear-gradient(145deg,rgba(255,255,255,0.5),rgba(200,220,240,0.35))";
  if (f.polaroid) return "linear-gradient(180deg,#fffefb 70%,#f0ebe3)";
  return f.color ? `linear-gradient(145deg,${f.color},#ddd)` : "linear-gradient(145deg,#f5f0ea,#e0d8d0)";
}

export function FramesStudioGallery() {
  const byId = new Map(FRAMES.map((f) => [f.id, f]));
  const homeFrames = HOME_FRAME_IDS.map((id) => byId.get(id)).filter(Boolean) as typeof FRAMES;

  return (
    <section className="mt-10 space-y-4" data-creation-section="frames">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-[16px] font-extrabold tracking-tight sm:text-[18px]">
          <Frame className="h-4 w-4" />
          Frames
        </h2>
        <Link
          to="/studio/frames"
          className="text-[11px] font-semibold text-primary hover:underline"
        >
          Open Frames Studio →
        </Link>
      </div>

      {/* Hero carousel concept */}
      <Link
        to="/studio/frames"
        className="relative block overflow-hidden rounded-2xl ring-1 ring-border/40"
      >
        <div
          className="relative flex min-h-[160px] items-center justify-center px-6 py-10 sm:min-h-[200px]"
          style={{
            background:
              "linear-gradient(135deg,#1c1c20 0%,#2a2420 40%,#1a1210 100%)",
          }}
        >
          <div
            className="relative w-[42%] max-w-[180px] aspect-[3/4] shadow-2xl"
            style={{
              background:
                "linear-gradient(145deg,#e8c86a 0%,#c4a040 35%,#8a7028 70%,#c4a040 100%)",
              padding: "10%",
              boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
            }}
          >
            <div
              className="h-full w-full bg-gradient-to-br from-neutral-300 via-neutral-400 to-neutral-500"
              style={{ boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.15)" }}
            />
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-10">
            <p className="text-sm font-bold text-white">Royal texture frames</p>
            <p className="text-[11px] text-white/75">
              Upload a photo · pick a frame · export in one tap
            </p>
          </div>
        </div>
      </Link>

      {/* Limited textured grid */}
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7">
        {homeFrames.map((f) => (
          <Link
            key={f.id}
            to="/studio/frames"
            className="group relative aspect-square overflow-hidden rounded-xl ring-1 ring-border/30 transition hover:ring-primary/40"
            title={f.name}
          >
            <div
              className="absolute inset-0"
              style={{ background: frameSwatch(f) }}
            />
            <div className="absolute inset-[18%] rounded-sm bg-neutral-400/80 shadow-inner" />
            <div className="absolute left-1 top-1">
              <TierChip tier={f.tier} />
            </div>
          </Link>
        ))}
      </div>

      <p className="text-center text-[11px] text-muted-foreground">
        Preview every frame free · Apply Common anytime · AI+ & Premium on plan
      </p>
    </section>
  );
}
