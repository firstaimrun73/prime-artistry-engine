import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { FooterAd } from "@/components/ads";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { CrownBadge } from "@/components/CrownBadge";
import { useAuth } from "@/lib/auth";
import {
  PLANS,
  DISPLAY_PRICES,
  DISPLAY_ANNUAL_PRICES_USD,
  DISPLAY_CURRENCIES,
  toCheckoutCurrency,
  PRICING_SHOW_PLAN_IDS,
  PRICING_POPULAR_PLAN_ID,
  annualSavingsMonths,
  type DisplayCurrency,
  type PlanId,
  type PurchasablePlanId,
  type BillingInterval,
} from "@/lib/plans";
import { useI18n } from "@/lib/i18n";
import { Check, Coins, Crown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
});

function formatPlanPrice(amount: number, currency: DisplayCurrency): string {
  if (amount === 0) return "Free";
  const symbols: Record<DisplayCurrency, string> = { USD: "$", EUR: "€", INR: "₹" };
  const sym = symbols[currency] ?? "$";
  if (currency === "INR") return `${sym}${Math.round(amount).toLocaleString("en-IN")}`;
  if (Number.isInteger(amount)) return `${sym}${amount}`;
  return `${sym}${amount.toFixed(2)}`;
}

const MODEL_TIER_LABEL: Record<string, string> = {
  standard: "Standard AI Models",
  premium: "Premium AI Models",
  ultra: "Ultra AI Models",
};

