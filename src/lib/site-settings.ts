// Reads the admin-controlled site settings (plan visibility + ad control)
// and exposes small hooks for the public pages.

import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { ADS_CONFIG } from "@/config/ads";
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
  // If compile-time ADS_CONFIG.enabled, treat missing admin flag as ON (user enabled ads).
  if (!ADS_CONFIG.enabled) return false;
  if (settings.ads.enabled === false) return false;
  return true;
}

/**
 * True when ads should render for the current user on the given placement.
 * Placement is optional — omit to check global enablement + audience only.
 */
export function useAdsVisible(placement?: AdPlacement): boolean {
  const settings = useAppSettings();
  const { profile } = useAuth();
  const plan = profile?.plan ?? "free";
  const admin = isAdminEmail(profile?.email);

  if (!ADS_CONFIG.enabled) return false;
  if (admin) return false;
  // Admin panel can force off; undefined/true = allow when ADS_CONFIG.enabled
  if (settings.ads.enabled === false) return false;
  if (placement && settings.ads.placements?.[placement] === false) return false;
  if (settings.ads.target === "none") return false;
  if (settings.ads.target === "paid") return plan !== "free";
  // default + "free": free plan only
  return plan === "free" || settings.ads.target === "all";
}
