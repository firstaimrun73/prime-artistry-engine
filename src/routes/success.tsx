import { createFileRoute, useSearch, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { getPlan } from "@/lib/plans";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/success")({
  validateSearch: (s: Record<string, unknown>) => ({
    plan: s.plan === "pro" ? "pro" : "free",
  }),
  component: Success,
});

function Success() {
  const { plan: planId } = useSearch({ from: "/success" });
  const plan = getPlan(planId as "free" | "pro");
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
        <CheckCircle2 className="h-16 w-16 text-primary" />
        <h1 className="mt-6 text-2xl font-bold">You're all set!</h1>
        <p className="mt-2 text-muted-foreground">
          Your {plan.name} plan is active with {plan.credits} credits.
        </p>
        <Button className="mt-8 w-full" onClick={() => navigate({ to: "/dashboard" })}>
          Go to dashboard
        </Button>
        <Button variant="outline" className="mt-3 w-full" onClick={() => navigate({ to: "/editor" })}>
          Open editor
        </Button>
      </div>
    </div>
  );
}
