import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { FooterAd } from "@/components/ads";
import { useEffect, useState } from "react";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { CrownBadge } from "@/components/CrownBadge";
import { useAuth } from "@/lib/auth";
import {
  PLANS,
  DISPLAY_PRICES,
  DISPLAY_CURRENCIES,
  toCheckoutCurrency,
  PRICING_SHOW_PLAN_IDS,
  PRICING_POPULAR_PLAN_ID,
  type DisplayCurrency,
  type PlanId,
} from "@/lib/plans";
import { useI18n } from "@/lib/i18n";
import { Check, Coins, Crown, ArrowLeft } from "lucide-react";
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

/** Concise differentiators so plans are easy to compare (not a full feature dump). */
const PLAN_DIFFS: Record<
  Exclude<PlanId, "free">,
  { summary: string; unlocks: string[] }
> = {
  lite: {
    summary: "Entry paid plan — Standard image & video, Song & Instrumental music.",
    unlocks: ["Video Studio (Standard)", "No ads", "Watermark-free"],
  },
  plus: {
    summary: "Best for daily creators — Auto Edit, Filters, all 6 music modes.",
    unlocks: ["Maluto AI Auto Edit", "Filters · Cropmix", "All music modes · 90s"],
  },
  pro: {
    summary: "Premium image & video + priority queue — most popular upgrade.",
    unlocks: ["Image Premium", "Video Premium", "Priority · 120s music"],
  },
  studio: {
    summary: "Ultra AI image path + higher concurrency for power users.",
    unlocks: ["Image Ultra AI", "Higher concurrency", "Full toolset"],
  },
  business: {
    summary: "Master Studio — max credits, IMAX/8K paths, chatbot access.",
    unlocks: ["10k credits / mo", "IMAX · 8K Max", "Master Studio chat"],
  },
};

function PricingPage() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [currency, setCurrency] = useState<DisplayCurrency>("USD");

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
      },
    });
  };

  const visiblePlans = PLANS.filter((p) => PRICING_SHOW_PLAN_IDS.includes(p.id));

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Home
          </Link>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 py-12 pb-24 md:pb-12">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <Crown className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("pricing.title")}</h1>
          <p className="mx-auto mt-2 max-w-xl text-muted-foreground">{t("pricing.lead")}</p>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
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
                "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                currency === code
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-primary",
              )}
            >
              {code}
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visiblePlans.map((plan) => {
            const highlight = plan.id === PRICING_POPULAR_PLAN_ID;
            const isCurrent = profile?.plan === plan.id;
            const raw = DISPLAY_PRICES[plan.id]?.[currency];
            const priceLabel =
              typeof raw === "number" ? formatPlanPrice(raw, currency) : raw ?? "—";
            const diff = PLAN_DIFFS[plan.id as Exclude<PlanId, "free">];

            return (
              <div
                key={plan.id}
                className={cn(
                  "relative flex flex-col rounded-2xl border bg-card p-6",
                  highlight ? "border-primary shadow-md shadow-primary/10 ring-1 ring-primary/20" : "border-border",
                )}
              >
                {highlight && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
                    Popular · best fit
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <CrownBadge plan={plan.id} />
                  <h2 className="text-lg font-bold">{plan.name}</h2>
                </div>
                <p className="mt-3 text-3xl font-extrabold tracking-tight">{priceLabel}</p>
                <p className="mt-1 text-xs text-muted-foreground">per month</p>
                <div className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                  <Coins className="h-4 w-4" />
                  {plan.credits.toLocaleString()} credits / month
                </div>
                {diff && (
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{diff.summary}</p>
                )}
                {diff && (
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {diff.unlocks.map((u) => (
                      <li
                        key={u}
                        className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary"
                      >
                        {u}
                      </li>
                    ))}
                  </ul>
                )}
                <ul className="mt-5 flex-1 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600">
                  <Check className="h-3.5 w-3.5" /> Watermark-free downloads · No ads
                </p>
                {isCurrent ? (
                  <Button className="mt-8 w-full" variant="outline" disabled style={{ marginTop: "auto" }}>
                    Activated
                  </Button>
                ) : (
                  <Button
                    className={cn("mt-8 w-full", highlight && "text-base font-semibold")}
                    variant={highlight ? "default" : "outline"}
                    size={highlight ? "lg" : "default"}
                    onClick={() => selectPlan(plan.id)}
                    style={{ marginTop: "auto" }}
                  >
                    {highlight ? `Upgrade to ${plan.name} — recommended` : `Upgrade to ${plan.name}`}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <div className="mx-auto mt-10 max-w-2xl space-y-3 rounded-2xl border border-border bg-muted/30 px-4 py-5 text-left sm:px-6">
          <p className="text-sm font-semibold text-foreground">Credits, renewal & cancellation</p>
          <ul className="space-y-2 text-xs text-muted-foreground sm:text-sm">
            <li>
              <span className="font-medium text-foreground">Monthly credits:</span> each paid plan adds its credit
              allocation when the billing period starts. Credits are used for generation across Image, Video, Music,
              and Maluto AI according to the quoted cost in the studio.
            </li>
            <li>
              <span className="font-medium text-foreground">Renewal:</span> subscriptions renew about every 30 days
              from purchase unless you cancel. Next billing date is shown on your subscription / dashboard after
              checkout.
            </li>
            <li>
              <span className="font-medium text-foreground">Cancellation:</span> turn off auto-renew anytime. You keep
              plan benefits and remaining credits until the end of the paid period (no immediate lockout on cancel).
            </li>
            <li>
              <span className="font-medium text-foreground">When credits run out:</span> generation is blocked until you
              upgrade, wait for the next monthly allocation, or buy a credit top-up (where available). Your plan
              features stay active for the billing period.
            </li>
          </ul>
          <p className="pt-1 text-[11px] text-muted-foreground">
            Secure checkout via Razorpay (INR) and PayPal (USD). Plan IDs and prices match server billing configuration.
          </p>
        </div>

        <div className="mx-auto mt-6 max-w-2xl space-y-2 text-center">
          <p className="text-xs text-muted-foreground">
            *Master Studio supports the longest prompts on Motio2edit.
          </p>
        </div>
      </div>
      <FooterAd placement="pricing" />
      <Footer />
    </div>
  );
}
