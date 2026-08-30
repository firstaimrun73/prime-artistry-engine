import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { getTrafficStats } from "@/lib/traffic.functions";
import { Activity, Eye } from "lucide-react";

function TrafficSection() {
  const fn = useServerFn(getTrafficStats);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-traffic"],
    queryFn: () => fn(),
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <section className="mt-8 rounded-xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">Loading traffic…</p>
      </section>
    );
  }
  if (!data?.isAdmin) return null;

  const fmt = (n: number) => n.toLocaleString("en-IN");

  return (
    <section className="mt-8 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-bold uppercase tracking-wide">Traffic</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        First-party page views · real recorded data only · excludes /api and /admin
      </p>

      {!data.hasData ? (
        <p className="mt-4 rounded-lg border border-dashed border-border bg-secondary/40 px-4 py-6 text-center text-sm text-muted-foreground">
          No historical data available. Traffic will appear here after real page views are recorded.
        </p>
      ) : (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-[11px] uppercase text-muted-foreground">Today</p>
              <p className="mt-1 text-lg font-extrabold">{fmt(data.today.uniqueVisitors)} visitors</p>
              <p className="text-xs text-muted-foreground">{fmt(data.today.pageViews)} page views</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-[11px] uppercase text-muted-foreground">Last 7 days</p>
              <p className="mt-1 text-lg font-extrabold">{fmt(data.last7.uniqueVisitors)} visitors</p>
              <p className="text-xs text-muted-foreground">{fmt(data.last7.pageViews)} page views</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-[11px] uppercase text-muted-foreground">Last 30 days</p>
              <p className="mt-1 text-lg font-extrabold">{fmt(data.last30.uniqueVisitors)} visitors</p>
              <p className="text-xs text-muted-foreground">{fmt(data.last30.pageViews)} page views</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-[11px] uppercase text-muted-foreground">Total tracked</p>
              <p className="mt-1 text-lg font-extrabold">{fmt(data.total.uniqueVisitors)} visitors</p>
              <p className="text-xs text-muted-foreground">{fmt(data.total.pageViews)} page views</p>
            </div>
          </div>

          <div className="mt-5">
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
              <Eye className="h-3.5 w-3.5" /> Last 30 days activity
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.daily} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" fontSize={10} interval="preserveStartEnd" />
                <YAxis fontSize={10} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="pageViews" name="Page views" fill="#F97316" radius={[3, 3, 0, 0]} />
                <Bar dataKey="visitors" name="Visitors" fill="#60A5FA" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </section>
  );
}

export { TrafficSection };
