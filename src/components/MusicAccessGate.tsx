import { useAuth } from "@/lib/auth";

/**
 * Music Studio access gate.
 * Free users get limited Music (modes/duration enforced server-side via plan capabilities).
 * Unauthenticated users still hit the normal auth route shell.
 */
export function MusicAccessGate({ children }: { children: React.ReactNode }) {
  const { loading, profile } = useAuth();

  if (loading || !profile) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
