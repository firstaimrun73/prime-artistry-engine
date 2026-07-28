export const ADS_CONFIG = {
  publisherId: "ca-pub-7901147042865442",
  enabled: true,
  placements: {
    topBanner: true,
    leftSidebar: true,
    rightSidebar: true,
    inContent: true,
    footer: true,
  },
  excludedRoutes: [
    "/editor",
    "/studio/image",
    "/studio/video",
    "/studio/music",
    "/login",
    "/auth",
    "/checkout",
    "/payment-success",
    "/payment-failed",
  ],
} as const;

export function isAdRouteAllowed(pathname: string): boolean {
  if (!ADS_CONFIG.enabled) return false;
  return !ADS_CONFIG.excludedRoutes.some((r) => pathname.startsWith(r));
}

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}
