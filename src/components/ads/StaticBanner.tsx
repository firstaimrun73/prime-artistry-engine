import { useMemo } from "react";
import { useAppSettings } from "@/lib/site-settings";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { isAdRouteAllowed } from "@/config/ads";
import { useRouterState } from "@tanstack/react-router";

export type BannerSlot = {
  id: string;
  heading?: string;
  subline?: string;
  buttonText?: string;
  link_url?: string;
  active?: boolean;
};

type StaticBannerProps = {
  /** Placement key for toggles + click log (e.g. home-1, history-top, studio-image). */
  placement: string;
  /** Optional index to rotate banners so neighbouring slots differ. */
  slotIndex?: number;
  className?: string;
};

const HARD_OFF = new Set([
  "pricing",
  "billing",
  "checkout",
  "auth",
  "settings",
  "login",
  "signup",
]);

function isSafeHttps(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

function escapeText(s: string): string {
  return s.replace(/[<>&"']/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );
}

/**
 * In-page static banner. Never fixed/floating/overlay.
 * Orange dotted border, "Ad" chip, neutral copy, fixed height.
 * Free-plan signed-in non-admin only (admin only when adminPreview).
 */
export function StaticBanner({ placement, slotIndex = 0, className = "" }: StaticBannerProps) {
  const settings = useAppSettings();
  const { profile, user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const visible = useMemo(() => {
    const ads = (settings as any).ads ?? {};
    if (ads.enabled !== true) return false;
    if (!user || !profile) return false;

    const admin = isAdminEmail(profile.email);
    const plan = profile.plan ?? "free";
    const adminPreview = ads.adminPreview === true;

    // Hard-coded OFF placements
    const baseKey = placement.split("-")[0]?.toLowerCase() ?? placement;
    if (HARD_OFF.has(baseKey) || HARD_OFF.has(placement.toLowerCase())) return false;
    if (!isAdRouteAllowed(pathname)) return false;

    // Placement toggle: missing key defaults ON
    const placements = (ads.placements ?? {}) as Record<string, boolean>;
    if (placements[placement] === false || placements[baseKey] === false) return false;

    if (admin) return adminPreview;
    // Enforce free only regardless of DB target
    if (plan !== "free") return false;
    return true;
  }, [settings, profile, user, placement, pathname]);

  const banner = useMemo((): BannerSlot | null => {
    const ads = (settings as any).ads ?? {};
    const raw = ads.banners;
    let list: BannerSlot[] = [];
    if (Array.isArray(raw)) {
      list = raw;
    } else if (raw && typeof raw === "object") {
      list = Object.values(raw) as BannerSlot[];
    }
    const active = list.filter((b) => b && b.active !== false && b.id && isSafeHttps(String(b.link_url ?? "")));
    if (!active.length) return null;
    return active[Math.abs(slotIndex) % active.length] ?? null;
  }, [settings, slotIndex]);

  if (!visible || !banner) return null;

  const heading = escapeText(String(banner.heading || "Free offers just for you"));
  const subline = escapeText(String(banner.subline || "Tap to explore"));
  const buttonText = escapeText(String(banner.buttonText || "Explore"));
  const href = `/api/public/ad-click?b=${encodeURIComponent(banner.id)}&p=${encodeURIComponent(placement)}`;

  const admin = isAdminEmail(profile?.email);
  const showPreviewNote = admin && (settings as any).ads?.adminPreview === true;

  return (
    <aside
      className={`ad-static relative mx-auto my-6 w-full max-w-3xl overflow-hidden rounded-xl ${className}`}
      style={{
        border: "2px dotted #FF5A1F",
        minHeight: 88,
        height: 96,
        background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 55%, #1e40af 100%)",
      }}
      aria-label="Advertisement"
      data-placement={placement}
      data-banner={banner.id}
    >
      <span
        className="absolute left-2 top-2 rounded px-1.5 py-0.5 text-[12px] font-bold leading-none"
        style={{ background: "#FF5A1F", color: "#fff", minHeight: 18 }}
      >
        Ad
      </span>
      {showPreviewNote && (
        <span className="absolute right-2 top-2 text-[10px] text-amber-200/90">
          Admin preview. Free users see this banner.
        </span>
      )}
      <div className="flex h-full items-center justify-between gap-3 px-4 pl-12 pr-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{heading}</p>
          <p className="truncate text-xs text-slate-300">{subline}</p>
        </div>
        <a
          href={href}
          target="_blank"
          rel="sponsored noopener noreferrer"
          className="inline-flex shrink-0 items-center justify-center rounded-lg px-4 text-sm font-bold text-white transition hover:opacity-90"
          style={{
            background: "#FF5A1F",
            minHeight: 44,
            minWidth: 96,
          }}
        >
          {buttonText}
        </a>
      </div>
    </aside>
  );
}
