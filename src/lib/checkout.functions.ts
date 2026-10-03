/**
 * Checkout server functions.
 * Free is NOT activatable via checkout — signup grants FREE_SIGNUP_CREDITS once
 * via public.handle_new_user() + credit_ledger FREE-SIGNUP-<user_id>.
 * Paid plans go through payment providers in payments.functions.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const checkoutSchema = z.object({
  plan: z.enum(["free", "lite", "plus", "pro", "studio", "business"]),
  currency: z.string().min(1).max(8),
});

/**
 * Rejected for free. Paid plans must use payment providers.
 * Kept so any stale client call fails safely without granting credits.
 */
export const completeCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => checkoutSchema.parse(data))
  .handler(async ({ data }) => {
    if (data.plan === "free") {
      throw new Error(
        "Free credits are granted automatically at signup. There is no free plan checkout.",
      );
    }
    throw new Error("Paid plans must be purchased through the secure payment checkout.");
  });
