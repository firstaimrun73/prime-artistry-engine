/**
 * Circle Edit (Circle to Remove product page)
 * Route: /studio/image/circle-remove
 * Frontend UI: violet/teal Circle Edit shell (separate from Image Editor orange).
 * Backend: existing generateMedia + mask flow for Remove only. Add/Crop UI stubs.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Download,
  Pencil,
  RefreshCw,
  Share2,
  Image as ImageIcon,
  Sparkles,
} from "lucide-react";
import { SmartRemoveModal, SMART_REMOVE_PROMPT } from "@/components/SmartRemoveModal";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { generateMedia } from "@/lib/generate.functions";
import { supabase } from "@/integrations/supabase/client";
import { isAdminEmail } from "@/lib/admin-config";
import { CompareSlider } from "@/components/CompareSlider";
import { secureDownloadImage } from "@/lib/download.functions";
import { triggerBrowserDownload } from "@/lib/secure-image-download";
import {
  CircleEditShell,
  CircleEditUploadZone,
  type CircleEditMode,
} from "@/components/circle-edit/CircleEditShell";

export const CIRCLE_INSTANT_CREDITS = 25;

const OVERLAY_STAGES = [
  "Analysing selection…",
  "Understanding the selected area…",
  "Preparing the removal…",
  "AI is rebuilding the background…",
  "Checking image quality…",
  "Applying final processing…",
  "Finishing your image…",
];

export const Route = createFileRoute("/studio/image/circle-remove")({
  head: () => ({
    meta: [
      { title: "Circle 2edit — MOTIO2EDIT" },
      {
        name: "description",
        content: "Paint an unwanted object and remove it — one image, no prompt.",
      },
    ],
  }),
  component: CircleRemovePage,
});

type Phase = "upload" | "select" | "generating" | "result";

function CircleRemovePage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const generate = useServerFn(generateMedia);
  const secureDl = useServerFn(secureDownloadImage);
  const fileRef = useRef<HTMLInputElement>(null);
  const generatingLockRef = useRef(false);

  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("upload");
  const [output, setOutput] = useState<string | null>(null);
  const [lastMaskDataUrl, setLastMaskDataUrl] = useState<string | null>(null);
  const [stageIdx, setStageIdx] = useState(0);
  const [etaSec, setEtaSec] = useState(55);
  const [maskOpen, setMaskOpen] = useState(false);
  const [mode, setMode] = useState<CircleEditMode>("remove");

  useEffect(() => {
    if (phase !== "generating") return;
    setStageIdx(0);
    setEtaSec(55);
    const stageTimer = setInterval(
      () => setStageIdx((i) => Math.min(i + 1, OVERLAY_STAGES.length - 1)),
      9000,
    );
    const etaTimer = setInterval(() => setEtaSec((s) => Math.max(5, s - 3)), 3000);
    return () => {
      clearInterval(stageTimer);
      clearInterval(etaTimer);
    };
  }, [phase]);

  const isAdmin = isAdminEmail(profile?.email);
  const creditsLabel = isAdmin
    ? "∞ credits"
    : `${(profile?.credits ?? 0).toLocaleString()} credits`;

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0E0F13] px-4 text-[#F2F2F5]">
        <p className="text-sm text-[#9A9CAA]">Sign in to use Circle 2edit.</p>
        <Button asChild className="mt-4 bg-[#8B7CFF] text-[#0E0F13] hover:bg-[#7A6BEE]">
          <Link to="/auth">Sign in</Link>
        </Button>
      </div>
    );
  }

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f?.type.startsWith("image/")) return toast.error("Upload one image.");
    if (f.size > 25 * 1024 * 1024) return toast.error("Max 25 MB.");
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setOutput(null);
    setLastMaskDataUrl(null);
    setPhase("select");
    if (mode === "remove") setMaskOpen(true);
  };

  const upload = async (blob: Blob, name: string) => {
    const uid = profile?.id ?? user.id;
    const path = `${uid}/circle-${Date.now()}-${name}`;
    const { error } = await supabase.storage.from("uploads").upload(path, blob, {
      contentType: blob.type || "image/png",
      upsert: true,
    });
    if (error) throw new Error(error.message);
    const { data, error: sErr } = await supabase.storage
      .from("uploads")
      .createSignedUrl(path, 3600 * 6);
    if (sErr || !data?.signedUrl) throw new Error("Signed URL failed");
    return data.signedUrl;
  };

  const runRemove = useCallback(
    async (maskDataUrl: string) => {
      if (!file || !preview || generatingLockRef.current) return;
      if (!isAdmin && (profile?.credits ?? 0) < CIRCLE_INSTANT_CREDITS) {
        toast.error(`Not enough credits (${CIRCLE_INSTANT_CREDITS} required).`);
        setPhase("select");
        setMaskOpen(true);
        return;
      }
      generatingLockRef.current = true;
      setMaskOpen(false);
      setPhase("generating");
      setLastMaskDataUrl(maskDataUrl);
      try {
        const imageUrl = await upload(file, file.name || "src.jpg");
        const maskRes = await fetch(maskDataUrl);
        const maskBlob = await maskRes.blob();
        const maskUrl = await upload(maskBlob, "mask.png");

        const res = await generate({
          data: {
            prompt: SMART_REMOVE_PROMPT,
            type: "image",
            imageUrl,
            sourceKind: "image",
            maskImageUrl: maskUrl,
            imageQuality: "hd",
            circleInstant: true,
          },
        });
        setOutput(res.outputUrl);
        setPhase("result");
        await refreshProfile();
        toast.success("Object removed");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed");
        setPhase("select");
        setMaskOpen(true);
      } finally {
        generatingLockRef.current = false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [file, preview, isAdmin, profile?.credits, generate, refreshProfile],
  );

  const shareResult = async () => {
    if (!output) return;
    try {
      if (navigator.share) await navigator.share({ title: "Motio2edit result", url: output });
      else {
        await navigator.clipboard.writeText(output);
        toast.success("Link copied");
      }
    } catch {
      /* cancelled */
    }
  };

  const downloadResult = async () => {
    if (!output) return;
    try {
      const res = await secureDl({ data: { imageUrl: output, keepWatermark: false } });
      await triggerBrowserDownload(res.downloadUrl, `motio2edit-circle-${Date.now()}.jpg`);
      toast.success("Download started");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    }
  };

  const resetPhoto = () => {
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setPreview(null);
    setFile(null);
    setOutput(null);
    setLastMaskDataUrl(null);
    setPhase("upload");
    setMaskOpen(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const onModeChange = (m: CircleEditMode) => {
    if (phase === "generating") return;
    setMode(m);
    if (m === "remove" && preview && phase === "select") setMaskOpen(true);
    if (m !== "remove") setMaskOpen(false);
    if (m === "add" || m === "crop") {
      toast.message(
        m === "add"
          ? "Add Object UI is ready — backend wiring comes next."
          : "Crop UI is ready — backend wiring comes next.",
      );
    }
  };

  if (phase === "generating") {
    return (
      <CircleEditShell
        creditsLabel={creditsLabel}
        mode={mode}
        onModeChange={onModeChange}
        generating
        onBack={() => toast.message("Generation is in progress. Result will appear when ready.")}
      >
        <div className="flex flex-1 flex-col items-center justify-center px-4">
          <div className="relative z-10 mx-4 flex w-full max-w-sm flex-col items-center gap-5 rounded-2xl border border-[#8B7CFF]/35 bg-[#15161B]/95 px-6 py-10 shadow-xl backdrop-blur-md">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#8B7CFF]/15">
              <Sparkles className="h-7 w-7 animate-pulse text-[#8B7CFF]" />
            </div>
            <p className="text-center text-[10px] font-medium tracking-widest text-[#8B7CFF]/90 uppercase">
              Circle 2edit
            </p>
            <p className="text-center text-base font-semibold text-[#F2F2F5]">{OVERLAY_STAGES[stageIdx]}</p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#1D1F27]">
              <div
                className="h-full rounded-full bg-[#8B7CFF] transition-all duration-700"
                style={{
                  width: `${Math.min(95, ((stageIdx + 1) / OVERLAY_STAGES.length) * 100)}%`,
                }}
              />
            </div>
            <p className="text-sm text-[#9A9CAA]">Estimated time: ~{etaSec}s</p>
            <p className="text-[11px] text-[#5F6170]">{CIRCLE_INSTANT_CREDITS} credits / image</p>
          </div>
        </div>
      </CircleEditShell>
    );
  }

  if (phase === "result" && output && preview) {
    return (
      <CircleEditShell
        creditsLabel={creditsLabel}
        mode={mode}
        onModeChange={onModeChange}
        onBack={() => {
          setPhase("select");
          setOutput(null);
          setMaskOpen(true);
        }}
        footer={
          <div className="shrink-0 space-y-2 border-t border-[#22232C] bg-[#15161B] px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="mx-auto grid max-w-3xl grid-cols-2 gap-2 sm:grid-cols-4">
              <Button
                className="h-11 bg-[#8B7CFF] text-[#0E0F13] hover:bg-[#7A6BEE]"
                onClick={() => void downloadResult()}
              >
                <Download className="mr-1.5 h-4 w-4" /> Download
              </Button>
              <Button
                variant="outline"
                className="h-11 border-[#2A2C36] bg-transparent text-[#F2F2F5] hover:bg-[#1D1F27]"
                onClick={() => void shareResult()}
              >
                <Share2 className="mr-1.5 h-4 w-4" /> Share
              </Button>
              <Button
                variant="outline"
                className="h-11 border-[#2A2C36] bg-transparent text-[#F2F2F5] hover:bg-[#1D1F27]"
                onClick={() => {
                  setPhase("select");
                  setOutput(null);
                  setMaskOpen(true);
                }}
              >
                <Pencil className="mr-1.5 h-4 w-4" /> Remove another
              </Button>
              <Button
                variant="outline"
                className="h-11 border-[#2A2C36] bg-transparent text-[#F2F2F5] hover:bg-[#1D1F27]"
                onClick={() => {
                  if (lastMaskDataUrl) void runRemove(lastMaskDataUrl);
                  else {
                    setPhase("select");
                    setMaskOpen(true);
                  }
                }}
              >
                <RefreshCw className="mr-1.5 h-4 w-4" /> Regenerate
              </Button>
            </div>
            <div className="mx-auto flex max-w-3xl gap-2">
              <Button
                variant="secondary"
                className="h-10 flex-1 bg-[#1D1F27] text-[#F2F2F5] hover:bg-[#22242E]"
                onClick={resetPhoto}
              >
                <ImageIcon className="mr-1.5 h-4 w-4" /> Another photo
              </Button>
              <Button
                variant="ghost"
                className="h-10 text-[#9A9CAA] hover:text-[#F2F2F5]"
                onClick={() => navigate({ to: "/studio/image" })}
              >
                Image Studio
              </Button>
            </div>
          </div>
        }
      >
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3 overflow-auto px-3 py-4">
          <p className="text-center text-xs font-medium text-[#5CE0C0]">Result · drag divider to compare</p>
          <div className="overflow-hidden rounded-2xl border border-[#2A2C36] bg-[#15161B] p-2 shadow-sm">
            <CompareSlider before={preview} after={output} />
          </div>
        </div>
      </CircleEditShell>
    );
  }

  return (
    <CircleEditShell
      creditsLabel={creditsLabel}
      mode={mode}
      onModeChange={onModeChange}
      onBack={() => navigate({ to: "/studio/image" })}
      footer={
        preview && mode === "remove" ? (
          <div className="flex shrink-0 items-center gap-2 border-t border-[#22232C] bg-[#15161B] px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Button
              variant="outline"
              className="h-11 border-[#2A2C36] bg-transparent text-[#9A9CAA] hover:text-[#F2F2F5]"
              onClick={() => fileRef.current?.click()}
            >
              Replace
            </Button>
            <Button
              className="ml-auto h-11 flex-1 bg-[#8B7CFF] font-bold text-[#0E0F13] hover:bg-[#7A6BEE] sm:flex-none sm:px-8"
              onClick={() => {
                setPhase("select");
                setMaskOpen(true);
              }}
            >
              <Pencil className="mr-1.5 h-4 w-4" /> Paint area to remove
            </Button>
          </div>
        ) : null
      }
    >
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-auto px-3 py-4">
        {!preview ? (
          <CircleEditUploadZone onPick={() => fileRef.current?.click()} />
        ) : (
          <div className="flex w-full max-w-2xl flex-col gap-3">
            <div className="overflow-hidden rounded-2xl border border-[#2A2C36] bg-[#15161B] p-2 shadow-sm">
              <img
                src={preview}
                alt="Source"
                className="mx-auto max-h-[min(58vh,640px)] w-full object-contain"
              />
            </div>
            {mode === "add" && (
              <p className="rounded-xl border border-[#2A2C36] bg-[#1D1F27] px-3 py-2 text-center text-xs text-[#9A9CAA]">
                Add Object — paint a target area, then describe or pick an object. Backend next.
              </p>
            )}
            {mode === "crop" && (
              <p className="rounded-xl border border-[#2A2C36] bg-[#1D1F27] px-3 py-2 text-center text-xs text-[#9A9CAA]">
                Crop — frame & ratio tools land with the next frontend pass. Backend next.
              </p>
            )}
            {mode === "remove" && (
              <p className="text-center text-[11px] text-[#5F6170]">
                Paint the unwanted object, then confirm. No text prompt · {CIRCLE_INSTANT_CREDITS} credits
              </p>
            )}
          </div>
        )}
      </div>

      <SmartRemoveModal
        open={maskOpen && !!preview && mode === "remove"}
        imageUrl={preview}
        onCancel={() => setMaskOpen(false)}
        onApply={(maskDataUrl) => {
          void runRemove(maskDataUrl);
        }}
      />
    </CircleEditShell>
  );
}
