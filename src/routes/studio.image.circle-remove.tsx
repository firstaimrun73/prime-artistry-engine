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
  Columns2,
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
import { useTheme } from "@/lib/theme";

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
  "Preparing your edit…",
  "Understanding the selected area…",
  "Sending to AI…",
  "Applying the edit…",
  "Refining result…",
  "Finalising…",
];

/** Monotonic stage → progress floors (never regress). */
const STAGE_PROGRESS = [8, 22, 40, 58, 76, 90];

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
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const generate = useServerFn(generateMedia);
  const secureDl = useServerFn(secureDownloadImage);
  const fileRef = useRef<HTMLInputElement>(null);
  const generatingLockRef = useRef(false);
  const maskStageRef = useRef<CircleMaskStageHandle>(null);
  const progressTimersRef = useRef<{ stage?: number; tick?: number }>({});

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
  const [showCompare, setShowCompare] = useState(false);

  const clearProgressTimers = useCallback(() => {
    const t = progressTimersRef.current;
    if (t.stage) window.clearInterval(t.stage);
    if (t.tick) window.clearInterval(t.tick);
    progressTimersRef.current = {};
  }, []);

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
    if (phase !== "generating") {
      clearProgressTimers();
      return;
    }
    setStageIdx(0);
    setProgressPct(STAGE_PROGRESS[0]);
    clearProgressTimers();

    progressTimersRef.current.stage = window.setInterval(() => {
      setStageIdx((i) => {
        const next = Math.min(i + 1, GEN_STAGES.length - 1);
        setProgressPct((p) => Math.max(p, STAGE_PROGRESS[next] ?? p));
        return next;
      });
    }, 4200);

    // Gentle monotonic creep toward stage ceiling (never past 94 until complete)
    progressTimersRef.current.tick = window.setInterval(() => {
      setProgressPct((p) => {
        if (p >= 94) return p;
        return Math.min(94, p + 1);
      });
    }, 900);

    return () => clearProgressTimers();
  }, [phase, clearProgressTimers]);

  const isAdmin = isAdminEmail(profile?.email);
  const creditsLabel = `${(profile?.credits ?? 0).toLocaleString()} credits`;

  if (!user) {
    return (
      <div
        className={cn(
          "flex min-h-screen flex-col items-center justify-center px-4",
          isDark ? "bg-[#12141A] text-[#F2F2F5]" : "bg-[#F4F5F8] text-[#1A1C24]",
        )}
      >
        <p className={cn("text-sm", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>
          Sign in to use Circle 2edit.
        </p>
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
    setShowCompare(false);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [file, preview, isAdmin, profile?.credits, generate, refreshProfile, addPrompt, addObjectId, clearProgressTimers],
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
    setShowCompare(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const onModeChange = (m: CircleEditMode) => {
    if (phase === "generating") return;
    setMode(m);
    setAddDrawerOpen(false);
  };

  const statusForMode = () => {
    if (!preview) return "Upload an image to begin";
    if (mode === "remove") return "Select area, then remove";
    return "Select region, choose asset, then add";
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
      <CircleEditShell
        creditsLabel={creditsLabel}
        mode={mode}
        onModeChange={onModeChange}
        generating
        hideModeToggle
        onBack={() => toast.message("Generation is in progress.")}
      >
        <CircleEditGenOverlay
          caption={GEN_STAGES[stageIdx]}
          progressPct={progressPct}
          stageCount={GEN_STAGES.length}
          activeStage={stageIdx}
        />
      </CircleEditShell>
    );
  }

  if (phase === "result" && output && preview) {
    return (
      <CircleEditShell
        creditsLabel={creditsLabel}
        mode={mode}
        onModeChange={onModeChange}
        hideModeToggle
        onBack={() => {
          setPhase("select");
          setOutput(null);
          setShowCompare(false);
        }}
        actionBar={
          <footer
            className={cn(
              "flex shrink-0 flex-wrap items-center gap-2 border-t px-3 py-3 sm:gap-2.5 sm:px-4",
              isDark ? "border-white/8 bg-[#181A22]/95" : "border-black/6 bg-white/90",
            )}
          >
            <Button
              className="h-10 bg-[#A89BFF] text-[#12141A] hover:bg-[#9688EE]"
              onClick={() => void downloadResult()}
            >
              <Download className="mr-1.5 h-4 w-4" /> Download
            </Button>
            <Button
              variant="outline"
              className={cn(
                "h-10",
                isDark
                  ? "border-white/10 bg-transparent text-[#F2F2F5]"
                  : "border-black/10 bg-transparent text-[#1A1C24]",
              )}
              onClick={() => void shareResult()}
            >
              <Share2 className="mr-1.5 h-4 w-4" /> Share
            </Button>
            <Button
              variant="outline"
              className={cn(
                "h-10",
                isDark
                  ? "border-white/10 bg-transparent text-[#F2F2F5]"
                  : "border-black/10 bg-transparent text-[#1A1C24]",
              )}
              onClick={() => {
                setPhase("select");
                setOutput(null);
                setHasMask(false);
                setShowCompare(false);
              }}
            >
              <Pencil className="mr-1.5 h-4 w-4" /> Edit again
            </Button>
            <Button
              variant="secondary"
              className={cn(
                "h-10",
                isDark ? "bg-[#22252F] text-[#F2F2F5]" : "bg-[#EEF0F4] text-[#1A1C24]",
              )}
              onClick={resetPhoto}
            >
              <ImageIcon className="mr-1.5 h-4 w-4" /> Another photo
            </Button>
          </footer>
        }
      >
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-3 overflow-auto px-3 py-4">
          <div className="flex items-center justify-between gap-2">
            <p
              className={cn(
                "text-[12px] font-semibold uppercase tracking-[0.06em]",
                isDark ? "text-[#9AA0B0]" : "text-[#5C6170]",
              )}
            >
              {showCompare ? "Compare" : "Output"}
            </p>
            <button
              type="button"
              onClick={() => setShowCompare((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors",
                showCompare
                  ? "border-[#A89BFF]/50 bg-[#A89BFF]/15 text-[#A89BFF]"
                  : isDark
                    ? "border-white/10 text-[#9AA0B0] hover:text-[#F2F2F5]"
                    : "border-black/10 text-[#5C6170] hover:text-[#1A1C24]",
              )}
            >
              <Columns2 className="h-3.5 w-3.5" />
              {showCompare ? "Show output" : "Compare"}
            </button>
          </div>

          {showCompare ? (
            <div
              className={cn(
                "overflow-hidden rounded-xl border p-1.5",
                isDark ? "border-white/10 bg-[#1A1C24]" : "border-black/8 bg-white shadow-sm",
              )}
            >
              <CompareSlider before={preview} after={output} />
            </div>
          ) : (
            <div
              className={cn(
                "flex flex-1 items-center justify-center overflow-hidden rounded-xl border p-2",
                isDark ? "border-white/10 bg-[#1A1C24]" : "border-black/8 bg-white shadow-sm",
              )}
            >
              <img
                src={output}
                alt="Result"
                className="max-h-[min(70dvh,640px)] w-full object-contain"
              />
            </div>
          )}
        </div>
      </CircleEditShell>
    );
  }

  const cat = OBJECT_CATEGORIES.find((c) => c.id === activeCat) ?? OBJECT_CATEGORIES[0];

  const drawToolsBar = (
    <CircleDrawToolbar tool={drawTool} onTool={setDrawTool} brushSize={brushSize} onBrushSize={setBrushSize} />
  );

  const controls =
    phase === "select" && preview ? (
      mode === "remove" ? (
        <section className="flex shrink-0 flex-col gap-1">{drawToolsBar}</section>
      ) : (
        <section className="flex shrink-0 flex-col gap-2">
          {drawToolsBar}
          <div className="flex items-center gap-2">
            <p
              className={cn(
                "min-w-0 flex-1 text-[11px]",
                isDark ? "text-[#9AA0B0]" : "text-[#5C6170]",
              )}
            >
              Mark placement region, then open Assets
            </p>
            <button
              type="button"
              onClick={() => setAddDrawerOpen((v) => !v)}
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[12px] font-semibold transition-colors",
                addDrawerOpen
                  ? "bg-[#A89BFF] text-[#12141A]"
                  : isDark
                    ? "border border-white/10 bg-white/5 text-[#E8E9ED] hover:border-[#A89BFF]/40"
                    : "border border-black/10 bg-white text-[#1A1C24] hover:border-[#7B6FE0]/35",
              )}
            >
              Assets
            </button>
          </div>
        </section>
      )
    ) : null;

  const addSheet =
    mode === "add" && addDrawerOpen ? (
      <div className="relative z-30 shrink-0">
        <button
          type="button"
          aria-label="Close assets"
          className="absolute inset-x-0 bottom-full h-28 bg-black/25"
          onClick={() => setAddDrawerOpen(false)}
        />
        <div
          className={cn(
            "max-h-[42vh] overflow-y-auto rounded-t-2xl border-t px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_28px_rgba(0,0,0,0.2)] sm:px-4",
            isDark ? "border-white/10 bg-[#1E212B]" : "border-black/8 bg-white",
          )}
        >
          <div
            className={cn(
              "mx-auto mb-2.5 h-1 w-10 rounded-full",
              isDark ? "bg-[#3A3E4C]" : "bg-[#D8DAE0]",
            )}
          />
          <div className="mb-2 flex items-center justify-between">
            <p
              className={cn(
                "text-[13px] font-semibold",
                isDark ? "text-[#F2F2F5]" : "text-[#1A1C24]",
              )}
            >
              Add Object
            </p>
            <button
              type="button"
              onClick={() => setAddDrawerOpen(false)}
              className={cn(
                "rounded-lg px-2 py-1 text-[12px] font-medium",
                isDark ? "text-[#9AA0B0] hover:text-[#F2F2F5]" : "text-[#5C6170] hover:text-[#1A1C24]",
              )}
            >
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
            className={cn(
              "mb-2.5 min-h-[42px] max-h-[72px] w-full resize-none rounded-lg border px-3 py-2.5 text-[13px] focus:border-[#A89BFF] focus:outline-none",
              isDark
                ? "border-white/10 bg-[#22252F] text-[#F2F2F5] placeholder:text-[#6B7080]"
                : "border-black/10 bg-[#F4F5F8] text-[#1A1C24] placeholder:text-[#8A90A0]",
            )}
          />
          <div className="mb-2 flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {OBJECT_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCat(c.id)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium",
                  activeCat === c.id
                    ? "border-[#A89BFF] bg-[rgba(168,155,255,0.18)] text-[#A89BFF]"
                    : isDark
                      ? "border-white/10 bg-white/5 text-[#9AA0B0]"
                      : "border-black/8 bg-[#F4F5F8] text-[#5C6170]",
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
                  <span
                    className={cn(
                      "grid h-12 w-12 place-items-center rounded-[12px] border text-xl",
                      selected
                        ? "border-[#A89BFF] bg-[rgba(168,155,255,0.14)]"
                        : isDark
                          ? "border-white/10 bg-white/5"
                          : "border-black/8 bg-[#F4F5F8]",
                    )}
                  >
                    {glyph}
                  </span>
                  <span
                    className={cn(
                      "text-[10px]",
                      selected ? "text-[#A89BFF]" : isDark ? "text-[#9AA0B0]" : "text-[#5C6170]",
                    )}
                  >
                    {name}
                  </span>
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
          ctaLabel={!preview ? "Choose image" : ctaLabel}
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
