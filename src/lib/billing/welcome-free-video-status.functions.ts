/**
 * Client-safe free-video status for Video Studio UI.
 * Server remains authoritative for entitlement claim during generation.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { evaluateWelcomeFreeVideo, WELCOME_FREE_VIDEO } from "./free-generation-entitlement";
import { isAdminClaims } from "@/lib/admin-guard.server";

const inputSchema = z.object({
  mode: z.enum(["text", "image", "video"]),
  durationSec: z.number(),
  resolution: z.string(),
  audio: z.boolean(),
  productMode: z.enum(["standard", "premium"]),
});

export const getWelcomeFreeVideoStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const userId = (context as { userId?: string }).userId;
    if (!userId) return { eligible: false, label: null as string | null };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await (context as any).supabase
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .single();
    const isAdmin = isAdminClaims({ email: profile?.email ?? undefined });

    const check = await evaluateWelcomeFreeVideo(supabaseAdmin, {
      userId,
      isAdmin,
      mode: data.mode,
      durationSec: data.durationSec,
      resolution: data.resolution,
      audio: data.audio,
      productMode: data.productMode,
    });
    return {
      eligible: !!check.eligible,
      label: check.eligible ? (check.policy?.label ?? WELCOME_FREE_VIDEO.label) : null,
    };
  });
