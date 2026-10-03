// Admin control panel — privileged server functions.
//
// Every function here is locked to the sole admin (firstaimrun89@gmail.com)
// through assertAdmin(), which also writes an audit row to admin_access_log.
// Public/read-only settings used by the pricing page and ad components live
// in getPublicSettings(), which is intentionally unauthenticated-safe.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const PLAN_IDS = ["free", "lite", "plus", "pro", "studio", "business"] as const;
export type ManagedPlanId = (typeof PLAN_IDS)[number];

export const AD_TARGETS = ["all", "free", "paid", "none"] as const;
export type AdTarget = (typeof AD_TARGETS)[number];

export const AD_PLACEMENTS = ["home", "history", "features", "faq", "profile", "about"] as const;
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
 * NOTE: static Free-only banners default ON so Free users see them;
 * Admin can still disable via app_settings.
 */
export const DEFAULT_SETTINGS: AppSettings = {
  planVisibility: { free: true, lite: true, plus: true, pro: true, studio: true, business: true },
  ads: {
    // Static Free-only banners ON by default; Admin can still disable.
    enabled: true,
    target: "free",
    placements: { home: true, history: true, features: true, faq: true, profile: true, about: true },
  },
};
