/**
 * Compact orange/white activity strip — real completed restorations today.
 * Hides itself when stats are unavailable (never shows simulated numbers).
 */
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { getDailyRestorationsCount } from "@/lib/stats/daily-restorations.functions";

export function DailyRestorationsStrip() {
  const fetchCount = useServerFn(getDailyRestorationsCount);
  const { data, isLoading } = useQuery({
    queryKey: ["daily-restorations-count"],
    queryFn: () => fetchCount(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  if (isLoading) return null;
  if (!data?.ok) return null;

  const n = data.count;
  const label =
    n === 0
      ? "Restorations start as jobs complete today"
      : n === 1
        ? "1 image restored today"
        : `${n.toLocaleString()} images restored today`;

  return (
    <section
      aria-label="Restoration activity"
      className="mx-auto w-full max-w-6xl px-4 pt-3 sm:pt-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-orange-500/30 bg-gradient-to-r from-orange-500 via-orange-500 to-amber-500 px-4 py-3 text-white shadow-md shadow-orange-500/20 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/20 backdrop-blur">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/90">
              Restored with Motio2edit AI
            </p>
            <p className="truncate text-sm font-extrabold sm:text-base">{label}</p>
          </div>
        </div>
        <Link
          to="/restored-images"
          className="shrink-0 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-orange-600 shadow-sm transition hover:bg-orange-50"
        >
          View gallery
        </Link>
      </div>
    </section>
  );
}
