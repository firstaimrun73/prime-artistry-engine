// Client-side admin gate. Renders children only for the configured admin
// account; everyone else sees a "Restricted" notice. This is a UX guard —
// the authoritative check lives in the server functions.

import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";

export function AdminGate({ children }: { children: React.ReactNode }) {
  const { profile, user, loading } = useAuth();
  const email = profile?.email ?? user?.email ?? null;

  if (loading) {
    return <div className="mx-auto max-w-6xl px-4 py-16 text-sm text-muted-foreground">Checking access…</div>;
  }

  if (!isAdminEmail(email)) {
    if (typeof console !== "undefined") {
      console.warn("[admin] blocked non-admin access attempt:", email ?? "anonymous");
    }
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
        <h1 className="mt-4 text-xl font-bold">Restricted</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This area is only available to the administrator.
        </p>
        <Link to="/dashboard" className="mt-6 inline-block text-sm font-medium text-primary hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
