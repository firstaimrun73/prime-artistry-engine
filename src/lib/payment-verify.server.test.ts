import { describe, it, expect } from "vitest";
import {
  amountsMatch,
  paypalCaptureChecks,
  razorpayVerifyChecks,
  rpcSucceeded,
  updateSucceeded,
} from "./payment-verify.server";
import {
  buildAnnualGrantTxId,
  computePlanExpiry,
  isExpirationEmailEligible,
  validityDays,
} from "./plan-lifecycle.server";

describe("amountsMatch", () => {
  it("matches USD within tolerance", () => {
    expect(amountsMatch(12, 12, "USD")).toBe(true);
    expect(amountsMatch(12, 11.5, "USD")).toBe(false);
  });
});

describe("paypalCaptureChecks fail-closed", () => {
  const baseTx = {
    gateway_order_id: "ORDER1",
    amount: 25,
    currency: "USD",
    payment_status: "processing",
    user_id: "u1",
    transaction_id: "pp_1",
  };

  function captured(over: any = {}) {
    return {
      status: "COMPLETED",
      purchase_units: [
        {
          custom_id: "pp_1",
          reference_id: "pp_1",
          payments: {
            captures: [{ amount: { value: "25.00", currency_code: "USD" }, id: "C1" }],
          },
          ...(over.pu || {}),
        },
      ],
      ...(over.root || {}),
    };
  }

  it("accepts valid capture", () => {
    expect(
      paypalCaptureChecks({ tx: baseTx, orderId: "ORDER1", userId: "u1", captured: captured() }),
    ).toEqual({ ok: true });
  });

  it("rejects missing currency", () => {
    const bad = captured({
      pu: {
        payments: { captures: [{ amount: { value: "25.00", currency_code: "" } }] },
      },
    });
    const r = paypalCaptureChecks({ tx: baseTx, orderId: "ORDER1", userId: "u1", captured: bad });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("currency_missing");
  });

  it("rejects missing amount", () => {
    const bad = {
      status: "COMPLETED",
      purchase_units: [{ custom_id: "pp_1", payments: { captures: [{ amount: {} }] } }],
    };
    const r = paypalCaptureChecks({ tx: baseTx, orderId: "ORDER1", userId: "u1", captured: bad });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("amount_missing");
  });

  it("rejects missing reference", () => {
    const bad = captured({ pu: { custom_id: undefined, reference_id: undefined } });
    // remove ids from unit
    bad.purchase_units[0].custom_id = undefined;
    bad.purchase_units[0].reference_id = undefined;
    const r = paypalCaptureChecks({ tx: baseTx, orderId: "ORDER1", userId: "u1", captured: bad });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("reference_mismatch");
  });

  it("rejects wrong order id", () => {
    const r = paypalCaptureChecks({
      tx: baseTx,
      orderId: "OTHER",
      userId: "u1",
      captured: captured(),
    });
    expect(r.ok).toBe(false);
  });
});

describe("razorpayVerifyChecks fail-closed", () => {
  const tx = {
    gateway_order_id: "order_1",
    amount: 999,
    currency: "INR",
    payment_status: "processing",
    user_id: "u1",
  };

  it("accepts captured API payment", () => {
    expect(
      razorpayVerifyChecks({
        tx,
        userId: "u1",
        razorpayOrderId: "order_1",
        razorpayPaymentId: "pay_1",
        paidMajor: 999,
        paymentStatus: "captured",
        apiOrderId: "order_1",
        apiPaymentId: "pay_1",
        apiFetchOk: true,
      }),
    ).toEqual({ ok: true });
  });

  it("rejects when API fetch fails", () => {
    const r = razorpayVerifyChecks({
      tx,
      userId: "u1",
      razorpayOrderId: "order_1",
      razorpayPaymentId: "pay_1",
      paidMajor: 999,
      paymentStatus: "captured",
      apiFetchOk: false,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("api_fetch_failed");
  });

  it("rejects missing amount even if status captured", () => {
    const r = razorpayVerifyChecks({
      tx,
      userId: "u1",
      razorpayOrderId: "order_1",
      razorpayPaymentId: "pay_1",
      paidMajor: null,
      paymentStatus: "captured",
      apiFetchOk: true,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("amount_missing");
  });

  it("rejects not captured", () => {
    const r = razorpayVerifyChecks({
      tx,
      userId: "u1",
      razorpayOrderId: "order_1",
      razorpayPaymentId: "pay_1",
      paidMajor: 999,
      paymentStatus: "authorized",
      apiFetchOk: true,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("not_captured");
  });
});

describe("rpcSucceeded and updateSucceeded", () => {
  it("rpc detects error", () => {
    expect(rpcSucceeded({ data: null, error: { message: "fail" } }).ok).toBe(false);
  });
  it("update fails on zero rows", () => {
    expect(updateSucceeded({ data: [], error: null }).ok).toBe(false);
  });
  it("update ok with rows", () => {
    expect(updateSucceeded({ data: [{ id: "1" }], error: null }).ok).toBe(true);
  });
});

describe("expiration email eligibility after demotion", () => {
  it("still eligible when plan is free but email not sent", () => {
    expect(
      isExpirationEmailEligible({
        plan_expires_at: "2020-01-01T00:00:00Z",
        expiration_email_sent_at: null,
        email: "a@b.com",
        now: new Date("2026-01-01T00:00:00Z"),
      }),
    ).toBe(true);
  });
  it("not eligible after successful send", () => {
    expect(
      isExpirationEmailEligible({
        plan_expires_at: "2020-01-01T00:00:00Z",
        expiration_email_sent_at: "2020-01-02T00:00:00Z",
        email: "a@b.com",
        now: new Date("2026-01-01T00:00:00Z"),
      }),
    ).toBe(false);
  });
});

describe("plan helpers", () => {
  it("validity", () => {
    expect(validityDays("month")).toBe(30);
    expect(validityDays("year")).toBe(365);
  });
  it("grant tx id", () => {
    expect(buildAnnualGrantTxId("u", "t")).toBe("annual_grant_u_t");
  });
  it("expiry", () => {
    const from = new Date("2026-01-01T00:00:00Z");
    expect(computePlanExpiry(from, "month").getTime() - from.getTime()).toBe(
      30 * 24 * 60 * 60 * 1000,
    );
  });
});
