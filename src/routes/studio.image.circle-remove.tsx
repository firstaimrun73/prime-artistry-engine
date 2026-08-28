/**
 * Circle 2edit — /studio/image/circle-remove
 * ONE canvas for Remove + Add. Circle/Brush/Eraser. No Crop in this tool.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Download,
  Pencil,
  Share2,
  Image as ImageIcon,
} from "lucide-react";
import { SMART_REMOVE_PROMPT } from "@/components/SmartRemoveModal";
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
  CircleEditGenOverlay,
  CircleEditActionBar,
  CircleDrawToolbar,
  type CircleEditMode,
  type CircleDrawTool,
} from "@/components/circle-edit/CircleEditShell";
import {
  CircleMaskStage,
  type CircleMaskStageHandle,
} from "@/components/circle-edit/CircleMaskStage";
import type { MaskTool } from "@/components/circle-edit/mask/types";
import { cn } from "@/lib/utils";

function readKeepWatermarkPref(): boolean {
  try {
    const v = localStorage.getItem("motio2edit-watermark-pref");
    if (v === "off") return false;
    if (v === "on") return true;
  } catch {
    /* ignore */
  }
  return true;
}

export const CIRCLE_INSTANT_CREDITS = 25;

function waitForImageLoadable(url: string, timeoutMs = 45_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const t = window.setTimeout(() => {
      img.onload = null;
      img.onerror = null;
      reject(new Error("Result image timed out loading."));
    }, timeoutMs);
    img.onload = () => {
      window.clearTimeout(t);
      resolve();
    };
    img.onerror = () => {
      window.clearTimeout(t);
      reject(new Error("Result image failed to load."));
    };
    img.src = url;
  });
}

const GEN_STAGES = [
  "Analysing selection",
  "Understanding image",
  "Preparing edit",
  "Launching Motion2AI",
  "Refining result",
  "Finalising",
];

const OBJECT_CATEGORIES = [
  { id: "animals", label: "Animals", items: [["Dog", "🐕"], ["Cat", "🐈"], ["Bird", "🐦"], ["Horse", "🐴"], ["Rabbit", "🐇"]] as const },
  { id: "objects", label: "Objects", items: [["Phone", "📱"], ["Camera", "📷"], ["Bag", "👜"], ["Lamp", "💡"], ["Chair", "🪑"]] as const },
  { id: "nature", label: "Nature", items: [["Tree", "🌳"], ["Flower", "🌸"], ["Plant", "🪴"], ["Rock", "🪨"]] as const },
  { id: "food", label: "Food", items: [["Coffee", "☕"], ["Pizza", "🍕"], ["Cake", "🍰"]] as const },
];

export const Route = createFileRoute("/studio/image/circle-remove")({
  head: () => ({
    meta: [
      { title: "Circle 2edit — MOTIO2EDIT" },
      { name: "description", content: "Circle 2edit — circle to remove or add objects." },
    ],
  }),
  component: CircleRemovePage,
});

type Phase = "upload" | "select" | "generating" | "result";

function drawToolToMaskTool(t: CircleDrawTool): MaskTool {
  if (t === "eraser") return "erase";
  if (t === "brush") return "brush";
  return "circle";
}

