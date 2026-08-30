// First-party page-view tracking + admin traffic aggregates.
// Writes are lightweight; reads are admin-only via service role.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SKIP_PREFIXES = ["/api", "/admin", "/lovable"];

export function shouldTrackPath(pathname: string): boolean {
  if (!pathname || pathname.startsWith("/api")) return false;
  if (pathname.startsWith("/admin")) return false;
  if (pathname.startsWith("/lovable")) return false;
  for (const p of SKIP_PREFIXES) {
    if (pathname === p || pathname.startsWith(p + "/")) return false;
  }
  return true;
}

export type TrafficPeriodStats = {
  uniqueVisitors: number;
  pageViews: number;
};

export type TrafficDailyPoint = {
  date: string;
  visitors: number;
  pageViews: number;
};

export type TrafficDashboard = {
  isAdmin: boolean;
  hasData: boolean;
  today: TrafficPeriodStats;
  last7: TrafficPeriodStats;
  last30: TrafficPeriodStats;
  total: TrafficPeriodStats;
  daily: TrafficDailyPoint[];
};

function emptyStats(): TrafficPeriodStats {
  return { uniqueVisitors: 0, pageViews: 0 };
}

function emptyDashboard(isAdmin: boolean): TrafficDashboard {
  return {
    isAdmin,
    hasData: false,
    today: emptyStats(),
    last7: emptyStats(),
    last30: emptyStats(),
    total: emptyStats(),
    daily: [],
  };
}

function dayKey(d: Date | string): string {
  return new Date(d).toISOString().slice(0, 10);
}

/** Public: record one page view. No auth required. Fail-soft. */
export const recordPageView = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        sessionId: z.string().min(8).max(64),
        pathname: z.string().min(1).max(500),
        referrer: z.string().max(1000).optional().nullable(),
        deviceClass: z.enum(["mobile", "tablet", "desktop", "unknown"]).optional().nullable(),
        userId: z.string().uuid().optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    if (!shouldTrackPath(data.pathname)) return { ok: true, skipped: true as const };
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
      const client = createClient(process.env.SUPABASE_URL!, key, {
        auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        global: {
          fetch: (input: RequestInfo | URL, init?: RequestInit) => {
            const h = new Headers(init?.headers);
            if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
            h.set("apikey", key);
            return fetch(input, { ...init, headers: h });
          },
        },
      });
      const { error } = await (client as any).from("page_views").insert({
        session_id: data.sessionId,
        user_id: data.userId ?? null,
        pathname: data.pathname.slice(0, 500),
        referrer: data.referrer ? data.referrer.slice(0, 1000) : null,
        device_class: data.deviceClass ?? null,
      });
      if (error) {
        console.warn("[traffic] insert failed:", error.message ?? error);
        return { ok: false as const, error: error.message };
      }
      return { ok: true as const };
    } catch (err) {
      console.warn("[traffic] record failed:", err);
      return { ok: false as const };
    }
  });

function aggregate(
  rows: { session_id: string; created_at: string }[],
  sinceIso: string | null,
): TrafficPeriodStats {
  const filtered = sinceIso ? rows.filter((r) => r.created_at >= sinceIso) : rows;
  const sessions = new Set(filtered.map((r) => r.session_id));
  return { uniqueVisitors: sessions.size, pageViews: filtered.length };
}

/** Admin-only traffic dashboard. Real counts only — never fabricated. */
export const getTrafficStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TrafficDashboard> => {
    const { isAdminClaims } = await import("./admin-guard.server");
    if (!isAdminClaims(context.claims)) return emptyDashboard(false);

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const since40 = new Date();
      since40.setUTCDate(since40.getUTCDate() - 40);
      const { data, error } = await (supabaseAdmin as any)
        .from("page_views")
        .select("session_id, created_at")
        .gte("created_at", since40.toISOString())
        .order("created_at", { ascending: true })
        .limit(100_000);

      if (error) {
        console.error("[traffic] aggregate error:", error.message ?? error);
        return emptyDashboard(true);
      }

      const rows: { session_id: string; created_at: string }[] = data ?? [];
      if (!rows.length) {
        const { count } = await (supabaseAdmin as any)
          .from("page_views")
          .select("id", { count: "exact", head: true });
        if (!count) return emptyDashboard(true);
      }

      const now = new Date();
      const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const d7 = new Date(todayStart);
      d7.setUTCDate(d7.getUTCDate() - 6);
      const d30 = new Date(todayStart);
      d30.setUTCDate(d30.getUTCDate() - 29);

      let totalPageViews = rows.length;
      let totalVisitors = new Set(rows.map((r) => r.session_id)).size;
      try {
        const { count: allCount } = await (supabaseAdmin as any)
          .from("page_views")
          .select("id", { count: "exact", head: true });
        if (typeof allCount === "number" && allCount > totalPageViews) {
          totalPageViews = allCount;
        }
      } catch {
        /* ignore */
      }

      const days: string[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(todayStart);
        d.setUTCDate(d.getUTCDate() - i);
        days.push(dayKey(d));
      }
      const byDayViews = new Map(days.map((d) => [d, 0]));
      const byDaySessions = new Map(days.map((d) => [d, new Set<string>()]));
      for (const r of rows) {
        const k = dayKey(r.created_at);
        if (byDayViews.has(k)) {
          byDayViews.set(k, (byDayViews.get(k) ?? 0) + 1);
          byDaySessions.get(k)!.add(r.session_id);
        }
      }

      const hasData = rows.length > 0 || totalPageViews > 0;

      return {
        isAdmin: true,
        hasData,
        today: aggregate(rows, todayStart.toISOString()),
        last7: aggregate(rows, d7.toISOString()),
        last30: aggregate(rows, d30.toISOString()),
        total: { uniqueVisitors: totalVisitors, pageViews: totalPageViews },
        daily: days.map((d) => ({
          date: d.slice(5),
          visitors: byDaySessions.get(d)?.size ?? 0,
          pageViews: byDayViews.get(d) ?? 0,
        })),
      };
    } catch (err) {
      console.error("[traffic] getTrafficStats failed:", err);
      return emptyDashboard(true);
    }
  });
