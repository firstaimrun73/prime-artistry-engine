import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/webhooks/paypal")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text();
        const headers: Record<string, string | null> = {
          "paypal-auth-algo": request.headers.get("paypal-auth-algo"),
          "paypal-cert-url": request.headers.get("paypal-cert-url"),
          "paypal-transmission-id": request.headers.get("paypal-transmission-id"),
          "paypal-transmission-sig": request.headers.get("paypal-transmission-sig"),
          "paypal-transmission-time": request.headers.get("paypal-transmission-time"),
        };

        const { verifyPaypalWebhook, planFromCredits, PLAN_PURCHASE } = await import(
          "@/lib/payments.server"
        );
        if (!(await verifyPaypalWebhook(headers, rawBody))) {
          return new Response("Invalid signature", { status: 401 });
        }

        let event: any;
        try {
          event = JSON.parse(rawBody);
        } catch {
          return new Response("Bad payload", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as any;

        const eventId = event?.id || `${event?.event_type}-${Date.now()}`;
        const eventType: string = event?.event_type || "unknown";

        // Idempotent event log — duplicate deliveries short-circuit here.
        const { error: logErr } = await db.from("webhook_events").insert({
          gateway: "paypal",
          event_id: eventId,
          event_type: eventType,
          payload: event,
        });
        if (logErr && logErr.code === "23505") {
          return new Response("ok", { status: 200 });
        }

        const resource = event?.resource || {};

        // ── One-time order capture (top-ups + legacy plan purchases) ──
        if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
          const customId: string | undefined = resource?.custom_id;
          const orderId: string | undefined = resource?.supplementary_data?.related_ids?.order_id;

          let tx: any = null;
          if (customId) {
            const { data } = await db
              .from("payment_transactions")
              .select("*")
              .eq("transaction_id", customId)
              .eq("payment_method", "paypal")
              .maybeSingle();
            tx = data;
          }
          if (!tx && orderId) {
            const { data } = await db
              .from("payment_transactions")
              .select("*")
              .eq("gateway_order_id", orderId)
              .eq("payment_method", "paypal")
              .maybeSingle();
            tx = data;
          }

          if (tx && tx.payment_status !== "completed") {
            await db
              .from("payment_transactions")
              .update({ payment_status: "processing", gateway_response: event })
              .eq("transaction_id", tx.transaction_id);

            await db.rpc("apply_payment_credits", {
              _user_id: tx.user_id,
              _transaction_id: tx.transaction_id,
              _credits: tx.credits_purchased,
              _reason: "paypal_webhook",
            });

            const plan = planFromCredits(tx.credits_purchased);
            if (plan) {
              await db
                .from("profiles")
                .update({ plan, updated_at: new Date().toISOString() })
                .eq("id", tx.user_id);
            }
          }
        }

        // ── Subscription activated (first approval) ──
        if (
          eventType === "BILLING.SUBSCRIPTION.ACTIVATED" ||
          eventType === "BILLING.SUBSCRIPTION.CREATED"
        ) {
          const subId: string | undefined = resource?.id;
          const customId: string | undefined = resource?.custom_id;
          const status: string = (resource?.status || "").toUpperCase();

          if (subId) {
            const now = new Date();
            const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

            // Find pending transaction by custom_id or gateway_order_id = subId
            let tx: any = null;
            if (customId) {
              const { data } = await db
                .from("payment_transactions")
                .select("*")
                .eq("transaction_id", customId)
                .maybeSingle();
              tx = data;
            }
            if (!tx) {
              const { data } = await db
                .from("payment_transactions")
                .select("*")
                .eq("gateway_order_id", subId)
                .maybeSingle();
              tx = data;
            }

            const userId = tx?.user_id;
            const plan =
              (tx?.metadata as any)?.plan ||
              planFromCredits(tx?.credits_purchased ?? 0) ||
              "lite";

            if (userId) {
              // Upsert subscription record
              const { data: existing } = await db
                .from("subscriptions")
                .select("id")
                .eq("provider_subscription_id", subId)
                .maybeSingle();

              if (existing) {
                await db
                  .from("subscriptions")
                  .update({
                    status: status === "ACTIVE" || eventType.endsWith("ACTIVATED") ? "active" : "pending",
                    plan,
                    auto_renew: true,
                    current_period_start: now.toISOString(),
                    current_period_end: periodEnd.toISOString(),
                    updated_at: now.toISOString(),
                  })
                  .eq("id", existing.id);
              } else {
                await db.from("subscriptions").insert({
                  user_id: userId,
                  plan,
                  status: status === "ACTIVE" || eventType.endsWith("ACTIVATED") ? "active" : "pending",
                  provider: "paypal",
                  provider_subscription_id: subId,
                  auto_renew: true,
                  current_period_start: now.toISOString(),
                  current_period_end: periodEnd.toISOString(),
                });
              }

              // First activation: grant credits once if not already completed
              if (
                (eventType === "BILLING.SUBSCRIPTION.ACTIVATED" || status === "ACTIVE") &&
                tx &&
                tx.payment_status !== "completed"
              ) {
                await db
                  .from("payment_transactions")
                  .update({ payment_status: "processing", gateway_response: event })
                  .eq("transaction_id", tx.transaction_id);

                await db.rpc("apply_payment_credits", {
                  _user_id: userId,
                  _transaction_id: tx.transaction_id,
                  _credits: tx.credits_purchased,
                  _reason: "paypal_subscription_activated",
                });

                await db
                  .from("profiles")
                  .update({ plan, updated_at: now.toISOString() })
                  .eq("id", userId);
              }
            }
          }
        }

        // ── Subscription cancelled / suspended / expired ──
        if (
          eventType === "BILLING.SUBSCRIPTION.CANCELLED" ||
          eventType === "BILLING.SUBSCRIPTION.SUSPENDED" ||
          eventType === "BILLING.SUBSCRIPTION.EXPIRED"
        ) {
          const subId: string | undefined = resource?.id;
          if (subId) {
            const statusMap: Record<string, string> = {
              "BILLING.SUBSCRIPTION.CANCELLED": "cancelled",
              "BILLING.SUBSCRIPTION.SUSPENDED": "suspended",
              "BILLING.SUBSCRIPTION.EXPIRED": "expired",
            };
            await db
              .from("subscriptions")
              .update({
                status: statusMap[eventType] || "cancelled",
                auto_renew: false,
                cancelled_at:
                  eventType === "BILLING.SUBSCRIPTION.CANCELLED"
                    ? new Date().toISOString()
                    : undefined,
                updated_at: new Date().toISOString(),
              })
              .eq("provider_subscription_id", subId);
          }
        }

        // ── Failed renewal ──
        if (eventType === "BILLING.SUBSCRIPTION.PAYMENT.FAILED") {
          const subId: string | undefined = resource?.billing_agreement_id || resource?.id;
          if (subId) {
            await db
              .from("subscriptions")
              .update({
                status: "past_due",
                updated_at: new Date().toISOString(),
              })
              .eq("provider_subscription_id", subId);
          }
        }

        // ── Recurring sale completed (renewal payment) ──
        // PAYMENT.SALE.COMPLETED fires for subscription renewals.
        if (eventType === "PAYMENT.SALE.COMPLETED") {
          const billingAgreementId: string | undefined =
            resource?.billing_agreement_id || resource?.billing_subscription_id;
          const saleId: string | undefined = resource?.id;
          const amount = Number(resource?.amount?.total || resource?.amount?.value || 0);

          if (billingAgreementId && saleId) {
            // Idempotent: do not re-credit the same sale
            const renewalTxId = `paypal_sale_${saleId}`;
            const { data: existingSale } = await db
              .from("payment_transactions")
              .select("id, payment_status")
              .eq("transaction_id", renewalTxId)
              .maybeSingle();

            if (!existingSale || existingSale.payment_status !== "completed") {
              const { data: sub } = await db
                .from("subscriptions")
                .select("*")
                .eq("provider_subscription_id", billingAgreementId)
                .maybeSingle();

              if (sub?.user_id) {
                const planId = (sub.plan as keyof typeof PLAN_PURCHASE) || "lite";
                const pkg = PLAN_PURCHASE[planId];
                const credits = pkg?.credits ?? 0;
                const now = new Date();
                const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

                if (!existingSale) {
                  await db.from("payment_transactions").insert({
                    user_id: sub.user_id,
                    payment_method: "paypal",
                    amount: amount || pkg?.amountUSD || 0,
                    currency: resource?.amount?.currency || "USD",
                    credits_purchased: credits,
                    transaction_id: renewalTxId,
                    gateway_order_id: saleId,
                    payment_status: "processing",
                    gateway_response: event,
                    metadata: {
                      kind: "paypal_subscription_renewal",
                      plan: planId,
                      paypal_subscription_id: billingAgreementId,
                      sale_id: saleId,
                    },
                  });
                }

                if (credits > 0) {
                  await db.rpc("apply_payment_credits", {
                    _user_id: sub.user_id,
                    _transaction_id: renewalTxId,
                    _credits: credits,
                    _reason: "paypal_subscription_renewal",
                  });
                }

                await db
                  .from("subscriptions")
                  .update({
                    status: "active",
                    auto_renew: true,
                    current_period_start: now.toISOString(),
                    current_period_end: periodEnd.toISOString(),
                    updated_at: now.toISOString(),
                  })
                  .eq("id", sub.id);

                await db
                  .from("profiles")
                  .update({ plan: planId, updated_at: now.toISOString() })
                  .eq("id", sub.user_id);
              }
            }
          }
        }

        await db
          .from("webhook_events")
          .update({ processed: true, processed_at: new Date().toISOString() })
          .eq("gateway", "paypal")
          .eq("event_id", eventId);

        return new Response("ok", { status: 200 });
      },
    },
  },
});
