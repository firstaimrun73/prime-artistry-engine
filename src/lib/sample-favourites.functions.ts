/**
 * Sample favourites — persistent user likes for homepage discovery.
 * Backed by sample_favourites table (migration 20260906120000).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isAdminClaims } from "@/lib/admin-guard.server";

const toggleSchema = z.object({
  sampleId: z.string().min(1).max(120),
  sampleTitle: z.string().max(200).optional(),
  sampleUrl: z.string().max(2048).optional(),
  sampleKind: z.enum(["image", "video", "music"]).optional(),
  sampleAspect: z.string().max(20).optional(),
});

export const toggleSampleFavourite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => toggleSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: existing } = await supabase
      .from("sample_favourites")
      .select("id")
      .eq("user_id", userId)
      .eq("sample_id", data.sampleId)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabase
        .from("sample_favourites")
        .delete()
        .eq("id", existing.id)
        .eq("user_id", userId);
      if (error) throw new Error("Could not remove favourite.");
      return { liked: false as const, sampleId: data.sampleId };
    }

    const { error } = await supabase.from("sample_favourites").insert({
      user_id: userId,
      sample_id: data.sampleId,
      sample_title: data.sampleTitle ?? null,
      sample_url: data.sampleUrl ?? null,
      sample_kind: data.sampleKind ?? null,
      sample_aspect: data.sampleAspect ?? null,
    });
    if (error) {
      if (/relation .* does not exist|Could not find the table/i.test(error.message)) {
        throw new Error("Favourites are not available yet. Please try again later.");
      }
      throw new Error("Could not save favourite.");
    }
    return { liked: true as const, sampleId: data.sampleId };
  });

export const listMySampleFavourites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("sample_favourites")
      .select("sample_id, sample_title, sample_url, sample_kind, sample_aspect, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      if (/relation .* does not exist|Could not find the table/i.test(error.message)) {
        return { items: [] as const };
      }
      throw new Error("Could not load favourites.");
    }
    return {
      items: (data ?? []).map((r) => ({
        sampleId: r.sample_id as string,
        title: (r.sample_title as string) ?? null,
        url: (r.sample_url as string) ?? null,
        kind: (r.sample_kind as string) ?? null,
        aspect: (r.sample_aspect as string) ?? null,
        createdAt: r.created_at as string,
      })),
    };
  });

export const getMyFavouriteIds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("sample_favourites")
      .select("sample_id")
      .eq("user_id", userId)
      .limit(500);
    if (error) return { ids: [] as string[] };
    return { ids: (data ?? []).map((r) => r.sample_id as string) };
  });

/** Admin aggregates — most-liked samples. */
export const getAdminFavouriteStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .single();
    if (!isAdminClaims({ email: profile?.email ?? undefined })) {
      return { isAdmin: false as const, total: 0, top: [] as { sampleId: string; count: number; title: string | null }[] };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("sample_favourites")
      .select("sample_id, sample_title")
      .limit(5000);
    if (error || !data) {
      return { isAdmin: true as const, total: 0, top: [] as { sampleId: string; count: number; title: string | null }[] };
    }

    const counts = new Map<string, { count: number; title: string | null }>();
    for (const row of data) {
      const id = row.sample_id as string;
      const prev = counts.get(id) ?? { count: 0, title: (row.sample_title as string) ?? null };
      prev.count += 1;
      if (!prev.title && row.sample_title) prev.title = row.sample_title as string;
      counts.set(id, prev);
    }
    const top = [...counts.entries()]
      .map(([sampleId, v]) => ({ sampleId, count: v.count, title: v.title }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 25);

    return { isAdmin: true as const, total: data.length, top };
  });
