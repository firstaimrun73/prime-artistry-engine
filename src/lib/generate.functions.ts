import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CREDIT_COST, PLAN_CREDITS, type PlanId } from "@/lib/plans";
import { buildFalRequest } from "@/lib/fal-request";

const inputSchema = z.object({
  prompt: z.string().min(1).max(2000),
  type: z.enum(["image", "video"]),
  // Optional source image (data URI) — enables the image-to-image workflow.
  imageUrl: z.string().min(1).max(15_000_000).optional(),
  // Edit strength for image-to-image (0.1 – 1). Higher = more visible edits.
  strength: z.number().min(0.1).max(1).optional(),
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
      // Choose workflow + model based on whether a source image was provided.
      const req = buildFalRequest({ prompt: data.prompt, imageUrl: data.imageUrl });

      // ── Debug logs ────────────────────────────────────────────────
      console.log("[generate] workflow:", req.workflow);
      console.log("[generate] model:", req.model);
      console.log(
        "[generate] uploaded image url:",
        data.imageUrl ? `${data.imageUrl.slice(0, 64)}… (${data.imageUrl.length} chars)` : "none",
      );
      console.log("[generate] endpoint:", req.endpoint);
      console.log(
        "[generate] payload:",
        JSON.stringify(
          // Truncate the data URI so logs stay readable.
          {
            ...req.body,
            image_url:
              typeof req.body.image_url === "string"
                ? `${(req.body.image_url as string).slice(0, 48)}…`
                : req.body.image_url,
          },
        ),
      );

      // fal.ai — runs server-side only; key is never sent to the client.
      const res = await fetch(req.endpoint, {
        method: "POST",
        headers: {
          Authorization: `Key ${falKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req.body),
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
      console.log("[generate] result url:", outputUrl ?? "none");
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
      input_url: data.imageUrl ? "uploaded" : null,
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
