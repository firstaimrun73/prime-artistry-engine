#!/usr/bin/env python3
"""Apply remaining storage architecture patches on CI."""
from pathlib import Path

def patch_finalize():
    p = Path("src/lib/watermark/finalize.ts")
    t = p.read_text()
    if "privateR2PutObject" in t:
        print("finalize already private R2")
        return
    old = """  // Prefer R2 when configured
  try {
    const { isR2Configured, r2PutObject, r2ResolveDeliveryUrl } = await import("@/lib/r2.server");
    if (isR2Configured()) {
      await r2PutObject({ key, body: opts.buffer, contentType });
      const url = await r2ResolveDeliveryUrl(key);
      if (url) {
        return {
          finalUrl: url,
          watermarked: opts.watermarked,
          mode: opts.mode,
          storagePath: key,
          skippedAsFinalized: false,
        };
      }
    }
  } catch (e) {
    console.warn("[WATERMARK_FINALIZE] R2 store failed, falling back to Supabase storage:", e);
  }"""
    new = """  // Prefer PRIVATE user-media R2 (motio2edit-user-media) - never primary sample bucket
  try {
    const {
      isPrivateR2Configured,
      privateR2PutObject,
      privateR2SignedGetUrl,
    } = await import("@/lib/private-history-storage.server");
    if (isPrivateR2Configured()) {
      await privateR2PutObject({ key, body: opts.buffer, contentType });
      const url = await privateR2SignedGetUrl(key);
      if (url) {
        return {
          finalUrl: url,
          watermarked: opts.watermarked,
          mode: opts.mode,
          storagePath: key,
          skippedAsFinalized: false,
        };
      }
    }
  } catch (e) {
    console.warn("[WATERMARK_FINALIZE] private R2 store failed, trying Blob/Supabase:", e);
  }

  try {
    const { isPrivateBlobConfigured, privateBlobPutObject } = await import(
      "@/lib/private-history-storage.server"
    );
    if (isPrivateBlobConfigured()) {
      const { url } = await privateBlobPutObject({
        pathname: key,
        body: opts.buffer,
        contentType,
      });
      if (url) {
        return {
          finalUrl: url,
          watermarked: opts.watermarked,
          mode: opts.mode,
          storagePath: key,
          skippedAsFinalized: false,
        };
      }
    }
  } catch (e) {
    console.warn("[WATERMARK_FINALIZE] private Blob store failed:", e);
  }"""
    if old not in t:
        raise SystemExit("finalize block not found")
    p.write_text(t.replace(old, new, 1))
    print("finalize patched")

def patch_history():
    p = Path("src/routes/_authenticated.history.tsx")
    t = p.read_text()
    if "core columns only" in t:
        print("history already patched")
        return
    old = """        if (error) {
          console.error("[history] load failed:", error.message);
          const fb = await supabase.from("generations").select("id, type, prompt, output_url, status, created_at, metadata, r2_object_key, storage_provider")
            .eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
          if (fb.error) { setGens([]); setLoadError(fb.error.message); toast.error("Could not load history."); setLoading(false); return; }
          rows = ((fb.data as Generation[]) ?? []).filter((g) => isVisibleInHistory(g));
        } else {
          rows = ((data as Generation[]) ?? []).filter((g) => isVisibleInHistory(g));
        }"""
    new = """        if (error) {
          // Real compatibility fallback: core columns only (pre-migration schema).
          console.error("[history] load failed (full select):", error.message, error);
          const fb = await supabase
            .from("generations")
            .select("id, type, prompt, output_url, status, created_at, metadata")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(100);
          if (fb.error) {
            console.error("[history] core fallback failed:", fb.error.message, fb.error);
            setGens([]);
            setLoadError(fb.error.message);
            toast.error("Could not load history.");
            setLoading(false);
            return;
          }
          rows = ((fb.data as Generation[]) ?? []).filter((g) => isVisibleInHistory(g));
        } else {
          rows = ((data as Generation[]) ?? []).filter((g) => isVisibleInHistory(g));
        }"""
    if old not in t:
        raise SystemExit("history block not found")
    p.write_text(t.replace(old, new, 1))
    print("history patched")

def patch_generate():
    p = Path("src/lib/generate.functions.ts")
    t = p.read_text()
    if "preferPrivateR2: isAdmin" in t:
        print("generate already plan-aware")
        return
    old = """        const ingested = await ingestProviderMediaToUserR2({
          userId,
          sourceUrl: outputUrl,
          kind,
        });"""
    new = """        const ingested = await ingestProviderMediaToUserR2({
          userId,
          sourceUrl: outputUrl,
          kind,
          plan: profile.plan,
          preferPrivateR2: isAdmin,
        });"""
    if old not in t:
        raise SystemExit("generate ingest not found")
    p.write_text(t.replace(old, new, 1))
    print("generate patched")

def patch_music_fn():
    p = Path("src/lib/music.functions.ts")
    t = p.read_text()
    old = """        const ingested = await ingestProviderMediaToUserR2({
          userId,
          sourceUrl: outputUrl,
          kind,
        });"""
    new = """        const ingested = await ingestProviderMediaToUserR2({
          userId,
          sourceUrl: outputUrl,
          kind,
          plan: profile.plan,
          preferPrivateR2: isAdmin,
        });"""
    if old in t:
        p.write_text(t.replace(old, new, 1))
        print("music functions patched")
    else:
        print("music functions ingest signature already different or missing")

if __name__ == "__main__":
    patch_finalize()
    patch_history()
    patch_generate()
    patch_music_fn()
