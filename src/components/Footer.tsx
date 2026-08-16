import { Link, useRouterState } from "@tanstack/react-router";
import { BrandMark, BRAND_NAME } from "@/components/BrandMark";

const LINKS: { label: string; to: string }[] = [
  { label: "FAQ", to: "/faq" },
  { label: "Support Center", to: "/support" },
  { label: "Tickets", to: "/tickets" },
  { label: "Security", to: "/security" },
  { label: "Contact", to: "/support" },
  { label: "Terms of Service", to: "/terms" },
  { label: "Privacy Policy", to: "/privacy" },
];

/**
 * Resource footer — intentionally limited to Profile / account surfaces
 * so it does not repeat on home, studios, editor, or other app screens.
 */
function shouldShowFooter(pathname: string): boolean {
  if (pathname.startsWith("/dashboard")) return true;
  if (pathname.startsWith("/settings")) return true;
  if (pathname.startsWith("/profile")) return true;
  // Public marketing / legal pages may still show a light footer
  if (
    pathname === "/" ||
    pathname.startsWith("/pricing") ||
    pathname.startsWith("/faq") ||
    pathname.startsWith("/support") ||
    pathname.startsWith("/security") ||
    pathname.startsWith("/terms") ||
    pathname.startsWith("/privacy") ||
    pathname.startsWith("/features") ||
    pathname.startsWith("/feedback")
  ) {
    // Signed-in home is "/" — parent should not pass Footer for signed-in.
    // When used as AppFooter with auth awareness, callers control inclusion.
    return true;
  }
  return false;
}

export function Footer({
  force,
  forceHide,
}: {
  /** Always show (e.g. profile page). */
  force?: boolean;
  /** Always hide (e.g. signed-in homepage). */
  forceHide?: boolean;
} = {}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (forceHide) return null;
  if (!force && !shouldShowFooter(pathname)) return null;

  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between">
        <Link to="/" className="flex items-center gap-2">
          <BrandMark size="md" />
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            by Motion2AI
          </span>
        </Link>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          {LINKS.map((l) => (
            <Link
              key={l.label}
              to={l.to}
              className="transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        Need help?{" "}
        <a href="mailto:support@motio2edit.com" className="hover:text-foreground">
          support@motio2edit.com
        </a>
        <span className="mx-2">·</span>
        © {new Date().getFullYear()} {BRAND_NAME} by Motion2AI. All rights reserved.
      </div>
    </footer>
  );
}

/** Profile / Settings only — account resource links. */
export function ProfileResourceFooter() {
  return <Footer force />;
}
