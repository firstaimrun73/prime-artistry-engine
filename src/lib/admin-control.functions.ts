// Admin control panel — privileged server functions.
//
// Every function here is locked to the ADMIN_EMAIL account through
// assertAdmin(), which also writes an audit row to admin_access_log.
// Public/read-only settings used by the pricing page and ad components live
// in getPublicSettings(), which is intentionally unauthenticated-safe.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const PLAN_IDS = ["free", "lite", "plus", "pro", "studio", "business"] as const;
export type ManagedPlanId = (typeof PLAN_IDS)[number];

export const AD_TARGETS = ["all", "free", "paid", "none"] as const;
export type AdTarget = (typeof AD_TARGETS)[number];

export const AD_PLACEMENTS = ["home", "history", "features", "pricing"] as const;
export type AdPlacement = (typeof AD_PLACEMENTS)[number];

export const BROADCAST_TARGETS = ["all", "free", "paid", ...PLAN_IDS] as const;
export const BROADCAST_KINDS = ["info", "warning", "offer", "feature"] as const;

export type PlanVisibility = Record<ManagedPlanId, boolean>;
export type AdSettings = {
  enabled: boolean;
  target: AdTarget;
  placements: Record<AdPlacement, boolean>;
};
export type AppSettings = { planVisibility: PlanVisibility; ads: AdSettings };

/**
 * Fail-closed defaults: if app_settings is missing or unreadable,
 * ads stay OFF until Admin successfully persists a row.
 * (Previously enabled:true caused ads to keep showing when the table was absent.)
 */
export const DEFAULT_SETTINGS: AppSettings = {
  planVisibility: { free: true, lite: true, plus: true, pro: true, studio: true, business: true },
  ads: {
    enabled: false,
    target: "all",
    placements: { home: true, history: true, features: true, pricing: true },
  },
};

function normalizeSettings(row: { plan_visibility?: unknown; ad_settings?: unknown } | null): AppSettings {
  if (!row) return DEFAULT_SETTINGS;
  const pv = (row.plan_visibility ?? {}) as Partial<PlanVisibility>;
  const ad = (row.ad_settings ?? {}) as Partial<AdSettings>;
  const placements = (ad.placements ?? {}) as Partial<Record<AdPlacement, boolean>>;
  return {
    planVisibility: Object.fromEntries(
      PLAN_IDS.map((p) => [p, pv[p] !== false]),
    ) as PlanVisibility,
    ads: {
      // Explicit boolean: only true when stored value is exactly true
      enabled: ad.enabled === true,
      target: (AD_TARGETS as readonly string[]).includes(String(ad.target)) ? (ad.target as AdTarget) : "all",
      placements: Object.fromEntries(
        AD_PLACEMENTS.map((p) => [p, placements[p] !== false]),
      ) as Record<AdPlacement, boolean>,
    },
  };
}

/** Public: pricing page + ad components read this. No auth required. */
export const getPublicSettings = createServerFn({ method: "GET" }).handler(async (): Promise<AppSettings> => {
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
    const { data, error } = await (client as any)
      .from("app_settings")
      .select("plan_visibility, ad_settings")
      .eq("id", 1)
      .maybeSingle();
    if (error) {
      console.error("[settings] app_settings read error (fail-closed ads OFF):", error.message ?? error);
      return DEFAULT_SETTINGS;
    }
    if (!data) {
      console.warn("[settings] app_settings row id=1 missing — ads OFF until Admin saves");
      return DEFAULT_SETTINGS;
    }
    return normalizeSettings(data);
  } catch (err) {
    console.error("[settings] read failed, fail-closed ads OFF:", err);
    return DEFAULT_SETTINGS;
  }
});

