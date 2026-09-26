/**
 * HTTP route: POST /api/frame-studio/apply
 * Wraps chargeFrameStudioApply for the standalone Frame Studio HTML client.
 */
import { createAPIFileRoute } from "@tanstack/react-start/api";
import { FRAME_CREDIT_COST } from "@/lib/frame-studio/credits";

export const APIRoute = createAPIFileRoute("/api/frame-studio/apply")({
  POST: async ({ request }) => {
    try {
      const body = await request.json().catch(() => ({}));
      const frameId = String(body.frameId || "").slice(0, 80);
      const tier = body.tier as "common" | "aiplus" | "premium";
      if (!frameId || !["common", "aiplus", "premium"].includes(tier)) {
        return Response.json(
          { ok: false, reason: "error", message: "Invalid frameId or tier" },
          { status: 400 },
        );
      }

      const auth = request.headers.get("authorization") || "";
      if (!auth.startsWith("Bearer ")) {
        return Response.json(
          { ok: false, reason: "auth", message: "Sign in required" },
          { status: 401 },
        );
      }

      const { chargeFrameStudioApply } = await import(
        "@/lib/frame-studio/charge.server"
      );
      const result = await chargeFrameStudioApply({
        data: { frameId, tier, cost: FRAME_CREDIT_COST[tier] },
      });

      if (!result.ok) {
        const status =
          result.reason === "auth" ? 401 : result.reason === "plan" ? 403 : 402;
        return Response.json(result, { status });
      }
      return Response.json(result);
    } catch (e) {
      console.error("[api/frame-studio/apply]", e);
      return Response.json(
        { ok: false, reason: "error", message: "Server error" },
        { status: 500 },
      );
    }
  },
});
