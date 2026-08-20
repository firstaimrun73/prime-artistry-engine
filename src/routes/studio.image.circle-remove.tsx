/**
 * Circle to Remove — dedicated product page
 * ONE IMAGE · NO PROMPT · mask → generateMedia inpaint → finalize → credits
 * Route: /studio/image/circle-remove (parent Outlet must render child)
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft,
  Upload,
  Download,
  Share2,
  Pencil,
  RefreshCw,
  X,
  Sparkles,
  Image as ImageIcon,
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

export const CIRCLE_INSTANT_CREDITS = 35;

const OVERLAY_STAGES = [
  "Analyzing image…",
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
      { title: "Circle to Remove — MOTIO2EDIT" },
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

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <p className="text-sm text-muted-foreground">Sign in to use Circle to Remove.</p>
        <Button asChild className="mt-4">
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

  if (phase === "generating") {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-background">
        <button
          type="button"
          aria-label="Close"
          className="absolute right-4 top-4 rounded-full bg-secondary/80 p-2 text-muted-foreground hover:text-foreground"
          onClick={() => toast.message("Generation is in progress. Result will appear when ready.")}
        >
          <X className="h-5 w-5" />
        </button>
        <div className="relative z-10 mx-4 flex w-full max-w-sm flex-col items-center gap-5 rounded-2xl border border-border/60 bg-card/90 px-6 py-10 shadow-xl backdrop-blur-md">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-500/15">
            <Sparkles className="h-7 w-7 animate-pulse text-orange-500" />
          </div>
          <p className="text-center text-base font-semibold">{OVERLAY_STAGES[stageIdx]}</p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-orange-500 transition-all duration-700"
              style={{
                width: `${Math.min(95, ((stageIdx + 1) / OVERLAY_STAGES.length) * 100)}%`,
              }}
            />
          </div>
          <p className="text-sm text-muted-foreground">Estimated time: ~{etaSec}s</p>
          <p className="text-[11px] text-muted-foreground/80">{CIRCLE_INSTANT_CREDITS} credits</p>
        </div>
      </div>
    );
  }

  if (phase === "result" && output && preview) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="flex items-center justify-between gap-2 border-b border-border/60 bg-card/50 px-3 py-3 backdrop-blur-md">
          <button
            type="button"
            onClick={() => {
              setPhase("select");
              setOutput(null);
              setMaskOpen(true);
            }}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Edit selection
          </button>
          <h1 className="text-sm font-semibold">Result</h1>
          <span className="w-16" />
        </header>
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-3 py-4">
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/70 p-2 shadow-sm backdrop-blur-md">
            <CompareSlider before={preview} after={output} />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Button className="h-11 bg-orange-500 hover:bg-orange-600" onClick={() => void downloadResult()}>
              <Download className="mr-1.5 h-4 w-4" /> Download
            </Button>
            <Button variant="outline" className="h-11" onClick={() => void shareResult()}>
              <Share2 className="mr-1.5 h-4 w-4" /> Share
            </Button>
            <Button
              variant="outline"
              className="h-11"
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
              className="h-11"
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
          <Button variant="secondary" className="h-11 w-full" onClick={resetPhoto}>
            <ImageIcon className="mr-1.5 h-4 w-4" /> Edit another photo
          </Button>
          <Button variant="ghost" className="h-10 w-full" onClick={() => navigate({ to: "/studio/image" })}>
            Back to Image Studio
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between gap-2 border-b border-border/60 bg-card/50 px-3 py-3 backdrop-blur-md">
        <button
          type="button"
          onClick={() => navigate({ to: "/studio/image" })}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="text-center">
          <h1 className="text-sm font-semibold">
            Circle to <span className="text-primary">Remove</span>
          </h1>
          <p className="text-[10px] text-muted-foreground">One image · No prompt · {CIRCLE_INSTANT_CREDITS} credits</p>
        </div>
        <span className="w-14 text-right text-[11px] tabular-nums text-muted-foreground">
          {isAdmin ? "∞" : profile?.credits ?? 0} cr
        </span>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-3 py-6">
        <ol className="mb-6 flex flex-wrap gap-2 text-[11px] font-medium text-muted-foreground">
          <li className={phase === "upload" ? "text-primary" : ""}>1. Upload</li>
          <li aria-hidden>→</li>
          <li className={phase === "select" ? "text-primary" : ""}>2. Select</li>
          <li aria-hidden>→</li>
          <li>3. Remove</li>
          <li aria-hidden>→</li>
          <li>4. Output</li>
        </ol>

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

        {!preview ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex min-h-[50vh] flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/70 bg-card/60 text-sm text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:border-primary hover:bg-primary/5"
          >
            <Upload className="h-9 w-9 text-primary" />
            <span className="font-medium text-foreground">Upload one image</span>
            <span className="text-xs">Then paint the object to remove — no prompt needed</span>
          </button>
        ) : (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/70 p-2 shadow-sm backdrop-blur-md">
              <img
                src={preview}
                alt="Source"
                className="mx-auto max-h-[55vh] w-full object-contain"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                className="h-11 flex-1 bg-orange-500 hover:bg-orange-600 sm:flex-none"
                onClick={() => {
                  setPhase("select");
                  setMaskOpen(true);
                }}
              >
                <Pencil className="mr-1.5 h-4 w-4" /> Paint area to remove
              </Button>
              <Button variant="outline" className="h-11" onClick={() => fileRef.current?.click()}>
                Replace image
              </Button>
            </div>
            <p className="text-center text-[11px] text-muted-foreground">
              Paint over the unwanted object, then tap Remove. No text prompt.
            </p>
          </div>
        )}
      </main>

      <SmartRemoveModal
        open={maskOpen && !!preview}
        imageUrl={preview}
        onCancel={() => {
          setMaskOpen(false);
          if (!lastMaskDataUrl && !output) {
            /* stay on select with image */
          }
        }}
        onApply={(maskDataUrl) => {
          void runRemove(maskDataUrl);
        }}
      />
    </div>
  );
}
