import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { canAccessMusic } from "@/lib/policy";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

/**
 * Free users cannot use Music Studio.
 * Shows a clear upgrade screen (no confusing credit errors).
 * Server-side generateMusic also rejects Free via canAccessMusic.
 */
export function MusicAccessGate({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();
  const admin = isAdminEmail(profile?.email);
  const allowed = canAccessMusic({
    plan: profile?.plan,
    email: profile?.email,
    isAdmin: admin,
  });

  useEffect(() => {
    // Soft navigate for free users so deep links land on pricing after the message.
    // Keep the upgrade panel visible briefly for clarity.
    if (profile && !allowed) {
      const t = window.setTimeout(() => {
        /* stay on page with upgrade UI — do not auto-redirect away from the message */
      }, 0);
      return () => window.clearTimeout(t);
    }
  }, [profile, allowed, navigate]);

  if (loading || !profile) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Lock className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold">AI Music Studio — Available on Lite+</h1>
        <p className="text-sm text-muted-foreground">
          Free includes image editing. Upgrade to Lite or higher to generate original AI music tracks.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button asChild>
            <Link to="/pricing">View plans</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/studio/image">Open Image Studio</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
