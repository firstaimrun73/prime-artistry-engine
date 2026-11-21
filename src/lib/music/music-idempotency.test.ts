import { describe, expect, it } from "vitest";

/** Pure decision helper mirrored by generateMusic durable job handling. */
function decideMusicIdempotencyAction(job: {
  status: "pending" | "succeeded" | "failed";
  result?: unknown;
  updatedAtMs: number;
  nowMs: number;
}): "return_cached" | "in_progress" | "retry" {
  if (job.status === "succeeded" && job.result) return "return_cached";
  if (job.status === "pending" && job.nowMs - job.updatedAtMs < 150_000) return "in_progress";
  return "retry";
}

describe("music idempotency decisions", () => {
  it("returns cached success", () => {
    expect(
      decideMusicIdempotencyAction({
        status: "succeeded",
        result: { outputUrl: "https://x" },
        updatedAtMs: 0,
        nowMs: 1_000,
      }),
    ).toBe("return_cached");
  });
  it("blocks concurrent pending", () => {
    expect(
      decideMusicIdempotencyAction({
        status: "pending",
        updatedAtMs: 1000,
        nowMs: 10_000,
      }),
    ).toBe("in_progress");
  });
  it("allows retry after stale pending or failed", () => {
    expect(
      decideMusicIdempotencyAction({
        status: "pending",
        updatedAtMs: 0,
        nowMs: 200_000,
      }),
    ).toBe("retry");
    expect(
      decideMusicIdempotencyAction({
        status: "failed",
        updatedAtMs: 0,
        nowMs: 1000,
      }),
    ).toBe("retry");
  });
});
