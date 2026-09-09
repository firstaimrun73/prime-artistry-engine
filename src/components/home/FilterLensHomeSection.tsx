/**
 * Homepage discovery for Filters + Lenses.
 * Free users: locked upgrade CTA (ExploreLensesSection shows circular previews).
 * Paid: interactive filter/lens cards with R2 lens samples.
 */
import { Link } from "@tanstack/react-router";
import { Aperture, Filter, ArrowRight, Lock } from "lucide-react";
import { ALL_FILTERS } from "@/lib/filter-lens/filters/filter-registry";
import { CAMERA_LENS_ROSTER } from "@/lib/lens-camera/roster";
import { getLensSampleCards } from "@/lib/lens-camera/lens-samples";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { isPaidPlan } from "@/lib/policy";

export function FilterLensHomeSection() {
  const { profile } = useAuth();
  const admin = isAdminEmail(profile?.email);
  const paid = admin || isPaidPlan(profile?.plan);

  const featuredFilters = ALL_FILTERS.filter((f) => f.unlock.isFree).slice(0, 6);
  const featuredLenses = getLensSampleCards(CAMERA_LENS_ROSTER).slice(0, 6);

  if (!paid) {
    return (
      <div className="mt-12 rounded-2xl border border-border/80 bg-card/70 p-5 text-center">
        <p className="text-sm font-semibold">Filters & Lenses</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Advanced filters and AI lenses are available on upgraded plans.
        </p>
        <Link
          to="/pricing"
          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary"
        >
          Upgrade to unlock <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

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
                "group overflow-hidden rounded-2xl border border-border/70 bg-card/60 transition hover:border-primary/40",
              )}
            >
              <div className="relative aspect-[4/5] bg-gradient-to-br from-primary/20 via-muted to-muted/40" />
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
            <p className="mt-0.5 text-[12px] text-muted-foreground">R2 samples · open in Lens editor</p>
          </div>
          <Link to="/studio/image/lens-editor" className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary">
            Open Lens <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {featuredLenses.map((l) => (
            <Link
              key={l.id}
              to="/studio/image/lens-editor"
              search={{ lens: l.lensId }}
              className={cn(
                "group overflow-hidden rounded-2xl border border-border/70 bg-card/60 p-2.5 text-center transition hover:border-primary/40",
              )}
              title={`Open ${l.name} — upload your image`}
            >
              <div className="relative mx-auto aspect-square w-full max-w-[100px] overflow-hidden rounded-full border border-white/20 bg-black/40">
                <img
                  src={l.imageUrl}
                  alt={`${l.name} — ${l.about}`}
                  loading="lazy"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    console.warn("[lens-home] failed", l.imageUrl);
                    (e.currentTarget as HTMLImageElement).style.opacity = "0.25";
                  }}
                />
              </div>
              <p className="mt-2 truncate text-[12px] font-semibold leading-tight">{l.name}</p>
              <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{l.about}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
