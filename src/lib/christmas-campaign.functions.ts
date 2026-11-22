/**
 * Server functions for Christmas Gift Campaign.
 * All credit mutations go through SECURITY DEFINER RPCs.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CHRISTMAS_CAMPAIGN_ID } from "@/lib/christmas-campaign";

export const startChristmasCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("start_christmas_campaign_session", {
      _user_id: context.userId,
      _campaign_id: CHRISTMAS_CAMPAIGN_ID,
    });
    if (error) throw new Error(error.message || "Could not start campaign session.");
    return data as {
      ok: boolean;
      sessionId?: string;
      startedAt?: string;
      claimedAt?: string | null;
      creditsGranted?: number | null;
      alreadyClaimed?: boolean;
    };
  });

export const getChristmasCampaignStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("get_christmas_campaign_status", {
      _user_id: context.userId,
      _campaign_id: CHRISTMAS_CAMPAIGN_ID,
    });
    if (error) throw new Error(error.message || "Could not load campaign status.");
    return data as {
      ok: boolean;
      hasSession?: boolean;
      startedAt?: string;
      claimed?: boolean;
      claimedAt?: string | null;
      creditsGranted?: number | null;
      elapsedSeconds?: number;
      requiredSeconds?: number;
      remainingSeconds?: number;
      eligible?: boolean;
      reason?: string;
    };
  });

export const claimChristmasGift = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("claim_christmas_gift_credits", {
      _user_id: context.userId,
      _campaign_id: CHRISTMAS_CAMPAIGN_ID,
    });
    if (error) throw new Error(error.message || "Could not claim gift.");
    return data as {
      ok: boolean;
      reason?: string;
      message?: string;
      creditsGranted?: number;
      newBalance?: number;
      remainingSeconds?: number;
      elapsedSeconds?: number;
      requiredSeconds?: number;
    };
  });
