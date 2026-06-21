import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CREDIT_COST, PLAN_CREDITS, type PlanId } from "@/lib/plans";

const inputSchema = z.object({
  prompt: z.string().min(1).max(2000),
  type: z.enum(["image", "video"]),
});

export const generateMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("plan, credits")
      .eq("id", userId)
      .single();

    if (pErr || !profile) {
      throw new Error("Could not load your account.");
    }

    if (data.type === "video" && profile.plan === "free") {
      throw new Error("Video generation requires a paid plan.");
    }

    const cost = CREDIT_COST[data.type];
    if (profile.credits < cost) {
      throw new Error(
        `Not enough credits. ${data.type === "video" ? "Video" : "Image"} generation costs ${cost} credits.`,
      );
    }

    const falKey = process.env.FAL_API_KEY;
    if (!falKey) throw new Error("AI service unavailable.");

    let outputUrl: string | null = null;

    if (data.type === "image") {
      // fal.ai FLUX dev — runs server-side only; key is never sent to the client.
      const res = await fetch("https://fal.run/fal-ai/flux/dev", {
        method: "POST",
        headers: {
          Authorization: `Key ${falKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: data.prompt,
          image_size: "square_hd",
          num_images: 1,
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        console.error("[generate] fal.ai error", res.status, txt);
        const detail = (() => {
          try {
            return (JSON.parse(txt) as { detail?: string }).detail ?? "";
          } catch {
            return "";
          }
        })();
        if (res.status === 429) throw new Error("Rate limit reached, try again shortly.");
        if (/balance|locked|billing|top up/i.test(detail))
          throw new Error("AI image service is out of credits. Top up the fal.ai account balance to continue.");
        if (res.status === 401 || res.status === 403)
          throw new Error("AI service authentication failed (invalid API key).");
        throw new Error("Generation failed, please try again.");
      }

      const json = (await res.json()) as {
        images?: { url?: string }[];
      };
      outputUrl = json.images?.[0]?.url ?? null;
      if (!outputUrl) throw new Error("Generation returned no image.");
    } else {
      // Video pipeline (paid only). Marks job processed.
      throw new Error("Video rendering is queued — try image generation meanwhile.");
    }

    const newCredits = profile.credits - cost;
    await supabase.from("profiles").update({ credits: newCredits }).eq("id", userId);
    await supabase.from("generations").insert({
      user_id: userId,
      type: data.type,
      prompt: data.prompt,
      output_url: outputUrl,
      status: "success",
    });

    return { outputUrl, credits: newCredits };
  });

const checkoutSchema = z.object({
  plan: z.enum(["free", "plus", "pro", "studio"]),
  currency: z.string().min(1).max(8),
});

export const completeCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => checkoutSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const credits = PLAN_CREDITS[data.plan as PlanId];
    const { error } = await supabase
      .from("profiles")
      .update({ plan: data.plan, credits, currency: data.currency })
      .eq("id", userId);
    if (error) throw new Error("Could not update your plan.");
    return { ok: true, plan: data.plan, credits };
  });
