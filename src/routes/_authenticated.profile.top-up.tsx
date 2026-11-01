/**
 * Credit Top-Up — packs + custom amount.
 * Rate: 1 credit = $0.0178. Credits server-computed only.
 * Subscribed plans only (except limited Halloween Special available to free users).
 * PayPal capture → apply_payment_credits.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import {
  ALL_TOPUP_PACKS,
  HALLOWEEN_SPECIAL_PACK,
  CUSTOM_TOPUP_MAX_USD,
  CUSTOM_TOPUP_MIN_USD,
  CUSTOM_TOPUP_CREDIT_FACE_USD,
  creditsFromUsd,
} from "@/lib/credit-topups";
import {
  listCreditTopUpPacks,
  quoteCustomTopUp,
  createTopUpPaypalOrder,
  captureTopUpPaypalOrder,
} from "@/lib/credit-topup.functions";
import { getPaypalClientId } from "@/lib/payments.functions";
import type { PlanId } from "@/lib/plans";
import { toast } from "sonner";
import { Coins, Lock, ArrowLeft, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    paypal?: any;
  }
}

const PAID: PlanId[] = ["lite", "plus", "pro", "studio", "business"];
const HALLOWEEN_ID = HALLOWEEN_SPECIAL_PACK.id;

export const Route = createFileRoute("/_authenticated/profile/top-up")({
  component: TopUpPage,
  head: () => ({
    meta: [
      { title: "Credit Top-Up — Motio2edit" },
      { name: "description", content: "Buy Motio2edit credits. 1 credit = $0.0178. Halloween Special available." },
    ],
  }),
});

function TopUpPage() {
  const { user, profile, refreshProfile, loading } = useAuth();
  const navigate = useNavigate();
  const plan = (profile?.plan ?? "free") as PlanId;
  const subscribed = PAID.includes(plan);

  const listPacks = useServerFn(listCreditTopUpPacks);
  const quoteCustom = useServerFn(quoteCustomTopUp);
  const createOrder = useServerFn(createTopUpPaypalOrder);
  const captureOrder = useServerFn(captureTopUpPaypalOrder);
  const paypalClientId = useServerFn(getPaypalClientId);

  const [packs, setPacks] = useState(ALL_TOPUP_PACKS);
  const [selectedPackId, setSelectedPackId] = useState<string | null>(HALLOWEEN_ID);
  const [customUsd, setCustomUsd] = useState<string>("25");
  const [mode, setMode] = useState<"pack" | "custom">("pack");
  const [busy, setBusy] = useState(false);
  const [paypalError, setPaypalError] = useState<string | null>(null);
  const paypalRef = useRef<HTMLDivElement | null>(null);
  const renderedRef = useRef(false);

  const customNum = Number(customUsd);
  const customValid =
    Number.isFinite(customNum) &&
    customNum >= CUSTOM_TOPUP_MIN_USD &&
    customNum <= CUSTOM_TOPUP_MAX_USD;
  const customCredits = customValid ? creditsFromUsd(customNum) : 0;

  const selectedPack = useMemo(
    () => packs.find((p) => p.id === selectedPackId) ?? packs[0],
    [packs, selectedPackId],
  );

  // Free users can only buy the Halloween pack
  const canBuy =
    subscribed || (selectedPackId === HALLOWEEN_ID && mode === "pack");

  useEffect(() => {
    listPacks()
      .then((r) => {
        if (r?.packs?.length) {
          setPacks(r.packs as typeof ALL_TOPUP_PACKS);
          // Prefer Halloween as default when present
          const halloween = r.packs.find((p: any) => p.id === HALLOWEEN_ID);
          setSelectedPackId(halloween?.id ?? r.packs[0].id);
        }
      })
      .catch(() => {});
  }, [listPacks]);

  useEffect(() => {
    if (!user || !canBuy || busy) return;
    let cancelled = false;
    renderedRef.current = false;
    setPaypalError(null);

    const mount = async () => {
      try {
        if (!window.paypal) {
          const { clientId } = await paypalClientId();
          if (!clientId) {
            setPaypalError("PayPal is not configured.");
            return;
          }
          await new Promise<void>((resolve, reject) => {
            const existing = document.getElementById("paypal-sdk-topup");
            if (existing) {
              resolve();
              return;
            }
            const script = document.createElement("script");
            script.id = "paypal-sdk-topup";
            script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture`;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("PayPal SDK failed to load"));
            document.body.appendChild(script);
          });
        }
        if (cancelled || renderedRef.current) return;
        const container = paypalRef.current;
        if (!window.paypal || !container) return;
        container.innerHTML = "";
        renderedRef.current = true;
        window.paypal
          .Buttons({
            style: { layout: "vertical", color: "gold", shape: "rect", label: "paypal" },
            createOrder: async () => {
              setBusy(true);
              try {
                const body =
                  mode === "pack"
                    ? { packId: selectedPack?.id }
                    : { customUsd: customNum };
                if (mode === "custom") {
                  if (!customValid) throw new Error("Enter an amount between $2 and $1,000.");
                  await quoteCustom({ data: { usd: customNum } });
                }
                const order = await createOrder({ data: body });
                (window as any).__motioTopUpInternalId = order.internalOrderId;
                return order.orderId;
              } catch (err) {
                setBusy(false);
                toast.error(err instanceof Error ? err.message : "Could not start checkout.");
                throw err;
              }
            },
            onApprove: async (data: { orderID: string }) => {
              try {
                const internalOrderId = (window as any).__motioTopUpInternalId as string;
                const result = await captureOrder({
                  data: { orderId: data.orderID, internalOrderId },
                });
                toast.success(
                  result.alreadyProcessed
                    ? "Credits already applied."
                    : `Added ${Number(result.credits).toLocaleString()} credits.`,
                );
                await refreshProfile?.();
                navigate({ to: "/profile" });
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Payment capture failed.");
              } finally {
                setBusy(false);
              }
            },
            onCancel: () => {
              setBusy(false);
              toast.info("Payment cancelled.");
            },
            onError: (err: unknown) => {
              setBusy(false);
              setPaypalError("PayPal could not process the payment.");
              toast.error(err instanceof Error ? err.message : "PayPal error.");
            },
          })
          .render(container);
      } catch (err) {
        setPaypalError(err instanceof Error ? err.message : "Could not load PayPal.");
      }
    };
    void mount();
    return () => {
      cancelled = true;
    };
  }, [user, canBuy, mode, selectedPack?.id, customNum, customValid, busy]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-lg px-4 py-8 pb-28">
        <Link
          to="/profile"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Profile
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight">Credit Top-Up</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          1 credit = ${CUSTOM_TOPUP_CREDIT_FACE_USD} · Halloween Special fixed at 150 credits
        </p>

        {!subscribed && (
          <div className="mt-4 rounded-2xl border border-orange-500/40 bg-orange-500/10 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-orange-400">
              <Sparkles className="h-4 w-4" />
              Halloween Special available for free accounts
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              $1.99 → 150 credits · try everything except Video Studio · ads removed. Other packs require a paid plan.
            </p>
          </div>
        )}

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={() => setMode("pack")}
            className={cn(
              "flex-1 rounded-full border px-3 py-2 text-sm font-semibold",
              mode === "pack"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground",
            )}
          >
            Packs
          </button>
          <button
            type="button"
            onClick={() => setMode("custom")}
            disabled={!subscribed}
            className={cn(
              "flex-1 rounded-full border px-3 py-2 text-sm font-semibold",
              mode === "custom"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground",
              !subscribed && "opacity-50",
            )}
          >
            Custom
          </button>
        </div>

        {mode === "pack" ? (
          <ul className="mt-4 space-y-2">
            {packs.map((p) => {
              const isHalloween = p.id === HALLOWEEN_ID;
              const credits = (p as any).fixedCredits ? p.credits : creditsFromUsd(p.priceUsd);
              const on = selectedPackId === p.id;
              const locked = !subscribed && !isHalloween;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => !locked && setSelectedPackId(p.id)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition",
                      on ? "border-primary bg-primary/5" : "border-border bg-card",
                      isHalloween && "border-orange-500/50 bg-orange-500/5",
                      locked && "opacity-50",
                    )}
                  >
                    <span>
                      <span className="flex items-center gap-1.5 text-sm font-bold">
                        {p.name}
                        {isHalloween && (
                          <span className="rounded-full bg-orange-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-orange-400">
                            Limited
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ${p.priceUsd.toFixed(2)} · {credits.toLocaleString()} credits
                        {locked && " · plan required"}
                      </span>
                    </span>
                    {locked ? (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Coins className="h-4 w-4 text-primary" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-4 rounded-2xl border border-border bg-card p-4">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Amount (USD)
            </label>
            <input
              type="number"
              min={CUSTOM_TOPUP_MIN_USD}
              max={CUSTOM_TOPUP_MAX_USD}
              step="0.01"
              value={customUsd}
              onChange={(e) => setCustomUsd(e.target.value)}
              className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-lg font-bold outline-none focus:ring-2 focus:ring-primary/30"
            />
            <p className="mt-2 text-sm text-muted-foreground">
              Min ${CUSTOM_TOPUP_MIN_USD} · Max ${CUSTOM_TOPUP_MAX_USD.toLocaleString()}
            </p>
            <p className="mt-1 text-base font-semibold text-primary">
              {customValid
                ? `→ ${customCredits.toLocaleString()} credits`
                : "Enter a valid amount"}
            </p>
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-border bg-muted/30 p-4">
          <p className="text-sm font-semibold">
            You will receive{" "}
            <span className="text-primary">
              {mode === "pack"
                ? ((selectedPack as any)?.fixedCredits
                    ? selectedPack?.credits
                    : creditsFromUsd(selectedPack?.priceUsd ?? 0)
                  )?.toLocaleString() ?? "—"
                : customValid
                  ? customCredits.toLocaleString()
                  : "—"}
            </span>{" "}
            credits
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Credits are calculated on the server. Payment must succeed before credits are added.
          </p>
        </div>

        {paypalError && (
          <p className="mt-3 text-sm text-destructive">{paypalError}</p>
        )}
        {canBuy ? (
          <div ref={paypalRef} className="mt-4 min-h-[48px]" />
        ) : (
          <div className="mt-4 rounded-2xl border border-border bg-card p-4 text-center">
            <Lock className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-2 text-sm">Select the Halloween Special pack to continue, or upgrade to a paid plan for all top-ups.</p>
            <Button asChild className="mt-3" variant="outline">
              <Link to="/pricing">View plans</Link>
            </Button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
