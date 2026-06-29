import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  findPlan,
  CURRENCY_SYMBOL,
  CURRENCY_METHODS,
  ALL_METHODS,
  creditsLabel,
  type Currency,
  type PlanId,
  type PaymentMethod,
} from "@/lib/plans";
import { completeCheckout } from "@/lib/generate.functions";
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  createCryptoInvoice,
  getCryptoStatus,
  getPaypalClientId,
  createPaypalOrder,
  capturePaypalOrder,
} from "@/lib/payments.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CreditCard, Bitcoin, Lock, Copy, Check, Wallet } from "lucide-react";

declare global {
  interface Window {
    Razorpay: any;
    paypal: any;
  }
}

export const Route = createFileRoute("/checkout")({
  validateSearch: (s: Record<string, unknown>) => ({
    plan: (["free", "plus", "pro", "studio", "business"].includes(s.plan as string) ? s.plan : "free") as PlanId,
    currency: ["USD", "EUR", "INR"].includes(s.currency as string) ? (s.currency as Currency) : "USD",
  }),
  component: Checkout,
});

const METHOD_ICON: Record<PaymentMethod, typeof CreditCard> = {
  card: CreditCard,
  crypto: Bitcoin,
  paypal: Wallet,
};

const COINS: { id: "usdttrc20" | "btc" | "eth"; label: string }[] = [
  { id: "usdttrc20", label: "USDT" },
  { id: "btc", label: "BTC" },
  { id: "eth", label: "ETH" },
];

type CryptoInvoice = {
  paymentId: string;
  payAddress: string;
  payAmount: number;
  payCurrency: string;
  credits: number;
};

