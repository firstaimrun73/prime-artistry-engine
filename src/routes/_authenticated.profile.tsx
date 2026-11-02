import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { ProfilePage } from "@/components/dashboard/ProfilePage";

/**
 * Profile route — account management only.
 * Child routes (e.g. /profile/subscription) render via Outlet.
 * Dashboard is a separate route; do not reuse it here.
 */
export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfileLayout,
  head: () => ({
    meta: [
      { title: "Profile — Motio2edit" },
      {
        name: "description",
        content: "Your Motio2edit account, avatar, credits, and settings.",
      },
    ],
  }),
});

function ProfileLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isChild = pathname.startsWith("/profile/") && pathname !== "/profile";
  if (isChild) return <Outlet />;
  return <ProfilePage />;
}
