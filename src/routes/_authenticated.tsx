import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/Header";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { FreePlanNotices } from "@/components/FreePlanNotices";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context, location }) => {
    // Auth is handled client-side via useAuth in the layout component.
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // Client-side redirect handled by AuthProvider / route guards elsewhere
    if (typeof window !== "undefined") {
      window.location.href = `/auth?redirect=${encodeURIComponent(window.location.pathname)}`;
    }
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Outlet />
      <MobileBottomNav />
      <FreePlanNotices />
    </div>
  );
}