export const saveAppSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        planVisibility: z.record(z.enum(PLAN_IDS), z.boolean()),
        ads: z.object({
          enabled: z.boolean(),
          target: z.enum(AD_TARGETS),
          placements: z.record(z.enum(AD_PLACEMENTS), z.boolean()),
        }),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("./admin-guard.server");
    await assertAdmin(context.claims, "/admin/settings");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Upsert so first save works even if the singleton row was never inserted.
    const { error } = await (supabaseAdmin as any)
      .from("app_settings")
      .upsert(
        {
          id: 1,
          plan_visibility: data.planVisibility,
          ad_settings: data.ads,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );
    if (error) {
      throw new Error(
        error.message?.includes("schema cache") || error.code === "PGRST205"
          ? "app_settings table is missing in the database. Apply the Supabase migration for public.app_settings, then save again."
          : error.message,
      );
    }
    return { ok: true };
  });

// ── User management ─────────────────────────────────────────────────────────

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  plan: string;
  credits: number;
  blocked: boolean;
  joinedAt: string;
  lastActiveAt: string | null;
  generations: number;
};

export const listAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ isAdmin: boolean; users: AdminUser[] }> => {
    const { isAdminClaims } = await import("./admin-guard.server");
    if (!isAdminClaims(context.claims)) return { isAdmin: false, users: [] };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const [profilesRes, gensRes] = await Promise.all([
      db
        .from("profiles")
        .select("id, email, display_name, plan, credits, blocked, created_at, updated_at")
        .order("created_at", { ascending: false })
        .limit(500),
      db.from("generations").select("user_id, created_at"),
    ]);

    const counts = new Map<string, number>();
    const lastSeen = new Map<string, string>();
    for (const g of gensRes.data ?? []) {
      counts.set(g.user_id, (counts.get(g.user_id) ?? 0) + 1);
      const prev = lastSeen.get(g.user_id);
      if (!prev || g.created_at > prev) lastSeen.set(g.user_id, g.created_at);
    }

    return {
      isAdmin: true,
      users: (profilesRes.data ?? []).map((p: any) => ({
        id: p.id,
        email: p.email ?? "—",
        name: p.display_name ?? "—",
        plan: p.plan ?? "free",
        credits: p.credits ?? 0,
        blocked: !!p.blocked,
        joinedAt: p.created_at,
        lastActiveAt: lastSeen.get(p.id) ?? p.updated_at ?? null,
        generations: counts.get(p.id) ?? 0,
      })),
    };
  });

export const CREDIT_REASONS = [
  "Manual top-up",
  "Support compensation",
  "Promotion / gift",
  "Failed generation refund",
  "Correction",
] as const;

export const adminAdjustCredits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        amount: z.number().int().min(-100000).max(100000),
        reason: z.string().trim().min(1).max(120),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("./admin-guard.server");
    await assertAdmin(context.claims, "/admin/users/credits");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    const { data: profile, error: pErr } = await db
      .from("profiles")
      .select("credits")
      .eq("id", data.userId)
      .single();
    if (pErr || !profile) throw new Error("User not found.");

    const next = Math.max(0, (profile.credits ?? 0) + data.amount);
    const { error } = await db
      .from("profiles")
      .update({ credits: next, updated_at: new Date().toISOString() })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);

    await db.from("credit_audit_log").insert({
      user_id: data.userId,
      transaction_id: `ADMIN-${Date.now()}-${data.userId.slice(0, 8)}`,
      payment_method: "admin",
      credits_added: data.amount,
      reason: data.reason,
    });

    return { ok: true, credits: next };
  });

export const adminChangePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ userId: z.string().uuid(), plan: z.enum(PLAN_IDS) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("./admin-guard.server");
    await assertAdmin(context.claims, "/admin/users/plan");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any)
      .from("profiles")
      .update({ plan: data.plan, updated_at: new Date().toISOString() })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminSetBlocked = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid(), blocked: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("./admin-guard.server");
    await assertAdmin(context.claims, "/admin/users/block");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any)
      .from("profiles")
      .update({ blocked: data.blocked })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("./admin-guard.server");
    await assertAdmin(context.claims, "/admin/users/delete");
    if (data.userId === context.userId) throw new Error("You cannot delete your own admin account.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type AdminUserHistoryItem = {
  id: string;
  type: string;
  prompt: string | null;
  outputUrl: string | null;
  status: string;
  createdAt: string;
};

