/**
 * Checkout server functions (free-plan switch).
 * Paid plans go through payment providers in payments.functions.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PlanId } from "@/lib/plans";

const checkoutSchema = z.object({
  plan: z.enum(["free", "lite", "plus", "pro", "studio", "business"]),
  currency: z.string().min(1).max(8),
});

/** Free-plan switch only. Paid plans must go through payment providers. */
export const completeCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => checkoutSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.plan !== "free") {
      throw new Error("Paid plans must be purchased through the secure payment checkout.");
    }
    const { error } = await supabase
      .from("profiles")
      .update({ plan: "free", currency: data.currency, updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (error) throw new Error("Could not update your plan.");
    return { ok: true, plan: "free" as PlanId, credits: 0 };
  });
