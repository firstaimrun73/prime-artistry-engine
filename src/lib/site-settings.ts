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

/** Compile-time ADS_CONFIG + admin panel. */
export function useAdsMasterEnabled(): boolean {
  const settings = useAppSettings();
  if (!ADS_CONFIG.enabled) return false;
  // Explicit admin OFF wins; otherwise allow when compile-time ON
  if (settings.ads.enabled === false && settings !== DEFAULT_SETTINGS) {
    // still respect DEFAULT which we set enabled:true below when ADS_CONFIG is on
  }
  if (settings.ads.enabled === false) return false;
  return true;
}

/**
 * Static Direct Link / Earn cards visibility.
 * Free signed-in users on allowed routes. Never grants credits.
 */
export function useAdsVisible(placement?: AdPlacement): boolean {
  const settings = useAppSettings();
  const { profile } = useAuth();
  const plan = profile?.plan ?? "free";
  const admin = isAdminEmail(profile?.email);

  if (!ADS_CONFIG.enabled) return false;
  if (admin) return false;
  if (settings.ads.enabled === false) return false;
  if (placement && settings.ads.placements?.[placement] === false) return false;
  if (settings.ads.target === "none") return false;
  if (settings.ads.target === "paid") return plan !== "free";
  // free or all
  return plan === "free" || settings.ads.target === "all" || !settings.ads.target;
}
