import { useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/BrandMark";
import {
  findPlan,
  CURRENCY_SYMBOL,
  creditsLabel,
  type Currency,
} from "@/lib/plans";
import {
  getPaypalClientId,
  createPaypalOrder,
  capturePaypalOrder,
  getPaypalSubscriptionMode,
} from "@/lib/payments.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Lock, ArrowLeft } from "lucide-react";

declare global {
  interface Window {
    paypal: any;
  }
}

type PaypalMode = "order" | "loading" | "unknown";

export function CheckoutPage() {
  const { plan: planId, currency, interval } = useSearch({ from: "/checkout" });
  const navigate = useNavigate();
  const plan = findPlan(planId as string);
  useEffect(() => {
    if (!plan || planId === "free") navigate({ to: "/pricing" });
  }, [plan, planId, navigate]);
  const { user, refreshProfile } = useAuth();
  const paypalClientId = useServerFn(getPaypalClientId);
  const createPp = useServerFn(createPaypalOrder);
  const capturePp = useServerFn(capturePaypalOrder);
  const getPpMode = useServerFn(getPaypalSubscriptionMode);

  const [processing, setProcessing] = useState(false);
  const [paypalReady, setPaypalReady] = useState(false);
  const [paypalError, setPaypalError] = useState<string | null>(null);
  const [paypalMode, setPaypalMode] = useState<PaypalMode>("loading");
  const paypalContainerRef = useRef<HTMLDivElement | null>(null);
  const paypalRenderedRef = useRef(false);

  const symbol = CURRENCY_SYMBOL[currency as Currency] ?? "$";
  const priceNum = plan?.price[currency as Currency] ?? 0;
  const isAnnual = interval === "year";
  const annualUsd = (plan as { priceAnnualUSD?: number })?.priceAnnualUSD ?? priceNum * 10;
  const displayAmount = isAnnual
    ? currency === "USD"
      ? annualUsd
      : currency === "EUR"
        ? Math.round(priceNum * 10 * 100) / 100
        : Math.round(priceNum * 10)
    : priceNum;
  const priceLabel = `${symbol}${currency === "INR" ? Math.round(displayAmount).toLocaleString("en-IN") : displayAmount}`;

  useEffect(() => {
    if (planId === "free") return;
    let cancelled = false;
    setPaypalMode("loading");
    getPpMode({ data: { plan: planId, interval } })
      .then(() => {
        if (!cancelled) setPaypalMode("order");
      })
      .catch(() => {
        if (!cancelled) setPaypalMode("order");
      });
    return () => {
      cancelled = true;
    };
  }, [planId, interval, getPpMode]);

  useEffect(() => {
    if (planId === "free" || !user) return;
    if (paypalMode !== "order") return;
    let cancelled = false;
    paypalRenderedRef.current = false;
    setPaypalReady(false);
    setPaypalError(null);
    const renderButtons = () => {
      if (cancelled || paypalRenderedRef.current) return;
      const container = paypalContainerRef.current;
      if (!window.paypal || !container) return;
      container.innerHTML = "";
      paypalRenderedRef.current = true;
      let internalOrderId: string | null = null;
      try {
        window.paypal
          .Buttons({
            style: { layout: "vertical", color: "gold", shape: "rect", label: "paypal" },
            createOrder: async () => {
              const res = await createPp({ data: { plan: planId, interval } });
              internalOrderId = res.internalOrderId;
              return res.orderId;
            },
            onApprove: async (data: { orderID: string }) => {
              setProcessing(true);
              try {
                await capturePp({
                  data: { orderId: data.orderID, internalOrderId: internalOrderId! },
                });
                await refreshProfile();
                navigate({ to: "/payment-success" });
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "PayPal payment failed.");
                navigate({ to: "/payment-failed" });
              } finally {
                setProcessing(false);
              }
            },
            onCancel: () => toast.info("PayPal payment cancelled."),
            onError: () => setPaypalError("PayPal could not process the payment."),
          })
          .render(container);
        setPaypalReady(true);
      } catch {
        setPaypalError("Could not load PayPal.");
      }
    };
    const init = async () => {
      try {
        if (window.paypal) {
          renderButtons();
          return;
        }
        const { clientId } = await paypalClientId();
        if (!clientId) {
          setPaypalError("PayPal is not configured.");
          return;
        }
        const existing = document.getElementById("paypal-sdk");
        if (existing) {
          existing.addEventListener("load", renderButtons, { once: true });
          return;
        }
        const script = document.createElement("script");
        script.id = "paypal-sdk";
        script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture`;
        script.async = true;
        script.onload = renderButtons;
        script.onerror = () => setPaypalError("Could not load PayPal.");
        document.body.appendChild(script);
      } catch {
        setPaypalError("Could not initialize PayPal.");
      }
    };
    init();
    return () => {
      cancelled = true;
    };
  }, [user, planId, interval, paypalMode, createPp, capturePp, paypalClientId, navigate, refreshProfile]);

  if (!plan) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="inline-flex min-w-0 items-center">
            <BrandMark size="md" />
          </Link>
          <Link
            to="/pricing"
            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to pricing
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-4xl gap-8 px-4 py-10 md:grid-cols-[1fr_300px] md:py-14">
        <div>
          <h1 className="text-2xl font-bold">Checkout</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {plan.name} · {isAnnual ? "Yearly" : "Monthly"} · PayPal
          </p>

          {!user && (
            <div className="mt-6 rounded-xl border border-border bg-muted/30 p-4 text-sm">
              <p className="mb-3 text-muted-foreground">Sign in to complete payment with PayPal.</p>
              <Button asChild>
                <Link to="/auth" search={{ mode: "signin", redirect: "/checkout" }}>
                  Sign in to continue
                </Link>
              </Button>
            </div>
          )}

          {user && (
            <div className="mt-6 space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Pay with PayPal
              </h2>
              {paypalError && <p className="text-sm text-destructive">{paypalError}</p>}
              {paypalMode === "loading" && (
                <p className="text-sm text-muted-foreground">Preparing PayPal…</p>
              )}
              {paypalMode === "order" && (
                <>
                  <div ref={paypalContainerRef} className="min-h-[48px]" />
                  {!paypalReady && !paypalError && (
                    <p className="text-sm text-muted-foreground">Loading PayPal…</p>
                  )}
                  {processing && (
                    <p className="text-sm text-muted-foreground">Confirming payment…</p>
                  )}
                </>
              )}
            </div>
          )}

          <p className="mt-8 flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" />
            Secure PayPal checkout · one-time purchase · no AutoPay
          </p>
        </div>

        <aside className="h-fit rounded-2xl border border-border bg-card p-5">
          <h3 className="font-semibold">Order summary</h3>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {plan.name} · {isAnnual ? "Yearly" : "Monthly"}
            </span>
            <span className="font-medium">{priceLabel}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Credits / month</span>
            <span className="font-medium">{creditsLabel(plan.credits)}</span>
          </div>
          <div className="my-4 h-px bg-border" />
          <div className="flex items-center justify-between font-semibold">
            <span>Total</span>
            <span>{priceLabel}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
