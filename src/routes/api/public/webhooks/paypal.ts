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

        const { verifyPaypalWebhook } = await import("@/lib/payments.server");
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

        // Idempotent event log — duplicate deliveries short-circuit here.
        const { error: logErr } = await db.from("webhook_events").insert({
          gateway: "paypal",
          event_id: eventId,
          event_type: event?.event_type || "unknown",
          payload: event,
        });
        if (logErr && logErr.code === "23505") {
          return new Response("ok", { status: 200 });
        }

        if (event?.event_type === "PAYMENT.CAPTURE.COMPLETED") {
          const resource = event?.resource || {};
          // custom_id carries our internal transaction_id; order id is a fallback match.
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

            // apply_payment_credits is idempotent (unique transaction_id in credit_ledger),
            // so a duplicate capture cannot double-credit.
            await db.rpc("apply_payment_credits", {
              _user_id: tx.user_id,
              _transaction_id: tx.transaction_id,
              _credits: tx.credits_purchased,
              _reason: "paypal_webhook",
            });
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
