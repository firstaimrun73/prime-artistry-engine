import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/webhooks/razorpay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text();
        const signature = request.headers.get("x-razorpay-signature");

        const { verifyRazorpayWebhook } = await import("@/lib/payments.server");
        if (!verifyRazorpayWebhook(rawBody, signature)) {
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

        const eventId =
          event?.payload?.payment?.entity?.id || event?.id || `${event?.event}-${Date.now()}`;

        // Idempotent event log.
        const { error: logErr } = await db
          .from("webhook_events")
          .insert({ gateway: "razorpay", event_id: eventId, event_type: event?.event || "unknown", payload: event });
        if (logErr && logErr.code === "23505") {
          return new Response("ok", { status: 200 }); // already handled
        }

        if (event?.event === "payment.captured" || event?.event === "order.paid") {
          const entity = event?.payload?.payment?.entity || {};
          const orderId = entity.order_id;
          if (orderId) {
            const { data: tx } = await db
              .from("payment_transactions")
              .select("*")
              .eq("gateway_order_id", orderId)
              .maybeSingle();
            if (tx && tx.payment_status !== "completed") {
              await db.rpc("apply_payment_credits", {
                _user_id: tx.user_id,
                _transaction_id: tx.transaction_id,
                _credits: tx.credits_purchased,
                _reason: "razorpay_webhook",
              });
            }
          }
        }

        await db
          .from("webhook_events")
          .update({ processed: true, processed_at: new Date().toISOString() })
          .eq("gateway", "razorpay")
          .eq("event_id", eventId);

        return new Response("ok", { status: 200 });
      },
    },
  },
});
