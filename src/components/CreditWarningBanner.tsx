import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

const DISMISS_KEY = "motio2edit-low-credits-dismissed";

/**
 * Low-credit warning banner shown at the top of the editor.
 *  • credits < 30  → dismissible orange banner
 *  • credits === 0 → red banner, not dismissible
 * Admins never see it.
 */
export function CreditWarningBanner({
  credits,
  isAdmin,
}: {
  credits: number;
  isAdmin: boolean;
}) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (isAdmin) return null;
  if (credits >= 30) return null;

  const empty = credits <= 0;
  if (!empty && dismissed) return null;

  return (
    <div
      className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm animate-fade-in ${
        empty
          ? "border-destructive/50 bg-destructive/10"
          : "border-primary/50 bg-primary/10"
      }`}
    >
      <span className="flex items-center gap-2 font-medium">
        <AlertTriangle className={`h-4 w-4 ${empty ? "text-destructive" : "text-primary"}`} />
        {empty
          ? "You have no credits left. Upgrade your plan to continue."
          : `Running low on credits (${credits} left). Top up to keep creating.`}
      </span>
      <span className="flex items-center gap-2">
        <Link
          to="/pricing"
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            empty
              ? "bg-destructive text-destructive-foreground"
              : "bg-primary text-primary-foreground"
          }`}
        >
          {empty ? "Upgrade →" : "Get Credits →"}
        </Link>
        {!empty && (
          <button
            type="button"
            aria-label="Dismiss low credit warning"
            onClick={() => {
              setDismissed(true);
              try {
                sessionStorage.setItem(DISMISS_KEY, "1");
              } catch {
                /* ignore */
              }
            }}
            className="rounded-full p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </span>
    </div>
  );
}

/** Shows the once-per-session low-credit toast. */
export const LOW_CREDIT_TOAST_KEY = "motio2edit-low-credits-toast";
