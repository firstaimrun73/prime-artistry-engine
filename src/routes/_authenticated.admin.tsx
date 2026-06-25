import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { getAdminStats } from "@/lib/admin-stats.functions";
import {
  Users,
  UserPlus,
  IndianRupee,
  TrendingUp,
  CreditCard,
  Image as ImageIcon,
  Video,
  HardDrive,
  ShieldAlert,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

const PIE_COLORS = ["#F97316", "#CD7F32", "#C0C0C0", "#FFD700", "#60A5FA"];

function StatCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <Icon className="h-5 w-5 text-primary" />
      <p className="mt-3 text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-extrabold">{value}</p>
    </div>
  );
}

function AdminPage() {
  const fn = useServerFn(getAdminStats);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => fn(),
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return <div className="mx-auto max-w-6xl px-4 py-16 text-sm text-muted-foreground">Loading admin data…</div>;
  }

  if (!data?.isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
        <h1 className="mt-4 text-xl font-bold">Restricted</h1>
        <p className="mt-2 text-sm text-muted-foreground">This page is only available to the administrator.</p>
        <Link to="/dashboard" className="mt-6 inline-block text-sm font-medium text-primary hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const { realtime, users, storage, purchases, charts } = data;
  const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">Live platform overview · refreshes every 30s</p>

      {/* Realtime */}
      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Real-time</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard icon={UserPlus} label="New signups today" value={String(realtime.signupsToday)} />
        <StatCard icon={IndianRupee} label="Revenue today" value={inr(realtime.revenueTodayInr)} />
        <StatCard icon={TrendingUp} label="Revenue all time" value={inr(realtime.revenueAllTimeInr)} />
        <StatCard icon={CreditCard} label="Active subscriptions" value={String(realtime.activeSubscriptions)} />
        <StatCard icon={Users} label="Total users" value={String(users.total)} />
      </div>

      {/* Users + Storage */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Free plan users" value={String(users.free)} />
        <StatCard icon={Users} label="Paid plan users" value={String(users.paid)} />
        <StatCard icon={ImageIcon} label="Images generated" value={String(storage.images)} />
        <StatCard icon={Video} label="Videos generated" value={String(storage.videos)} />
      </div>
      <div className="mt-4">
        <StatCard icon={HardDrive} label="Storage used (approx)" value={`${storage.usedGb} GB`} />
      </div>

      {/* Charts */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold">Daily revenue (₹, 14d)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={charts.revenueDaily} margin={{ top: 16, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Line type="monotone" dataKey="amount" stroke="#F97316" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold">Daily signups (14d)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={charts.signupsDaily} margin={{ top: 16, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis fontSize={11} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#60A5FA" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold">Popular plans</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={charts.popularPlans} dataKey="count" nameKey="plan" cx="50%" cy="50%" outerRadius={80} label>
                {charts.popularPlans.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold">Top users by generations</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {storage.perUser.length === 0 && <li className="text-muted-foreground">No data yet.</li>}
            {storage.perUser.map((u) => (
              <li key={u.email} className="flex items-center justify-between">
                <span className="truncate">{u.email}</span>
                <span className="font-semibold">{u.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Purchases */}
      <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Purchases</h2>
      <div className="mt-3 overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-secondary text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Plan</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Method</th>
              <th className="px-3 py-2">Txn ID</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {purchases.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                  No purchases recorded.
                </td>
              </tr>
            )}
            {purchases.map((p) => (
              <tr key={p.transactionId} className="border-t border-border">
                <td className="px-3 py-2">{p.name}</td>
                <td className="px-3 py-2">{p.email}</td>
                <td className="px-3 py-2 capitalize">{p.plan}</td>
                <td className="px-3 py-2">
                  {p.currency === "INR" ? "₹" : p.currency + " "}
                  {p.amount.toLocaleString("en-IN")}
                </td>
                <td className="px-3 py-2 capitalize">{p.method}</td>
                <td className="px-3 py-2 font-mono text-xs">{p.transactionId}</td>
                <td className="px-3 py-2 text-xs">{new Date(p.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2">
                  <span
                    className={
                      p.status === "completed"
                        ? "rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-semibold text-green-500"
                        : "rounded-full bg-yellow-500/15 px-2 py-0.5 text-xs font-semibold text-yellow-500"
                    }
                  >
                    {p.status === "completed" ? "success" : p.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
