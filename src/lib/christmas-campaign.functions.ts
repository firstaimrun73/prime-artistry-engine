/**
 * Server functions for Christmas / seasonal gift campaign.
 * RPCs use auth.uid() only. Christmas reward hard-capped at 25 on the response path.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CHRISTMAS_CAMPAIGN_ID } from "@/lib/christmas-campaign";
import {
  CHRISTMAS_FIXED_REWARD,
  CHRISTMAS_FIXED_SESSION_SECONDS,
  type CampaignClaimResult,
  type CampaignStartResult,
  type CampaignStatusResult,
} from "@/lib/christmas-campaign.types";

function asObject(data: unknown): Record<string, unknown> | null {
  if (data == null) return null;
  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data) as unknown;
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  if (typeof data === "object") return data as Record<string, unknown>;
  return null;
}

function num(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return undefined;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function bool(v: unknown): boolean | undefined {
  return typeof v === "boolean" ? v : undefined;
}

function capChristmasReward(credits: number | undefined): number | undefined {
  if (credits == null) return undefined;
  return Math.min(Math.max(0, Math.floor(credits)), CHRISTMAS_FIXED_REWARD);
}

function normalizeStart(data: unknown): CampaignStartResult {
  const o = asObject(data);
  if (!o) return { ok: false, reason: "invalid_response", message: "Invalid campaign response." };
  return {
    ok: o.ok === true,
    reason: str(o.reason),
    message: str(o.message),
    sessionId: str(o.sessionId) ?? str(o.session_id),
    startedAt: str(o.startedAt) ?? str(o.started_at),
    claimedAt: (str(o.claimedAt) ?? str(o.claimed_at) ?? null) as string | null,
    creditsGranted: capChristmasReward(num(o.creditsGranted) ?? num(o.credits_granted)),
    alreadyClaimed: bool(o.alreadyClaimed) ?? bool(o.already_claimed) ?? false,
    rewardCredits: CHRISTMAS_FIXED_REWARD,
    sessionSeconds: CHRISTMAS_FIXED_SESSION_SECONDS,
  };
}

function normalizeStatus(data: unknown): CampaignStatusResult {
  const o = asObject(data);
  if (!o) return { ok: false, reason: "invalid_response" };
  return {
    ok: o.ok === true,
    reason: str(o.reason),
    hasSession: bool(o.hasSession) ?? bool(o.has_session) ?? false,
    startedAt: str(o.startedAt) ?? str(o.started_at),
    claimed: bool(o.claimed) ?? false,
    claimedAt: (str(o.claimedAt) ?? str(o.claimed_at) ?? null) as string | null,
    creditsGranted: capChristmasReward(num(o.creditsGranted) ?? num(o.credits_granted)),
    elapsedSeconds: num(o.elapsedSeconds) ?? num(o.elapsed_seconds),
    requiredSeconds: CHRISTMAS_FIXED_SESSION_SECONDS,
    remainingSeconds: num(o.remainingSeconds) ?? num(o.remaining_seconds),
    eligible: bool(o.eligible) ?? false,
    campaignActive: bool(o.campaignActive) ?? bool(o.campaign_active),
    rewardCredits: CHRISTMAS_FIXED_REWARD,
    sessionSeconds: CHRISTMAS_FIXED_SESSION_SECONDS,
    countryAllowed: bool(o.countryAllowed) ?? bool(o.country_allowed),
  };
}

function normalizeClaim(data: unknown): CampaignClaimResult {
  const o = asObject(data);
  if (!o) return { ok: false, reason: "invalid_response", message: "Invalid claim response." };
  const ok = o.ok === true;
  const granted = capChristmasReward(num(o.creditsGranted) ?? num(o.credits_granted));
  return {
    ok,
    reason: str(o.reason),
    message: str(o.message),
    creditsGranted: ok ? CHRISTMAS_FIXED_REWARD : granted,
    newBalance: num(o.newBalance) ?? num(o.new_balance),
    remainingSeconds: num(o.remainingSeconds) ?? num(o.remaining_seconds),
    elapsedSeconds: num(o.elapsedSeconds) ?? num(o.elapsed_seconds),
    requiredSeconds: CHRISTMAS_FIXED_SESSION_SECONDS,
    claimedAt: str(o.claimedAt) ?? str(o.claimed_at),
  };
}

export const startChristmasCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("start_christmas_campaign_session", {
      _campaign_id: CHRISTMAS_CAMPAIGN_ID,
    });
    if (error) {
      const msg = error.message || "Could not start campaign session.";
      if (/not_authenticated|jwt|auth/i.test(msg)) {
        return { ok: false, reason: "auth_required", message: "Sign in required." } satisfies CampaignStartResult;
      }
      throw new Error(msg);
    }
    return normalizeStart(data);
  });

export const getChristmasCampaignStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("get_christmas_campaign_status", {
      _campaign_id: CHRISTMAS_CAMPAIGN_ID,
    });
    if (error) {
      const msg = error.message || "Could not load campaign status.";
      if (/not_authenticated|jwt|auth/i.test(msg)) {
        return { ok: false, reason: "auth_required" } satisfies CampaignStatusResult;
      }
      throw new Error(msg);
    }
    return normalizeStatus(data);
  });

export const claimChristmasGift = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("claim_christmas_gift_credits", {
      _campaign_id: CHRISTMAS_CAMPAIGN_ID,
    });
    if (error) {
      const msg = error.message || "Could not claim gift.";
      if (/not_authenticated|jwt|auth/i.test(msg)) {
        return { ok: false, reason: "auth_required", message: "Sign in required." } satisfies CampaignClaimResult;
      }
      throw new Error(msg);
    }
    const result = normalizeClaim(data);
    if (result.ok && result.creditsGranted !== CHRISTMAS_FIXED_REWARD) {
      result.creditsGranted = CHRISTMAS_FIXED_REWARD;
    }
    return result;
  });
