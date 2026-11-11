import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isAdminClaims } from "@/lib/admin-guard.server";

const TOOLS = ["maluto", "image", "circle", "filters", "frames", "video", "music"] as const;

const submitSchema = z.object({
  fullName: z.string().trim().max(120).optional(),
  reason: z.string().trim().min(20).max(1500),
  intendedUse: z.string().trim().min(20).max(1500),
  toolsRequested: z.array(z.enum(TOOLS)).min(1).max(10),
  usageFrequency: z.string().trim().max(80).optional(),
  extraInfo: z.string().trim().max(1500).optional(),
});

const reviewSchema = z.object({
  applicationId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  adminNote: z.string().trim().max(2000).optional(),
  creditsGranted: z.number().int().min(0).max(50_000).optional(),
  toolsGranted: z.array(z.enum(TOOLS)).max(10).optional(),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

function ticketCode(id: string): string {
  return `TKT-${id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 5).toUpperCase()}`;
}

/** User submits a free-access application. Never grants access. */
export const submitFreeAccessApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => submitSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: pending } = await supabase
      .from("free_access_applications")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "pending")
      .limit(1)
      .maybeSingle();

    if (pending) {
      throw new Error("You already have a free access request pending review.");
    }

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("free_access_applications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", weekAgo);

    if ((count ?? 0) >= 2) {
      throw new Error("You can only submit two free access requests per week. Please wait and try again later.");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("email, display_name, plan")
      .eq("id", userId)
      .maybeSingle();

    const email =
      profile?.email ||
      (context.claims as { email?: string } | undefined)?.email ||
      "";
    if (!email) throw new Error("Account email is required.");

    const subject = "Free access request — Access Assistance Programme";
    const message = [
      `Reason: ${data.reason}`,
      `Intended use: ${data.intendedUse}`,
      `Tools: ${data.toolsRequested.join(", ")}`,
      data.usageFrequency ? `Frequency: ${data.usageFrequency}` : null,
      data.extraInfo ? `Extra: ${data.extraInfo}` : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    let ticketId: string | null = null;
    try {
      const { data: ticket } = await supabase
        .from("support_tickets")
        .insert({
          user_id: userId,
          category: "free_access_request",
          priority: "normal",
          subject,
          message,
        })
        .select("id")
        .single();
      ticketId = ticket?.id ?? null;
    } catch {
      try {
        const { data: ticket } = await supabase
          .from("support_tickets")
          .insert({
            user_id: userId,
            category: "other",
            priority: "normal",
            subject: `[FREE_ACCESS_REQUEST] ${subject}`,
            message,
          })
          .select("id")
          .single();
        ticketId = ticket?.id ?? null;
      } catch (e) {
        console.warn("[free-access] ticket insert failed", e);
      }
    }

    const { data: app, error } = await supabaseAdmin
      .from("free_access_applications")
      .insert({
        user_id: userId,
        ticket_id: ticketId,
        email,
        full_name: data.fullName || profile?.display_name || null,
        reason: data.reason,
        intended_use: data.intendedUse,
        tools_requested: data.toolsRequested,
        usage_frequency: data.usageFrequency || null,
        extra_info: data.extraInfo || null,
        status: "pending",
      })
      .select("id, status, created_at")
      .single();

    if (error) throw new Error(error.message);

    return {
      id: app.id,
      status: app.status as string,
      ticketCode: ticketId ? ticketCode(ticketId) : null,
    };
  });

/** List the current user's applications. */
export const listMyFreeAccessApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("free_access_applications")
      .select(
        "id, status, reason, intended_use, tools_requested, usage_frequency, credits_granted, tools_granted, expires_at, admin_note, created_at, reviewed_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Admin: list applications. */
export const adminListFreeAccessApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("email")
      .eq("id", context.userId)
      .maybeSingle();
    if (!isAdminClaims({ email: profile?.email ?? undefined })) {
      throw new Error("Admin only");
    }

    const { data, error } = await supabaseAdmin
      .from("free_access_applications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Admin: approve or reject. Only approval mutates credits / complimentary fields. */
export const adminReviewFreeAccessApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => reviewSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("email")
      .eq("id", context.userId)
      .maybeSingle();
    if (!isAdminClaims({ email: profile?.email ?? undefined })) {
      throw new Error("Admin only");
    }

    const { data: app, error: loadErr } = await supabaseAdmin
      .from("free_access_applications")
      .select("*")
      .eq("id", data.applicationId)
      .single();
    if (loadErr || !app) throw new Error("Application not found");
    if (app.status !== "pending") throw new Error("Application is not pending");

    if (data.decision === "rejected") {
      const { error } = await supabaseAdmin
        .from("free_access_applications")
        .update({
          status: "rejected",
          admin_note: data.adminNote || null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: context.userId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.applicationId);
      if (error) throw new Error(error.message);
      return { ok: true, status: "rejected" as const };
    }

    const credits = data.creditsGranted ?? 0;
    const tools = data.toolsGranted ?? [];
    const days = data.expiresInDays ?? 14;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    if (credits > 0) {
      const { data: userProfile, error: pErr } = await supabaseAdmin
        .from("profiles")
        .select("credits")
        .eq("id", app.user_id)
        .single();
      if (pErr) throw new Error(pErr.message);
      const next = (userProfile?.credits ?? 0) + credits;
      const { error: uErr } = await supabaseAdmin
        .from("profiles")
        .update({
          credits: next,
          complimentary_expires_at: expiresAt,
          complimentary_tools: tools,
          updated_at: new Date().toISOString(),
        })
        .eq("id", app.user_id);
      if (uErr) throw new Error(uErr.message);
    } else {
      const { error: uErr } = await supabaseAdmin
        .from("profiles")
        .update({
          complimentary_expires_at: expiresAt,
          complimentary_tools: tools,
          updated_at: new Date().toISOString(),
        })
        .eq("id", app.user_id);
      if (uErr) throw new Error(uErr.message);
    }

    const { error } = await supabaseAdmin
      .from("free_access_applications")
      .update({
        status: "approved",
        admin_note: data.adminNote || null,
        credits_granted: credits,
        tools_granted: tools,
        expires_at: expiresAt,
        reviewed_at: new Date().toISOString(),
        reviewed_by: context.userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.applicationId);
    if (error) throw new Error(error.message);

    return { ok: true, status: "approved" as const, expiresAt, creditsGranted: credits };
  });
