import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { isFreePlan } from "@/lib/policy";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const FREE_INTRO_KEY = "motio2edit-free-intro-seen-v2";
const OUT_OF_CREDITS_KEY = "motio2edit-out-of-credits-seen";
const LOW_CREDITS_POPUP_KEY = "motio2edit-low-credits-popup-v1";

/** Compact free-plan notices — rectangular, theme-aware, non-intrusive. */
export function FreePlanNotices() {
  const { profile } = useAuth();
  const [introOpen, setIntroOpen] = useState(false);
  const [outOpen, setOutOpen] = useState(false);
  const [lowOpen, setLowOpen] = useState(false);

  const admin = isAdminEmail(profile?.email);
  const free = !admin && isFreePlan(profile?.plan);
  const credits = profile?.credits ?? 0;

  useEffect(() => {
    if (!profile || !free) return;
    try {
      if (localStorage.getItem(FREE_INTRO_KEY) !== "1") setIntroOpen(true);
    } catch {
      /* skip */
    }
  }, [profile, free]);

  useEffect(() => {
    if (!profile || !free || credits > 0) return;
    try {
      if (sessionStorage.getItem(OUT_OF_CREDITS_KEY) === "1") return;
      setOutOpen(true);
    } catch {
      setOutOpen(true);
    }
  }, [profile, free, credits]);

  useEffect(() => {
    if (!profile || !free || credits <= 0 || credits > 10) return;
    try {
      if (sessionStorage.getItem(LOW_CREDITS_POPUP_KEY) === "1") return;
      setLowOpen(true);
    } catch {
      setLowOpen(true);
    }
  }, [profile, free, credits]);

  const dismissIntro = () => {
    setIntroOpen(false);
    try {
      localStorage.setItem(FREE_INTRO_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const dismissOut = () => {
    setOutOpen(false);
    try {
      sessionStorage.setItem(OUT_OF_CREDITS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const dismissLow = () => {
    setLowOpen(false);
    try {
      sessionStorage.setItem(LOW_CREDITS_POPUP_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  if (!free) return null;

  const shell =
    "max-w-[min(100%,22rem)] rounded-2xl border border-border bg-card p-0 shadow-lg sm:max-w-sm";

  return (
    <>
      <Dialog open={introOpen && !outOpen && !lowOpen} onOpenChange={(o) => !o && dismissIntro()}>
        <DialogContent className={shell}>
          <DialogHeader className="space-y-1 px-4 pt-4 text-left">
            <DialogTitle className="text-base">Welcome to Free</DialogTitle>
            <DialogDescription className="text-sm">
              Create with starter credits. Free exports include a Motio2edit watermark.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 border-t border-border px-4 py-3 sm:justify-end">
            <Button size="sm" variant="outline" onClick={dismissIntro}>
              Continue
            </Button>
            <Button size="sm" asChild onClick={dismissIntro}>
              <Link to="/pricing">Plans</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={outOpen} onOpenChange={(o) => !o && dismissOut()}>
        <DialogContent className={shell}>
          <DialogHeader className="space-y-1 px-4 pt-4 text-left">
            <DialogTitle className="text-base">Out of credits</DialogTitle>
            <DialogDescription className="text-sm">
              Choose a plan to keep generating, or explore partner offers from the header.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 border-t border-border px-4 py-3 sm:justify-end">
            <Button size="sm" variant="outline" onClick={dismissOut}>
              Not now
            </Button>
            <Button size="sm" asChild onClick={dismissOut}>
              <Link to="/pricing">Upgrade</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={lowOpen && !outOpen} onOpenChange={(o) => !o && dismissLow()}>
        <DialogContent className={shell}>
          <DialogHeader className="space-y-1 px-4 pt-4 text-left">
            <DialogTitle className="text-base">Low credits ({credits} left)</DialogTitle>
            <DialogDescription className="text-sm">
              Upgrade for more credits and watermark-free exports.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 border-t border-border px-4 py-3 sm:justify-end">
            <Button size="sm" variant="outline" onClick={dismissLow}>
              Keep creating
            </Button>
            <Button size="sm" asChild onClick={dismissLow}>
              <Link to="/pricing">Upgrade</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
