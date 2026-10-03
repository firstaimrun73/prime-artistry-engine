import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { CrownBadge } from "@/components/CrownBadge";
import { useAuth } from "@/lib/auth";
import { getPlan, PLANS, type PlanId } from "@/lib/plans";
import { useI18n } from "@/lib/i18n";
import { Check, Coins } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
});

function PricingPage() {
  const { profile, user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [currency, setCurrency] = useState<"USD" | "EUR" | "INR">("USD");

  useEffect(() => {
    if (profile?.currency === "INR" || profile?.currency === "EUR" || profile?.currency === "USD") {
      setCurrency(profile.currency);
    }
  }, [profile?.currency]);

  const selectPlan = (id: PlanId) => {
    if (!user) {
      navigate({ to: "/auth", search: { redirect: "/pricing" } });
      return;
    }
    navigate({ to: "/checkout", search: { plan: id } });
  };

  const visible = PLANS.filter((p) => p.id !== "free");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-6xl px-4 py-12 pb-24 sm:py-16 md:pb-16">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t("pricing.title")}</h1>
          <p className="mx-auto mt-2 max-w-xl text-muted-foreground">{t("pricing.lead")}</p>
        </div>

        <div className="mt-8 flex justify-center gap-2">
          {(["USD", "EUR", "INR"] as const).map((c) => (
            <Button
              key={c}
              size="sm"
              variant={currency === c ? "default" : "outline"}
              onClick={() => setCurrency(c)}
            >
              {c}
            </Button>
          ))}
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((plan) => {
            const highlight = plan.id === "pro";
            const isCurrent = profile?.plan === plan.id;
            const price = plan.price[currency];
            return (
              <div
                key={plan.id}
                className={`flex flex-col rounded-2xl border bg-card p-6 ${
                  highlight ? "border-primary shadow-md shadow-primary/10" : "border-border"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-lg font-bold">{plan.name}</h2>
                  <CrownBadge plan={plan.id} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold">
                    {currency === "INR" ? "₹" : currency === "EUR" ? "€" : "$"}
                    {price}
                  </span>
                  <span className="text-sm text-muted-foreground">/ mo</span>
                </div>
                <div className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                  <Coins className="h-4 w-4" />
                  {plan.credits.toLocaleString()} credits / month
                </div>
                <ul className="mt-5 flex-1 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600">
                  <Check className="h-3.5 w-3.5" /> Watermark-free downloads
                </p>
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600">
                  <Check className="h-3.5 w-3.5" /> Edit your media free from ads
                </p>
                {isCurrent ? (
                  <Button className="mt-8 w-full" variant="outline" disabled style={{ marginTop: "auto" }}>
                    Activated
                  </Button>
                ) : (
                  <Button
                    className="mt-8 w-full"
                    variant={highlight ? "default" : "outline"}
                    onClick={() => selectPlan(plan.id)}
                    style={{ marginTop: "auto" }}
                  >
                    {`Upgrade to ${plan.name}`}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <div className="mx-auto mt-10 max-w-2xl space-y-3 text-center">
          <p className="text-xs text-muted-foreground">
            *Master Studio supports the longest prompts on Motio2edit.
          </p>
          <p className="text-xs text-muted-foreground">
            Secure checkout via Razorpay and PayPal.
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
