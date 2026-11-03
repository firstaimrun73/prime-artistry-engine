import { describe, it, expect } from "vitest";
import {
  amountsMatch,
  paypalCaptureChecks,
  razorpayVerifyChecks,
  rpcSucceeded,
} from "./payment-verify.server";
import { buildAnnualGrantTxId, computePlanExpiry, validityDays } from "./plan-lifecycle.server";

describe("amountsMatch", () => {
  it("matches USD within tolerance", () => {
    expect(amountsMatch(12, 12, "USD")).toBe(true);
    expect(amountsMatch(12, 12.005, "USD")).toBe(true);
    expect(amountsMatch(12, 11.5, "USD")).toBe(false);
  });
  it("rejects non-finite", () => {
    expect(amountsMatch(NaN, 10, "USD")).toBe(false);
  });
});

describe("paypalCaptureChecks", () => {
  const baseTx = {
    gateway_order_id: "ORDER1",
    amount: 25,
    currency: "USD",
    payment_status: "pending",
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
          ...over.pu,
        },
      ],
      ...over.root,
    };
  }

  it("accepts valid capture", () => {
    expect(
      paypalCaptureChecks({ tx: baseTx, orderId: "ORDER1", userId: "u1", captured: captured() }),
    ).toEqual({ ok: true });
  });

  it("rejects wrong order id", () => {
    const r = paypalCaptureChecks({
      tx: baseTx,
      orderId: "OTHER",
      userId: "u1",
      captured: captured(),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("order_id_mismatch");
  });

  it("rejects wrong amount", () => {
    const bad = captured({
      pu: {
        payments: { captures: [{ amount: { value: "1.00", currency_code: "USD" } }] },
      },
    });
    const r = paypalCaptureChecks({ tx: baseTx, orderId: "ORDER1", userId: "u1", captured: bad });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("amount_mismatch");
  });

  it("rejects missing amount", () => {
    const bad = { status: "COMPLETED", purchase_units: [{ payments: { captures: [{}] } }] };
    const r = paypalCaptureChecks({ tx: baseTx, orderId: "ORDER1", userId: "u1", captured: bad });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("amount_missing");
  });

  it("rejects wrong currency", () => {
    const bad = captured({
      pu: {
        payments: { captures: [{ amount: { value: "25.00", currency_code: "EUR" } }] },
      },
    });
    const r = paypalCaptureChecks({ tx: baseTx, orderId: "ORDER1", userId: "u1", captured: bad });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("currency_mismatch");
  });
});

describe("razorpayVerifyChecks", () => {
  const tx = {
    gateway_order_id: "order_1",
    amount: 999,
    currency: "INR",
    payment_status: "pending",
    user_id: "u1",
  };

  it("accepts captured payment with matching amount", () => {
    expect(
      razorpayVerifyChecks({
        tx,
        userId: "u1",
        razorpayOrderId: "order_1",
        paidMajor: 999,
        paymentStatus: "captured",
      }),
    ).toEqual({ ok: true });
  });

  it("rejects invalid signature path via order mismatch", () => {
    const r = razorpayVerifyChecks({
      tx,
      userId: "u1",
      razorpayOrderId: "order_other",
      paymentStatus: "captured",
    });
    expect(r.ok).toBe(false);
  });

  it("rejects not captured", () => {
    const r = razorpayVerifyChecks({
      tx,
      userId: "u1",
      razorpayOrderId: "order_1",
      paymentStatus: "created",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("not_captured");
  });
});

describe("rpcSucceeded", () => {
  it("detects error object", () => {
    const r = rpcSucceeded({ data: null, error: { message: "fail" } });
    expect(r.ok).toBe(false);
  });
  it("ok when no error", () => {
    expect(rpcSucceeded({ data: { credited: true }, error: null }).ok).toBe(true);
  });
});

describe("plan lifecycle helpers", () => {
  it("monthly validity 30 days, annual 365", () => {
    expect(validityDays("month")).toBe(30);
    expect(validityDays("year")).toBe(365);
  });
  it("computePlanExpiry", () => {
    const from = new Date("2026-01-01T00:00:00Z");
    const exp = computePlanExpiry(from, "month");
    expect(exp.getTime() - from.getTime()).toBe(30 * 24 * 60 * 60 * 1000);
  });
  it("annual grant tx id stable", () => {
    expect(buildAnnualGrantTxId("u", "2026-02-01T00:00:00.000Z")).toBe(
      "annual_grant_u_2026-02-01T00:00:00.000Z",
    );
  });
});
