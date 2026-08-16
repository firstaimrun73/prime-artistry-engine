import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MAX_VIDEO_MB } from "./editor.constants";

export const readAsDataUrl = (file: File) =>
  new Promise<string | null>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });

// Upload a (video) file to private storage and return a signed URL fal can fetch.
// Retries twice on transient failures; videos get a 2h signed URL so long
// renders never expire mid-job.
export const uploadToStorage = async (file: File, uid: string): Promise<string> => {
  const isVideo = file.type.startsWith("video");
  if (isVideo && file.size > MAX_VIDEO_MB * 1024 * 1024) {
    throw new Error(`Video too large. Maximum ${MAX_VIDEO_MB}MB allowed.`);
  }
  const ext = file.name.split(".").pop() || "bin";

  let lastErr = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    const path = `${uid}/${isVideo ? "video-" : ""}${Date.now()}-${attempt}.${ext}`;
    const { error: upErr } = await supabase.storage.from("uploads").upload(path, file, {
      contentType: file.type,
      upsert: true,
    });
    if (upErr) {
      lastErr = upErr.message;
      if (attempt < 2) {
        if (isVideo) toast(`Upload retrying… (${attempt + 2}/3)`);
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        continue;
      }
      break;
    }
    const { data, error } = await supabase.storage
      .from("uploads")
      .createSignedUrl(path, isVideo ? 7200 : 3600);
    if (error || !data?.signedUrl || !data.signedUrl.startsWith("https://")) {
      lastErr = error?.message ?? "signed url failed";
      if (attempt < 2) continue;
      break;
    }
    return data.signedUrl;
  }
  console.error("[editor] upload failed:", lastErr);
  throw new Error(
    isVideo
      ? "Video upload failed. Try a smaller file or check your connection."
      : "Upload failed. Try a smaller file or check your connection.",
  );
};