import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
  DISPLAY_CURRENCIES,
  toCheckoutCurrency,
  PRICING_SHOW_PLAN_IDS,
  PRICING_POPULAR_PLAN_ID,
  type DisplayCurrency,
  type PlanId,
} from "@/lib/plans";
import { useI18n } from "@/lib/i18n";
import { Check, Coins, Crown } from "lucide-react";
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

/** Who each plan is for + key unlocks (verified against plans.ts — not marketing inventions). */
const PLAN_DIFFS: Record<
  Exclude<PlanId, "free">,
  { audience: string; unlocks: string[] }
> = {
  lite: {
    audience: "Best for trying paid tools — Standard image & video, Song & Instrumental.",
    unlocks: ["Video Studio (Standard)", "Circle · Cropmix · Remove BG", "Multi-image (5)"],
  },
  plus: {
    audience: "Daily creators — Maluto AI Auto Edit, Filters, and all 6 music modes.",
    unlocks: ["Maluto AI Auto Edit", "Filters · Cropmix", "All music modes · 90s"],
  },
  pro: {
    audience: "Premium image & video with priority queue — most popular upgrade.",
    unlocks: ["Image Premium", "Video Premium", "Priority · 120s music"],
  },
  studio: {
    audience: "Power users who need Ultra AI image and higher concurrency.",
    unlocks: ["Image Ultra AI", "Higher concurrency", "Full toolset"],
  },
  business: {
    audience: "Maximum capacity — top credits, IMAX/8K Max, Master Studio chat.",
    unlocks: ["10k credits / mo", "IMAX · 8K Max", "Master Studio chat"],
  },
};

/** Drop lines already shown as price/credits header or the shared watermark badge. */
function cardFeatureLines(features: string[]): string[] {
  return features.filter((f) => {
    const lower = f.toLowerCase();
    if (lower.includes("credits / month")) return false;
    if (lower === "watermark-free downloads") return false;
    if (lower === "no ads") return false;
    return true;
  });
}

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
      <Header />
      <div className="mx-auto max-w-6xl px-4 py-8 pb-24 sm:py-12 md:pb-12">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 sm:h-12 sm:w-12">
            <Crown className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">{t("pricing.title")}</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">{t("pricing.lead")}</p>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 sm:mt-6">
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

        {/* Stable cards: no scale/translate transforms (mobile readability). */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visiblePlans.map((plan) => {
            const highlight = plan.id === PRICING_POPULAR_PLAN_ID;
            const isCurrent = profile?.plan === plan.id;
            const raw = DISPLAY_PRICES[plan.id]?.[currency];
            const priceLabel =
              typeof raw === "number" ? formatPlanPrice(raw, currency) : raw ?? "—";
            const diff = PLAN_DIFFS[plan.id as Exclude<PlanId, "free">];
            const features = cardFeatureLines(plan.features);

            return (
              <div
                key={plan.id}
                className={cn(
                  "relative flex min-w-0 flex-col rounded-2xl border bg-card p-5 sm:p-6",
                  highlight
                    ? "border-primary shadow-md shadow-primary/10 ring-1 ring-primary/20"
                    : "border-border",
                )}
              >
                {highlight && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
                    Popular · best fit
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <CrownBadge plan={plan.id} />
                  <h2 className="text-base font-bold sm:text-lg">{plan.name}</h2>
                </div>
                <p className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">{priceLabel}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">per month</p>
                <div className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                  <Coins className="h-4 w-4 shrink-0" />
                  <span>{plan.credits.toLocaleString()} credits / month</span>
                </div>
                {diff && (
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{diff.audience}</p>
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
                <ul className="mt-4 flex-1 space-y-1.5 sm:mt-5 sm:space-y-2">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="min-w-0 break-words">{f}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600">
                  <Check className="h-3.5 w-3.5 shrink-0" /> Watermark-free · No ads
                </p>
                {isCurrent ? (
                  <Button className="mt-6 w-full sm:mt-8" variant="outline" disabled style={{ marginTop: "auto" }}>
                    Activated
                  </Button>
                ) : (
                  <Button
                    className={cn("mt-6 w-full sm:mt-8", highlight && "text-base font-semibold")}
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

        <div className="mx-auto mt-10 max-w-2xl space-y-2 rounded-2xl border border-border bg-muted/30 px-4 py-4 text-left sm:px-6 sm:py-5">
          <p className="text-sm font-semibold text-foreground">How credits & billing work</p>
          <ul className="space-y-1.5 text-xs text-muted-foreground sm:text-sm">
            <li>
              <span className="font-medium text-foreground">Credits:</span> each paid plan adds its monthly
              allocation at the start of the billing period. Use them for Image, Video, Music, and Maluto AI at
              the cost shown in each studio.
            </li>
            <li>
              <span className="font-medium text-foreground">Renewal & cancel:</span> plans renew about every 30
              days until you turn off auto-renew. You keep plan benefits and remaining credits until the period
              ends.
            </li>
            <li>
              <span className="font-medium text-foreground">Out of credits:</span> generation pauses until the next
              allocation, an upgrade, or a top-up (where available). Plan features stay active for the paid period.
            </li>
          </ul>
          <p className="pt-1 text-[11px] text-muted-foreground">
            Checkout: Razorpay (INR) and PayPal (USD). Prices match server billing configuration.
          </p>
        </div>
      </div>
      <FooterAd placement="pricing" />
      <Footer />
    </div>
  );
}
