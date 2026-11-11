import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isAdminClaims } from "@/lib/admin-guard.server";
import { sendBrandedEmail } from "@/lib/email.server";
import { ENFORCED_COMPLIMENTARY_TOOLS } from "@/lib/complimentary-access";

const TOOLS = ["maluto", "image", "circle", "filters", "frames", "video", "music"] as const;
const ENFORCED = new Set<string>(ENFORCED_COMPLIMENTARY_TOOLS);

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

const revokeSchema = z.object({
  applicationId: z.string().uuid(),
  adminNote: z.string().trim().max(2000).optional(),
});

function ticketCode(id: string): string {
  return `TKT-${id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 5).toUpperCase()}`;
}

function filterEnforcedTools(tools: string[] | undefined | null): string[] {
  return (tools ?? []).filter((t) => ENFORCED.has(t));
}

async function assertAdmin(context: {
  supabase: { from: (t: string) => any };
  userId: string;
}): Promise<void> {
  const { data: profile } = await context.supabase
    .from("profiles")
    .select("email")
    .eq("id", context.userId)
    .maybeSingle();
  if (!isAdminClaims({ email: profile?.email ?? undefined })) {
    throw new Error("Admin only");
  }
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

    // User confirmation email (non-blocking)
    void sendBrandedEmail({
      to: email,
      subject: "We received your free access request — Motio2edit",
      heading: "Request received",
      bodyHtml: `
        <p>Hi ${data.fullName || profile?.display_name || "there"},</p>
        <p>Thanks for applying to the Access Assistance Programme. Your request is <strong>pending review</strong>.</p>
        <p>Submitting a request does <strong>not</strong> unlock any paid tools. Our team reviews each application individually.</p>
        <p>You can check status anytime on the <a href="https://motio2edit.com/access-assistance">Access Assistance</a> page.</p>
      `,
      idempotencyKey: `free-access-submitted-${app.id}`,
    }).catch((e) => console.warn("[free-access] submit email failed", e));

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
        "id, status, reason, intended_use, tools_requested, usage_frequency, credits_granted, tools_granted, expires_at, admin_note, created_at, reviewed_at, revoked_at",
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
    await assertAdmin(context);

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
    await assertAdmin(context);

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
        .eq("id", data.applicationId)
        .eq("status", "pending");
      if (error) throw new Error(error.message);

      void sendBrandedEmail({
        to: app.email,
        subject: "Update on your free access request — Motio2edit",
        heading: "Request not approved",
        bodyHtml: `
          <p>Hi ${app.full_name || "there"},</p>
          <p>We reviewed your Access Assistance request and were not able to approve free access at this time.</p>
          <p>You are always welcome to explore our <a href="https://motio2edit.com/pricing">pricing plans</a> or submit another request later if your situation changes.</p>
        `,
        idempotencyKey: `free-access-rejected-${app.id}`,
      }).catch((e) => console.warn("[free-access] reject email failed", e));

      return { ok: true, status: "rejected" as const };
    }

    const credits = data.creditsGranted ?? 0;
    // Only grant tools that have server-side enforcement today (Maluto).
    const tools = filterEnforcedTools(data.toolsGranted);
    if (tools.length === 0) {
      throw new Error("Select at least one enforced tool (currently: Maluto AI). Other studios are not complimentary-wired yet.");
    }
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
      .eq("id", data.applicationId)
      .eq("status", "pending");
    if (error) throw new Error(error.message);

    const expiryLabel = (() => {
      try {
        return new Date(expiresAt).toUTCString();
      } catch {
        return expiresAt;
      }
    })();

    void sendBrandedEmail({
      to: app.email,
      subject: "Complimentary access approved — Motio2edit",
      heading: "Access approved",
      bodyHtml: `
        <p>Hi ${app.full_name || "there"},</p>
        <p>Your Access Assistance request was <strong>approved</strong>.</p>
        <ul>
          <li><strong>Credits granted:</strong> ${credits}</li>
          <li><strong>Tools:</strong> ${tools.join(", ")}</li>
          <li><strong>Expires:</strong> ${expiryLabel}</li>
        </ul>
        <p>Credits still apply normally when you use tools. Complimentary access is limited and temporary.</p>
        <p><a href="https://motio2edit.com/studio/image/auto-edit">Open Maluto AI</a> · <a href="https://motio2edit.com/access-assistance">View status</a></p>
      `,
      idempotencyKey: `free-access-approved-${app.id}`,
    }).catch((e) => console.warn("[free-access] approve email failed", e));

    return { ok: true, status: "approved" as const, expiresAt, creditsGranted: credits, toolsGranted: tools };
  });

/**
 * Admin: revoke complimentary access for an approved application.
 * Clears profile complimentary fields; preserves application + review history.
 * Does not claw back already-spent credits.
 */
export const adminRevokeComplimentaryAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => revokeSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(context);

    const { data: app, error: loadErr } = await supabaseAdmin
      .from("free_access_applications")
      .select("*")
      .eq("id", data.applicationId)
      .single();
    if (loadErr || !app) throw new Error("Application not found");
    if (app.status !== "approved") {
      throw new Error("Only approved applications can be revoked");
    }
    if (app.revoked_at) {
      throw new Error("Access was already revoked");
    }

    const now = new Date().toISOString();
    const noteParts = [
      app.admin_note ? String(app.admin_note) : null,
      data.adminNote ? `Revoke note: ${data.adminNote}` : null,
      `Revoked ${now}`,
    ].filter(Boolean);

    const { error: pErr } = await supabaseAdmin
      .from("profiles")
      .update({
        complimentary_expires_at: null,
        complimentary_tools: null,
        updated_at: now,
      })
      .eq("id", app.user_id);
    if (pErr) throw new Error(pErr.message);

    const { error } = await supabaseAdmin
      .from("free_access_applications")
      .update({
        status: "expired",
        revoked_at: now,
        revoked_by: context.userId,
        admin_note: noteParts.join("\n") || null,
        updated_at: now,
      })
      .eq("id", data.applicationId)
      .eq("status", "approved");
    if (error) throw new Error(error.message);

    void sendBrandedEmail({
      to: app.email,
      subject: "Complimentary access ended — Motio2edit",
      heading: "Access ended",
      bodyHtml: `
        <p>Hi ${app.full_name || "there"},</p>
        <p>Your complimentary Access Assistance period has ended. Paid-plan features that required complimentary unlock are no longer available on the free plan.</p>
        <p>Any remaining credits on your account are still usable where free-plan tools allow. Explore <a href="https://motio2edit.com/pricing">plans</a> anytime.</p>
      `,
      idempotencyKey: `free-access-revoked-${app.id}`,
    }).catch((e) => console.warn("[free-access] revoke email failed", e));

    return { ok: true, status: "expired" as const, revokedAt: now };
  });
