import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { getPlan, CURRENCY_SYMBOL, CURRENCY_METHODS, ALL_METHODS, TRANSACTION_FEE, type Currency, type PlanId } from "@/lib/plans";
import { completeCheckout } from "@/lib/generate.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CreditCard, Bitcoin, Lock } from "lucide-react";
import type { PaymentMethod } from "@/lib/plans";

export const Route = createFileRoute("/checkout")({
  validateSearch: (s: Record<string, unknown>) => ({
    plan: (["free", "plus", "pro", "studio"].includes(s.plan as string) ? s.plan : "free") as PlanId,
    currency: ["USD", "EUR", "INR"].includes(s.currency as string) ? (s.currency as Currency) : "USD",
  }),
  component: Checkout,
});

const METHOD_ICON: Record<PaymentMethod, typeof CreditCard> = {
  card: CreditCard,
  crypto: Bitcoin,
};

function Checkout() {
  const { plan: planId, currency } = useSearch({ from: "/checkout" });
  const plan = getPlan(planId as PlanId);
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const checkout = useServerFn(completeCheckout);
  const methods = CURRENCY_METHODS[currency as Currency];
  const [method, setMethod] = useState<PaymentMethod>(methods[0]);
  const [processing, setProcessing] = useState(false);

  const handlePay = async () => {
    if (!user) {
      navigate({ to: "/auth", search: { redirect: "/checkout" } });
      return;
    }
    setProcessing(true);
    try {
      await checkout({ data: { plan: planId, currency } });
      await refreshProfile();
      navigate({ to: "/success", search: { plan: planId } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout failed.");
    } finally {
      setProcessing(false);
    }
  };

  const symbol = CURRENCY_SYMBOL[currency as Currency];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto grid max-w-4xl gap-8 px-4 py-16 md:grid-cols-[1fr_320px]">
        <div>
          <h1 className="text-2xl font-bold">Checkout</h1>
          <p className="mt-1 text-sm text-muted-foreground">Complete your {plan.name} plan purchase.</p>

          <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Payment method
          </h2>
          <div className="mt-3 space-y-3">
            {ALL_METHODS.filter((m) => methods.includes(m.id)).map((m) => {
              const Icon = METHOD_ICON[m.id];
              return (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                    method === m.id ? "border-primary bg-accent" : "border-border bg-card hover:border-muted-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5 text-primary" />
                  <span className="font-medium">{m.label}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" /> Available methods depend on your selected currency ({currency}).
          </p>
        </div>

        <aside className="h-fit rounded-2xl border border-border bg-card p-6">
          <h3 className="font-semibold">Order summary</h3>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{plan.name} plan</span>
            <span className="font-medium">{symbol}{plan.price[currency as Currency]}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Credits</span>
            <span className="font-medium">{plan.credits}</span>
          </div>
          {planId !== "free" && (
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Transaction fee</span>
              <span className="font-medium">{symbol}{TRANSACTION_FEE[currency as Currency]}</span>
            </div>
          )}
          <div className="my-4 h-px bg-border" />
          <div className="flex items-center justify-between font-semibold">
            <span>Total</span>
            <span>
              {symbol}
              {planId === "free"
                ? plan.price[currency as Currency]
                : (plan.price[currency as Currency] + TRANSACTION_FEE[currency as Currency]).toFixed(2)}
            </span>
          </div>
          <Button className="mt-6 w-full" onClick={handlePay} disabled={processing}>
            {processing ? "Processing…" : planId === "free" ? "Activate free plan" : "Pay now"}
          </Button>
          <Link to="/pricing" className="mt-4 block text-center text-xs text-muted-foreground hover:text-foreground">
            ← Back to pricing
          </Link>
        </aside>
      </div>
    </div>
  );
}
