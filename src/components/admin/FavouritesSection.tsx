/**
 * Admin: aggregate sample favourite activity.
 */
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { getAdminFavouriteStats } from "@/lib/sample-favourites.functions";

export function FavouritesSection() {
  const fn = useServerFn(getAdminFavouriteStats);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-favourite-stats"],
    queryFn: () => fn(),
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <section className="mt-8 rounded-xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">Loading favourites…</p>
      </section>
    );
  }
  if (!data?.isAdmin) return null;

  return (
    <section className="mt-8 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Heart className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Sample favourites
        </h2>
      </div>
      <p className="mt-2 text-2xl font-extrabold">{data.total} total likes</p>
      <ul className="mt-4 space-y-2 text-sm">
        {data.top.length === 0 && (
          <li className="text-muted-foreground">No favourites recorded yet.</li>
        )}
        {data.top.map((row) => (
          <li key={row.sampleId} className="flex items-center justify-between gap-3">
            <span className="truncate font-medium">{row.title || row.sampleId}</span>
            <span className="shrink-0 font-semibold text-primary">{row.count}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
