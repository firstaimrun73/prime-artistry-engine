// Customer feedback system — server functions.
//
//  • submitFeedback     — public; sanitizes input, rate-limits, stores, emails support.
//  • listPublicFeedback — public; returns recent 4–5 star testimonials.
//  • listFeedbackAdmin  — admin only; full list + aggregate stats.
//  • updateFeedbackStatus — admin only; mark read/resolved.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const FEEDBACK_CATEGORIES = [
  "General Feedback",
  "Bug Report",
  "Feature Request",
  "Payment Issue",
  "AI Editor Feedback",
  "Design Feedback",
  "Performance Issue",
  "Payment Experience",
  "Other",
] as const;

export type PublicFeedback = {
  id: string;
  rating: number;
  message: string;
  userName: string;
  category: string;
  createdAt: string;
};

// Strip any HTML/script content and clamp length.
function sanitize(text: string, max: number): string {
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .trim()
    .slice(0, max);
}

const RATING_EMOJI = ["", "😡", "😕", "😐", "🙂", "😍"];

const submitSchema = z.object({
  userId: z.string().uuid().nullable().optional(),
  userName: z.string().max(120).optional().nullable(),
  userEmail: z.string().email().max(200).optional().nullable().or(z.literal("")),
  category: z.enum(FEEDBACK_CATEGORIES),
  rating: z.number().int().min(1).max(5),
  message: z.string().min(1).max(1000),
  pageUrl: z.string().max(500).optional().nullable(),
});

export const submitFeedback = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => submitSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    const message = sanitize(data.message, 1000);
    if (!message) throw new Error("Message is required.");

    // Basic spam filter.
    const spam = /(https?:\/\/|www\.|\b(viagra|casino|crypto airdrop|free money)\b)/i;
    if (spam.test(message)) throw new Error("Your message looks like spam and was blocked.");

    const userName = data.userName ? sanitize(data.userName, 120) : null;
    const userEmail = data.userEmail ? data.userEmail.trim().slice(0, 200) : null;

    // Rate limit: max 5 per user per day (only when we can identify the user).
    if (data.userId) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count } = await db
        .from("feedback")
        .select("id", { count: "exact", head: true })
        .eq("user_id", data.userId)
        .gte("created_at", since);
      if ((count ?? 0) >= 5) {
        throw new Error("You've reached the daily feedback limit (5). Please try again tomorrow.");
      }
    }

    const { error } = await db.from("feedback").insert({
      user_id: data.userId ?? null,
      user_name: userName,
      user_email: userEmail,
      category: data.category,
      rating: data.rating,
      message,
      page_url: data.pageUrl ?? null,
      status: "new",
    });
    if (error) throw new Error(error.message);

    // Email support (best-effort).
    try {
      const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
      const RESEND_API_KEY = process.env.RESEND_API_KEY;
      const supportEmail = process.env.SUPPORT_EMAIL || "support@motio2edit.com";
      if (LOVABLE_API_KEY && RESEND_API_KEY) {
        const emoji = RATING_EMOJI[data.rating] ?? "";
        const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <h2 style="margin:0 0 12px">New Feedback ${emoji} ${data.rating}/5</h2>
          <p><b>Category:</b> ${data.category}</p>
          <p><b>From:</b> ${userName ?? "Anonymous"} (${userEmail ?? "no email"})</p>
          <p><b>Date:</b> ${new Date().toUTCString()}</p>
          <p><b>Page:</b> ${data.pageUrl ?? "—"}</p>
          <hr/>
          <p style="white-space:pre-wrap">${message}</p>
        </div>`;
        await fetch("https://connector-gateway.lovable.dev/resend/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": RESEND_API_KEY,
          },
          body: JSON.stringify({
            from: `Motio2Edit Feedback <${supportEmail}>`,
            to: [supportEmail],
            subject: `[FEEDBACK] [${data.category}] - Rating: ${emoji} ${data.rating}/5`,
            html,
          }),
        });
      }
    } catch (err) {
      console.error("[feedback] email error:", err);
    }

    return { ok: true };
  });

export const listPublicFeedback = createServerFn({ method: "GET" })
  .handler(async (): Promise<PublicFeedback[]> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data, error } = await (supabaseAdmin as any)
        .from("feedback")
        .select("id, rating, message, user_name, category, created_at")
        .gte("rating", 4)
        .order("created_at", { ascending: false })
        .limit(24);
      if (error) {
        console.error("[feedback] listPublicFeedback error:", error);
        return [];
      }
      return (data ?? []).map((f: any) => ({
        id: f.id,
        rating: f.rating,
        message: f.message,
        userName: f.user_name || "Anonymous",
        category: f.category || "General Feedback",
        createdAt: f.created_at,
      }));
    } catch (err) {
      console.error("[feedback] listPublicFeedback threw:", err);
      return [];
    }
  });


export type AdminFeedback = {
  id: string;
  rating: number;
  message: string;
  userName: string;
  userEmail: string | null;
  category: string;
  status: string;
  pageUrl: string | null;
  createdAt: string;
};

export type FeedbackAdminData = {
  isAdmin: boolean;
  total: number;
  averageRating: number;
  ratingBreakdown: { rating: number; count: number }[];
  categoryBreakdown: { category: string; count: number }[];
  latest: AdminFeedback[];
};

export const listFeedbackAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FeedbackAdminData> => {
    const adminEmail = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
    const callerEmail = (context.claims?.email ?? "").toLowerCase();
    const empty: FeedbackAdminData = {
      isAdmin: false,
      total: 0,
      averageRating: 0,
      ratingBreakdown: [],
      categoryBreakdown: [],
      latest: [],
    };
    if (!adminEmail || callerEmail !== adminEmail) return empty;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any)
      .from("feedback")
      .select("id, rating, message, user_name, user_email, category, status, page_url, created_at")
      .order("created_at", { ascending: false });
    const rows = data ?? [];

    const total = rows.length;
    const avg = total ? rows.reduce((s: number, r: any) => s + (r.rating || 0), 0) / total : 0;
    const ratingBreakdown = [1, 2, 3, 4, 5].map((rating) => ({
      rating,
      count: rows.filter((r: any) => r.rating === rating).length,
    }));
    const catMap = new Map<string, number>();
    for (const r of rows) catMap.set(r.category || "Other", (catMap.get(r.category || "Other") ?? 0) + 1);

    return {
      isAdmin: true,
      total,
      averageRating: Math.round(avg * 10) / 10,
      ratingBreakdown,
      categoryBreakdown: [...catMap.entries()].map(([category, count]) => ({ category, count })),
      latest: rows.slice(0, 50).map((r: any) => ({
        id: r.id,
        rating: r.rating,
        message: r.message,
        userName: r.user_name || "Anonymous",
        userEmail: r.user_email,
        category: r.category || "Other",
        status: r.status || "new",
        pageUrl: r.page_url,
        createdAt: r.created_at,
      })),
    };
  });

export const updateFeedbackStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: string }) =>
    z.object({ id: z.string().uuid(), status: z.enum(["new", "read", "resolved"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const adminEmail = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
    const callerEmail = (context.claims?.email ?? "").toLowerCase();
    if (!adminEmail || callerEmail !== adminEmail) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any)
      .from("feedback")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