function CircleRemovePage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const generate = useServerFn(generateMedia);
  const secureDl = useServerFn(secureDownloadImage);
  const fileRef = useRef<HTMLInputElement>(null);
  const generatingLockRef = useRef(false);
  const maskStageRef = useRef<CircleMaskStageHandle>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("upload");
  const [output, setOutput] = useState<string | null>(null);
  const [stageIdx, setStageIdx] = useState(0);
  const [progressPct, setProgressPct] = useState(0);
  const [mode, setMode] = useState<CircleEditMode>("remove");
  const [addPrompt, setAddPrompt] = useState("");
  const [addObjectId, setAddObjectId] = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState(OBJECT_CATEGORIES[0].id);
  const [drawTool, setDrawTool] = useState<CircleDrawTool>("circle");
  const [brushSize, setBrushSize] = useState(24);
  const [addDrawerOpen, setAddDrawerOpen] = useState(false);
  const [hasMask, setHasMask] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("circle2edit-preview");
      if (!raw) return;
      sessionStorage.removeItem("circle2edit-preview");
      setPreview(raw);
      setPhase("select");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (phase !== "generating") return;
    setStageIdx(0);
    setProgressPct(8);
    const stageTimer = setInterval(() => setStageIdx((i) => Math.min(i + 1, GEN_STAGES.length - 1)), 4500);
    const pctTimer = setInterval(() => setProgressPct((p) => Math.min(92, p + 3 + Math.random() * 4)), 1200);
    return () => {
      clearInterval(stageTimer);
      clearInterval(pctTimer);
    };
  }, [phase]);

  const isAdmin = isAdminEmail(profile?.email);
  const creditsLabel = `${(profile?.credits ?? 0).toLocaleString()} credits`;

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#12141A] px-4 text-[#F2F2F5]">
        <p className="text-sm text-[#9AA0B0]">Sign in to use Circle 2edit.</p>
        <Button asChild className="mt-4 bg-[#A89BFF] text-[#12141A] hover:bg-[#9688EE]">
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
    setHasMask(false);
    setPhase("select");
  };

  const upload = async (blob: Blob, name: string) => {
    const uid = profile?.id ?? user.id;
    const path = `${uid}/circle-${Date.now()}-${name}`;
    const { error } = await supabase.storage.from("uploads").upload(path, blob, {
      contentType: blob.type || "image/png",
      upsert: true,
    });
    if (error) throw new Error(error.message);
    const { data, error: sErr } = await supabase.storage.from("uploads").createSignedUrl(path, 3600 * 6);
    if (sErr || !data?.signedUrl) throw new Error("Signed URL failed");
    return data.signedUrl;
  };

  const runWithMask = useCallback(
    async (kind: "remove" | "add") => {
      if (!file || !preview || generatingLockRef.current) return;
      const maskDataUrl = maskStageRef.current?.exportMask() ?? null;
      if (!maskDataUrl) {
        toast.error("Circle or paint an area first.");
        return;
      }
      if (!isAdmin && (profile?.credits ?? 0) < CIRCLE_INSTANT_CREDITS) {
        toast.error(`Not enough credits (${CIRCLE_INSTANT_CREDITS} required).`);
        return;
      }

      if (kind === "add") {
        const desc = addPrompt.trim() || (addObjectId ? addObjectId.split(":")[1] ?? addObjectId : "");
        if (!desc) {
          setAddDrawerOpen(true);
          toast.message("Describe what to add, or pick an asset.");
          return;
        }
      }

      generatingLockRef.current = true;
      setPhase("generating");
      try {
        const imageUrl = await upload(file, file.name || "src.jpg");
        const maskBlob = await (await fetch(maskDataUrl)).blob();
        const maskUrl = await upload(maskBlob, kind === "add" ? "mask-add.png" : "mask.png");

        if (kind === "remove") {
          const res = await generate({
            data: {
              prompt: SMART_REMOVE_PROMPT,
              type: "image",
              imageUrl,
              sourceKind: "image",
              maskImageUrl: maskUrl,
              imageQuality: "hd",
              circleInstant: true,
              keepWatermark: readKeepWatermarkPref(),
            },
          });
          setProgressPct(100);
          if (!res.outputUrl || res.outputUrl === imageUrl) {
            throw new Error("Generation returned invalid result.");
          }
          await waitForImageLoadable(res.outputUrl);
          setOutput(res.outputUrl);
          setPhase("result");
          await refreshProfile();
          toast.success("Object removed");
        } else {
          const desc = addPrompt.trim() || (addObjectId ? addObjectId.split(":")[1] ?? addObjectId : "");
          const prompt = `In the white masked region only, add ${desc}. Match perspective, lighting, scale, shadows, and surrounding colors. Blend naturally. Do not change unmasked pixels.`;
          const res = await generate({
            data: {
              prompt,
              type: "image",
              imageUrl,
              sourceKind: "image",
              maskImageUrl: maskUrl,
              imageQuality: "hd",
              keepWatermark: readKeepWatermarkPref(),
            },
          });
          setProgressPct(100);
          if (!res.outputUrl || res.outputUrl === imageUrl) {
            throw new Error("Generation returned invalid result.");
          }
          await waitForImageLoadable(res.outputUrl);
          setOutput(res.outputUrl);
          setPhase("result");
          await refreshProfile();
          toast.success("Object added");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed");
        setPhase("select");
      } finally {
        generatingLockRef.current = false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [file, preview, isAdmin, profile?.credits, generate, refreshProfile, addPrompt, addObjectId],
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
      const res = await secureDl({ data: { imageUrl: output, keepWatermark: readKeepWatermarkPref() } });
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
    setPhase("upload");
    setAddPrompt("");
    setAddObjectId(null);
    setAddDrawerOpen(false);
    setHasMask(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const onModeChange = (m: CircleEditMode) => {
    if (phase === "generating") return;
    setMode(m);
    setAddDrawerOpen(false);
  };

  const statusForMode = () => {
    if (!preview) return "Upload a photo to begin";
    if (mode === "remove") return "Circle the object, then Remove Object";
    return "Mark region, pick asset, then Add Object";
  };

  const onPrimaryCta = () => {
    if (!preview) {
      fileRef.current?.click();
      return;
    }
    if (mode === "remove") {
      void runWithMask("remove");
      return;
    }
    void runWithMask("add");
  };

  const onClearMask = () => {
    maskStageRef.current?.clear();
    setHasMask(false);
  };

  const ctaLabel = mode === "remove" ? "Remove Object" : "Add Object";
  const ctaCost = `${CIRCLE_INSTANT_CREDITS} credits`;

  if (phase === "generating") {
    return (
      <CircleEditShell creditsLabel={creditsLabel} mode={mode} onModeChange={onModeChange} generating onBack={() => toast.message("Generation is in progress.")}>
        <CircleEditGenOverlay caption={GEN_STAGES[stageIdx]} progressPct={progressPct} stageCount={GEN_STAGES.length} activeStage={stageIdx} />
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
        }}
        actionBar={
          <footer className="flex shrink-0 flex-wrap items-center gap-2 border-t border-[#2A2E3A] bg-[#181A22] px-3 py-3 sm:gap-3 sm:px-4">
            <Button className="h-11 bg-[#A89BFF] text-[#12141A] hover:bg-[#9688EE]" onClick={() => void downloadResult()}>
              <Download className="mr-1.5 h-4 w-4" /> Download
            </Button>
            <Button variant="outline" className="h-11 border-[#2E3140] bg-transparent text-[#F2F2F5]" onClick={() => void shareResult()}>
              <Share2 className="mr-1.5 h-4 w-4" /> Share
            </Button>
            <Button
              variant="outline"
              className="h-11 border-[#2E3140] bg-transparent text-[#F2F2F5]"
              onClick={() => {
                setPhase("select");
                setOutput(null);
                setHasMask(false);
              }}
            >
              <Pencil className="mr-1.5 h-4 w-4" /> Edit again
            </Button>
            <Button variant="secondary" className="h-11 bg-[#22252F] text-[#F2F2F5]" onClick={resetPhoto}>
              <ImageIcon className="mr-1.5 h-4 w-4" /> Another photo
            </Button>
          </footer>
        }
      >
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-2 overflow-auto px-3 py-4">
          <div className="overflow-hidden rounded-xl border border-[#2E3140] bg-[#1A1C24] p-1.5">
            <CompareSlider before={preview} after={output} />
          </div>
        </div>
      </CircleEditShell>
    );
  }

  const cat = OBJECT_CATEGORIES.find((c) => c.id === activeCat) ?? OBJECT_CATEGORIES[0];

  const drawToolsBar = (
    <CircleDrawToolbar tool={drawTool} onTool={setDrawTool} brushSize={brushSize} onBrushSize={setBrushSize} />
  );

  const controls =
    phase === "select" || phase === "upload" ? (
      mode === "remove" ? (
        <section className="flex shrink-0 flex-col gap-1.5">
          {drawToolsBar}
          <p className="text-center text-[11px] text-[#9AA0B0]">
            Draw a circle around the object — the inside becomes selected
          </p>
        </section>
      ) : (
        <section className="flex shrink-0 flex-col gap-2">
          {drawToolsBar}
          <div className="flex items-center gap-2">
            <p className="min-w-0 flex-1 text-[11px] text-[#9AA0B0]">Mark the placement region, then open Assets</p>
            <button
              type="button"
              onClick={() => setAddDrawerOpen((v) => !v)}
              className={cn(
                "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-[12px] font-semibold transition-colors",
                addDrawerOpen ? "bg-[#A89BFF] text-[#12141A]" : "border border-[#2E3140] bg-[#22252F] text-[#E8E9ED] hover:border-[#A89BFF]/50",
              )}
            >
              <span className="text-base leading-none">+</span>
              Assets
            </button>
          </div>
        </section>
      )
    ) : null;

  const addSheet =
    mode === "add" && addDrawerOpen ? (
      <div className="relative z-30 shrink-0">
        <button type="button" aria-label="Close assets" className="absolute inset-x-0 bottom-full h-28 bg-black/30" onClick={() => setAddDrawerOpen(false)} />
        <div className="max-h-[42vh] overflow-y-auto rounded-t-2xl border-t border-[#2E3140] bg-[#1E212B] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_28px_rgba(0,0,0,0.35)] sm:px-4">
          <div className="mx-auto mb-2.5 h-1 w-10 rounded-full bg-[#3A3E4C]" />
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[13px] font-semibold text-[#F2F2F5]">Add Object</p>
            <button type="button" onClick={() => setAddDrawerOpen(false)} className="rounded-lg px-2 py-1 text-[12px] font-medium text-[#9AA0B0] hover:text-[#F2F2F5]">
              Close
            </button>
          </div>
          <textarea
            value={addPrompt}
            onChange={(e) => {
              setAddPrompt(e.target.value);
              if (e.target.value.trim()) setAddObjectId(null);
            }}
            rows={1}
            placeholder="Describe what to add…"
            className="mb-2.5 min-h-[42px] max-h-[72px] w-full resize-none rounded-xl border border-[#2E3140] bg-[#22252F] px-3 py-2.5 text-[13px] text-[#F2F2F5] placeholder:text-[#6B7080] focus:border-[#A89BFF] focus:outline-none"
          />
          <div className="mb-2 flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {OBJECT_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCat(c.id)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium",
                  activeCat === c.id ? "border-[#A89BFF] bg-[rgba(168,155,255,0.18)] text-[#A89BFF]" : "border-[#2E3140] bg-[#22252F] text-[#9AA0B0]",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {cat.items.map(([name, glyph]) => {
              const id = `${cat.id}:${name}`;
              const selected = addObjectId === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setAddObjectId(id);
                    setAddPrompt("");
                  }}
                  className="flex w-[60px] shrink-0 flex-col items-center gap-1"
                >
                  <span className={cn("grid h-12 w-12 place-items-center rounded-[12px] border text-xl", selected ? "border-[#A89BFF] bg-[rgba(168,155,255,0.14)]" : "border-[#2E3140] bg-[#22252F]")}>
                    {glyph}
                  </span>
                  <span className={cn("text-[10px]", selected ? "text-[#A89BFF]" : "text-[#9AA0B0]")}>{name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    ) : null;

  return (
    <CircleEditShell
      creditsLabel={creditsLabel}
      mode={mode}
      onModeChange={onModeChange}
      onBack={() => navigate({ to: "/studio" })}
      controls={controls}
      sheet={addSheet}
      actionBar={
        <CircleEditActionBar
          onClear={preview ? (hasMask ? onClearMask : resetPhoto) : undefined}
          statusText={statusForMode()}
          ctaLabel={!preview ? "Upload photo" : ctaLabel}
          ctaCost={!preview ? undefined : ctaCost}
          ctaDisabled={!!preview && !hasMask}
          onCta={onPrimaryCta}
          ctaVariant="violet"
        />
      }
    >
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {!preview ? (
          <div className="flex flex-1 items-center justify-center px-[18px] py-3">
            <CircleEditUploadZone onPick={() => fileRef.current?.click()} />
          </div>
        ) : (
          <CircleMaskStage
            ref={maskStageRef}
            imageUrl={preview}
            tool={drawToolToMaskTool(drawTool)}
            brushSize={brushSize}
            onMaskChange={setHasMask}
          />
        )}
      </div>
    </CircleEditShell>
  );
}
