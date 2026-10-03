/**
 * GET /api/public/unsubscribe?token=&email=
 * Sets profiles.marketing_unsubscribed = true. Transactional emails unaffected.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { validUnsubToken } from "@/lib/unsubscribe-token";

function page(title: string, body: string): Response {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;font-family:Arial,sans-serif;background:#efeae6;color:#17171c">
<table width="100%"><tr><td align="center" style="padding:48px 16px">
<div style="max-width:420px;background:#fff;border-radius:16px;padding:28px;text-align:center">
<div style="font:800 22px Arial">Motio<span style="color:#FF5A1F">2</span>edit</div>
<h1 style="font:800 20px Arial;margin:16px 0 8px">${title}</h1>
<p style="font:14px/1.5 Arial;color:#4a4a55">${body}</p>
<p style="margin-top:20px"><a href="https://motio2edit.com" style="color:#FF5A1F">Back to Motio2edit</a></p>
</div></td></tr></table></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export const Route = createFileRoute("/api/public/unsubscribe")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const email = (url.searchParams.get("email") || "").trim().toLowerCase();
        const token = url.searchParams.get("token") || "";
        if (!email || !validUnsubToken(email, token)) {
          return page("Link invalid", "This unsubscribe link is invalid or expired.");
        }
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !key) return page("Error", "Server configuration error.");
        const db = createClient(supabaseUrl, key);
        const { error } = await db.from("profiles").update({ marketing_unsubscribed: true }).ilike("email", email);
        if (error) return page("Error", "Could not update preference. Contact support@motio2edit.com.");
        return page("Unsubscribed", "You will no longer receive marketing emails. Security and account emails are unchanged.");
      },
    },
  },
});
