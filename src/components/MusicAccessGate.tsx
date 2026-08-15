import { useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { canAccessMusic } from "@/lib/policy";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

/**
 * Free users cannot use Music Studio. Redirect / show upgrade.
 * Paid Lite+ allowed per canAccessMusic.
 */
export function MusicAccessGate({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const admin = isAdminEmail(profile?.email);
  const allowed = canAccessMusic({ plan: profile?.plan, email: profile?.email, isAdmin: admin });

  useEffect(() => {
    if (profile && !allowed) {
      navigate({ to: "/pricing" });
    }
  }, [profile, allowed, navigate]);

  if (!profile) return null;
  if (!allowed) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
        <Lock className="h-8 w-8 text-primary" />
        <h1 className="text-xl font-bold">Music Studio requires a paid plan</h1>
        <p className="text-sm text-muted-foreground">
          Upgrade to unlock AI music generation.
        </p>
        <Button asChild>
          <Link to="/pricing">View plans</Link>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
