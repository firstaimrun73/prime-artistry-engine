import { createFileRoute, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/Header";
import { AppSidebar } from "@/components/AppSidebar";
import { AdminPopupModal } from "@/components/AdminPopupModal";
import { FirstGenerationFeedback } from "@/components/FirstGenerationFeedback";
import { FreePlanNotices } from "@/components/FreePlanNotices";
import { MusicAccessGate } from "@/components/MusicAccessGate";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { loading, user } = useAuth();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.navigate({ to: "/auth", search: { redirect: window.location.pathname } });
      } else {
        setChecked(true);
      }
    }
  }, [loading, user, router]);

  if (loading || !checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const isMusicRoute = pathname === "/music" || pathname.startsWith("/music/");

  const main = isMusicRoute ? (
    <MusicAccessGate>
      <Outlet />
    </MusicAccessGate>
  ) : (
    <Outlet />
  );

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <div className="md:pl-56">
        <div className="md:hidden">
          <Header />
        </div>
        {main}
        <AdminPopupModal />
        <FirstGenerationFeedback />
        <FreePlanNotices />
      </div>
    </div>
  );
}
