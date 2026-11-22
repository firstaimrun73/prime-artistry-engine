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
import { FreeCreditOffer } from "@/components/FreeCreditOffer";
import { showOptInFreeCreditCta } from "@/config/ads";

const FREE_INTRO_KEY = "motio2edit-free-intro-seen-v2";
const OUT_OF_CREDITS_KEY = "motio2edit-out-of-credits-seen";
const LOW_CREDITS_POPUP_KEY = "motio2edit-low-credits-popup-v1";

/**
 * Free plan notices — minimal interruption.
 * Low credits (~10 or less): once per session, offer upgrade OR opt-in free credits partner link.
 */
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
      if (localStorage.getItem(FREE_INTRO_KEY) !== "1") {
        setIntroOpen(true);
      }
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

  return (
    <>
      <Dialog open={introOpen && !outOpen && !lowOpen} onOpenChange={(o) => !o && dismissIntro()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Welcome to Motio2edit Free</DialogTitle>
            <DialogDescription className="space-y-2 pt-1 text-left">
              <span className="block">
                You can create with free credits. The Free plan includes a Motio2edit watermark on
                exports.
              </span>
              <span className="block text-muted-foreground">
                Plans are always available from your Profile when you need more credits or clean
                exports.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button onClick={dismissIntro}>Continue free</Button>
            <Button asChild variant="outline" onClick={dismissIntro}>
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
                Add credits or choose a plan to keep generating. Or try partner offers for free credits.
              </span>
            </DialogDescription>
          </DialogHeader>
          {showOptInFreeCreditCta() && (
            <div className="py-1">
              <FreeCreditOffer variant="button" />
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={dismissOut}>
              Not now
            </Button>
            <Button asChild onClick={dismissOut}>
              <Link to="/pricing">Upgrade plan</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={lowOpen && !outOpen} onOpenChange={(o) => !o && dismissLow()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Low on credits ({credits} left)</DialogTitle>
            <DialogDescription className="space-y-2 pt-1 text-left">
              <span className="block">
                Upgrade your plan for more power — or claim free credits via partner offers.
              </span>
            </DialogDescription>
          </DialogHeader>
          {showOptInFreeCreditCta() && (
            <div className="py-1">
              <FreeCreditOffer variant="button" />
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={dismissLow}>
              Keep creating
            </Button>
            <Button asChild onClick={dismissLow}>
              <Link to="/pricing">Upgrade plan</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
