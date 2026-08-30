import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getAdminPopup, saveAdminPopup, type PopupTarget } from "@/lib/popup.functions";
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
import { listFeedbackAdmin, updateFeedbackStatus } from "@/lib/feedback.functions";
import { AdminGate } from "@/components/admin/AdminGate";
import { AdminControlPanel } from "@/components/admin/AdminControlPanel";
import { TrafficSection } from "@/components/admin/TrafficSection";
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
  Megaphone,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminRoute,
});

// Client-side lock: only the configured admin account renders the dashboard.
// The server functions behind it enforce the same rule authoritatively.
function AdminRoute() {
  return (
    <AdminGate>
      <AdminPage />
    </AdminGate>
  );
}

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
      <Link
        to="/admin/refunds"
        className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
      >
        Manage refund requests →
      </Link>

      <PopupControl />


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

      <TrafficSection />
      <AdminControlPanel />
      <AdminFeedbackSection />
    </div>
  );
}

function AdminFeedbackSection() {
  const fn = useServerFn(listFeedbackAdmin);
  const updateFn = useServerFn(updateFeedbackStatus);
  const { data, refetch } = useQuery({
    queryKey: ["admin-feedback"],
    queryFn: () => fn(),
    refetchInterval: 60_000,
  });
  const [catFilter, setCatFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all");

  if (!data?.isAdmin) return null;

  const filtered = data.latest.filter(
    (f) =>
      (catFilter === "all" || f.category === catFilter) &&
      (ratingFilter === "all" || f.rating === Number(ratingFilter)),
  );
  const categories = [...new Set(data.latest.map((f) => f.category))];

  const setStatus = async (id: string, status: "read" | "resolved") => {
    await updateFn({ data: { id, status } });
    refetch();
  };

  return (
    <>
      <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Feedback</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={Users} label="Total feedback" value={String(data.total)} />
        <StatCard icon={TrendingUp} label="Average rating" value={`${data.averageRating} / 5`} />
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground">Rating breakdown</p>
          <div className="mt-2 space-y-1 text-sm">
            {data.ratingBreakdown
              .slice()
              .reverse()
              .map((r) => (
                <div key={r.rating} className="flex items-center justify-between">
                  <span>{"⭐".repeat(r.rating)}</span>
                  <span className="font-semibold">{r.count}</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold">Categories</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.categoryBreakdown} margin={{ top: 16, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="category" fontSize={9} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis fontSize={11} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#6c63ff" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold">Rating distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.ratingBreakdown} margin={{ top: 16, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="rating" fontSize={11} />
              <YAxis fontSize={11} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#F97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="rounded-lg border border-border bg-background p-2 text-sm"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value)}
          className="rounded-lg border border-border bg-background p-2 text-sm"
        >
          <option value="all">All ratings</option>
          {[5, 4, 3, 2, 1].map((r) => (
            <option key={r} value={String(r)}>
              {r} stars
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 space-y-3">
        {filtered.length === 0 && <p className="text-sm text-muted-foreground">No feedback matches the filters.</p>}
        {filtered.map((f) => (
          <div key={f.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span>{"⭐".repeat(f.rating)}</span>
                <span className="rounded-full bg-accent px-2 py-0.5 text-xs">{f.category}</span>
                <span
                  className={
                    f.status === "resolved"
                      ? "rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-semibold text-green-500"
                      : f.status === "read"
                        ? "rounded-full bg-blue-500/15 px-2 py-0.5 text-xs font-semibold text-blue-500"
                        : "rounded-full bg-yellow-500/15 px-2 py-0.5 text-xs font-semibold text-yellow-500"
                  }
                >
                  {f.status}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">{new Date(f.createdAt).toLocaleString()}</span>
            </div>
            <p className="mt-2 text-sm">{f.message}</p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>{f.userName}</span>
              {f.userEmail && <span>· {f.userEmail}</span>}
              {f.pageUrl && <span className="truncate">· {f.pageUrl}</span>}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setStatus(f.id, "read")}
                className="rounded-md border border-border px-3 py-1 text-xs font-medium"
              >
                Mark read
              </button>
              <button
                onClick={() => setStatus(f.id, "resolved")}
                className="rounded-md border border-border px-3 py-1 text-xs font-medium"
              >
                Mark resolved
              </button>
              {f.userEmail && (
                <a
                  href={`mailto:${f.userEmail}?subject=Re: your Motio2Edit feedback`}
                  className="rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
                >
                  Reply
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/** Admin-controlled site popup: enable, edit copy and pick the audience. */
function PopupControl() {
  const load = useServerFn(getAdminPopup);
  const save = useServerFn(saveAdminPopup);
  const { data, refetch } = useQuery({ queryKey: ["admin-popup", "admin"], queryFn: () => load() });

  const [enabled, setEnabled] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [buttonText, setButtonText] = useState("");
  const [target, setTarget] = useState<PopupTarget>("all");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!data || hydrated) return;
    setEnabled(data.enabled);
    setTitle(data.title);
    setMessage(data.message);
    setButtonText(data.buttonText);
    setTarget(data.target);
    setHydrated(true);
  }, [data, hydrated]);

  const submit = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await save({ data: { enabled, title, message, buttonText, target } });
      setSaved(true);
      await refetch();
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mt-8 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Megaphone className="h-5 w-5 text-primary" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Popup control</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Shows a one-per-hour popup to matching users. Admin accounts never see it.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Popup enabled
        </label>
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value as PopupTarget)}
          className="rounded-lg border border-border bg-background p-2 text-sm"
        >
          <option value="all">All users</option>
          <option value="free">Free plan users</option>
          <option value="paid">Paid plan users</option>
          <option value="low_credits">Users with low credits (&lt; 25)</option>
        </select>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Popup title"
          maxLength={120}
          className="rounded-lg border border-border bg-background p-2 text-sm sm:col-span-2"
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Popup message"
          rows={3}
          maxLength={600}
          className="rounded-lg border border-border bg-background p-2 text-sm sm:col-span-2"
        />
        <input
          value={buttonText}
          onChange={(e) => setButtonText(e.target.value)}
          placeholder="Button text"
          maxLength={40}
          className="rounded-lg border border-border bg-background p-2 text-sm"
        />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={submit}
          disabled={saving || !title.trim() || !message.trim() || !buttonText.trim()}
          className="rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save popup"}
        </button>
        {saved && <span className="text-xs font-medium text-green-500">Saved</span>}
      </div>
    </section>
  );
}
