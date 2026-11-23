import { createHmac, timingSafeEqual } from "node:crypto";
import type { RewardedAdCallbackPayload } from "./types";
import { REWARDED_ADS_ENABLED } from "./types";

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: "disabled" | "missing_secret" | "bad_signature" | "missing_fields" };

export function verifyRewardedAdSignature(
  payload: RewardedAdCallbackPayload,
  secret: string | undefined,
): VerifyResult {
  if (!REWARDED_ADS_ENABLED) return { ok: false, reason: "disabled" };
  if (!secret) return { ok: false, reason: "missing_secret" };
  const { providerTxnId, userId, sessionId, completedAt, signature } = payload;
  if (!providerTxnId || !userId || !sessionId || !completedAt || !signature) {
    return { ok: false, reason: "missing_fields" };
  }
  const body = `${providerTxnId}.${userId}.${sessionId}.${completedAt}`;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(signature, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, reason: "bad_signature" };
    }
  } catch {
    return { ok: false, reason: "bad_signature" };
  }
  return { ok: true };
}

export function rewardedAdLedgerTxnId(provider: string, providerTxnId: string): string {
  return `REWARDED-${provider}-${providerTxnId}`;
}
