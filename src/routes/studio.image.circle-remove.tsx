/**
 * Circle 2edit — /studio/image/circle-remove
 * Remove: circleInstant → flux-pro/v1/erase
 * Add: circleInstant:false → flux-general/inpainting
 * Drawing: CircleMaskStage (freehand circle, brush, eraser) — do not replace.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { generateMedia } from "@/lib/generate.functions";
import { secureDownloadImage } from "@/lib/download.functions";
import { triggerBrowserDownload } from "@/lib/secure-image-download";
import { supabase } from "@/integrations/supabase/client";
import { readKeepWatermarkPref } from "@/lib/watermark-pref";
import { SMART_REMOVE_PROMPT } from "@/components/SmartRemoveModal";
import {
  CircleEditShell,
  CircleEditUploadZone,
  CircleEditActionBar,
  CircleDrawToolbar,
  CircleEditGenOverlay,
  type CircleDrawTool,
} from "@/components/circle-edit/CircleEditShell";
import {
  CircleMaskStage,
  type CircleMaskStageHandle,
} from "@/components/circle-edit/CircleMaskStage";
import { CircleAddDrawer } from "@/components/circle-edit/CircleAddDrawer";
import { CompareSlider } from "@/components/CompareSlider";
import { findAddAsset, buildAddPrompt } from "@/lib/circle-edit/add-assets";
import type { MaskTool } from "@/components/circle-edit/mask/types";
import { useTheme } from "@/lib/theme";
import { isFreePlan } from "@/lib/policy";
import { CIRCLE_REMOVE_CREDITS, estimateCircleAddCredits } from "@/lib/circle-edit/credits";
import { getAssetCreditCost } from "@/lib/circle-edit/add-assets-pricing";

export const Route = createFileRoute("/studio/image/circle-remove")({
  ssr: false,
  component: Circle2editPage,
  head: () => ({
    meta: [
      { title: "Circle 2edit — Motio2edit" },
      { name: "description", content: "Circle 2edit — circle to remove or add objects." },
    ],
  }),
});

const GEN_STAGES = [
  "Analyzing your image",
  "Reading the selected area",
  "Understanding the object",
  "Matching lighting and perspective",
  "Building the edit",
  "Blending the result",
  "Finalizing your image",
] as const;

const BRUSH_PRESETS = [
  { id: "S" as const, size: 14, label: "S" },
  { id: "M" as const, size: 24, label: "M" },
  { id: "L" as const, size: 40, label: "L" },
];

type Phase = "select" | "generating" | "result";
type Mode = "remove" | "add";

function drawToolToMaskTool(t: CircleDrawTool): MaskTool {
  if (t === "eraser") return "erase";
  if (t === "brush") return "brush";
  return "circle";
}

async function waitForImageLoadable(url: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Result image failed to load"));
    img.src = url;
  });
}

function Circle2editPage() {
  const navigate = Route.useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const isAdmin = isAdminEmail(profile?.email);
  const addLocked = !isAdmin && isFreePlan(profile?.plan);
  const generate = useServerFn(generateMedia);
  const secureDl = useServerFn(secureDownloadImage);
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const fileRef = useRef<HTMLInputElement>(null);
  const maskStageRef = useRef<CircleMaskStageHandle>(null);
  const generatingLockRef = useRef(false);

  const [phase, setPhase] = useState<Phase>("select");
  const [mode, setMode] = useState<Mode>("remove");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [output, setOutput] = useState<string | null>(null);
  const [hasMask, setHasMask] = useState(false);
  const [drawTool, setDrawTool] = useState<CircleDrawTool>("circle");
  const [brushSize, setBrushSize] = useState(24);
  const [addDrawerOpen, setAddDrawerOpen] = useState(false);
  const [addObjectId, setAddObjectId] = useState<string | null>(null);
  const [addPrompt, setAddPrompt] = useState("");
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [assetQuery, setAssetQuery] = useState("");
  const [progressPct, setProgressPct] = useState(0);
  const [stageIdx, setStageIdx] = useState(0);
  const [showCompare, setShowCompare] = useState(false);
  const [sourceWidth, setSourceWidth] = useState(0);
  const [sourceHeight, setSourceHeight] = useState(0);
  const progressTimers = useRef<number[]>([]);

  const clearProgressTimers = useCallback(() => {
    progressTimers.current.forEach((id) => window.clearTimeout(id));
    progressTimers.current = [];
  }, []);

  useEffect(() => {
    if (phase !== "generating") {
      clearProgressTimers();
      return;
    }
    setProgressPct(6);
    setStageIdx(0);
    const steps = [
      { ms: 700, pct: 14, idx: 1 },
      { ms: 1600, pct: 28, idx: 2 },
      { ms: 2800, pct: 42, idx: 3 },
      { ms: 4200, pct: 58, idx: 4 },
      { ms: 6000, pct: 72, idx: 5 },
      { ms: 8000, pct: 86, idx: 6 },
    ];
    progressTimers.current = steps.map((s) =>
      window.setTimeout(() => {
        setProgressPct(s.pct);
        setStageIdx(s.idx);
      }, s.ms),
    );
    return clearProgressTimers;
  }, [phase, clearProgressTimers]);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview(url);
    setOutput(null);
    setHasMask(false);
    setPhase("select");
    setShowCompare(false);
    const probe = new Image();
    probe.onload = () => {
      setSourceWidth(probe.naturalWidth || 0);
      setSourceHeight(probe.naturalHeight || 0);
    };
    probe.src = url;
  };

  const resetPhoto = () => {
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setOutput(null);
    setHasMask(false);
    setPhase("select");
    maskStageRef.current?.clear();
  };

  const onClearMask = () => {
    maskStageRef.current?.clear();
    setHasMask(false);
  };

  const upload = async (blob: Blob, name: string) => {
    if (!user) throw new Error("Sign in required");
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
      if (kind === "add" && addLocked) {
        toast.error("Circle Add requires a paid plan.");
        return;
      }
      const assetCost = kind === "add" ? getAssetCreditCost(addObjectId) : 0;
      const needed =
        kind === "remove"
          ? CIRCLE_REMOVE_CREDITS
          : estimateCircleAddCredits({
              sourceWidth,
              sourceHeight,
              assetCreditCost: assetCost,
            }).totalCredits;
      if (!isAdmin && (profile?.credits ?? 0) < needed) {
        toast.error(`Not enough credits (${needed} required).`);
        return;
      }

      if (kind === "add") {
        const asset = findAddAsset(addObjectId);
        const desc = addPrompt.trim() || asset?.generationDescriptor || "";
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
              sourceWidth: sourceWidth || undefined,
              sourceHeight: sourceHeight || undefined,
              keepWatermark: readKeepWatermarkPref(),
            },
          });
          clearProgressTimers();
          setProgressPct(100);
          setStageIdx(GEN_STAGES.length - 1);
          if (!res.outputUrl || res.outputUrl === imageUrl) {
            throw new Error("Generation returned invalid result.");
          }
          await waitForImageLoadable(res.outputUrl);
          setOutput(res.outputUrl);
          setShowCompare(false);
          setPhase("result");
          await refreshProfile();
          toast.success("Object removed");
        } else {
          const asset = findAddAsset(addObjectId);
          const prompt = buildAddPrompt({ asset, userDetail: addPrompt });
          const res = await generate({
            data: {
              prompt,
              type: "image",
              imageUrl,
              sourceKind: "image",
              maskImageUrl: maskUrl,
              imageQuality: "hd",
              circleInstant: false,
              circleAssetId: addObjectId || undefined,
              sourceWidth: sourceWidth || undefined,
              sourceHeight: sourceHeight || undefined,
              keepWatermark: readKeepWatermarkPref(),
            },
          });
          clearProgressTimers();
          setProgressPct(100);
          setStageIdx(GEN_STAGES.length - 1);
          if (!res.outputUrl || res.outputUrl === imageUrl) {
            throw new Error("Generation returned invalid result.");
          }
          await waitForImageLoadable(res.outputUrl);
          setOutput(res.outputUrl);
          setShowCompare(false);
          setPhase("result");
          await refreshProfile();
          toast.success("Object added");
        }
      } catch (err) {
        clearProgressTimers();
        toast.error(err instanceof Error ? err.message : "Failed");
        setPhase("select");
      } finally {
        generatingLockRef.current = false;
      }
    },
    [file, preview, isAdmin, profile?.credits, generate, refreshProfile, addPrompt, addObjectId, clearProgressTimers, sourceWidth, sourceHeight, addLocked],
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
      const res = await secureDl({
        data: { imageUrl: output, keepWatermark: readKeepWatermarkPref() },
      });
      await triggerBrowserDownload(res.downloadUrl, `motio2edit-circle-${Date.now()}.jpg`);
      toast.success("Download started");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download failed");
    }
  };

  const onModeChange = (m: Mode) => {
    if (m === "add" && addLocked) {
      toast.message("Circle Add is a paid feature. Upgrade to unlock.");
      return;
    }
    setMode(m);
    if (m === "add") setAddDrawerOpen(true);
  };

  const statusForMode = () => {
    if (!preview) return "Upload an image to begin";
    if (!hasMask)
      return mode === "remove" ? "Circle or paint the object to remove" : "Circle or paint where to add";
    if (mode === "add") {
      const asset = findAddAsset(addObjectId);
      if (asset) return `Add ${asset.label} into selection`;
      if (addPrompt.trim()) return "Ready to add";
      return "Pick an asset or describe what to add";
    }
    return "Ready to remove";
  };

  const onPrimaryCta = () => {
    if (!preview) {
      fileRef.current?.click();
      return;
    }
    if (!hasMask) {
      toast.message(mode === "remove" ? "Select an area first" : "Select where to add first");
      return;
    }
    void runWithMask(mode);
  };

  const creditsLabel = isAdmin ? "Admin" : `${profile?.credits ?? 0} credits`;
  const ctaLabel =
    mode === "remove" ? "Remove Object" : addLocked ? "Add locked" : "Add Object";
  const addQuote =
    mode === "add"
      ? estimateCircleAddCredits({
          sourceWidth,
          sourceHeight,
          assetCreditCost: getAssetCreditCost(addObjectId),
        })
      : null;
  const ctaCost =
    mode === "remove"
      ? `${CIRCLE_REMOVE_CREDITS} credits`
      : addLocked
        ? "Paid plan"
        : addQuote
          ? `${addQuote.totalCredits} credits`
          : "";

  const controls = preview ? (
    <div className="flex flex-col gap-2">
      <CircleDrawToolbar
        tool={drawTool}
        onTool={setDrawTool}
        brushSize={brushSize}
        onBrushSize={setBrushSize}
      />
      <div className="flex items-center justify-center gap-1.5">
        {BRUSH_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setBrushSize(p.size)}
            className={
              brushSize === p.size
                ? "rounded-md bg-[#7B6FE0] px-2.5 py-1 text-[11px] font-semibold text-white"
                : "rounded-md border border-black/10 bg-white/70 px-2.5 py-1 text-[11px] font-medium text-[#3A3E4C] dark:border-white/10 dark:bg-white/5 dark:text-[#C5C7D0]"
            }
          >
            {p.label}
          </button>
        ))}
      </div>
      {mode === "add" && addQuote && !addLocked ? (
        <p className="text-center text-[11px] text-[#5C6170] dark:text-[#9AA0B0]">
          Base {addQuote.baseCredits}
          {addQuote.assetCredits > 0 ? ` + asset ${addQuote.assetCredits}` : ""} = {addQuote.totalCredits} credits
        </p>
      ) : null}
      {mode === "add" && addLocked ? (
        <p className="text-center text-[11px] font-medium text-[#7B6FE0]">Add requires a paid plan</p>
      ) : null}
    </div>
  ) : null;

  const addSheet = (
    <CircleAddDrawer
      isDark={isDark}
      open={mode === "add" && addDrawerOpen}
      onClose={() => setAddDrawerOpen(false)}
      addObjectId={addObjectId}
      setAddObjectId={setAddObjectId}
      addPrompt={addPrompt}
      setAddPrompt={setAddPrompt}
      activeCat={activeCat}
      setActiveCat={setActiveCat}
      assetQuery={assetQuery}
      setAssetQuery={setAssetQuery}
    />
  );

  if (phase === "result" && output && preview) {
    return (
      <CircleEditShell
        creditsLabel={creditsLabel}
        mode={mode}
        onModeChange={onModeChange}
        onBack={() => navigate({ to: "/studio" })}
        controls={null}
        actionBar={
          <div className="flex w-full flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setPhase("select");
                setOutput(null);
              }}
              className="rounded-lg border px-4 py-2.5 text-sm font-medium"
            >
              Edit again
            </button>
            <button type="button" onClick={() => void shareResult()} className="rounded-lg border px-4 py-2.5 text-sm font-medium">
              Share
            </button>
            <button
              type="button"
              onClick={() => void downloadResult()}
              className="ml-auto rounded-lg bg-[#7B6FE0] px-4 py-2.5 text-sm font-semibold text-white"
            >
              Download
            </button>
          </div>
        }
      >
        <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center p-3">
          {showCompare ? (
            <CompareSlider before={preview} after={output} />
          ) : (
            <img src={output} alt="Result" className="max-h-full max-w-full rounded-xl object-contain" />
          )}
          <button type="button" onClick={() => setShowCompare((v) => !v)} className="mt-3 text-xs font-medium text-[#7B6FE0]">
            {showCompare ? "Hide compare" : "Compare before / after"}
          </button>
        </div>
      </CircleEditShell>
    );
  }

  return (
    <CircleEditShell
      creditsLabel={creditsLabel}
      mode={mode}
      onModeChange={onModeChange}
      generating={phase === "generating"}
      onBack={
        phase === "generating"
          ? () => toast.message("Please wait until generation finishes.")
          : () => navigate({ to: "/studio" })
      }
      controls={controls}
      sheet={addSheet}
      actionBar={
        <CircleEditActionBar
          onClear={preview ? (hasMask ? onClearMask : resetPhoto) : undefined}
          statusText={statusForMode()}
          ctaLabel={!preview ? "Choose image" : ctaLabel}
          ctaCost={!preview ? undefined : ctaCost}
          ctaDisabled={!!preview && (!hasMask || (mode === "add" && addLocked))}
          onCta={onPrimaryCta}
          ctaVariant="violet"
        />
      }
    >
      {phase === "generating" && (
        <CircleEditGenOverlay
          progressPct={progressPct}
          activeStage={stageIdx}
          stageCount={GEN_STAGES.length}
          caption={GEN_STAGES[stageIdx]}
        />
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {!preview ? (
          <div className="flex flex-1 items-center justify-center px-[18px] py-3">
            <CircleEditUploadZone onPick={() => fileRef.current?.click()} />
          </div>
        ) : (
          <div className="relative flex min-h-0 flex-1 flex-col">
            <CircleMaskStage
              ref={maskStageRef}
              imageUrl={preview}
              tool={drawToolToMaskTool(drawTool)}
              brushSize={brushSize}
              onMaskChange={setHasMask}
            />
            <p className="pointer-events-none absolute bottom-2 left-0 right-0 z-[5] text-center text-[11px] font-medium text-[#5C6170]/95 dark:text-[#9AA0B0]/90">
              You can zoom and pan the image to make precise selections
            </p>
          </div>
        )}
      </div>
    </CircleEditShell>
  );
}