function PricingPage() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [currency, setCurrency] = useState<DisplayCurrency>("USD");
  const [interval, setInterval] = useState<BillingInterval>("month");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("motio2edit-display-currency");
      if (saved && (DISPLAY_CURRENCIES as string[]).includes(saved)) {
        setCurrency(saved as DisplayCurrency);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const selectPlan = (planId: PlanId) => {
    if (planId === "free") return;
    navigate({
      to: "/checkout",
      search: {
        plan: planId,
        currency: toCheckoutCurrency(currency),
        method: undefined,
        interval,
      },
    });
  };

  const visiblePlans = PLANS.filter((p) => PRICING_SHOW_PLAN_IDS.includes(p.id));
  const savingsMonths = annualSavingsMonths();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-5xl px-4 py-8 pb-24 sm:py-12 md:pb-12">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 sm:h-12 sm:w-12">
            <Crown className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
            {t("pricing.title") || "Pricing"}
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
            Simple plans. Clear model access. Credits deposited every month.
          </p>
        </div>

        {/* Monthly / Yearly toggle */}
        <div className="mt-8 flex justify-center">
          <div className="inline-flex items-center rounded-full border border-border bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => setInterval("month")}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
                interval === "month"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setInterval("year")}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
                interval === "year"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Yearly
              <span className="ml-1.5 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
                {savingsMonths} months free
              </span>
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {DISPLAY_CURRENCIES.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => {
                setCurrency(code);
                try {
                  localStorage.setItem("motio2edit-display-currency", code);
                } catch {
                  /* ignore */
                }
              }}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                currency === code
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-primary",
              )}
            >
              {code}
            </button>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visiblePlans.map((plan) => {
            const highlight = plan.id === PRICING_POPULAR_PLAN_ID;
            const isCurrent = profile?.plan === plan.id;
            const isUltra = plan.id === "ultra";
            const monthlyUsd = DISPLAY_PRICES[plan.id]?.USD ?? 0;
            const annualUsd =
              DISPLAY_ANNUAL_PRICES_USD[plan.id as PurchasablePlanId] ?? monthlyUsd * 10;

            let priceLabel: string;
            let periodLabel: string;
            if (interval === "year") {
              // Show annual total; for non-USD approximate from USD face
              if (currency === "USD") {
                priceLabel = formatPlanPrice(annualUsd, "USD");
              } else if (currency === "EUR") {
                priceLabel = formatPlanPrice(Math.round(annualUsd * 0.92), "EUR");
              } else {
                priceLabel = formatPlanPrice(Math.round(annualUsd * 83.5), "INR");
              }
              periodLabel = "per year";
            } else {
              const raw = DISPLAY_PRICES[plan.id]?.[currency];
              priceLabel =
                typeof raw === "number" ? formatPlanPrice(raw, currency) : raw ?? "—";
              periodLabel = "per month";
            }

            return (
              <div
                key={plan.id}
                className={cn(
                  "relative flex w-full flex-col rounded-2xl border bg-card p-5 sm:p-6",
                  highlight &&
                    "border-primary shadow-md shadow-primary/10 ring-1 ring-primary/20",
                  isUltra &&
                    !highlight &&
                    "border-amber-500/40 bg-gradient-to-b from-amber-500/5 to-card",
                )}
              >
                {highlight && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
                    Most popular
                  </span>
                )}
                {isUltra && (
                  <span className="absolute -top-2.5 right-4 rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    Flagship
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <CrownBadge plan={plan.id} />
                  <h2 className="text-base font-bold sm:text-lg">{plan.name}</h2>
                </div>

                <p className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
                  {priceLabel}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{periodLabel}</p>
                {interval === "year" && (
                  <p className="mt-1 text-xs font-medium text-emerald-600">
                    Billed annually · credits still added every month
                  </p>
                )}

                <div className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                  <Coins className="h-4 w-4 shrink-0" />
                  <span>{plan.credits.toLocaleString()} credits / month</span>
                </div>

                <div className="mt-3 rounded-lg bg-primary/5 px-3 py-2 text-xs font-semibold text-primary">
                  {MODEL_TIER_LABEL[plan.modelTier] ?? plan.modelTier}
                </div>

                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  {plan.positioning}
                </p>

                <ul className="mt-4 flex-1 space-y-1.5 sm:mt-5 sm:space-y-2">
                  {plan.features
                    .filter((f) => !f.toLowerCase().includes("credits / month"))
                    .slice(0, 8)
                    .map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span className="min-w-0 break-words">{f}</span>
                      </li>
                    ))}
                </ul>

                <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600">
                  <Check className="h-3.5 w-3.5 shrink-0" /> Watermark-free · No disruptive ads
                </p>

                {isCurrent ? (
                  <Button
                    className="mt-6 w-full sm:mt-8"
                    variant="outline"
                    disabled
                    style={{ marginTop: "auto" }}
                  >
                    Current plan
                  </Button>
                ) : (
                  <Button
                    className={cn(
                      "mt-6 w-full sm:mt-8",
                      highlight && "text-base font-semibold",
                      isUltra && "bg-amber-500 text-white hover:bg-amber-600",
                    )}
                    variant={highlight || isUltra ? "default" : "outline"}
                    size={highlight ? "lg" : "default"}
                    onClick={() => selectPlan(plan.id)}
                    style={{ marginTop: "auto" }}
                  >
                    {interval === "year"
                      ? `Get ${plan.name} yearly`
                      : `Get ${plan.name}`}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <div className="mx-auto mt-10 max-w-2xl space-y-2 rounded-2xl border border-border bg-muted/30 px-4 py-4 text-left sm:px-6 sm:py-5">
          <p className="text-sm font-semibold text-foreground">How credits & billing work</p>
          <ul className="space-y-1.5 text-xs text-muted-foreground sm:text-sm">
            <li>
              <span className="font-medium text-foreground">Credits:</span> each paid plan adds its
              monthly allocation at the start of each month. Annual plans are billed once per year;
              credits are still deposited monthly (never all at once).
            </li>
            <li>
              <span className="font-medium text-foreground">Model access:</span> Starter = Standard
              models · Pro = Premium models · Ultra AI = Ultra models. Higher tiers include lower
              tiers. Access is enforced server-side.
            </li>
            <li>
              <span className="font-medium text-foreground">Video Studio:</span> available with paid
              plans subject to separate cost and quota rules. Private videos remain private.
            </li>
            <li>
              <span className="font-medium text-foreground">Cancel anytime:</span> turn off auto-renew;
              you keep benefits and remaining credits until the period ends.
            </li>
          </ul>
          <p className="pt-2 text-xs text-muted-foreground">
            Need more credits?{" "}
            <Link to="/profile/top-up" className="font-medium text-primary underline-offset-2 hover:underline">
              One-time top-ups
            </Link>{" "}
            are always available.
          </p>
        </div>
      </div>
      <FooterAd placement="pricing" />
      <Footer />
    </div>
  );
}
