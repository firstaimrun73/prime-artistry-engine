/** Routes where the global mobile bottom tab bar must be hidden. */
export function hideBottomNav(pathname: string): boolean {
  if (pathname.startsWith("/editor")) return true;
  if (pathname.startsWith("/studio/video")) return true;
  if (pathname === "/music" || pathname.startsWith("/music/")) return true;
  if (pathname.startsWith("/studio/music")) return true;
  if (pathname.startsWith("/studio/image/circle-remove")) return true;
  if (pathname.startsWith("/studio/image/circle-info")) return true;
  if (pathname.startsWith("/studio/image/circle-add-discover")) return true;
  if (pathname.startsWith("/studio/image/auto-edit")) return true;
  // Dedicated filter/lens editor surfaces — never cover intensity/Apply controls
  if (pathname.startsWith("/studio/image/filters")) return true;
  if (pathname.startsWith("/studio/image/lenses")) return true;
  if (pathname.startsWith("/studio/image/filter-editor")) return true;
  if (pathname.startsWith("/studio/image/lens-editor")) return true;
  if (pathname.startsWith("/studio/image/age")) return true;
  // About Product — editorial page; hide app bottom nav on mobile (Part 6)
  if (pathname === "/about" || pathname.startsWith("/about/")) return true;
  return false;
}
