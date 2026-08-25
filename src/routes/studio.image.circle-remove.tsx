/**
 * Circle 2edit — /studio/image/circle-remove
 * Design: circle-edit.html prototype (violet/teal).
 * Remove backend: SmartRemoveModal → generateMedia → flux-pro/v1/erase.
 * Add/Crop: UI only (no fake APIs).
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
  CircleEditGenOverlay,
  CircleEditActionBar,
  type CircleEditMode,
} from "@/components/circle-edit/CircleEditShell";
import { cn } from "@/lib/utils";

export const CIRCLE_INSTANT_CREDITS = 25;

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

const CROP_RATIOS = [
  { id: "free", label: "Free" },
  { id: "1:1", label: "1:1" },
  { id: "4:3", label: "4:3" },
  { id: "3:4", label: "3:4" },
  { id: "16:9", label: "16:9" },
  { id: "9:16", label: "9:16" },
] as const;

export const Route = createFileRoute("/studio/image/circle-remove")({
  head: () => ({
    meta: [
      { title: "Circle 2edit — MOTIO2EDIT" },
      {
        name: "description",
        content: "Circle 2edit — paint to remove objects. One image, no prompt.",
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
  const [progressPct, setProgressPct] = useState(0);
  const [maskOpen, setMaskOpen] = useState(false);
  const [mode, setMode] = useState<CircleEditMode>("remove");

  const [addPrompt, setAddPrompt] = useState("");
  const [addObjectId, setAddObjectId] = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState(OBJECT_CATEGORIES[0].id);
  const [cropRatio, setCropRatio] = useState<string>("free");

  useEffect(() => {
    if (phase !== "generating") return;
    setStageIdx(0);
    setProgressPct(8);
    const stageTimer = setInterval(
      () => setStageIdx((i) => Math.min(i + 1, GEN_STAGES.length - 1)),
      4500,
    );
    const pctTimer = setInterval(
      () => setProgressPct((p) => Math.min(92, p + 3 + Math.random() * 4)),
      1200,
    );
    return () => {
      clearInterval(stageTimer);
      clearInterval(pctTimer);
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
        setProgressPct(100);
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
    setAddPrompt("");
    setAddObjectId(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const onModeChange = (m: CircleEditMode) => {
    if (phase === "generating") return;
    setMode(m);
    setMaskOpen(false);
  };

  const statusForMode = () => {
    if (!preview) return "Upload a photo to begin";
    if (mode === "remove") return "Circle an object to begin";
    if (mode === "add") return "Circle an area, then pick an object or write a prompt";
    return "Drag the frame, pick a ratio";
  };

  const onPrimaryCta = () => {
    if (mode === "remove") {
      if (!preview) {
        fileRef.current?.click();
        return;
      }
      setMaskOpen(true);
      return;
    }
    if (mode === "add") {
      toast.message("Add Object backend is next — UI only for now.");
      return;
    }
    if (mode === "crop") {
      toast.message("Crop backend is next — UI only for now.");
    }
  };

  const ctaLabel =
    mode === "remove" ? "Remove Object" : mode === "add" ? "Add Object" : "Apply Crop";
  const ctaCost = mode === "crop" ? undefined : `${CIRCLE_INSTANT_CREDITS} credits`;
  const ctaVariant = mode === "crop" ? ("teal" as const) : ("violet" as const);

  if (phase === "generating") {
    return (
      <CircleEditShell
        creditsLabel={creditsLabel}
        mode={mode}
        onModeChange={onModeChange}
        generating
        onBack={() => toast.message("Generation is in progress. Result will appear when ready.")}
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
        onBack={() => {
          setPhase("select");
          setOutput(null);
        }}
        controls={
          <div className="flex shrink-0 justify-center border-t border-[#22232C] bg-[#15161B] px-4 py-3">
            <span className="font-mono text-[10.5px] tracking-[0.06em] text-[#5F6170]">
              Drag the divider to compare
            </span>
          </div>
        }
        actionBar={
          <footer className="flex shrink-0 flex-wrap items-center gap-2 border-t border-[#22232C] bg-[#15161B] px-3 py-3 sm:gap-3 sm:px-4">
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
            <Button
              variant="secondary"
              className="h-11 bg-[#1D1F27] text-[#F2F2F5] hover:bg-[#22242E]"
              onClick={resetPhoto}
            >
              <ImageIcon className="mr-1.5 h-4 w-4" /> Another photo
            </Button>
          </footer>
        }
      >
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-2 overflow-auto px-3 py-4">
          <div className="overflow-hidden rounded-xl border border-[#2A2C36] bg-[#15161B] p-1.5">
            <CompareSlider before={preview} after={output} />
          </div>
        </div>
      </CircleEditShell>
    );
  }

  const cat = OBJECT_CATEGORIES.find((c) => c.id === activeCat) ?? OBJECT_CATEGORIES[0];

  const controls =
    phase === "select" || phase === "upload" ? (
      mode === "add" ? (
        <section className="flex shrink-0 flex-col gap-3 border-t border-[#22232C] bg-[#15161B] px-3 py-3 sm:px-4">
          <textarea
            value={addPrompt}
            onChange={(e) => {
              setAddPrompt(e.target.value);
              if (e.target.value.trim()) setAddObjectId(null);
            }}
            rows={1}
            placeholder="Describe what you want to add…"
            className="min-h-[44px] max-h-[88px] w-full resize-none rounded-xl border border-[#2A2C36] bg-[#1D1F27] px-3.5 py-3 text-[13.5px] text-[#F2F2F5] placeholder:text-[#5F6170] focus:border-[#8B7CFF] focus:outline-none"
          />
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {OBJECT_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCat(c.id)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold",
                  activeCat === c.id
                    ? "border-[#8B7CFF] bg-[rgba(139,124,255,0.16)] text-[#8B7CFF]"
                    : "border-[#2A2C36] bg-[#1D1F27] text-[#9A9CAA]",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                  className="flex w-[66px] shrink-0 flex-col items-center gap-1.5"
                >
                  <span
                    className={cn(
                      "grid h-14 w-14 place-items-center rounded-[14px] border text-2xl",
                      selected
                        ? "border-[#8B7CFF] bg-[rgba(139,124,255,0.14)]"
                        : "border-[#2A2C36] bg-[#1D1F27]",
                    )}
                  >
                    {glyph}
                  </span>
                  <span
                    className={cn(
                      "text-[10.5px]",
                      selected ? "text-[#8B7CFF]" : "text-[#9A9CAA]",
                    )}
                  >
                    {name}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ) : mode === "crop" ? (
        <section className="flex shrink-0 flex-wrap gap-2 border-t border-[#22232C] bg-[#15161B] px-3 py-3 sm:px-4">
          {CROP_RATIOS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setCropRatio(r.id)}
              className={cn(
                "rounded-full border px-3.5 py-2 text-[12.5px] font-semibold",
                cropRatio === r.id
                  ? "border-[#8B7CFF] bg-[#8B7CFF] text-[#0E0F13]"
                  : "border-[#2A2C36] bg-[#1D1F27] text-[#9A9CAA] hover:text-[#F2F2F5]",
              )}
            >
              {r.label}
            </button>
          ))}
        </section>
      ) : null
    ) : null;

  return (
    <CircleEditShell
      creditsLabel={creditsLabel}
      mode={mode}
      onModeChange={onModeChange}
      onBack={() => navigate({ to: "/studio/image" })}
      controls={controls}
      actionBar={
        <CircleEditActionBar
          onClear={preview ? resetPhoto : undefined}
          statusText={statusForMode()}
          ctaLabel={!preview ? "Upload photo" : ctaLabel}
          ctaCost={!preview ? undefined : ctaCost}
          ctaDisabled={false}
          onCta={onPrimaryCta}
          ctaVariant={!preview ? "violet" : ctaVariant}
        />
      }
    >
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden px-[18px] py-3">
        {!preview ? (
          <CircleEditUploadZone onPick={() => fileRef.current?.click()} />
        ) : (
          <div className="relative flex max-h-full max-w-full flex-col items-center">
            <div className="relative max-h-full max-w-full overflow-hidden rounded-xl">
              <img
                src={preview}
                alt="Source"
                className="max-h-[min(58vh,640px)] max-w-full rounded-xl object-contain"
              />
              <div className="pointer-events-none absolute inset-0 rounded-xl">
                <span className="absolute left-0 top-0 h-4 w-4 rounded-tl-lg border-l-[1.5px] border-t-[1.5px] border-[#4B4470]" />
                <span className="absolute right-0 top-0 h-4 w-4 rounded-tr-lg border-r-[1.5px] border-t-[1.5px] border-[#4B4470]" />
                <span className="absolute bottom-0 left-0 h-4 w-4 rounded-bl-lg border-b-[1.5px] border-l-[1.5px] border-[#4B4470]" />
                <span className="absolute bottom-0 right-0 h-4 w-4 rounded-br-lg border-b-[1.5px] border-r-[1.5px] border-[#4B4470]" />
              </div>
              <div className="pointer-events-none absolute bottom-2.5 left-2.5 rounded-lg border border-[#22232C] bg-[rgba(15,16,20,0.55)] px-2 py-1 font-mono text-[10px] tracking-wide text-[#5F6170] backdrop-blur-sm">
                MODE: <span className="font-semibold text-[#9A9CAA]">{mode.toUpperCase()}</span>
                {" · "}
                <span className="font-semibold text-[#9A9CAA]">READY</span>
              </div>
              {mode === "crop" && (
                <div className="pointer-events-none absolute inset-[9%] rounded-sm border-[1.5px] border-[#8B7CFF] shadow-[0_0_0_9999px_rgba(9,10,13,0.55)]">
                  <div className="absolute inset-0 opacity-50">
                    <div className="absolute bottom-0 left-1/3 top-0 border-l border-white/35" />
                    <div className="absolute bottom-0 left-2/3 top-0 border-l border-white/35" />
                    <div className="absolute left-0 right-0 top-1/3 border-t border-white/35" />
                    <div className="absolute left-0 right-0 top-2/3 border-t border-white/35" />
                  </div>
                </div>
              )}
            </div>
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
