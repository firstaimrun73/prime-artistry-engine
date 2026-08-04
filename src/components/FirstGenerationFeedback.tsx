// One-time feedback prompt shown after a user's first successful generation.
//
// Trigger rules:
//   • Only when the account has at least one generation.
//   • Only once, ever — a localStorage flag ("motio2edit-feedback-shown")
//     is written on submit AND on skip.

import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { submitFeedback } from "@/lib/feedback.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const FLAG = "motio2edit-feedback-shown";

// Mapped onto the categories the feedback table already accepts.
const CATEGORIES = [
  { label: "Image Quality", value: "AI Editor Feedback" },
  { label: "Speed", value: "Performance Issue" },
  { label: "Ease of Use", value: "Design Feedback" },
  { label: "Value for Money", value: "Payment Experience" },
  { label: "Overall Experience", value: "General Feedback" },
] as const;

export function FirstGenerationFeedback() {
  const { user, profile } = useAuth();
  const send = useServerFn(submitFeedback);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [category, setCategory] = useState<string>(CATEGORIES[4].value);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!user) return;
    // Never prompt the admin account.
    if (isAdminEmail(profile?.email ?? user.email ?? null)) return;
    let cancelled = false;
    try {
      if (localStorage.getItem(FLAG)) return;
    } catch {
      return;
    }
    (async () => {
      // Only image generations trigger the prompt — not video or music.
      const { count } = await supabase
        .from("generations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("type", "image");
      if (!cancelled && (count ?? 0) >= 1) setOpen(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, profile?.email]);

  const dismissForever = () => {
    try {
      localStorage.setItem(FLAG, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  const submit = async () => {
    if (!rating) return toast.error("Please pick a star rating.");
    setBusy(true);
    try {
      await send({
        data: {
          userId: user?.id ?? null,
          userName: profile?.display_name ?? null,
          userEmail: profile?.email ?? null,
          category: category as never,
          rating,
          message: message.trim() || "No additional comments.",
          pageUrl: typeof window !== "undefined" ? window.location.pathname : null,
        },
      });
      setDone(true);
      try {
        localStorage.setItem(FLAG, "1");
      } catch {
        /* ignore */
      }
      setTimeout(() => setOpen(false), 2000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send feedback.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? dismissForever() : setOpen(true))}>
      <DialogContent className="max-w-sm">
        {done ? (
          <div className="py-8 text-center">
            <p className="text-lg font-bold">Thank you!</p>
            <p className="mt-2 text-sm text-muted-foreground">Your feedback helps us improve.</p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>How was your first edit?</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-label={`${n} star${n > 1 ? "s" : ""}`}
                    onClick={() => setRating(n)}
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(0)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        n <= (hover || rating) ? "fill-primary text-primary" : "text-muted-foreground"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <div>
                <Label className="text-xs">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                placeholder="Tell us more (optional)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                maxLength={1000}
              />
              <div className="flex gap-2">
                <Button className="flex-1" onClick={submit} disabled={busy}>
                  {busy ? "Sending…" : "Submit feedback"}
                </Button>
                <Button variant="ghost" onClick={dismissForever}>
                  Skip
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
