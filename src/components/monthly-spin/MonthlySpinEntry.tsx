/**
 * Compact header / in-feed entry for Monthly Credit Spin.
 * No large Discover banners.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { MonthlySpinPanel } from "@/components/monthly-spin/MonthlySpinPanel";
import { useAuth } from "@/lib/auth";
import { Gift } from "lucide-react";

export function MonthlySpinEntry({
  className = "",
  variant = "icon",
}: {
  className?: string;
  variant?: "icon" | "pill" | "inline-card";
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const openSheet = () => setOpen(true);

  if (variant === "inline-card") {
    return (
      <>
        <button
          type="button"
          onClick={openSheet}
          className={`my-4 flex w-full max-w-lg items-center gap-3 rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/10 via-background to-orange-500/10 p-3.5 text-left shadow-sm transition hover:border-violet-500/40 ${className}`}
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-300">
            <Gift className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Monthly Credit Spin</span>
            <span className="block text-xs text-muted-foreground">
              One free spin each month · up to 1,000 credits
            </span>
          </span>
          <span className="shrink-0 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
            Spin
          </span>
        </button>
        <SpinSheet open={open} onOpenChange={setOpen} signedIn={!!user} />
      </>
    );
  }

  if (variant === "pill") {
    return (
      <>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={`hidden h-8 gap-1.5 border-violet-500/40 bg-violet-500/10 text-xs font-semibold sm:inline-flex ${className}`}
          onClick={openSheet}
          aria-label="Monthly Credit Spin"
        >
          <Gift className="h-3.5 w-3.5" />
          Monthly Spin
        </Button>
        <SpinSheet open={open} onOpenChange={setOpen} signedIn={!!user} />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={openSheet}
        className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-violet-500/40 bg-violet-500/10 transition hover:scale-105 ${className}`}
        aria-label="Monthly Credit Spin"
        title="Monthly Credit Spin"
      >
        <Gift className="h-4.5 w-4.5 text-violet-600 dark:text-violet-300" />
      </button>
      <SpinSheet open={open} onOpenChange={setOpen} signedIn={!!user} />
    </>
  );
}

function SpinSheet({
  open,
  onOpenChange,
  signedIn,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  signedIn: boolean;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92vh] overflow-y-auto rounded-t-2xl sm:max-w-md sm:rounded-none"
      >
        <SheetHeader className="text-left">
          <SheetTitle>Monthly Credit Spin</SheetTitle>
          <SheetDescription>
            Spin once per month for a chance at free credits. Results are random and verified on our
            servers.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4">
          <MonthlySpinPanel signedIn={signedIn} onClose={() => onOpenChange(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
