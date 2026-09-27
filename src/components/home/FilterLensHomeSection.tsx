/**
 * Homepage discovery for Filters only.
 * Lens Studio has been removed from the product.
 */
import { Link } from "@tanstack/react-router";
import { Filter, ArrowRight } from "lucide-react";
import { ALL_FILTERS } from "@/lib/filter-lens/filters/filter-registry";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { isPaidPlan } from "@/lib/policy";

export function FilterLensHomeSection() {
  const { profile } = useAuth();
  const admin = isAdminEmail(profile?.email);
  const paid = admin || isPaidPlan(profile?.plan);

  const featuredFilters = ALL_FILTERS.filter((f) => f.unlock.isFree).slice(0, 6);

  if (!paid) {
    return (
      <div className="mt-12 rounded-2xl border border-border/80 bg-card/70 p-5 text-center">
        <p className="text-sm font-semibold">Filters</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Advanced filters are available on upgraded plans.
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
    </div>
  );
}
