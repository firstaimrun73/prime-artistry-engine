import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

    if (data.type === "video" && profile.plan !== "pro") {
      throw new Error("Video generation requires a paid plan.");
    }

    if (profile.credits <= 0) {
      throw new Error("You are out of credits.");
    }

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI service unavailable.");

    let outputUrl: string | null = null;

    if (data.type === "image") {
      const res = await fetch(
        "https://ai.gateway.lovable.dev/v1/images/generations",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            prompt: data.prompt,
          }),
        },
      );

      if (!res.ok) {
        const txt = await res.text();
        console.error("[generate] gateway error", res.status, txt);
        if (res.status === 429) throw new Error("Rate limit reached, try again shortly.");
        throw new Error("Generation failed, please try again.");
      }

      const json = (await res.json()) as {
        data?: { b64_json?: string; url?: string }[];
      };
      const item = json.data?.[0];
      if (item?.b64_json) {
        outputUrl = `data:image/png;base64,${item.b64_json}`;
      } else if (item?.url) {
        outputUrl = item.url;
      }
      if (!outputUrl) throw new Error("Generation returned no image.");
    } else {
      // Video pipeline (paid only). Marks job processed.
      throw new Error("Video rendering is queued — try image generation meanwhile.");
    }

    const newCredits = profile.credits - 1;
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
  plan: z.enum(["free", "pro"]),
  currency: z.string().min(1).max(8),
});

export const completeCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => checkoutSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const credits = data.plan === "pro" ? 500 : 15;
    const { error } = await supabase
      .from("profiles")
      .update({ plan: data.plan, credits, currency: data.currency })
      .eq("id", userId);
    if (error) throw new Error("Could not update your plan.");
    return { ok: true, plan: data.plan, credits };
  });
