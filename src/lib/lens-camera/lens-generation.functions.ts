/**
 * Lens generation billing + AI+ daily entitlement + Image Edit for AI+ lenses.
 * Normal: 20 credits after successful Apply only.
 * AI+: paid/admin, 5 successful attempts per day — charged only after generation succeeds.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isAdminClaims } from "@/lib/admin-guard.server";
import {
  getCameraLensById,
  isAiLens,
  LENS_AI_PLUS_ATTEMPT_LIMIT,
} from "@/lib/lens-camera/roster";
import { isPaidPlan } from "@/lib/policy";
import { buildImageEdit, type FalStep } from "@/lib/fal-request";

const FAL_QUEUE = "https://queue.fal.run/";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function runFalStep(step: FalStep, falKey: string): Promise<string> {
  const headers = { Authorization: `Key ${falKey}`, "Content-Type": "application/json" };
  const submit = await fetch(`${FAL_QUEUE}${step.model}`, {
    method: "POST",
    headers,
    body: JSON.stringify(step.body),
  });
  if (!submit.ok) {
    const txt = await submit.text();
    throw new Error(`AI edit failed (${submit.status}): ${txt.slice(0, 200)}`);
  }
  const { status_url, response_url } = (await submit.json()) as {
    status_url: string;
    response_url: string;
  };
  const deadline = Date.now() + 120_000;
  let delay = 1500;
  let lastStatus = "";
  while (Date.now() < deadline) {
    await sleep(delay);
    const st = await fetch(status_url, { headers });
    if (!st.ok) throw new Error(`AI status failed (${st.status})`);
    const body = (await st.json()) as { status?: string };
    lastStatus = body.status ?? "";
    if (lastStatus === "COMPLETED") break;
    if (lastStatus === "FAILED" || lastStatus === "ERROR") {
      throw new Error("AI enhancement failed.");
    }
    delay = Math.min(delay + 500, 5000);
  }
  if (lastStatus !== "COMPLETED") throw new Error("AI enhancement timed out.");
  const res = await fetch(response_url, { headers });
  if (!res.ok) throw new Error(`AI result failed (${res.status})`);
  const result = (await res.json()) as {
    images?: { url?: string }[];
    image?: { url?: string };
  };
  const url = result.images?.[0]?.url ?? result.image?.url ?? null;
  if (!url) throw new Error("AI enhancement returned no image.");
  return url;
}

const chargeSchema = z.object({
  lensId: z.string().min(1).max(64),
  generationId: z.string().min(8).max(80),
});

const aiPlusRunSchema = z.object({
  lensId: z.string().min(1).max(64),
  generationId: z.string().min(8).max(80),
  imageDataUrl: z.string().min(32).max(12_000_000),
});

function startOfLocalDayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

const AI_PROMPTS: Record<string, string> = {
  lens_hd_4k:
    "Enhance this photograph for ultra-clear high-resolution detail. Sharpen fine textures, reduce noise, preserve exact composition, lighting, and subject identity. Photorealistic 4K clarity upgrade.",
  lens_farreach:
    "This is a digitally zoomed photograph of a distant subject. Recover fine detail, reduce compression noise, gently sharpen, and enhance clarity while preserving composition and identity.",
  lens_microreveal:
    "Enhance this image as macro photography: extreme subject detail, crisp textures, natural shallow depth of field feel, preserve identity and composition.",
  lens_origami:
    "Transform this photograph into origami paper-fold art. Geometric folded paper aesthetic, clean creases, stylized origami sculpture of the main subject, keep recognizable composition.",
};

export const chargeLensGeneration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => chargeSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const lens = getCameraLensById(data.lensId);
    if (!lens) throw new Error("Unknown lens.");
    if (lens.status === "coming-soon") throw new Error("This lens is not available yet.");
    if (isAiLens(lens) || lens.creditCost <= 0) {
      return {
        ok: true as const,
        credits: 0,
        charged: 0,
        generationId: data.generationId,
        lensName: lens.name,
        cost: 0,
      };
    }
    const cost = lens.creditCost;
    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("plan, credits, email")
      .eq("id", userId)
      .single();
    if (pErr || !profile) throw new Error("Could not load your account.");
    const isAdmin = isAdminClaims({ email: profile.email ?? undefined });
    if (!isAdmin && (profile.credits as number) < cost) {
      throw new Error(`Not enough credits. ${lens.name} costs ${cost} credits.`);
    }
    let newCredits = profile.credits as number;
    let charged = 0;
    if (!isAdmin) {
      const { data: deduction, error: dErr } = await supabaseAdmin.rpc("deduct_credits", {
        _amount: cost,
        _gen_type: "image",
        _user_id: userId,
      });
      if (dErr || !deduction) {
        if (dErr?.message?.includes("INSUFFICIENT_CREDITS")) {
          throw new Error(`Not enough credits. ${lens.name} costs ${cost} credits.`);
        }
        throw new Error("Could not charge credits. Please try again.");
      }
      newCredits = (deduction as { credits: number }).credits;
      charged = cost;
    }
    return {
      ok: true as const,
      credits: newCredits,
      charged,
      generationId: data.generationId,
      lensName: lens.name,
      cost,
    };
  });

export const runLensAiPlusGeneration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => aiPlusRunSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const lens = getCameraLensById(data.lensId);
    if (!lens) throw new Error("Unknown lens.");
    if (!isAiLens(lens)) throw new Error("This lens is not AI+.");
    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("plan, email")
      .eq("id", userId)
      .single();
    if (pErr || !profile) throw new Error("Could not load your account.");
    const isAdmin = isAdminClaims({ email: profile.email ?? undefined });
    const paid = isAdmin || isPaidPlan(profile.plan);
    if (!paid) {
      throw new Error("AI+ lenses require a paid plan. Upgrade to unlock.");
    }
    const dayStart = startOfLocalDayIso();
    if (!isAdmin) {
      const { count, error: cErr } = await supabaseAdmin
        .from("generation_history")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("type", "lens_ai_plus")
        .eq("status", "success")
        .gte("created_at", dayStart);
      if (cErr) throw new Error("Could not verify AI+ allowance.");
      if ((count ?? 0) >= LENS_AI_PLUS_ATTEMPT_LIMIT) {
        throw new Error("AI+ daily limit reached. Try again tomorrow.");
      }
    }
    const prompt =
      AI_PROMPTS[lens.id] ??
      "Enhance this photograph with high detail while preserving composition and identity.";
    const falKey = process.env.FAL_KEY || process.env.FAL_API_KEY;
    if (!falKey) throw new Error("AI service is not configured.");
    let outputUrl: string;
    try {
      const step = buildImageEdit({
        prompt,
        imageUrl: data.imageDataUrl,
        strength: 0.55,
      });
      outputUrl = await runFalStep(step, falKey);
    } catch (e) {
      throw new Error(
        e instanceof Error ? e.message : "AI enhancement failed. Try again.",
      );
    }
    if (!outputUrl) throw new Error("AI enhancement returned no image.");
    await supabaseAdmin.from("generation_history").insert({
      user_id: userId,
      type: "lens_ai_plus",
      status: "success",
      prompt: `${lens.id}:${data.generationId}`,
      output_url: outputUrl.slice(0, 500),
    });
    const { count: usedNow } = await supabaseAdmin
      .from("generation_history")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("type", "lens_ai_plus")
      .eq("status", "success")
      .gte("created_at", dayStart);
    return {
      ok: true as const,
      outputUrl,
      lensName: lens.name,
      generationId: data.generationId,
      used: usedNow ?? 1,
      limit: isAdmin ? null : LENS_AI_PLUS_ATTEMPT_LIMIT,
      remaining: isAdmin
        ? null
        : Math.max(0, LENS_AI_PLUS_ATTEMPT_LIMIT - (usedNow ?? 1)),
    };
  });

export const consumeAiPlusAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        lensId: z.string().min(1).max(64),
        generationId: z.string().min(8).max(80),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const lens = getCameraLensById(data.lensId);
    if (!lens || !isAiLens(lens)) throw new Error("This lens is not AI+.");
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan, email")
      .eq("id", userId)
      .single();
    const isAdmin = isAdminClaims({ email: profile?.email ?? undefined });
    const paid = isAdmin || isPaidPlan(profile?.plan);
    if (!paid) throw new Error("AI+ lenses require a paid plan. Upgrade to unlock.");
    if (!isAdmin) {
      const dayStart = startOfLocalDayIso();
      const { count } = await supabaseAdmin
        .from("generation_history")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("type", "lens_ai_plus")
        .eq("status", "success")
        .gte("created_at", dayStart);
      if ((count ?? 0) >= LENS_AI_PLUS_ATTEMPT_LIMIT) {
        throw new Error("AI+ daily limit reached. Try again tomorrow.");
      }
    }
    return {
      ok: true as const,
      generationId: data.generationId,
      lensName: lens.name,
      reserved: false as const,
    };
  });

export const getAiPlusStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan, email")
      .eq("id", userId)
      .single();
    const isAdmin = isAdminClaims({ email: profile?.email ?? undefined });
    const paid = isAdmin || isPaidPlan(profile?.plan);
    if (!paid) {
      return { paid: false, used: 0, limit: LENS_AI_PLUS_ATTEMPT_LIMIT, remaining: 0 };
    }
    const dayStart = startOfLocalDayIso();
    const { count } = await supabaseAdmin
      .from("generation_history")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("type", "lens_ai_plus")
      .eq("status", "success")
      .gte("created_at", dayStart);
    const used = count ?? 0;
    return {
      paid: true,
      used,
      limit: isAdmin ? null : LENS_AI_PLUS_ATTEMPT_LIMIT,
      remaining: isAdmin ? null : Math.max(0, LENS_AI_PLUS_ATTEMPT_LIMIT - used),
    };
  });
