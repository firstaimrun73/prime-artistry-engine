import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { REWARDED_ADS_ENABLED } from "./types";
import { rewardedAdLedgerTxnId, verifyRewardedAdSignature } from "./verify";

describe("rewarded ads master switch", () => {
  it("stays disabled", () => expect(REWARDED_ADS_ENABLED).toBe(false));
});

describe("verifyRewardedAdSignature", () => {
  const secret = "test-secret";
  const base = {
    providerTxnId: "txn-1",
    userId: "user-1",
    sessionId: "sess-1",
    completedAt: "2026-11-22T12:00:00.000Z",
  };
  it("rejects when disabled", () => {
    const signature = createHmac("sha256", secret)
      .update(`${base.providerTxnId}.${base.userId}.${base.sessionId}.${base.completedAt}`)
      .digest("hex");
    const result = verifyRewardedAdSignature({ ...base, signature }, secret);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("disabled");
  });
  it("stable ledger ids", () => {
    expect(rewardedAdLedgerTxnId("monetag", "abc")).toBe("REWARDED-monetag-abc");
  });
});
