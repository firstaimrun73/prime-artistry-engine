/** Routes where the global mobile bottom tab bar must be hidden. Top Header is unrelated. */
export function hideBottomNav(pathname: string): boolean {
  if (pathname.startsWith("/editor")) return true;
  if (pathname.startsWith("/studio/video")) return true;
  if (pathname.startsWith("/studio/frames")) return true;
  if (pathname.startsWith("/studio/cropmix")) return true;
  if (pathname === "/music" || pathname.startsWith("/music/")) return true;
  if (pathname.startsWith("/studio/music")) return true;
  if (pathname.startsWith("/studio/image/circle-remove")) return true;
  if (pathname.startsWith("/studio/image/circle-info")) return true;
  if (pathname.startsWith("/studio/image/circle-add-discover")) return true;
  if (pathname.startsWith("/studio/image/auto-edit")) return true;
  if (pathname.startsWith("/studio/image/remove-bg")) return true;
  if (pathname.startsWith("/studio/image/filters")) return true;
  if (pathname.startsWith("/studio/image/filter-editor")) return true;
  if (pathname.startsWith("/studio/image/age")) return true;
  if (pathname === "/about" || pathname.startsWith("/about/")) return true;
  if (pathname.startsWith("/sample/")) return true;
  // Dedicated surfaces: keep TOP HEADER, hide BOTTOM tab bar only
  if (pathname === "/pricing" || pathname.startsWith("/pricing/")) return true;
  if (pathname.startsWith("/profile/subscription")) return true;
  if (pathname.startsWith("/profile/billing")) return true;
  if (pathname === "/chat" || pathname.startsWith("/chat/")) return true;
  if (pathname.startsWith("/checkout")) return true;
  if (pathname.startsWith("/pay")) return true;
  return false;
}
