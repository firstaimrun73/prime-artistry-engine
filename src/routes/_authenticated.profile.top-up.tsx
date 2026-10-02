/**
 * Credit Top-Up — packs + custom amount.
 * Rate: 1 credit = $0.0178. Credits server-computed only.
 * Subscribed plans only. PayPal capture → apply_payment_credits.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import {
  CREDIT_TOPUP_PACKS,
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
import { Coins, Lock, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    paypal?: any;
  }
}

const PAID: PlanId[] = ["lite", "plus", "pro", "studio", "business"];

export const Route = createFileRoute("/_authenticated/profile/top-up")({
  component: TopUpPage,
  head: () => ({
    meta: [
      { title: "Credit Top-Up — Motio2edit" },
      { name: "description", content: "Buy Motio2edit credits. 1 credit = $0.0178." },
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

  const [packs, setPacks] = useState(CREDIT_TOPUP_PACKS);
  const [selectedPackId, setSelectedPackId] = useState<string | null>(CREDIT_TOPUP_PACKS[0]?.id ?? null);
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

  useEffect(() => {
    listPacks()
      .then((r) => {
        if (r?.packs?.length) {
          setPacks(r.packs as typeof CREDIT_TOPUP_PACKS);
          setSelectedPackId(r.packs[0].id);
        }
      })
      .catch(() => {});
  }, [listPacks]);

  useEffect(() => {
    if (!user || !subscribed || busy) return;
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
  }, [user, subscribed, mode, selectedPack?.id, customNum, customValid, busy]);

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
          1 credit = ${CUSTOM_TOPUP_CREDIT_FACE_USD} · credits = floor(USD ÷ {CUSTOM_TOPUP_CREDIT_FACE_USD})
        </p>

        {!subscribed ? (
          <div className="mt-8 rounded-2xl border border-border bg-card p-6 text-center">
            <Lock className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">Top-up is for subscribed plans only.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Upgrade to Lite or higher to buy additional credits.
            </p>
            <Button asChild className="mt-4">
              <Link to="/pricing">View plans</Link>
            </Button>
          </div>
        ) : (
          <>
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
                className={cn(
                  "flex-1 rounded-full border px-3 py-2 text-sm font-semibold",
                  mode === "custom"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground",
                )}
              >
                Custom
              </button>
            </div>

            {mode === "pack" ? (
              <ul className="mt-4 space-y-2">
                {packs.map((p) => {
                  const credits = creditsFromUsd(p.priceUsd);
                  const on = selectedPackId === p.id;
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedPackId(p.id)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition",
                          on ? "border-primary bg-primary/5" : "border-border bg-card",
                        )}
                      >
                        <span>
                          <span className="block text-sm font-bold">{p.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ${p.priceUsd.toFixed(2)} · {credits.toLocaleString()} credits
                          </span>
                        </span>
                        <Coins className="h-4 w-4 text-primary" />
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
                    ? creditsFromUsd(selectedPack?.priceUsd ?? 0).toLocaleString()
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
            <div ref={paypalRef} className="mt-4 min-h-[48px]" />
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
