/**
 * Server functions for Christmas / seasonal gift campaign.
 * RPCs use auth.uid() only — never pass user id from the client.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CHRISTMAS_CAMPAIGN_ID } from "@/lib/christmas-campaign";

export const startChristmasCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("start_christmas_campaign_session", {
      _campaign_id: CHRISTMAS_CAMPAIGN_ID,
    });
    if (error) throw new Error(error.message || "Could not start campaign session.");
    return data as {
      ok: boolean;
      reason?: string;
      message?: string;
      sessionId?: string;
      startedAt?: string;
      claimedAt?: string | null;
      creditsGranted?: number | null;
      alreadyClaimed?: boolean;
      rewardCredits?: number;
      sessionSeconds?: number;
    };
  });

export const getChristmasCampaignStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("get_christmas_campaign_status", {
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
      campaignActive?: boolean;
      rewardCredits?: number;
      sessionSeconds?: number;
    };
  });

export const claimChristmasGift = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("claim_christmas_gift_credits", {
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
