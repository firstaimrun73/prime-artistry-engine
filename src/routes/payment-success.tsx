import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { submitFeedback } from "@/lib/feedback.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/payment-success")({
  validateSearch: (s: Record<string, unknown>) => ({
    /** Set when returning from PayPal subscription approve URL */
    sub: s.sub === "1" || s.sub === 1 || s.sub === true ? ("1" as const) : undefined,
  }),
  head: () => ({
    meta: [{ title: "Payment successful — MOTIO2EDIT" }],
  }),
  component: PaymentSuccess,
});

const EMOJIS = ["😡", "😕", "😐", "🙂", "😍"];

function PaymentExperience() {
  const [show, setShow] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { user } = useAuth();
  const send = useServerFn(submitFeedback);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 5000);
    return () => clearTimeout(t);
  }, []);

  if (!show || submitted) return null;

  const rate = async (rating: number) => {
    setSubmitted(true);
    try {
      await send({
        data: {
          userId: user?.id ?? null,
          userName: null,
          userEmail: user?.email ?? null,
          category: "Payment Experience",
          rating,
          message: `Payment experience rating: ${rating}/5`,
          pageUrl: typeof window !== "undefined" ? window.location.href : null,
        },
      });
      toast.success("Thanks for your feedback! 🎉");
    } catch {
      /* silent */
    }
  };

  return (
    <div className="mt-10 w-full rounded-2xl border border-border bg-card p-5 text-center">
      <p className="text-sm font-medium">How was your payment experience?</p>
      <div className="mt-3 flex justify-center gap-2">
        {EMOJIS.map((e, i) => (
          <button
            key={i}
            onClick={() => rate(i + 1)}
            className="rounded-lg border border-border p-2 text-2xl transition-colors hover:bg-accent"
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

function PaymentSuccess() {
  const navigate = useNavigate();
  const { sub } = useSearch({ from: "/payment-success" });
  const { refreshProfile } = useAuth();
  const isSubscriptionReturn = sub === "1";

  // Soft refresh profile after return; activation still depends on webhook.
  useEffect(() => {
    void refreshProfile?.();
  }, [refreshProfile]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
        {isSubscriptionReturn ? (
          <>
            <Clock className="h-16 w-16 text-primary" />
            <h1 className="mt-6 text-2xl font-bold">Subscription approval received</h1>
            <p className="mt-2 text-muted-foreground">
              PayPal confirmed your approval. Your plan and credits will appear once our servers verify the
              subscription (usually within a minute). This page alone does not activate billing.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              If nothing updates after a few minutes, refresh your profile or contact support with your PayPal
              email.
            </p>
          </>
        ) : (
          <>
            <CheckCircle2 className="h-16 w-16 text-primary" />
            <h1 className="mt-6 text-2xl font-bold">Payment successful!</h1>
            <p className="mt-2 text-muted-foreground">
              Your plan is now active and your credits have been added to your account.
            </p>
          </>
        )}
        <Button className="mt-8 w-full" onClick={() => navigate({ to: "/dashboard" })}>
          Go to dashboard
        </Button>
        <Button variant="outline" className="mt-3 w-full" onClick={() => navigate({ to: "/editor" })}>
          Open editor
        </Button>
        <Button
          variant="ghost"
          className="mt-2 w-full text-muted-foreground"
          onClick={() => navigate({ to: "/profile" })}
        >
          View profile / subscription
        </Button>
        {!isSubscriptionReturn && <PaymentExperience />}
      </div>
    </div>
  );
}
