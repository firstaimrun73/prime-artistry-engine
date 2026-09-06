/**
 * Homepage discovery for Filters + Lenses.
 * Lens cards deep-link to /studio/image/lens-editor?lens=<id> with CAMERA_LENS_ROSTER names.
 */
import type { CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import { Aperture, Filter, ArrowRight } from "lucide-react";
import { ALL_FILTERS } from "@/lib/filter-lens/filters/filter-registry";
import { CAMERA_LENS_ROSTER } from "@/lib/lens-camera/roster";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const FILTER_CSS: Record<string, string> = {
  Natural: "contrast(1.05) saturate(1.1)",
  Portrait: "contrast(1.08) brightness(1.05) saturate(0.95)",
  Cinematic: "contrast(1.2) saturate(0.85) brightness(0.95)",
  Film: "sepia(0.25) contrast(1.1) saturate(0.9)",
  Vintage: "sepia(0.4) contrast(1.05) brightness(1.05)",
  Retro: "sepia(0.3) hue-rotate(-10deg) contrast(1.1)",
  "Black & White": "grayscale(1) contrast(1.15)",
  Moody: "contrast(1.25) brightness(0.9) saturate(0.8)",
  Warm: "sepia(0.15) saturate(1.2) brightness(1.05)",
  Cool: "hue-rotate(15deg) saturate(0.9) brightness(1.02)",
  Sunset: "sepia(0.35) saturate(1.3) contrast(1.1)",
  Night: "brightness(0.75) contrast(1.2) saturate(0.7)",
  Street: "contrast(1.2) saturate(0.85)",
  Travel: "saturate(1.25) contrast(1.05)",
  Landscape: "saturate(1.15) contrast(1.1) brightness(1.02)",
  Food: "saturate(1.3) contrast(1.1)",
  Fashion: "contrast(1.15) saturate(0.95) brightness(1.05)",
  Dramatic: "contrast(1.35) brightness(0.92) saturate(1.1)",
  Soft: "brightness(1.08) contrast(0.92) saturate(0.95)",
  Professional: "contrast(1.12) saturate(1.05)",
};

const LENS_CSS: Record<string, string> = {
  "wide-angle": "contrast(1.1) saturate(1.1)",
  "ultra-wide": "contrast(1.12) saturate(1.15) brightness(1.02)",
  fisheye: "contrast(1.2) saturate(1.05)",
  standard: "contrast(1.08) saturate(1.05)",
  "portrait-prime": "brightness(1.06) contrast(1.08) saturate(0.92)",
  telephoto: "contrast(1.22) saturate(0.88) brightness(0.96)",
  "super-telephoto": "contrast(1.15) saturate(1.05)",
  macro: "contrast(1.2) saturate(1.15)",
  "tilt-shift": "saturate(1.2) contrast(1.1)",
  "soft-focus": "brightness(1.1) contrast(0.95)",
  infrared: "hue-rotate(-20deg) saturate(1.3) contrast(1.15)",
  vintage: "sepia(0.35) contrast(1.05)",
  default: "contrast(1.1) saturate(1.05)",
};

const PREVIEW_GRADIENTS = [
  "linear-gradient(135deg, #1e3a5f 0%, #0f766e 50%, #134e4a 100%)",
  "linear-gradient(160deg, #4c1d95 0%, #7c3aed 45%, #c4b5fd 100%)",
  "linear-gradient(145deg, #7c2d12 0%, #ea580c 40%, #fbbf24 100%)",
  "linear-gradient(120deg, #0c4a6e 0%, #0284c7 50%, #7dd3fc 100%)",
  "linear-gradient(150deg, #1a1a1a 0%, #525252 40%, #a3a3a3 100%)",
  "linear-gradient(135deg, #831843 0%, #db2777 45%, #fbcfe8 100%)",
  "linear-gradient(160deg, #14532d 0%, #16a34a 45%, #86efac 100%)",
  "linear-gradient(140deg, #1e1b4b 0%, #4338ca 40%, #a5b4fc 100%)",
  "linear-gradient(125deg, #78350f 0%, #d97706 50%, #fde68a 100%)",
  "linear-gradient(155deg, #164e63 0%, #0891b2 45%, #a5f3fc 100%)",
  "linear-gradient(130deg, #3b0764 0%, #9333ea 40%, #e9d5ff 100%)",
  "linear-gradient(170deg, #450a0a 0%, #dc2626 45%, #fecaca 100%)",
];

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

function uniquePreviewStyle(id: string, cssFilter: string): CSSProperties {
  const g = PREVIEW_GRADIENTS[hashId(id) % PREVIEW_GRADIENTS.length];
  return { backgroundImage: g, filter: cssFilter };
}

function previewCssForFilter(category: string): string {
  return FILTER_CSS[category] ?? "contrast(1.08) saturate(1.05)";
}

function previewCssForLens(concept: string, index: number): string {
  const key = (concept || "").toLowerCase();
  if (LENS_CSS[key]) return LENS_CSS[key];
  for (const k of Object.keys(LENS_CSS)) {
    if (key.includes(k)) return LENS_CSS[k];
  }
  const cycle = Object.values(LENS_CSS);
  return cycle[index % cycle.length];
}

export function FilterLensHomeSection() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const featuredFilters = ALL_FILTERS.filter((f) => f.unlock.isFree).slice(0, 6);
  const featuredLenses = CAMERA_LENS_ROSTER.slice(0, 6);

  return (
    <div className="mt-12 space-y-10">
      <section className="space-y-3" data-home-section="filters">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-1.5 text-[14px] font-bold tracking-tight">
              <Filter className="h-4 w-4 text-primary" />
              Filters
            </h3>
            <p className="mt-0.5 text-[12px] text-muted-foreground">Photographic looks · apply to your photo</p>
          </div>
          <Link to="/studio/image/filters" className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary">
            Browse all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {featuredFilters.map((f) => (
            <Link
              key={f.id}
              to="/studio/image/filters"
              className={cn(
                "group overflow-hidden rounded-2xl border transition-colors",
                isDark ? "border-white/10 bg-white/[0.03] hover:border-primary/40" : "border-black/5 bg-black/[0.02] hover:border-primary/40",
              )}
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-muted/40">
                <div className="h-full w-full transition duration-300 group-hover:scale-[1.03]" style={uniquePreviewStyle(f.id, previewCssForFilter(f.category))} aria-hidden />
              </div>
              <div className="px-2.5 py-2">
                <p className="truncate text-[12px] font-semibold leading-tight">{f.name}</p>
                <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{f.category}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3" data-home-section="lenses">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-1.5 text-[14px] font-bold tracking-tight">
              <Aperture className="h-4 w-4 text-primary" />
              Lenses
            </h3>
            <p className="mt-0.5 text-[12px] text-muted-foreground">Same 20 Motio2edit lenses · open in Lens</p>
          </div>
          <Link
            to="/studio/image/lens-editor"
            search={{ lens: CAMERA_LENS_ROSTER[0]?.id }}
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary"
          >
            Open Lens <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {featuredLenses.map((l, i) => (
            <Link
              key={l.id}
              to="/studio/image/lens-editor"
              search={{ lens: l.id }}
              className={cn(
                "group overflow-hidden rounded-2xl border transition-colors",
                isDark ? "border-white/10 bg-white/[0.03] hover:border-primary/40" : "border-black/5 bg-black/[0.02] hover:border-primary/40",
              )}
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-muted/40">
                <div className="h-full w-full transition duration-300 group-hover:scale-[1.03]" style={uniquePreviewStyle(`lens-${l.id}`, previewCssForLens(l.concept, i))} aria-hidden />
              </div>
              <div className="px-2.5 py-2">
                <p className="truncate text-[12px] font-semibold leading-tight">{l.name}</p>
                <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{l.shortDescription}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
