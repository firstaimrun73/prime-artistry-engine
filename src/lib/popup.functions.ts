// Admin-controlled site popup.
//
// The admin can enable a single announcement/upsell popup from /admin. Signed-in
// users fetch it on load; the client decides whether the popup applies to them
// (target audience) and remembers a 1-hour dismissal in localStorage.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const POPUP_TARGETS = ["all", "free", "paid", "low_credits"] as const;
export type PopupTarget = (typeof POPUP_TARGETS)[number];

export type AdminPopup = {
  id: string;
  enabled: boolean;
  title: string;
  message: string;
  buttonText: string;
  target: PopupTarget;
  updatedAt: string;
};

const POPUP_ID = "00000000-0000-0000-0000-000000000001";

export const getAdminPopup = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminPopup | null> => {
    const { data, error } = await context.supabase
      .from("admin_popups")
      .select("id, enabled, title, message, button_text, target, updated_at")
      .eq("id", POPUP_ID)
      .maybeSingle();
    if (error || !data) return null;
    return {
      id: data.id,
      enabled: data.enabled,
      title: data.title,
      message: data.message,
      buttonText: data.button_text,
      target: (data.target as PopupTarget) ?? "all",
      updatedAt: data.updated_at,
    };
  });

const saveSchema = z.object({
  enabled: z.boolean(),
  title: z.string().trim().min(1).max(120),
  message: z.string().trim().min(1).max(600),
  buttonText: z.string().trim().min(1).max(40),
  target: z.enum(POPUP_TARGETS),
});

export const saveAdminPopup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => saveSchema.parse(data))
  .handler(async ({ data, context }) => {
    const adminEmail = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
    const callerEmail = (context.claims?.email ?? "").toLowerCase();
    if (!adminEmail || callerEmail !== adminEmail) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("admin_popups")
      .update({
        enabled: data.enabled,
        title: data.title,
        message: data.message,
        button_text: data.buttonText,
        target: data.target,
      })
      .eq("id", POPUP_ID);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