function Checkout() {
  const { plan: planId, currency } = useSearch({ from: "/checkout" });
  const navigate = useNavigate();
  // Guard: redirect back to pricing if the plan is missing/unknown.
  const plan = findPlan(planId as string);
  useEffect(() => {
    if (!plan) navigate({ to: "/pricing" });
  }, [plan, navigate]);
  const { user, refreshProfile } = useAuth();
  const checkout = useServerFn(completeCheckout);
  const createOrder = useServerFn(createRazorpayOrder);
  const verifyPayment = useServerFn(verifyRazorpayPayment);
  const createCrypto = useServerFn(createCryptoInvoice);
  const cryptoStatus = useServerFn(getCryptoStatus);
  const paypalClientId = useServerFn(getPaypalClientId);
  const createPp = useServerFn(createPaypalOrder);
  const capturePp = useServerFn(capturePaypalOrder);

  const methods = CURRENCY_METHODS[currency as Currency];
  const [method, setMethod] = useState<PaymentMethod>(methods[0]);
  const [processing, setProcessing] = useState(false);
  const [coin, setCoin] = useState<(typeof COINS)[number]["id"]>("usdttrc20");
  const [invoice, setInvoice] = useState<CryptoInvoice | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(20 * 60);
  const [cryptoState, setCryptoState] = useState<"waiting" | "confirming" | "confirmed">("waiting");
  const [copied, setCopied] = useState(false);
  const [cardRetry, setCardRetry] = useState<string | null>(null);
  const [cryptoCancelled, setCryptoCancelled] = useState(false);
  const [paypalReady, setPaypalReady] = useState(false);
  const [paypalError, setPaypalError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const paypalContainerRef = useRef<HTMLDivElement | null>(null);
  const paypalRenderedRef = useRef(false);

  const symbol = CURRENCY_SYMBOL[currency as Currency];
  const isFree = planId === "free";

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Load the PayPal JS SDK and render the Buttons when PayPal is selected.
  useEffect(() => {
    if (isFree || method !== "paypal" || !user) return;
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
              const res = await createPp({ data: { plan: planId } });
              internalOrderId = res.internalOrderId;
              return res.orderId;
            },
            onApprove: async (data: { orderID: string }) => {
              setProcessing(true);
              try {
                await capturePp({ data: { orderId: data.orderID, internalOrderId: internalOrderId! } });
                await refreshProfile();
                navigate({ to: "/payment-success" });
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "PayPal payment failed.");
                navigate({ to: "/payment-failed" });
              } finally {
                setProcessing(false);
              }
            },
            onCancel: () => {
              toast.info("PayPal payment cancelled. Try again anytime.");
            },
            onError: (err: unknown) => {
              setPaypalError("PayPal could not process the payment. Please try again.");
              toast.error(err instanceof Error ? err.message : "PayPal error.");
            },
          })
          .render(container);
        setPaypalReady(true);
      } catch {
        setPaypalError("Could not load PayPal. Please try again.");
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
        script.onerror = () => setPaypalError("Could not load PayPal. Please refresh and try again.");
        document.body.appendChild(script);
      } catch {
        setPaypalError("Could not initialize PayPal.");
      }
    };

    init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, user, planId, isFree]);


  // Countdown timer for crypto invoices.
  useEffect(() => {
    if (!invoice) return;
    if (secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [invoice, secondsLeft]);

  const requireAuth = () => {
    if (!user) {
      navigate({ to: "/auth", search: { redirect: "/checkout" } });
      return false;
    }
    return true;
  };

  const handleFree = async () => {
    if (!requireAuth()) return;
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

  const handleCard = async () => {
    if (!requireAuth()) return;
    if (typeof window === "undefined" || !window.Razorpay) {
      toast.error("Payment library is still loading. Please try again in a moment.");
      return;
    }
    setProcessing(true);
    setCardRetry(null);
    try {
      const order = await createOrder({ data: { plan: planId } });
      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Motio2Edit",
        description: "Credits Purchase",
        order_id: order.orderId,
        theme: { color: "#6c63ff" },
        method: {
          upi: false,
          wallet: false,
          netbanking: false,
          card: true,
        },
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
          // Popup closed by the user — keep them here and offer instant retry.
          ondismiss: () => {
            setProcessing(false);
            setCardRetry("Payment window closed. Click to try again.");
          },
        },
      });
      rzp.on("payment.failed", (resp: { error?: { reason?: string; description?: string } }) => {
        setProcessing(false);
        const reason = resp?.error?.reason || "";
        let msg = "Payment failed. Please try again.";
        if (/declin|card/i.test(reason) || /declin/i.test(resp?.error?.description || "")) {
          msg = "Card declined. Try another card.";
        } else if (/network|gateway|timeout/i.test(reason)) {
          msg = "Network error. Please try again.";
        }
        setCardRetry(msg);
        toast.error(msg);
      });
      rzp.open();
    } catch (err) {
      setProcessing(false);
      const msg = err instanceof Error ? err.message : "Could not start payment.";
      setCardRetry(msg);
      toast.error(msg);
    }
  };


  const startPolling = (paymentId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await cryptoStatus({ data: { invoiceId: paymentId } });
        if (["confirming", "sending", "confirmed"].includes(res.status)) setCryptoState("confirming");
        if (res.outcome === "success") {
          setCryptoState("confirmed");
          if (pollRef.current) clearInterval(pollRef.current);
          await refreshProfile();
          navigate({ to: "/payment-success" });
        } else if (res.outcome === "failed") {
          if (pollRef.current) clearInterval(pollRef.current);
          navigate({ to: "/payment-failed" });
        }
      } catch {
        /* keep polling */
      }
    }, 10000);
  };

  const handleCrypto = async () => {
    if (!requireAuth()) return;
    setProcessing(true);
    setCryptoCancelled(false);
    try {
      const inv = await createCrypto({ data: { plan: planId, payCurrency: coin } });
      setInvoice(inv as CryptoInvoice);
      setSecondsLeft(20 * 60);
      setCryptoState("waiting");
      startPolling(inv.paymentId!);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create crypto payment.");
    } finally {
      setProcessing(false);
    }
  };

  // Cancel an in-progress crypto payment: clear the address, stop polling,
  // return to selection, and let the user retry instantly.
  const cancelPayment = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setInvoice(null);
    setCryptoState("waiting");
    setSecondsLeft(20 * 60);
    setCryptoCancelled(true);
    toast.info("Payment cancelled. Try again anytime.");
  };


  const copyAddress = async () => {
    if (!invoice) return;
    try {
      await navigator.clipboard.writeText(invoice.payAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy address.");
    }
  };

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  // Plan is undefined (invalid/missing param) — redirect handled by the effect above.
  if (!plan) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto grid max-w-4xl gap-8 px-4 py-16 md:grid-cols-[1fr_320px]">
        <div>
          <h1 className="text-2xl font-bold">Checkout</h1>
          <p className="mt-1 text-sm text-muted-foreground">Complete your {plan.name} plan purchase.</p>

          {!isFree && (
            <>
              <div
                style={{
                  background: "rgba(255,107,53,0.05)",
                  border: "1px solid rgba(255,107,53,0.3)",
                  borderRadius: "12px",
                  padding: "16px",
                  textAlign: "center",
                  marginBottom: "16px",
                }}
              >
                <p style={{ color: "#ffffff", margin: "0 0 4px", fontSize: "15px", fontWeight: 600 }}>
                  💳 Credit / Debit Card
                </p>
                <p style={{ color: "#FF6B35", margin: 0, fontSize: "12px" }}>Coming Soon</p>
              </div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Payment method
              </h2>
              <div className="mt-3 space-y-3">
                {ALL_METHODS.filter((m) => methods.includes(m.id)).map((m) => {
                  const Icon = METHOD_ICON[m.id];
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        setMethod(m.id);
                        setInvoice(null);
                        setCardRetry(null);
                        setCryptoCancelled(false);
                      }}
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

              {method === "crypto" && !invoice && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Select coin</h3>
                  <div className="mt-3 flex gap-3">
                    {COINS.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setCoin(c.id)}
                        className={`flex-1 rounded-xl border p-3 text-center font-medium transition-colors ${
                          coin === c.id ? "border-primary bg-accent" : "border-border bg-card hover:border-muted-foreground"
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {method === "crypto" && invoice && (
                <div className="mt-6 rounded-2xl border border-border bg-card p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Send crypto payment</h3>
                    <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">
                      {mins}:{secs.toString().padStart(2, "0")}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Status:{" "}
                    <span className="font-medium capitalize text-foreground">
                      {cryptoState === "waiting" ? "Waiting for payment" : cryptoState === "confirming" ? "Confirming" : "Confirmed"}
                    </span>
                  </p>

                  <div className="mt-4 flex justify-center">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(invoice.payAddress)}`}
                      alt="Payment QR code"
                      width={180}
                      height={180}
                      className="rounded-lg bg-white p-2"
                    />
                  </div>

                  <div className="mt-4">
                    <p className="text-xs text-muted-foreground">Exact amount to send</p>
                    <p className="text-lg font-bold">
                      {invoice.payAmount} {invoice.payCurrency.toUpperCase()}
                    </p>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs text-muted-foreground">Wallet address</p>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="flex-1 break-all rounded-lg border border-border bg-background p-2 text-xs">
                        {invoice.payAddress}
                      </code>
                      <Button size="icon" variant="outline" onClick={copyAddress}>
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Credits are added automatically once the payment is confirmed on-chain.
                  </p>
                  <Button variant="outline" className="mt-4 w-full" onClick={cancelPayment}>
                    Cancel Payment
                  </Button>
                </div>
              )}

              {/* Crypto cancelled — instant retry options, no cooldown. */}
              {method === "crypto" && !invoice && cryptoCancelled && (
                <div className="mt-6 rounded-xl border border-border bg-card p-4">
                  <p className="text-sm text-muted-foreground">Try again anytime.</p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <Button className="flex-1" onClick={handleCrypto} disabled={processing}>
                      Try Crypto Again
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setCryptoCancelled(false);
                        setMethod("card");
                      }}
                    >
                      Pay with Card Instead
                    </Button>
                  </div>
                </div>
              )}

              {/* PayPal — official PayPal Buttons rendered by the SDK. */}
              {method === "paypal" && (
                <div className="mt-6 rounded-2xl border border-border bg-card p-6">
                  <h3 className="font-semibold">Pay with PayPal</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    You'll be charged ${plan.price[currency as Currency]} (USD). Credits are added instantly after payment.
                  </p>
                  {!paypalReady && !paypalError && (
                    <p className="mt-4 text-sm text-muted-foreground">Loading PayPal…</p>
                  )}
                  {paypalError && (
                    <p className="mt-4 text-sm text-destructive">{paypalError}</p>
                  )}
                  <div ref={paypalContainerRef} className="mt-4" />
                </div>
              )}



              {/* Card popup closed / failed — instant retry options, no cooldown. */}
              {method === "card" && cardRetry && (
                <div className="mt-6 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
                  <p className="text-sm font-medium text-foreground">{cardRetry}</p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <Button className="flex-1" onClick={handleCard} disabled={processing}>
                      Try Card Payment Again
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setCardRetry(null);
                        setMethod("crypto");
                      }}
                    >
                      Switch to Crypto Instead
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}


          <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" /> Secured payments. Card payments are processed in INR via Razorpay.
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
            <span className="font-medium">{creditsLabel(plan.credits)}</span>
          </div>
          <div className="my-4 h-px bg-border" />
          <div className="flex items-center justify-between font-semibold">
            <span>Total</span>
            <span>
              {symbol}
              {plan.price[currency as Currency]}
            </span>
          </div>

          {isFree ? (
            <Button className="mt-6 w-full" onClick={handleFree} disabled={processing}>
              {processing ? "Processing…" : "Activate free plan"}
            </Button>
          ) : method === "card" ? (
            <>
              <Button className="mt-6 w-full" onClick={handleCard} disabled={processing}>
                {processing ? "Processing…" : "💳 Pay with Credit / Debit Card"}
              </Button>
              <p className="mt-2 text-center text-xs text-muted-foreground">Secured by Razorpay</p>
            </>
          ) : invoice ? (
            <p className="mt-6 text-center text-xs text-muted-foreground">Waiting for your crypto payment…</p>
          ) : (
            <>
              <Button className="mt-6 w-full" onClick={handleCrypto} disabled={processing}>
                {processing ? "Processing…" : "🪙 Pay with Crypto"}
              </Button>
              <p className="mt-2 text-center text-xs text-muted-foreground">USDT / BTC / ETH</p>
            </>
          )}

          <Link to="/pricing" className="mt-4 block text-center text-xs text-muted-foreground hover:text-foreground">
            ← Back to pricing
          </Link>
        </aside>
      </div>
    </div>
  );
}
