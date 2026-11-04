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

/** Once per browser (localStorage) — do not re-show after dismiss. */
const FREE_INTRO_KEY = "motio2edit-free-intro-seen-v2";
/** Once per session for out-of-credits. */
const OUT_OF_CREDITS_KEY = "motio2edit-out-of-credits-seen";

/**
 * Free plan notices — minimal interruption:
 *  1) Intro: once per device, soft copy, Continue free primary
 *  2) Zero credits: once per session, credit-focused (not generic upgrade spam)
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
      if (localStorage.getItem(FREE_INTRO_KEY) !== "1") {
        setIntroOpen(true);
      }
    } catch {
      /* ignore storage — skip intro rather than spam */
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

  if (!free) return null;

  return (
    <>
      <Dialog open={introOpen && !outOpen} onOpenChange={(o) => !o && dismissIntro()}>
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
                Add credits or choose a plan to keep generating. This notice only appears once per
                session.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={dismissOut}>
              Not now
            </Button>
            <Button asChild onClick={dismissOut}>
              <Link to="/pricing">View plans</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
