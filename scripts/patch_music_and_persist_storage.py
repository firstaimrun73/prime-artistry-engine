from pathlib import Path

def patch_music():
    p = Path("src/lib/music.functions.ts")
    t = p.read_text()
    old = """        if (ingested) {
          musicR2Key = ingested.objectKey;
          musicStorageProvider = "r2";
          outputUrl = ingested.deliveryUrl;
          if (outputType === "video") videoUrl = ingested.deliveryUrl;
        }"""
    new = """        if (ingested) {
          musicR2Key = ingested.objectKey;
          musicStorageProvider = ingested.storageProvider; // blob (free) or r2 (paid/admin)
          outputUrl = ingested.deliveryUrl;
          if (outputType === "video") videoUrl = ingested.deliveryUrl;
        }"""
    if old not in t:
        if "ingested.storageProvider" in t:
            print("music already fixed")
            return
        raise SystemExit("music storage block not found")
    p.write_text(t.replace(old, new, 1))
    print("music storage_provider fixed")

def patch_persist():
    p = Path("src/lib/history-persist.server.ts")
    t = p.read_text()
    old = """  // If finalize already wrote to R2 users/**, capture permanent key and ensure delivery is signed.
  try {
    const {
      extractR2ObjectKeyFromUrl,
      isPrivateUserObjectKey,
      r2ResolveDeliveryUrl,
      isR2Configured,
    } = await import("@/lib/r2.server");
    const extracted =
      r2Key ||
      (outputUrl ? extractR2ObjectKeyFromUrl(outputUrl) : null);
    if (extracted && isPrivateUserObjectKey(extracted) && isR2Configured()) {
      r2Key = extracted;
      if (!storageProvider || storageProvider === "supabase") {
        storageProvider = "r2";
      }
      const signed = await r2ResolveDeliveryUrl(extracted, { preferSigned: true });
      if (signed) outputUrl = signed;
    }
  } catch (e) {
    console.warn("[history-persist] R2 key extract/sign skipped:", e);
  }"""
    new = """  // If finalize already wrote to private user-media R2, capture permanent key and re-sign.
  try {
    const { extractR2ObjectKeyFromUrl, isPrivateUserObjectKey } = await import("@/lib/r2.server");
    const { isPrivateR2Configured, privateR2SignedGetUrl } = await import(
      "@/lib/private-history-storage.server"
    );
    const extracted =
      r2Key ||
      (outputUrl ? extractR2ObjectKeyFromUrl(outputUrl) : null);
    if (extracted && isPrivateUserObjectKey(extracted) && isPrivateR2Configured()) {
      r2Key = extracted;
      if (!storageProvider || storageProvider === "supabase") {
        storageProvider = "r2";
      }
      const signed = await privateR2SignedGetUrl(extracted);
      if (signed) outputUrl = signed;
    }
  } catch (e) {
    console.warn("[history-persist] private R2 key extract/sign skipped:", e);
  }"""
    if old not in t:
        if "privateR2SignedGetUrl" in t:
            print("history-persist already private")
            return
        raise SystemExit("history-persist block not found")
    p.write_text(t.replace(old, new, 1))
    print("history-persist private R2 fixed")

if __name__ == "__main__":
    patch_music()
    patch_persist()
