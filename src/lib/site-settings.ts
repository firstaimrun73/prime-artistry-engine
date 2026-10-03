// Reads the admin-controlled site settings (plan visibility + ad control)
// and exposes small hooks for the public pages.

import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { isPaidPlan } from "@/lib/policy";
import { ADS_CONFIG, isAdRouteAllowed } from "@/config/ads";
import {
  DEFAULT_SETTINGS,
  getPublicSettings,
  type AdPlacement,
  type AppSettings,
  type ManagedPlanId,
} from "@/lib/admin-control.functions";

export function useAppSettings(): AppSettings {
  const load = useServerFn(getPublicSettings);
  const { data } = useQuery({
    queryKey: ["app-settings"],
    queryFn: () => load(),
    staleTime: 30_000,
  });
  return data ?? DEFAULT_SETTINGS;
}

export function usePlanVisible(): (plan: string) => boolean {
  const settings = useAppSettings();
  return (plan: string) => settings.planVisibility[plan as ManagedPlanId] !== false;
}

/** Admin master switch + compile-time kill switch. */
export function useAdsMasterEnabled(): boolean {
  const settings = useAppSettings();
  return ADS_CONFIG.enabled && settings.ads.enabled === true;
}

/**
 * True when static banners may render for the current user on the given placement.
 * HARD RULE: Free plan only. Paid plans + Admin never see ads.
 * Admin master switch + per-placement toggles still apply.
 */
export function useAdsVisible(placement?: AdPlacement): boolean {
  const settings = useAppSettings();
  const { profile } = useAuth();
  const plan = profile?.plan ?? "free";
  const admin = isAdminEmail(profile?.email);

  if (!ADS_CONFIG.enabled) return false;
  if (settings.ads.enabled !== true) return false;
  if (admin) return false;
  // Paid plans never see ads regardless of admin target setting
  if (isPaidPlan(plan)) return false;
  if (plan !== "free") return false;
  if (settings.ads.target === "none") return false;
  // Even if target is "paid" or "all", product rule is Free-only for banners
  if (settings.ads.target === "paid") return false;
  if (placement && settings.ads.placements[placement] === false) return false;
  if (typeof window !== "undefined" && !isAdRouteAllowed(window.location.pathname)) {
    return false;
  }
  return true;
}
