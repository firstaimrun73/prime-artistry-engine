// Admin dashboard stats — privileged server function.
//
// Gated to the sole admin firstaimrun89@gmail.com. Uses the service-role client (loaded
// inside the handler) to aggregate platform-wide data the normal RLS policies
// would otherwise hide. Returns plain DTOs only.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AdminPurchase = {
  transactionId: string;
  name: string;
  email: string;
  plan: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  createdAt: string;
};

export type AdminStats = {
  isAdmin: boolean;
  realtime: {
    onlineNow: number;
    signupsToday: number;
    revenueTodayInr: number;
    revenueAllTimeInr: number;
    activeSubscriptions: number;
  };
  users: {
    total: number;
    free: number;
    paid: number;
    byCountry: { country: string; count: number }[];
  };
  storage: {
    images: number;
    videos: number;
    usedGb: number;
    perUser: { email: string; count: number }[];
  };
  purchases: AdminPurchase[];
  charts: {
    revenueDaily: { date: string; amount: number }[];
    signupsDaily: { date: string; count: number }[];
    popularPlans: { plan: string; count: number }[];
  };
};

function dayKey(d: string | Date) {
  return new Date(d).toISOString().slice(0, 10);
}

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminStats> => {
    const callerEmail = String(context.claims?.email ?? "").trim().toLowerCase();
    const empty: AdminStats = {
      isAdmin: false,
      realtime: { onlineNow: 0, signupsToday: 0, revenueTodayInr: 0, revenueAllTimeInr: 0, activeSubscriptions: 0 },
      users: { total: 0, free: 0, paid: 0, byCountry: [] },
      storage: { images: 0, videos: 0, usedGb: 0, perUser: [] },
      purchases: [],
      charts: { revenueDaily: [], signupsDaily: [], popularPlans: [] },
    };

    // Sole admin only — firstaimrun89@gmail.com
    if (callerEmail !== "firstaimrun89@gmail.com") return empty;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [profilesRes, paymentsRes, subsRes, gensRes] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, email, display_name, plan, created_at"),
      supabaseAdmin
        .from("payment_transactions")
        .select("transaction_id, user_id, payment_method, amount, currency, payment_status, created_at")
        .order("created_at", { ascending: false }),
      supabaseAdmin.from("subscriptions").select("status, plan"),
      supabaseAdmin.from("generations").select("user_id, type, created_at"),
    ]);

    const profiles = profilesRes.data ?? [];
    const payments = paymentsRes.data ?? [];
    const subs = subsRes.data ?? [];
    const gens = gensRes.data ?? [];

    const profileById = new Map(profiles.map((p) => [p.id, p]));
    const today = dayKey(new Date());

    const total = profiles.length;
    const free = profiles.filter((p) => (p.plan ?? "free") === "free").length;
    const paid = total - free;

    const completed = payments.filter((p) => p.payment_status === "completed");
    const toInr = (amt: number, cur: string) =>
      cur?.toUpperCase() === "INR" ? amt : Math.round(amt * 85);
    const revenueAllTimeInr = completed.reduce((s, p) => s + toInr(Number(p.amount) || 0, p.currency), 0);
    const revenueTodayInr = completed
      .filter((p) => dayKey(p.created_at) === today)
      .reduce((s, p) => s + toInr(Number(p.amount) || 0, p.currency), 0);

    const signupsToday = profiles.filter((p) => dayKey(p.created_at) === today).length;
    const activeSubscriptions = subs.filter((s) => s.status === "active").length;

    const images = gens.filter((g) => g.type === "image").length;
    const videos = gens.filter((g) => g.type === "video").length;
    const usedGb = Math.round(((images * 2.5 + videos * 12) / 1024) * 100) / 100;
    const perUserMap = new Map();
    for (const g of gens) perUserMap.set(g.user_id, (perUserMap.get(g.user_id) ?? 0) + 1);
    const perUser = [...perUserMap.entries()]
      .map(([uid, count]) => ({ email: profileById.get(uid)?.email ?? "unknown", count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const purchases = payments.slice(0, 200).map((p) => {
      const prof = profileById.get(p.user_id);
      return {
        transactionId: p.transaction_id ?? "—",
        name: prof?.display_name ?? "—",
        email: prof?.email ?? "—",
        plan: prof?.plan ?? "—",
        amount: Number(p.amount) || 0,
        currency: p.currency ?? "INR",
        method: p.payment_method ?? "—",
        status: p.payment_status ?? "—",
        createdAt: p.created_at,
      };
    });

    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(dayKey(d));
    }
    const revByDay = new Map(days.map((d) => [d, 0]));
    for (const p of completed) {
      const k = dayKey(p.created_at);
      if (revByDay.has(k)) revByDay.set(k, revByDay.get(k) + toInr(Number(p.amount) || 0, p.currency));
    }
    const signByDay = new Map(days.map((d) => [d, 0]));
    for (const p of profiles) {
      const k = dayKey(p.created_at);
      if (signByDay.has(k)) signByDay.set(k, signByDay.get(k) + 1);
    }
    const planCountMap = new Map();
    for (const p of profiles) planCountMap.set(p.plan ?? "free", (planCountMap.get(p.plan ?? "free") ?? 0) + 1);

    return {
      isAdmin: true,
      realtime: {
        onlineNow: 0,
        signupsToday,
        revenueTodayInr,
        revenueAllTimeInr,
        activeSubscriptions,
      },
      users: { total, free, paid, byCountry: [] },
      storage: { images, videos, usedGb, perUser },
      purchases,
      charts: {
        revenueDaily: days.map((d) => ({ date: d.slice(5), amount: revByDay.get(d) ?? 0 })),
        signupsDaily: days.map((d) => ({ date: d.slice(5), count: signByDay.get(d) ?? 0 })),
        popularPlans: [...planCountMap.entries()].map(([plan, count]) => ({ plan, count })),
      },
    };
  });
