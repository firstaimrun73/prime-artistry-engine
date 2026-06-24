import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/webhooks/nowpayments")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text();
        const signature = request.headers.get("x-nowpayments-sig");

        const { verifyNowPaymentsIpn, NP_STATUS_MAP } = await import("@/lib/payments.server");
        if (!verifyNowPaymentsIpn(rawBody, signature)) {
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

        const eventId = `${event?.payment_id || event?.invoice_id || event?.order_id}-${event?.payment_status}`;

        const { error: logErr } = await db.from("webhook_events").insert({
          gateway: "nowpayments",
          event_id: eventId,
          event_type: event?.payment_status || "unknown",
          payload: event,
        });
        if (logErr && logErr.code === "23505") {
          return new Response("ok", { status: 200 });
        }

        // Match by NOWPayments order_id (our internal transaction_id) or invoice id.
        const { data: tx } = await db
          .from("payment_transactions")
          .select("*")
          .or(`transaction_id.eq.${event?.order_id},gateway_order_id.eq.${event?.invoice_id}`)
          .maybeSingle();

        if (tx) {
          const mapped = NP_STATUS_MAP[event?.payment_status] || "pending";
          await db
            .from("payment_transactions")
            .update({ payment_status: mapped, gateway_response: event })
            .eq("transaction_id", tx.transaction_id);

          if (event?.payment_status === "finished" && tx.payment_status !== "completed") {
            await db.rpc("apply_payment_credits", {
              _user_id: tx.user_id,
              _transaction_id: tx.transaction_id,
              _credits: tx.credits_purchased,
              _reason: "nowpayments_webhook",
            });
          }
        }

        await db
          .from("webhook_events")
          .update({ processed: true, processed_at: new Date().toISOString() })
          .eq("gateway", "nowpayments")
          .eq("event_id", eventId);

        return new Response("ok", { status: 200 });
      },
    },
  },
});
