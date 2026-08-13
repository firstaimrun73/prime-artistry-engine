import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getWatermarkMode, type WatermarkMode } from "@/lib/policy";

const inputSchema = z.object({
  /** Clean (or already-watermarked) https image URL from generation/history. */
  imageUrl: z.string().url().max(8_000),
  /** Paid-user preference only. Free users are forced to primary+secondary. */
  keepWatermark: z.boolean().optional(),
});

/**
 * Authoritative image download.
 *
 * - Loads plan/role from Supabase (never trusts client isPaid/isAdmin).
 * - Free → always primary + secondary, regardless of keepWatermark.
 * - Paid → primary only if keepWatermark true; else clean.
 * - Admin → clean (same as policy).
 *
 * When watermarking is required, fetches the image server-side, composites
 * with sharp, uploads to private storage, returns a short-lived signed URL.
 * The clean provider URL is never returned as the downloadable asset for free.
 */
export const secureDownloadImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("plan, email")
      .eq("id", userId)
      .single();

    if (pErr || !profile) {
      throw new Error("Could not load your account.");
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    const isAdmin =
      !!adminEmail &&
      !!profile.email &&
      profile.email.toLowerCase() === adminEmail.toLowerCase();

    // Server overrides client: free always gets primary+secondary.
    const mode: WatermarkMode = getWatermarkMode({
      plan: profile.plan,
      email: profile.email,
      isAdmin,
      keepWatermark: data.keepWatermark === true,
      forDownload: true,
    });

    // No branding required → return original URL (paid OFF / admin).
    if (mode === "none") {
      return {
        downloadUrl: data.imageUrl,
        watermarked: false,
        mode,
      };
    }

    // Only allow fetching known safe hosts (fal CDN, supabase, data already https).
    const url = data.imageUrl;
    if (!url.startsWith("https://")) {
      throw new Error("Invalid image URL.");
    }

    const { applyServerWatermark, fetchImageBuffer } = await import(
      "@/lib/watermark.server"
    );
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const raw = await fetchImageBuffer(url);
    const stamped = await applyServerWatermark(raw, mode);

    const path = `${userId}/wm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("uploads")
      .upload(path, stamped, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (upErr) {
      console.error("[secureDownload] upload failed:", upErr.message);
      throw new Error("Could not prepare download. Please try again.");
    }

    // Short-lived signed URL (10 minutes) — not a permanent public link.
    const { data: signed, error: sErr } = await supabaseAdmin.storage
      .from("uploads")
      .createSignedUrl(path, 600);

    if (sErr || !signed?.signedUrl) {
      console.error("[secureDownload] signed url failed:", sErr?.message);
      throw new Error("Could not prepare download. Please try again.");
    }

    return {
      downloadUrl: signed.signedUrl,
      watermarked: true,
      mode,
    };
  });
