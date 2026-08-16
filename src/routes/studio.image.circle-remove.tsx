import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Upload } from "lucide-react";
import { SmartRemoveModal, SMART_REMOVE_PROMPT } from "@/components/SmartRemoveModal";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { generateMedia } from "@/lib/generate.functions";
import { imageQualityCost } from "@/lib/quality-options";
import { supabase } from "@/integrations/supabase/client";
import { isAdminEmail } from "@/lib/admin-config";
import { cn } from "@/lib/utils";

export const SMART_ADD_PROMPT =
  "In the masked region only, generate and insert the described content so it matches the surrounding lighting, perspective, scale and textures. Keep every unmasked pixel identical. If no object was described, fill the masked area with natural continuation of the nearby background.";

export const Route = createFileRoute("/studio/image/circle-remove")({
  validateSearch: (s: Record<string, unknown>) => ({
    mode: s.mode === "add" ? ("add" as const) : ("remove" as const),
  }),
  head: () => ({
    meta: [
      { title: "Circle to Remove — Motio2edit" },
      { name: "description", content: "Paint a region to remove or add content with Motio2edit." },
    ],
  }),
  component: CircleRemovePage,
});

function CircleRemovePage() {
  const { mode } = Route.useSearch();
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const generate = useServerFn(generateMedia);
  const fileRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [maskOpen, setMaskOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<"remove" | "add">(mode);
  const [addDescribe, setAddDescribe] = useState("");

  useEffect(() => {
    setActiveMode(mode);
  }, [mode]);

  const isAdmin = isAdminEmail(profile?.email);
  const cost = imageQualityCost("hd");

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <p className="text-sm text-muted-foreground">Sign in to use Circle tools.</p>
        <Button asChild className="mt-4">
          <Link to="/auth">Sign in</Link>
        </Button>
      </div>
    );
  }

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f?.type.startsWith("image/")) return toast.error("Upload an image.");
    if (f.size > 25 * 1024 * 1024) return toast.error("Max 25 MB.");
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setOutput(null);
    setMaskOpen(true);
  };

  const upload = async (blob: Blob, name: string) => {
    const uid = profile?.id ?? user.id;
    const path = `${uid}/circle-${Date.now()}-${name}`;
    const { error } = await supabase.storage.from("uploads").upload(path, blob, {
      contentType: blob.type || "image/png",
      upsert: true,
    });
    if (error) throw new Error(error.message);
    const { data, error: sErr } = await supabase.storage.from("uploads").createSignedUrl(path, 3600);
    if (sErr || !data?.signedUrl) throw new Error("Signed URL failed");
    return data.signedUrl;
  };

  const onMaskApply = async (maskDataUrl: string) => {
    if (!file || !preview) return;
    if (!isAdmin && (profile?.credits ?? 0) < cost) {
      toast.error(`Not enough credits (${cost} required).`);
      return;
    }
    setBusy(true);
    setMaskOpen(false);
    try {
      const imageUrl = await upload(file, file.name || "src.jpg");
      const maskRes = await fetch(maskDataUrl);
      const maskBlob = await maskRes.blob();
      const maskUrl = await upload(maskBlob, "mask.png");

      const prompt =
        activeMode === "remove"
          ? SMART_REMOVE_PROMPT
          : addDescribe.trim()
            ? `${SMART_ADD_PROMPT} Content to add: ${addDescribe.trim()}`
            : SMART_ADD_PROMPT;

      const res = await generate({
        data: {
          prompt,
          type: "image",
          imageUrl,
          sourceKind: "image",
          maskImageUrl: maskUrl,
          imageQuality: "hd",
        },
      });
      setOutput(res.outputUrl);
      await refreshProfile();
      toast.success(activeMode === "remove" ? "Removal complete" : "Add complete");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
      setMaskOpen(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Focused top bar — no bottom nav on this route */}
      <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-3">
        <button
          type="button"
          onClick={() => navigate({ to: "/studio/image" })}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="inline-flex overflow-hidden rounded-full border border-border text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveMode("remove")}
            className={cn(
              "px-3 py-1.5",
              activeMode === "remove" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground",
            )}
          >
            Circle to Remove
          </button>
          <button
            type="button"
            onClick={() => setActiveMode("add")}
            className={cn(
              "px-3 py-1.5",
              activeMode === "add" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground",
            )}
          >
            Circle to Add
          </button>
        </div>

        <span className="text-[11px] text-muted-foreground">{cost} cr</span>
      </header>

      <main className="flex flex-1 flex-col px-3 py-4">
        {activeMode === "add" && (
          <div className="mb-3">
            <label className="text-xs font-medium text-muted-foreground">What to add (optional)</label>
            <input
              value={addDescribe}
              onChange={(e) => setAddDescribe(e.target.value.slice(0, 400))}
              placeholder="e.g. a red balloon, a wooden bench…"
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        )}

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

        {!preview ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex min-h-[50vh] flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card text-sm text-muted-foreground hover:border-primary"
          >
            <Upload className="h-8 w-8" />
            Upload image to paint a region
          </button>
        ) : (
          <div className="space-y-3">
            {!maskOpen && !busy && (
              <div className="overflow-hidden rounded-xl border border-border">
                <img src={output ?? preview} alt="" className="mx-auto max-h-[60vh] w-full object-contain" />
              </div>
            )}
            {busy && (
              <p className="py-12 text-center text-sm font-semibold text-primary">
                {activeMode === "remove" ? "Removing…" : "Generating in masked area…"}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setMaskOpen(true)} disabled={busy}>
                {output ? "Edit mask again" : "Paint mask"}
              </Button>
              <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
                Replace image
              </Button>
              {output && (
                <Button asChild variant="secondary">
                  <a href={output} download={`motio2edit-circle-${Date.now()}.png`}>
                    Download
                  </a>
                </Button>
              )}
            </div>
          </div>
        )}
      </main>

      <SmartRemoveModal
        open={maskOpen && !!preview}
        imageUrl={preview}
        onCancel={() => setMaskOpen(false)}
        onApply={onMaskApply}
      />
    </div>
  );
}
