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

const FREE_INTRO_KEY = "motio2edit-free-intro-seen";
const OUT_OF_CREDITS_KEY = "motio2edit-out-of-credits-seen";

/**
 * Non-spammy Free plan notices (once per browser session each):
 *  1) Intro: Free plan includes ads
 *  2) Zero credits: upgrade CTA
 * Does not change generation or credit enforcement.
 */
export function FreePlanNotices() {
  const { profile } = useAuth();
  const [introOpen, setIntroOpen] = useState(false);
  const [outOpen, setOutOpen] = useState(false);

  const admin = isAdminEmail(profile?.email);
  const free = !admin && isFreePlan(profile?.plan);
  const credits = profile?.credits ?? 0;

  useEffect(() => {
    if (!profile || !free) return;

    try {
      if (sessionStorage.getItem(FREE_INTRO_KEY) !== "1") {
        setIntroOpen(true);
      }
    } catch {
      setIntroOpen(true);
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

  const dismissIntro = () => {
    setIntroOpen(false);
    try {
      sessionStorage.setItem(FREE_INTRO_KEY, "1");
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

  if (!free) return null;

  return (
    <>
      <Dialog open={introOpen && !outOpen} onOpenChange={(o) => !o && dismissIntro()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>You're using Motio2edit Free</DialogTitle>
            <DialogDescription className="space-y-2 pt-1 text-left">
              <span className="block">Ads are included with the Free plan.</span>
              <span className="block text-muted-foreground">
                Upgrade anytime for more credits, no ads, and advanced features.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={dismissIntro}>
              Continue free
            </Button>
            <Button asChild onClick={dismissIntro}>
              <Link to="/pricing">View plans</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={outOpen} onOpenChange={(o) => !o && dismissOut()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>You're out of credits</DialogTitle>
            <DialogDescription className="space-y-2 pt-1 text-left">
              <span className="block">
                Top up your plan to continue generating. Get more credits, no ads, and advanced
                features.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={dismissOut}>
              Not now
            </Button>
            <Button asChild onClick={dismissOut}>
              <Link to="/pricing">Upgrade / View plans</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
