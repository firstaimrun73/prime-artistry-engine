import { createFileRoute, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/Header";
import { AdminPopupModal } from "@/components/AdminPopupModal";
import { FirstGenerationFeedback } from "@/components/FirstGenerationFeedback";
import { FreePlanNotices } from "@/components/FreePlanNotices";
import { MusicAccessGate } from "@/components/MusicAccessGate";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

/** Focused creative / exception pages — no top Header chrome. */
function hideChromeHeader(pathname: string): boolean {
  if (pathname.startsWith("/editor")) return true;
  if (pathname.startsWith("/studio/video")) return true;
  if (pathname === "/music" || pathname.startsWith("/music/")) return true;
  if (pathname.startsWith("/studio/music")) return true;
  if (pathname.startsWith("/studio/image/auto-edit")) return true;
  if (pathname.startsWith("/studio/image/circle-remove")) return true;
  if (pathname === "/chat" || pathname.startsWith("/chat/")) return true;
  return false;
}

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
  const noHeader = hideChromeHeader(pathname);
  const isEditorShell = pathname.startsWith("/editor");

  const main = isMusicRoute ? (
    <MusicAccessGate>
      <Outlet />
    </MusicAccessGate>
  ) : (
    <Outlet />
  );

  return (
    <div
      className={
        isEditorShell
          ? "min-h-screen w-full min-w-0 overflow-x-clip bg-transparent"
          : "min-h-screen w-full min-w-0 overflow-x-clip bg-background"
      }
    >
      {/* Single primary nav: top Header only — no left AppSidebar on desktop. */}
      <div className="w-full min-w-0">
        {!noHeader && <Header />}
        {main}
        <AdminPopupModal />
        <FirstGenerationFeedback />
        <FreePlanNotices />
      </div>
    </div>
  );
}
