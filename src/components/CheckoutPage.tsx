import { useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/BrandMark";
import {
  findPlan,
  CURRENCY_SYMBOL,
  CURRENCY_METHODS,
  ALL_METHODS,
  cardProvidersForCurrency,
  defaultCardProvider,
  creditsLabel,
  type Currency,
  type PaymentMethod,
  type CardProvider,
} from "@/lib/plans";
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  getPaypalClientId,
  createPaypalOrder,
  capturePaypalOrder,
  getPaypalSubscriptionMode,
} from "@/lib/payments.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CreditCard, Lock, Wallet, ArrowLeft } from "lucide-react";

declare global {
  interface Window {
    Razorpay: any;
    paypal: any;
  }
}

type PaypalMode = "order" | "loading" | "unknown";

const METHOD_ICON: Record<PaymentMethod, typeof CreditCard> = {
  card: CreditCard,
  paypal: Wallet,
};

export function CheckoutPage() {
  const { plan: planId, currency, interval } = useSearch({ from: "/checkout" });
  const navigate = useNavigate();
  const plan = findPlan(planId as string);
  useEffect(() => {
    if (!plan || planId === "free") navigate({ to: "/pricing" });
  }, [plan, planId, navigate]);
  const { user, refreshProfile } = useAuth();
  const createOrder = useServerFn(createRazorpayOrder);
  const verifyPayment = useServerFn(verifyRazorpayPayment);
  const paypalClientId = useServerFn(getPaypalClientId);
  const createPp = useServerFn(createPaypalOrder);
  const capturePp = useServerFn(capturePaypalOrder);
  const getPpMode = useServerFn(getPaypalSubscriptionMode);

  const methods = CURRENCY_METHODS[currency as Currency];
  const providers = cardProvidersForCurrency(currency as Currency);
  const [method, setMethod] = useState<PaymentMethod>(methods[0]);
  const [cardProvider, setCardProvider] = useState<CardProvider>(() =>
    defaultCardProvider(currency as Currency),
  );
  const [processing, setProcessing] = useState(false);
  const [cardRetry, setCardRetry] = useState<string | null>(null);
  const [paypalReady, setPaypalReady] = useState(false);
  const [paypalError, setPaypalError] = useState<string | null>(null);
  const [paypalMode, setPaypalMode] = useState<PaypalMode>("loading");
  const paypalContainerRef = useRef<HTMLDivElement | null>(null);
  const paypalRenderedRef = useRef(false);

  const symbol = CURRENCY_SYMBOL[currency as Currency];
  const priceNum = plan?.price[currency as Currency] ?? 0;
  const isAnnual = interval === "year";
  const priceLabel = isAnnual
    ? `${symbol}${currency === "USD" ? (plan as { priceAnnualUSD?: number })?.priceAnnualUSD ?? priceNum * 10 : Math.round(priceNum * 10)}`
    : `${symbol}${priceNum}`;
  const durationLabel = isAnnual ? "365 days" : "30 days";
  const chargeLine = `${priceLabel} · ${durationLabel}`;

  useEffect(() => {
    setCardProvider(defaultCardProvider(currency as Currency));
  }, [currency]);

  useEffect(() => {
    if (planId === "free") return;
    let cancelled = false;
    setPaypalMode("loading");
    getPpMode({ data: { plan: planId, interval } })
      .then((r) => {
        if (cancelled) return;
        setPaypalMode(r.mode === "order" ? "order" : "order");
      })
      .catch(() => {
        if (!cancelled) setPaypalMode("order");
      });
    return () => {
      cancelled = true;
    };
  }, [planId, interval, getPpMode]);

  useEffect(() => {
    if (planId === "free" || method !== "card" || cardProvider !== "paypal" || !user) return;
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
  }, [method, cardProvider, user, planId, interval, paypalMode]);

  const requireAuth = () => {
    if (!user) {
      navigate({ to: "/auth", search: { redirect: "/checkout" } });
      return false;
    }
    return true;
  };

  const handleCard = async () => {
    if (!requireAuth()) return;
    if (currency !== "INR") {
      toast.error("Razorpay is only available for INR (India).");
      return;
    }
    if (typeof window === "undefined" || !window.Razorpay) {
      toast.error("Payment library is still loading.");
      return;
    }
    setProcessing(true);
    setCardRetry(null);
    try {
      const order = await createOrder({ data: { plan: planId, interval } });
      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Motio2edit",
        description: `${plan?.name ?? "Plan"} — one-time (${isAnnual ? "annual" : "monthly"})`,
        order_id: order.orderId,
        theme: { color: "#FF6A1A" },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await verifyPayment({
              data: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                internalOrderId: order.internalOrderId,
              },
            });
            await refreshProfile();
            navigate({ to: "/payment-success" });
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Verification failed.");
            navigate({ to: "/payment-failed" });
          }
        },
        modal: {
          ondismiss: () => {
            setProcessing(false);
            setCardRetry("Payment window closed. Click to try again.");
          },
        },
      });
      rzp.on("payment.failed", () => {
        setProcessing(false);
        setCardRetry("Payment failed. Please try again.");
      });
      rzp.open();
    } catch (err) {
      setProcessing(false);
      const msg = err instanceof Error ? err.message : "Could not start payment.";
      setCardRetry(msg);
      toast.error(msg);
    }
  };

  if (!plan) return null;

  const oneTimeNotice = (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
      <p className="font-semibold text-foreground">One-time payment</p>
      <p className="mt-1 text-muted-foreground">
        You will be charged{" "}
        <span className="font-medium text-foreground">{chargeLine}</span> once. There is{" "}
        <strong>no automatic renewal</strong>. When your plan expires we will email you so you can
        renew from the pricing page if you want.
      </p>
      {isAnnual && (
        <p className="mt-2 text-muted-foreground">
          Annual plans receive <strong>{creditsLabel(plan.credits)} credits each month</strong>{" "}
          during the 365-day period (not all at once).
        </p>
      )}
    </div>
  );

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

      <div className="mx-auto grid max-w-4xl gap-8 px-4 py-10 md:grid-cols-[1fr_320px] md:py-14">
        <div>
          <h1 className="text-2xl font-bold">Checkout</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {plan.name} · {isAnnual ? "Annual" : "Monthly"} · Motio2edit one-time purchase
          </p>

          <div className="mt-6">{oneTimeNotice}</div>

          <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Payment method
          </h2>
          <div className="mt-3 space-y-3">
            {ALL_METHODS.filter((m) => methods.includes(m.id)).map((m) => {
              const Icon = METHOD_ICON[m.id];
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setMethod(m.id);
                    setCardRetry(null);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                    method === m.id
                      ? "border-primary bg-accent"
                      : "border-border bg-card hover:border-muted-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5 text-primary" />
                  <span className="font-medium">{m.label}</span>
                </button>
              );
            })}
          </div>

          {method === "card" && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {currency === "INR" ? "India payment" : "International payment"}
              </h3>
              <div
                className={`mt-3 grid gap-3 ${providers.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}
              >
                {providers.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setCardProvider(p.id);
                      setCardRetry(null);
                    }}
                    className={`rounded-xl border p-4 text-left transition-colors ${
                      cardProvider === p.id
                        ? "border-primary bg-accent"
                        : "border-border bg-card hover:border-muted-foreground"
                    }`}
                  >
                    <span className="block font-medium">{p.label}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{p.note}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {method === "card" && cardProvider === "paypal" && (
            <div className="mt-6 space-y-3">
              {paypalError && <p className="text-sm text-destructive">{paypalError}</p>}
              {paypalMode === "loading" && (
                <p className="text-sm text-muted-foreground">Preparing PayPal checkout…</p>
              )}
              {paypalMode === "order" && (
                <>
                  <div ref={paypalContainerRef} className="min-h-[48px]" />
                  {!paypalReady && !paypalError && (
                    <p className="text-sm text-muted-foreground">Loading PayPal…</p>
                  )}
                </>
              )}
            </div>
          )}

          {method === "card" && cardProvider === "razorpay" && cardRetry && (
            <p className="mt-4 text-sm text-destructive">{cardRetry}</p>
          )}

          <p className="mt-8 flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" />
            Secured via PayPal (international) and Razorpay (India). Manual renewal only — no
            AutoPay.
          </p>
        </div>

        <aside className="h-fit rounded-2xl border border-border bg-card p-6">
          <h3 className="font-semibold">Order summary</h3>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {plan.name} · {isAnnual ? "Annual (365 days)" : "Monthly (30 days)"}
            </span>
            <span className="font-medium">{priceLabel}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Credits / month</span>
            <span className="font-medium">{creditsLabel(plan.credits)}</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {isAnnual
              ? "Paid once · credits monthly · no auto-renew"
              : "Paid once · valid 30 days · no auto-renew"}
          </p>
          <div className="my-4 h-px bg-border" />
          <div className="flex items-center justify-between font-semibold">
            <span>Total due now</span>
            <span>{priceLabel}</span>
          </div>

          {method === "card" && cardProvider === "razorpay" ? (
            <Button className="mt-6 w-full" onClick={handleCard} disabled={processing}>
              {processing ? "Processing…" : "Pay with Razorpay (India)"}
            </Button>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
