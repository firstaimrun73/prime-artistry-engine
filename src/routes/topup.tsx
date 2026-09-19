/**
 * Phase 4 — Top up credits ($2–$1000, presets + custom).
 * Credits are always computed server-side via creditsForTopup.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  TOPUP_MIN_USD,
  TOPUP_MAX_USD,
  TOPUP_PRESETS_USD,
  creditsForTopup,
  topupBonus,
  effectiveUsdPerCredit,
  validateTopupAmount,
} from "@/lib/billing/topup-credits";
import { createTopupOrder } from "@/lib/payments.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Minus, Plus, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/topup")({
  head: () => ({
    meta: [
      { title: "Top up credits — Motio2edit" },
      {
        name: "description",
        content: "Add Motio2edit credits from $2 to $1000. Volume bonus on larger amounts.",
      },
    ],
  }),
  component: TopupPage,
});

type Provider = "paypal" | "razorpay" | "crypto";

function TopupPage() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const createOrder = useServerFn(createTopupOrder);

  const [amountUsd, setAmountUsd] = useState(10);
  const [customMode, setCustomMode] = useState(false);
  const [provider, setProvider] = useState<Provider>("paypal");
  const [busy, setBusy] = useState(false);

  const credits = creditsForTopup(amountUsd);
  const bonus = topupBonus(amountUsd);
  const perCredit = effectiveUsdPerCredit(amountUsd);
  const validation = validateTopupAmount(amountUsd);

  const videoHint = useMemo(() => {
    if (credits == null) return null;
    const low = Math.max(1, Math.floor(credits / 100));
    const high = Math.max(low, Math.floor(credits / 45));
    return `About ${low}–${high} short Video Studio clips (estimate).`;
  }, [credits]);

  const selectPreset = (usd: number) => {
    setCustomMode(false);
    setAmountUsd(usd);
  };

  const adjust = (delta: number) => {
    setCustomMode(true);
    setAmountUsd((a) => Math.min(TOPUP_MAX_USD, Math.max(TOPUP_MIN_USD, a + delta)));
  };

  const onPay = async () => {
    if (!user) {
      toast.error("Sign in to top up.");
      void navigate({ to: "/login" });
      return;
    }
    if (!validation.ok) {
      toast.error(validation.message);
      return;
    }
    setBusy(true);
    try {
      const res = await createOrder({
        data: { amountUsd, provider },
      });
      if (provider === "crypto" && res.invoiceUrl) {
        window.location.href = res.invoiceUrl;
        return;
      }
      toast.success(`Order created · ${res.credits} credits. Complete payment to receive them.`);
      if (provider === "paypal" && res.orderId) {
        sessionStorage.setItem("motio-topup-paypal-order", res.orderId);
      }
      if (provider === "razorpay" && res.orderId) {
        sessionStorage.setItem("motio-topup-razorpay-order", JSON.stringify(res));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start top-up.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <Header />
      <main className="relative mx-auto max-w-lg px-4 pb-32 pt-6">
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -left-20 top-20 h-64 w-64 rounded-full bg-orange-400/25 blur-[80px] dark:bg-orange-500/20" />
          <div className="absolute right-0 top-40 h-56 w-56 rounded-full bg-violet-500/25 blur-[80px] dark:bg-violet-500/15" />
          <div className="absolute bottom-20 left-1/3 h-48 w-48 rounded-full bg-sky-400/25 blur-[80px] dark:bg-sky-500/15" />
        </div>

        <button
          type="button"
          onClick={() => navigate({ to: "/pricing" })}
          className="mb-4 inline-flex min-h-[44px] items-center gap-2 text-sm text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-[#FF7A45] to-[#F43F5E] bg-clip-text text-transparent">
              Top up credits
            </span>
          </h1>
          {profile && (
            <span className="rounded-full border border-white/40 bg-white/55 px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur-xl dark:border-white/12 dark:bg-white/[.06]">
              {profile.credits} credits
            </span>
          )}
        </div>

        <section className="rounded-[20px] border border-white/70 bg-white/55 p-4 shadow-[0_8px_32px_rgba(80,60,140,.12)] backdrop-blur-xl dark:border-white/[.12] dark:bg-white/[.06]">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Amount (USD)
          </p>
          <div className="flex flex-wrap gap-2">
            {TOPUP_PRESETS_USD.map((usd) => {
              const selected = !customMode && amountUsd === usd;
              return (
                <button
                  key={usd}
                  type="button"
                  onClick={() => selectPreset(usd)}
                  className={cn(
                    "min-h-[44px] min-w-[64px] rounded-xl px-3 text-sm font-semibold transition",
                    selected
                      ? "bg-gradient-to-r from-[#FF7A45] to-[#F43F5E] text-white shadow-[0_6px_18px_rgba(244,63,94,.35)]"
                      : "border border-border/60 bg-background/60 text-foreground",
                  )}
                >
                  ${usd}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setCustomMode(true)}
              className={cn(
                "min-h-[44px] rounded-xl px-3 text-sm font-semibold",
                customMode
                  ? "bg-gradient-to-r from-[#FF7A45] to-[#F43F5E] text-white shadow-[0_6px_18px_rgba(244,63,94,.35)]"
                  : "border border-border/60 bg-background/60",
              )}
            >
              Custom
            </button>
          </div>

          {customMode && (
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                type="button"
                aria-label="Decrease"
                onClick={() => adjust(-1)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-border/60 bg-background/70"
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                type="number"
                min={TOPUP_MIN_USD}
                max={TOPUP_MAX_USD}
                step={1}
                value={amountUsd}
                onChange={(e) => {
                  const n = Math.floor(Number(e.target.value) || 0);
                  setAmountUsd(n);
                }}
                className="h-11 w-24 rounded-xl border border-border/60 bg-background/80 text-center text-lg font-bold"
              />
              <button
                type="button"
                aria-label="Increase"
                onClick={() => adjust(1)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-border/60 bg-background/70"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          )}
        </section>

        <section className="mt-4 rounded-[20px] border border-white/70 bg-white/55 p-4 shadow-[0_8px_32px_rgba(80,60,140,.12)] backdrop-blur-xl dark:border-white/[.12] dark:bg-white/[.06]">
          <p className="text-sm text-muted-foreground">You pay</p>
          <p className="text-3xl font-extrabold">${amountUsd}</p>
          <p className="mt-2 text-sm text-muted-foreground">You get</p>
          <p className="text-2xl font-bold">
            {credits != null ? `${credits.toLocaleString()} credits` : "—"}
          </p>
          {bonus > 0 && (
            <span className="mt-2 inline-block rounded-full bg-gradient-to-r from-[#FF7A45] to-[#F43F5E] px-2.5 py-0.5 text-xs font-semibold text-white">
              +{Math.round(bonus * 100)}% bonus
            </span>
          )}
          {perCredit != null && (
            <p className="mt-2 text-xs text-muted-foreground">
              ≈ ${perCredit.toFixed(4)} per credit
            </p>
          )}
          {videoHint && (
            <p className="mt-2 text-xs text-muted-foreground">{videoHint}</p>
          )}
          {!validation.ok && (
            <p className="mt-2 text-sm text-destructive">{validation.message}</p>
          )}
        </section>

        <section className="mt-4 rounded-[20px] border border-white/70 bg-white/55 p-4 shadow-[0_8px_32px_rgba(80,60,140,.12)] backdrop-blur-xl dark:border-white/[.12] dark:bg-white/[.06]">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Payment method
          </p>
          <div className="flex flex-col gap-2">
            {(
              [
                ["paypal", "PayPal"],
                ["razorpay", "Razorpay (card · INR)"],
                ["crypto", "Crypto"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setProvider(id)}
                className={cn(
                  "min-h-[44px] rounded-xl border px-3 text-left text-sm font-medium",
                  provider === id
                    ? "border-transparent bg-gradient-to-r from-[#FF7A45] to-[#F43F5E] text-white"
                    : "border-border/60 bg-background/60",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/40 bg-white/70 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl dark:border-white/10 dark:bg-black/50">
        <div className="mx-auto max-w-lg">
          <Button
            className="h-12 w-full rounded-2xl bg-gradient-to-r from-[#FF7A45] to-[#F43F5E] text-base font-bold text-white shadow-[0_6px_18px_rgba(244,63,94,.35)] disabled:opacity-45"
            disabled={busy || !validation.ok}
            onClick={() => void onPay()}
          >
            {busy ? "Starting…" : `Pay $${amountUsd}`}
          </Button>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Credits are added only after payment is confirmed.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
