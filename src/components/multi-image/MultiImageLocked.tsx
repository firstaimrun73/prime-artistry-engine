import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MULTI_IMAGE_UPGRADE_MESSAGE } from "@/lib/multi-image";

type Props = {
  /** Compact banner vs full-page card */
  variant?: "banner" | "card";
};

/**
 * Free-plan (and locked) Multi-Image gate.
 * Logic must still reject Free elsewhere — this is UI only.
 */
export function MultiImageLocked({ variant = "card" }: Props) {
  useEffect(() => {
    toast.message(MULTI_IMAGE_UPGRADE_MESSAGE, {
      duration: 6000,
      id: "multi-image-free-lock",
    });
  }, []);

  if (variant === "banner") {
    return (
      <div className="flex flex-wrap items-start gap-3 rounded-xl border border-primary/40 bg-primary/5 px-4 py-3 text-sm shadow-sm">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">Multi-Image locked</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{MULTI_IMAGE_UPGRADE_MESSAGE}</p>
        </div>
        <Button asChild size="sm" className="shrink-0">
          <Link to="/pricing">Upgrade</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
        <Lock className="h-5 w-5" />
      </div>
      <h2 className="mt-4 text-lg font-bold">Multi-Image editing</h2>
      <p className="mt-2 text-sm text-muted-foreground">{MULTI_IMAGE_UPGRADE_MESSAGE}</p>
      <Button asChild className="mt-6 w-full">
        <Link to="/pricing">View plans</Link>
      </Button>
    </div>
  );
}