export const adminUserHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<AdminUserHistoryItem[]> => {
    const { isAdminClaims } = await import("./admin-guard.server");
    if (!isAdminClaims(context.claims)) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await (supabaseAdmin as any)
      .from("generations")
      .select("id, type, prompt, output_url, status, created_at")
      .eq("user_id", data.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    return (rows ?? []).map((r: any) => ({
      id: r.id,
      type: r.type,
      prompt: r.prompt,
      outputUrl: r.output_url,
      status: r.status,
      createdAt: r.created_at,
    }));
  });

// ── Broadcasts ──────────────────────────────────────────────────────────────

export type Broadcast = {
  id: string;
  title: string;
  message: string;
  target: string;
  kind: string;
  active: boolean;
  createdAt: string;
};

export const sendBroadcast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        title: z.string().trim().min(1).max(120),
        message: z.string().trim().min(1).max(1500),
        target: z.enum(BROADCAST_TARGETS),
        kind: z.enum(BROADCAST_KINDS),
        alsoEmail: z.boolean().default(false),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("./admin-guard.server");
    await assertAdmin(context.claims, "/admin/broadcast");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    const { error } = await db.from("broadcasts").insert({
      title: data.title,
      message: data.message,
      target: data.target,
      kind: data.kind,
      active: true,
    });
    if (error) throw new Error(error.message);

    let emailed = 0;
    if (data.alsoEmail) {
      const { data: profiles } = await db.from("profiles").select("email, plan");
      const recipients = (profiles ?? [])
        .filter((p: any) => {
          const plan = p.plan ?? "free";
          if (data.target === "all") return true;
          if (data.target === "free") return plan === "free";
          if (data.target === "paid") return plan !== "free";
          return plan === data.target;
        })
        .map((p: any) => p.email)
        .filter(Boolean);

      const key = process.env.RESEND_API_KEY;
      const from = process.env.SUPPORT_EMAIL || "onboarding@resend.dev";
      if (key && recipients.length) {
        for (const to of recipients.slice(0, 200)) {
          try {
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                from: `MOTIO2EDIT <${from}>`,
                to,
                subject: data.title,
                html: `<div style="font-family:system-ui,sans-serif"><h2>${data.title}</h2><p style="white-space:pre-wrap">${data.message}</p><p style="color:#888;font-size:12px">— MOTIO2EDIT by Motion2AI</p></div>`,
              }),
            });
            emailed++;
          } catch (err) {
            console.error("[broadcast] email failed for a recipient:", err);
          }
        }
      }
    }

    return { ok: true, emailed };
  });

export const listBroadcastsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Broadcast[]> => {
    const { isAdminClaims } = await import("./admin-guard.server");
    if (!isAdminClaims(context.claims)) return [];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any)
      .from("broadcasts")
      .select("id, title, message, target, kind, active, created_at")
      .order("created_at", { ascending: false })
      .limit(30);
    return (data ?? []).map((b: any) => ({
      id: b.id,
      title: b.title,
      message: b.message,
      target: b.target,
      kind: b.kind,
      active: b.active,
      createdAt: b.created_at,
    }));
  });

export const setBroadcastActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("./admin-guard.server");
    await assertAdmin(context.claims, "/admin/broadcast/toggle");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any)
      .from("broadcasts")
      .update({ active: data.active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Signed-in users read the broadcasts that apply to them (RLS: active only). */
export const listMyBroadcasts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Broadcast[]> => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("plan")
      .eq("id", context.userId)
      .maybeSingle();
    const plan = profile?.plan ?? "free";
    const { data } = await (context.supabase as any)
      .from("broadcasts")
      .select("id, title, message, target, kind, active, created_at")
      .order("created_at", { ascending: false })
      .limit(10);
    return (data ?? [])
      .filter((b: any) => {
        if (b.target === "all") return true;
        if (b.target === "free") return plan === "free";
        if (b.target === "paid") return plan !== "free";
        return b.target === plan;
      })
      .map((b: any) => ({
        id: b.id,
        title: b.title,
        message: b.message,
        target: b.target,
        kind: b.kind,
        active: b.active,
        createdAt: b.created_at,
      }));
  });
