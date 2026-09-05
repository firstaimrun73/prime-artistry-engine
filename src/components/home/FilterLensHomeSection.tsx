/**
 * Homepage discovery for Filters + Lenses.
 * Links to real studio routes. Media-first, compact, no fake controls.
 */
import { Link } from "@tanstack/react-router";
import { Aperture, Filter, ArrowRight } from "lucide-react";
import { ALL_FILTERS } from "@/lib/filter-lens/filters/filter-registry";
import { ALL_LENSES } from "@/lib/filter-lens/lenses/lens-registry";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

/** Category → CSS filter preview (approximate look, no binary assets required). */
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
  default: "contrast(1.1) saturate(1.05)",
  portrait: "brightness(1.06) contrast(1.08) saturate(0.92)",
  cinematic: "contrast(1.22) saturate(0.88) brightness(0.96)",
  landscape: "saturate(1.2) contrast(1.08)",
  night: "brightness(0.8) contrast(1.25) saturate(0.75)",
};

/** Varied local demo backgrounds (repo-hosted, not R2). */
const PREVIEW_BG = [
  "/demo/video/poster-landscape.jpg",
  "/demo/video/poster-portrait.jpg",
  "/demo/video/poster-tech.jpg",
  "/demo/music/cover-vinyl.jpg",
  "/demo/music/cover-waveform.jpg",
  "/demo/music/cover-studio.jpg",
];

function previewCssForFilter(category: string): string {
  return FILTER_CSS[category] ?? "contrast(1.08) saturate(1.05)";
}

function previewCssForLens(specialty: string, index: number): string {
  const key = specialty.toLowerCase();
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
  const featuredLenses = ALL_LENSES.slice(0, 6);

  return (
    <div className="mt-12 space-y-10">
      <section className="space-y-3" data-home-section="filters">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-1.5 text-[14px] font-bold tracking-tight">
              <Filter className="h-4 w-4 text-primary" />
              Filters
            </h3>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              Photographic looks · apply to your photo
            </p>
          </div>
          <Link
            to="/studio/image/filters"
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary"
          >
            Browse all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {featuredFilters.map((f, i) => (
            <Link
              key={f.id}
              to="/studio/image/filters"
              className={cn(
                "group overflow-hidden rounded-2xl border transition-colors",
                isDark
                  ? "border-white/10 bg-white/[0.03] hover:border-primary/40"
                  : "border-black/5 bg-black/[0.02] hover:border-primary/40",
              )}
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-muted/40">
                <img
                  src={PREVIEW_BG[i % PREVIEW_BG.length]}
                  alt=""
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                  style={{ filter: previewCssForFilter(f.category) }}
                  loading="lazy"
                />
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
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              Computational looks · specialty processing
            </p>
          </div>
          <Link
            to="/studio/image/lenses"
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary"
          >
            Browse all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {featuredLenses.map((l, i) => (
            <Link
              key={l.id}
              to="/studio/image/lenses"
              className={cn(
                "group overflow-hidden rounded-2xl border transition-colors",
                isDark
                  ? "border-white/10 bg-white/[0.03] hover:border-primary/40"
                  : "border-black/5 bg-black/[0.02] hover:border-primary/40",
              )}
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-muted/40">
                <img
                  src={PREVIEW_BG[(i + 2) % PREVIEW_BG.length]}
                  alt=""
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                  style={{ filter: previewCssForLens(l.specialty, i) }}
                  loading="lazy"
                />
              </div>
              <div className="px-2.5 py-2">
                <p className="truncate text-[12px] font-semibold leading-tight">{l.name}</p>
                <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{l.specialty}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
