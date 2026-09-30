/**
 * Remove BG server function.
 * - 20 credits per photo (any aspect)
 * - Free → SD (long edge capped); paid → HD full model output
 * - No watermark on result
 * - Does not use generateMedia (isolated product path)
 * - History: fal provider URL + metadata via persistGenerationHistory
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isAdminClaims } from "@/lib/admin-guard.server";
import { isPaidPlan } from "@/lib/policy";
import {
  REMOVE_BG_CREDITS,
  REMOVE_BG_FAL_MODEL,
  REMOVE_BG_SD_MAX_EDGE,
  type RemoveBgQuality,
} from "@/lib/remove-bg/constants";
import { persistGenerationHistory } from "@/lib/history-persist.server";

const FAL_QUEUE = "https://queue.fal.run/";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const inputSchema = z.object({
  imageUrl: z.string().url().max(15_000_000),
  /** Client hint; server still enforces plan rules. */
  quality: z.enum(["sd", "hd"]).optional(),
});

async function runFalRemoveBg(imageUrl: string, falKey: string): Promise<string> {
  const headers = { Authorization: `Key ${falKey}`, "Content-Type": "application/json" };
  const submit = await fetch(`${FAL_QUEUE}${REMOVE_BG_FAL_MODEL}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ image_url: imageUrl }),
  });
  if (!submit.ok) {
    const txt = await submit.text();
    throw new Error(`Background removal failed (${submit.status}): ${txt.slice(0, 160)}`);
  }
  const { status_url, response_url } = (await submit.json()) as {
    status_url: string;
    response_url: string;
  };
  const deadline = Date.now() + 120_000;
  let delay = 1200;
  let last = "";
  while (Date.now() < deadline) {
    await sleep(delay);
    const st = await fetch(status_url, { headers });
    if (!st.ok) throw new Error(`Background removal status error (${st.status})`);
    const body = (await st.json()) as { status?: string };
    last = body.status ?? "";
    if (last === "COMPLETED") break;
    if (last === "FAILED" || last === "ERROR") {
      throw new Error("Background removal failed on the AI service.");
    }
    delay = Math.min(delay + 400, 4000);
  }
  if (last !== "COMPLETED") throw new Error("Background removal timed out. Please retry.");
  const res = await fetch(response_url, { headers });
  if (!res.ok) throw new Error(`Background removal result error (${res.status})`);
  const result = (await res.json()) as {
    image?: { url?: string };
    images?: { url?: string }[];
  };
  const url = result.image?.url ?? result.images?.[0]?.url ?? null;
  if (!url) throw new Error("Background removal returned no image.");
  return url;
}

export const runRemoveBg = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("plan, credits, email")
      .eq("id", userId)
      .single();
    if (pErr || !profile) throw new Error("Could not load your account.");

    const isAdmin = isAdminClaims({ email: profile.email ?? undefined });
    const paid = isAdmin || isPaidPlan(profile.plan);
    const quality: RemoveBgQuality = paid && data.quality === "hd" ? "hd" : paid ? (data.quality ?? "hd") : "sd";

    const cost = REMOVE_BG_CREDITS;
    if (!isAdmin && (profile.credits ?? 0) < cost) {
      throw new Error(`Not enough credits. Remove BG costs ${cost} credits.`);
    }

    const falKey = process.env.FAL_API_KEY;
    if (!falKey) throw new Error("AI service unavailable.");

    let outputUrl: string;
    try {
      outputUrl = await runFalRemoveBg(data.imageUrl, falKey);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Background removal failed.";
      throw new Error(`${msg} — Credits not charged.`);
    }

    if (!outputUrl || outputUrl === data.imageUrl) {
      throw new Error("Background removal returned invalid result. Credits not charged.");
    }

    let newCredits = profile.credits ?? 0;
    if (!isAdmin) {
      const next = Math.max(0, newCredits - cost);
      const { error: cErr } = await supabaseAdmin
        .from("profiles")
        .update({ credits: next })
        .eq("id", userId)
        .eq("credits", newCredits);
      if (cErr) {
        console.error("[remove-bg] credit deduct failed", cErr);
        throw new Error("Could not deduct credits. Please contact support.");
      }
      newCredits = next;
    }

    // History for all users (incl. admin) — fal provider URL only
    try {
      await persistGenerationHistory({
        supabaseAdmin,
        userId,
        type: "image",
        prompt: "remove-bg",
        input_url: data.imageUrl.startsWith("https://") ? data.imageUrl : null,
        output_url: outputUrl,
        status: "success",
        metadata: {
          product: "remove-bg",
          quality,
          noWatermark: true,
          credits_charged: isAdmin ? 0 : cost,
        },
      });
    } catch (hErr) {
      console.warn("[remove-bg] history persist skipped", hErr);
    }

    return {
      outputUrl,
      quality,
      creditsCharged: isAdmin ? 0 : cost,
      creditsRemaining: isAdmin ? profile.credits : newCredits,
      sdMaxEdge: quality === "sd" ? REMOVE_BG_SD_MAX_EDGE : null,
    };
  });
