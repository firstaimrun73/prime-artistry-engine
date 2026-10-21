from pathlib import Path
p = Path("src/lib/generate.functions.ts")
t = p.read_text()
assert len(t.encode()) > 18000 and "PLACEHOLDER" not in t
old_refund = """      if (imageReservationTxId) {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error: refundErr } = await supabaseAdmin.rpc("refund_credits", {
            _transaction_id: imageReservationTxId,
            _user_id: userId,
          });
          if (refundErr) {
            console.error("[generate] CRITICAL image refund_credits failed", refundErr.message);
          }
        } catch (refundThrow) {
          console.error("[generate] CRITICAL image refund_credits threw", refundThrow);
        }
      }"""
new_refund = """      if (imageReservationTxId) {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: refundData, error: refundErr } = await supabaseAdmin.rpc("refund_credits", {
            _transaction_id: imageReservationTxId,
            _user_id: userId,
          });
          if (refundErr) {
            console.error(
              "[generate] CRITICAL image refund_credits RPC error",
              { tx: imageReservationTxId, userId, message: refundErr.message },
            );
          } else {
            const refunded =
              refundData &&
              typeof refundData === "object" &&
              (refundData as { refunded?: unknown }).refunded === true;
            if (refunded) {
              console.info("[generate] image refund confirmed", { tx: imageReservationTxId });
            } else {
              console.error(
                "[generate] CRITICAL image refund_credits not confirmed",
                {
                  tx: imageReservationTxId,
                  userId,
                  refundData,
                  reason: "already_refunded_or_missing",
                },
              );
            }
          }
        } catch (refundThrow) {
          console.error("[generate] CRITICAL image refund_credits threw", {
            tx: imageReservationTxId,
            err: refundThrow,
          });
        }
      }"""
if "already_refunded_or_missing" in t and "image refund confirmed" in t:
    print("already patched")
elif old_refund not in t:
    raise SystemExit("PRECONDITION FAIL refund block")
else:
    t = t.replace(old_refund, new_refund, 1)
    p.write_text(t)
    print("patched", len(t.encode()))
assert "already_refunded_or_missing" in p.read_text()
assert len(p.read_text().encode()) > 18000
