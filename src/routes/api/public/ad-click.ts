/**
 * GET /api/public/ad-click?b=<id>&p=<placement>
 * Looks up banner id in app_settings.ad_settings.banners and 302-redirects
 * ONLY to that stored link_url. Never trusts a URL from the query.
 * Logs (banner_id, placement) to public.ad_click_log when possible.
 */
import { createAPIFileRoute } from "@tanstack/react-start/api";

function isSafeHttps(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

export const APIRoute = createAPIFileRoute("/api/public/ad-click")({
  GET: async ({ request }) => {
    const url = new URL(request.url);
    const bannerId = String(url.searchParams.get("b") || "").trim().slice(0, 64);
    const placement = String(url.searchParams.get("p") || "unknown").trim().slice(0, 80);

    if (!bannerId) {
      return new Response("Not found", { status: 404 });
    }

    let linkUrl: string | null = null;

    try {
      const { createClient } = await import("@supabase/supabase-js");
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY!;
      const client = createClient(process.env.SUPABASE_URL!, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data } = await (client as any)
        .from("app_settings")
        .select("ad_settings")
        .eq("id", 1)
        .maybeSingle();

      const ads = data?.ad_settings ?? {};
      const raw = ads.banners;
      let list: any[] = [];
      if (Array.isArray(raw)) list = raw;
      else if (raw && typeof raw === "object") list = Object.values(raw);

      const found = list.find((b) => b && String(b.id) === bannerId);
      if (found?.link_url && isSafeHttps(String(found.link_url))) {
        linkUrl = String(found.link_url);
      }

      // Best-effort click log; never block redirect
      try {
        await (client as any).from("ad_click_log").insert({
          banner_id: bannerId,
          placement,
        });
      } catch (err) {
        console.warn("[ad-click] log insert failed:", err);
      }
    } catch (err) {
      console.error("[ad-click] lookup failed:", err);
    }

    if (!linkUrl) {
      return new Response("Not found", { status: 404 });
    }

    return new Response(null, {
      status: 302,
      headers: {
        Location: linkUrl,
        "Cache-Control": "no-store",
      },
    });
  },
});
