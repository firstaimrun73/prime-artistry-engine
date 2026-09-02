/**
 * Circle 2edit — /studio/image/circle-remove
 * Remove: circleInstant true
 * Add: circleInstant false → flux-pro fill; asset rail + factors + confirm
 * Exit/Back respects from=home|info|sample so Homepage → Editor → Exit returns Homepage.
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
import {
  readCircleKeepWatermarkPref,
  writeCircleKeepWatermarkPref,
} from "@/lib/circle-edit/circle-watermark";
import { SMART_REMOVE_PROMPT } from "@/components/SmartRemoveModal";
import {
  CircleEditShell,
  CircleEditUploadZone,
  CircleEditActionBar,
  CircleDrawToolbar,
  CircleEditGenOverlay,
  CircleCreditsInfo,
  type CircleDrawTool,
  type InkColor,
} from "@/components/circle-edit/CircleEditShell";
import {
  CircleMaskStage,
  type CircleMaskStageHandle,
} from "@/components/circle-edit/CircleMaskStage";
import { CircleAddAssetRail } from "@/components/circle-edit/CircleAddAssetRail";
import { CircleFactorPicker } from "@/components/circle-edit/CircleFactorPicker";
import { CompareSlider } from "@/components/CompareSlider";
import { findAddAsset } from "@/lib/circle-edit/add-assets";
import type { MaskTool } from "@/components/circle-edit/mask/types";
import { useTheme } from "@/lib/theme";
import { isFreePlan } from "@/lib/policy";
import { CIRCLE_REMOVE_CREDITS, estimateCircleAddCredits } from "@/lib/circle-edit/credits";
import { getAssetCreditCost } from "@/lib/circle-edit/add-assets-pricing";
import { AssetIcon } from "@/components/circle-edit/AssetIcon";
import { cn } from "@/lib/utils";
import { resolveCircleBackTarget } from "@/lib/circle-edit/circle-samples";

type CircleSearch = {
  mode?: "add" | "remove";
  assetId?: string;
  sampleId?: string;
  from?: "home" | "info" | "sample";
};

export const Route = createFileRoute("/studio/image/circle-remove")({
  ssr: false,
  validateSearch: (raw: Record<string, unknown>): CircleSearch => {
    const mode = raw.mode === "add" || raw.mode === "remove" ? raw.mode : undefined;
    const assetId =
      typeof raw.assetId === "string" && raw.assetId.length > 0 && raw.assetId.length <= 80
        ? raw.assetId
        : undefined;
    const sampleId =
      typeof raw.sampleId === "string" && raw.sampleId.length > 0 && raw.sampleId.length <= 80
        ? raw.sampleId
        : undefined;
    const from =
      raw.from === "home" || raw.from === "info" || raw.from === "sample" ? raw.from : undefined;
    return { mode, assetId, sampleId, from };
  },
  component: Circle2editPage,
  head: () => ({
    meta: [
      { title: "Circle 2edit — Motio2edit" },
      { name: "description", content: "Circle 2edit — circle to remove or add objects." },
    ],
  }),
});

const GEN_STAGES = [
  "Preparing selection",
  "Understanding image",
  "Understanding object",
  "Matching perspective",
  "Matching lighting",
  "Building object",
  "Applying AI",
  "Finalising",
] as const;

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
  const search = Route.useSearch();
  const { user, profile, refreshProfile } = useAuth();
  const isAdmin = isAdminEmail(profile?.email);
  const addLocked = !isAdmin && isFreePlan(profile?.plan);
  const watermarkLocked = !isAdmin && isFreePlan(profile?.plan);
  const generate = useServerFn(generateMedia);
  const secureDl = useServerFn(secureDownloadImage);
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const fileRef = useRef<HTMLInputElement>(null);
  const maskStageRef = useRef<CircleMaskStageHandle>(null);
  const generatingLockRef = useRef(false);
  const tryNowHydratedRef = useRef(false);

  const [phase, setPhase] = useState<Phase>("select");
  const [mode, setMode] = useState<Mode>("remove");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [output, setOutput] = useState<string | null>(null);
  const [hasMask, setHasMask] = useState(false);
  const [drawTool, setDrawTool] = useState<CircleDrawTool>("circle");
  const [brushSize, setBrushSize] = useState(24);
  const [inkColor, setInkColor] = useState<InkColor>("purple");
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [addDrawerOpen, setAddDrawerOpen] = useState(false);
  const [addObjectId, setAddObjectId] = useState<string | null>(null);
  const [factorSelection, setFactorSelection] = useState<Record<string, string>>({});
  const [addConfirmed, setAddConfirmed] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [stageIdx, setStageIdx] = useState(0);
  const [showCompare, setShowCompare] = useState(true);
  const [sourceWidth, setSourceWidth] = useState(0);
  const [sourceHeight, setSourceHeight] = useState(0);
  const [keepCircleWatermark, setKeepCircleWatermark] = useState(true);
  const progressTimers = useRef<number[]>([]);

  const goBack = useCallback(() => {
    const target = resolveCircleBackTarget(search.from, search.sampleId);
    navigate({ to: target as "/" });
  }, [navigate, search.from, search.sampleId]);

  const clearProgressTimers = useCallback(() => {
    progressTimers.current.forEach((id) => window.clearTimeout(id));
    progressTimers.current = [];
  }, []);

  const onHistoryChange = useCallback((u: boolean, r: boolean) => {
    setCanUndo(u);
    setCanRedo(r);
  }, []);

  useEffect(() => {
    if (watermarkLocked) {
      setKeepCircleWatermark(true);
      return;
    }
    setKeepCircleWatermark(readCircleKeepWatermarkPref());
  }, [watermarkLocked]);

  useEffect(() => {
    if (tryNowHydratedRef.current) return;
    tryNowHydratedRef.current = true;
    const m = search.mode;
    const aid = search.assetId;
    if (m === "remove") {
      setMode("remove");
      return;
    }
    if (m === "add") {
      if (addLocked) {
        toast.message("Circle Add is a paid feature. Upgrade to unlock.");
        setMode("remove");
        return;
      }
      setMode("add");
      setDrawTool("brush");
      if (aid && findAddAsset(aid)) {
        setAddObjectId(aid);
        setFactorSelection({});
        setAddConfirmed(false);
        setConfirmOpen(true);
        toast.message(`Selected ${findAddAsset(aid)?.name ?? "object"} — confirm options to place`);
      } else if (aid) {
        toast.message("That object is not available. Browse the asset list.");
        setAddDrawerOpen(true);
      } else {
        setAddDrawerOpen(true);
      }
    }
  }, [search.mode, search.assetId, search.sampleId, addLocked]);

  useEffect(() => {
    if (!preview) return;
    const img = new Image();
    img.onload = () => {
      setSourceWidth(img.naturalWidth || 0);
      setSourceHeight(img.naturalHeight || 0);
    };
    img.src = preview;
  }, [preview]);

  useEffect(() => {
    if (phase !== "generating") {
      clearProgressTimers();
      return;
    }
    setProgressPct(6);
    setStageIdx(0);
    const steps = [
      { ms: 600, pct: 12, idx: 1 },
      { ms: 1400, pct: 24, idx: 2 },
      { ms: 2400, pct: 38, idx: 3 },
      { ms: 3600, pct: 52, idx: 4 },
      { ms: 5000, pct: 68, idx: 5 },
      { ms: 6800, pct: 82, idx: 6 },
      { ms: 8600, pct: 92, idx: 7 },
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
    setPreview(URL.createObjectURL(f));
    setOutput(null);
    setHasMask(false);
    setCanUndo(false);
    setCanRedo(false);
    setPhase("select");
    setShowCompare(true);
  };

  const resetPhoto = () => {
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setOutput(null);
    setHasMask(false);
    setCanUndo(false);
    setCanRedo(false);
    setPhase("select");
    maskStageRef.current?.clear();
  };

  const onClearMask = () => {
    if (!hasMask) {
      toast.message("No mask to clear");
      return;
    }
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
      const maskStats = kind === "add" ? maskStageRef.current?.exportMaskStats() ?? null : null;
      if (kind === "add" && addLocked) {
        toast.error("Circle Add requires a paid plan.");
        return;
      }
      if (kind === "add" && !addConfirmed) {
        toast.message("Confirm the object first.");
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
        if (!asset) {
          setAddDrawerOpen(true);
          toast.message("Pick an object to add.");
          return;
        }
      }

      setAddDrawerOpen(false);
      setConfirmOpen(false);
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
              keepWatermark: watermarkLocked ? true : keepCircleWatermark,
            },
          });
          clearProgressTimers();
          setProgressPct(100);
          setStageIdx(GEN_STAGES.length - 1);
          if (!res.outputUrl || res.outputUrl === imageUrl) throw new Error("Generation returned invalid result.");
          await waitForImageLoadable(res.outputUrl);
          setOutput(res.outputUrl);
          setShowCompare(true);
          setPhase("result");
          await refreshProfile();
          toast.success("Object removed");
        } else {
          const res = await generate({
            data: {
              prompt: "circle-add",
              type: "image",
              imageUrl,
              sourceKind: "image",
              maskImageUrl: maskUrl,
              imageQuality: "hd",
              circleInstant: false,
              circleAssetId: addObjectId || undefined,
              circleFactors: factorSelection,
              circleMaskStats: maskStats ?? undefined,
              sourceWidth: sourceWidth || undefined,
              sourceHeight: sourceHeight || undefined,
              keepWatermark: watermarkLocked ? true : keepCircleWatermark,
            },
          });
          clearProgressTimers();
          setProgressPct(100);
          setStageIdx(GEN_STAGES.length - 1);
          if (!res.outputUrl || res.outputUrl === imageUrl) throw new Error("Generation returned invalid result.");
          await waitForImageLoadable(res.outputUrl);
          setOutput(res.outputUrl);
          setShowCompare(true);
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
    [
      file,
      preview,
      isAdmin,
      profile?.credits,
      generate,
      refreshProfile,
      addObjectId,
      factorSelection,
      clearProgressTimers,
      addLocked,
      sourceWidth,
      sourceHeight,
      addConfirmed,
      keepCircleWatermark,
      watermarkLocked,
    ],
  );

  const onModeChange = (m: Mode) => {
    if (m === "add" && addLocked) {
      toast.message("Circle Add is a paid feature. Upgrade to unlock.");
      return;
    }
    setMode(m);
    if (m === "add") {
      setDrawTool("brush");
      setAddConfirmed(false);
      setConfirmOpen(false);
    } else {
      setAddDrawerOpen(false);
      setConfirmOpen(false);
    }
  };

  const statusForMode = () => {
    if (!preview) return "Upload an image to begin";
    if (mode === "add") {
      if (!addObjectId) return "Browse objects to add";
      if (!addConfirmed) return "Confirm object & options";
      if (!hasMask) return "Paint where to add";
      return `Ready to add ${findAddAsset(addObjectId)?.name ?? "object"}`;
    }
    if (!hasMask) return "Circle or paint the object to remove";
    return "Ready to remove";
  };

  const creditsLabel = isAdmin ? "Admin" : `${profile?.credits ?? 0} credits`;
  const addQuote =
    mode === "add"
      ? estimateCircleAddCredits({
          sourceWidth,
          sourceHeight,
          assetCreditCost: getAssetCreditCost(addObjectId),
        })
      : null;

  const creditInfoLines =
    mode === "remove"
      ? [
          { label: "Operation", value: "Circle Remove" },
          { label: "Cost", value: `${CIRCLE_REMOVE_CREDITS} credits` },
          { label: "Note", value: "Server-authoritative" },
        ]
      : [
          { label: "Operation", value: "Circle Add" },
          { label: "Image", value: `${addQuote?.baseCredits ?? "—"} credits` },
          { label: "Object", value: `${addQuote?.assetCredits ?? 0} credits` },
          { label: "Total", value: `${addQuote?.totalCredits ?? "—"} credits` },
        ];

  const canGenerate =
    !!preview &&
    hasMask &&
    (mode === "remove" || (!addLocked && !!findAddAsset(addObjectId) && addConfirmed));

  const selectedAsset = findAddAsset(addObjectId);
  const paintLocked = phase === "generating" || (mode === "add" && !addConfirmed);

  const watermarkToggle = (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border px-2 py-1",
        isDark ? "border-white/10 bg-white/[0.03]" : "border-black/8 bg-black/[0.02]",
      )}
    >
      <span className="text-[10px] font-medium text-[#7B6FE0]">⭕ Motio 2 Edit</span>
      {watermarkLocked ? (
        <span
          className={cn(
            "ml-auto inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
            isDark ? "bg-white/10 text-[#C5C7D0]" : "bg-black/5 text-[#3A3E4C]",
          )}
          title="Required on Free plan"
        >
          Locked
        </span>
      ) : (
        <button
          type="button"
          role="switch"
          aria-checked={keepCircleWatermark}
          aria-label="Toggle Circle watermark"
          onClick={() => {
            const next = !keepCircleWatermark;
            setKeepCircleWatermark(next);
            writeCircleKeepWatermarkPref(next);
            toast.message(next ? "Circle watermark on" : "Circle watermark off");
          }}
          className={cn(
            "relative ml-auto h-5 w-9 shrink-0 rounded-full transition-colors",
            keepCircleWatermark ? "bg-[#7B6FE0]" : isDark ? "bg-white/20" : "bg-black/20",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all",
              keepCircleWatermark ? "left-4" : "left-0.5",
            )}
          />
        </button>
      )}
    </div>
  );

  const controls = preview ? (
    <div className="flex flex-col gap-2">
      {watermarkToggle}
      {mode === "remove" || addConfirmed ? (
        <CircleDrawToolbar
          tool={drawTool}
          onTool={setDrawTool}
          brushSize={brushSize}
          onBrushSize={setBrushSize}
          hideCircle={mode === "add"}
          onUndo={() => maskStageRef.current?.undo()}
          onRedo={() => maskStageRef.current?.redo()}
          canUndo={canUndo}
          canRedo={canRedo}
          inkColor={inkColor}
          onInkColor={setInkColor}
        />
      ) : null}
      {mode === "add" && !addLocked ? (
        <>
          {addConfirmed && selectedAsset ? (
            <div className="flex items-center gap-2 rounded-xl border border-[#7B6FE0]/40 bg-[rgba(123,111,224,0.10)] px-2.5 py-1.5">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[rgba(123,111,224,0.18)]">
                <AssetIcon asset={selectedAsset} size={20} isDark={isDark} selected />
              </span>
              <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-[#7B6FE0]">
                {selectedAsset.name}
              </span>
              <button
                type="button"
                aria-label="Clear selected object"
                onClick={() => {
                  setAddObjectId(null);
                  setFactorSelection({});
                  setAddConfirmed(false);
                  setConfirmOpen(false);
                  maskStageRef.current?.clear();
                  setHasMask(false);
                }}
                className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-[13px] font-bold text-[#7B6FE0]/80 hover:bg-[rgba(123,111,224,0.15)]"
              >
                ×
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddConfirmed(false);
                  setConfirmOpen(true);
                }}
                className="shrink-0 rounded-lg px-2 py-0.5 text-[11px] font-medium text-[#7B6FE0]/90"
              >
                Change
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAddDrawerOpen(true)}
              className="rounded-xl border border-[#7B6FE0]/40 bg-[rgba(123,111,224,0.08)] px-3 py-1.5 text-[12px] font-semibold text-[#7B6FE0] backdrop-blur-md"
            >
              Browse objects
            </button>
          )}
        </>
      ) : null}
      {mode === "add" && addLocked ? (
        <p className="text-center text-[11px] font-medium text-[#7B6FE0]">Add requires a paid plan</p>
      ) : null}
    </div>
  ) : null;

  const addSheet =
    mode === "add" ? (
      <CircleAddAssetRail
        isDark={isDark}
        open={addDrawerOpen}
        onClose={() => setAddDrawerOpen(false)}
        addObjectId={addObjectId}
        onSelect={(id) => {
          setAddObjectId(id);
          setFactorSelection({});
          setAddConfirmed(false);
          setAddDrawerOpen(false);
          setConfirmOpen(true);
        }}
        disabled={addLocked || !preview}
      />
    ) : null;

  const confirmSheet =
    mode === "add" && confirmOpen && selectedAsset && !addConfirmed ? (
      <>
        <button
          type="button"
          aria-label="Close confirmation"
          className="fixed inset-0 z-[45] bg-black/25"
          onClick={() => {
            setConfirmOpen(false);
            setAddObjectId(null);
            setFactorSelection({});
          }}
        />
        <div
          className={cn(
            "fixed inset-x-0 bottom-0 z-[50] max-h-[50vh] overflow-y-auto border-t px-3 py-3 shadow-[0_-8px_28px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:px-4",
            isDark ? "border-white/10 bg-[#181A22]/96" : "border-black/6 bg-white/96",
          )}
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          role="dialog"
          aria-label="Confirm object to add"
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[rgba(123,111,224,0.18)]">
              <AssetIcon asset={selectedAsset} size={28} isDark={isDark} selected />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-[#7B6FE0]">{selectedAsset.name}</p>
              <p className={cn("text-[11px]", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>
                Choose options, then confirm to paint placement
              </p>
            </div>
          </div>
          <CircleFactorPicker
            asset={selectedAsset}
            selection={factorSelection}
            onChange={setFactorSelection}
            isDark={isDark}
          />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setConfirmOpen(false);
                setAddObjectId(null);
                setFactorSelection({});
                setAddConfirmed(false);
              }}
              className={cn(
                "flex-1 rounded-xl border px-3 py-2.5 text-[13px] font-semibold",
                isDark ? "border-white/12 text-[#9AA0B0]" : "border-black/10 text-[#5C6170]",
              )}
            >
              ✕ Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setAddConfirmed(true);
                setConfirmOpen(false);
                setDrawTool("brush");
                toast.message(`Ready to place ${selectedAsset.name}`);
              }}
              className="flex-1 rounded-xl bg-[#7B6FE0] px-3 py-2.5 text-[13px] font-semibold text-white"
            >
              ✓ Confirm
            </button>
          </div>
        </div>
      </>
    ) : null;

  if (phase === "result" && output && preview) {
    return (
      <CircleEditShell
        creditsLabel={creditsLabel}
        mode={mode}
        onModeChange={onModeChange}
        addLocked={addLocked}
        onBack={goBack}
        controls={null}
        actionBar={
          <div className="flex w-full flex-wrap items-center justify-center gap-2 px-3 py-2.5">
            <button
              type="button"
              onClick={() => {
                setPhase("select");
                setOutput(null);
              }}
              className="rounded-xl border px-4 py-2.5 text-sm font-medium backdrop-blur-md"
            >
              Edit again
            </button>
            <button
              type="button"
              onClick={() => setShowCompare((v) => !v)}
              className="rounded-xl border px-4 py-2.5 text-sm font-medium text-[#7B6FE0]"
            >
              {showCompare ? "Show result only" : "Compare"}
            </button>
            <button
              type="button"
              onClick={() =>
                void (async () => {
                  try {
                    const res = await secureDl({
                      data: { imageUrl: output, keepWatermark: watermarkLocked ? true : keepCircleWatermark },
                    });
                    await triggerBrowserDownload(res.downloadUrl, `motio2edit-circle-${Date.now()}.jpg`);
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Download failed");
                  }
                })()
              }
              className="rounded-xl bg-[#7B6FE0] px-4 py-2.5 text-sm font-semibold text-white"
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
        </div>
      </CircleEditShell>
    );
  }

  return (
    <CircleEditShell
      creditsLabel={creditsLabel}
      mode={mode}
      onModeChange={onModeChange}
      addLocked={addLocked}
      generating={phase === "generating"}
      onBack={goBack}
      controls={controls}
      sheet={
        <>
          {addSheet}
          {confirmSheet}
        </>
      }
      onGenerate={() => void runWithMask(mode)}
      generateDisabled={!canGenerate}
      generateLabel={mode === "remove" ? "Remove Object" : "Add Object"}
      generateHint={
        !preview
          ? "Upload an image first"
          : mode === "add" && !addObjectId
            ? "Choose an object first"
            : mode === "add" && !addConfirmed
              ? "Confirm object first"
              : !hasMask
                ? "Select an area first"
                : undefined
      }
      actionBar={
        <CircleEditActionBar
          hasImage={!!preview}
          hasMask={hasMask}
          onClearMask={onClearMask}
          onClearImage={resetPhoto}
          statusText={statusForMode()}
          infoSlot={<CircleCreditsInfo title="Credits" lines={creditInfoLines} />}
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
              disabled={paintLocked}
              onMaskChange={setHasMask}
              inkColor={inkColor}
              onHistoryChange={onHistoryChange}
            />
          </div>
        )}
      </div>
    </CircleEditShell>
  );
}
