import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { Dashboard } from "./_authenticated.dashboard";

/**
 * Profile page. Mobile bottom-nav and the header avatar target /profile.
 * The existing Profile UI is the Dashboard component at /dashboard.
 * /profile/subscription remains a child (Outlet) so it is not overwritten.
 */
export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfileLayout,
  head: () => ({
    meta: [
      { title: "Profile — Motio2edit" },
      { name: "description", content: "Your Motio2edit profile, credits, and recent generations." },
    ],
  }),
});

function ProfileLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isChild = pathname.startsWith("/profile/");
  if (isChild) return <Outlet />;
  return <Dashboard />;
}
