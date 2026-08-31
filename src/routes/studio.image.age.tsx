import { useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Upload, Loader2, Download, Info, AlertTriangle } from "lucide-react";
import { Header } from "@/components/Header";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * Age Studio — discovery/fun visual transform only.
 * NOT a primary Studio tab. Not a prediction of real appearance.
 * Local preview transform for UX; full AI path can be wired later without changing Studio nav.
 */
export const Route = createFileRoute("/studio/image/age")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Age Studio — Motio2edit" },
      {
        name: "description",
        content:
          "Fun AI age-style visual transform. Results are not predictions of real future appearance.",
      },
    ],
  }),
  component: AgeStudioPage,
});

type AgeMode = "younger" | "older";

function AgeStudioPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const fileRef = useRef<HTMLInputElement>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<AgeMode>("older");
  const [busy, setBusy] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (sourceUrl?.startsWith("blob:")) URL.revokeObjectURL(sourceUrl);
    if (resultUrl?.startsWith("blob:")) URL.revokeObjectURL(resultUrl);
    setSourceUrl(URL.createObjectURL(f));
    setResultUrl(null);
    e.target.value = "";
  };

  /** Client-side illustrative transform only — not a biometric prediction. */
  const onGenerate = async () => {
    if (!sourceUrl) {
      toast.error("Upload a photo first");
      return;
    }
    setBusy(true);
    try {
      const img = await loadImage(sourceUrl);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imageData.data;
      for (let i = 0; i < d.length; i += 4) {
        if (mode === "older") {
          const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          d[i] = Math.min(255, gray * 0.35 + d[i] * 0.65 + 8);
          d[i + 1] = Math.min(255, gray * 0.35 + d[i + 1] * 0.65 + 4);
          d[i + 2] = Math.min(255, gray * 0.4 + d[i + 2] * 0.6);
        } else {
          d[i] = Math.min(255, d[i] * 1.05 + 6);
          d[i + 1] = Math.min(255, d[i + 1] * 1.04 + 4);
          d[i + 2] = Math.min(255, d[i + 2] * 1.08 + 10);
        }
      }
      ctx.putImageData(imageData, 0, 0);
      const url = canvas.toDataURL("image/png");
      setResultUrl(url);
      toast.success("Preview ready — AI-generated style only");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Transform failed");
    } finally {
      setBusy(false);
    }
  };

  const display = showOriginal ? sourceUrl : resultUrl || sourceUrl;

  return (
    <div className={cn("min-h-screen", isDark ? "bg-[#12141A] text-[#F2F2F5]" : "bg-[#F4F5F8] text-[#1A1C24]")}>
      <Header />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-6">
        <Link to="/" className={cn("mb-3 inline-flex items-center gap-1 text-xs font-medium", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>
          <ArrowLeft className="h-3.5 w-3.5" /> Home
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight">Age Studio</h1>
        <p className={cn("mt-1 text-sm", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>
          Fun visual style transform — not a prediction of real future appearance.
        </p>

        <div className={cn("mt-4 flex items-start gap-2 rounded-xl border p-3 text-sm", isDark ? "border-amber-500/30 bg-amber-500/10 text-amber-100" : "border-amber-500/40 bg-amber-50 text-amber-900")}>
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">AI-generated result</p>
            <p className="mt-0.5 text-[13px] leading-snug opacity-90">
              It may be inaccurate. Do not treat the result as a prediction of your actual future appearance,
              health, personality, or identity.
            </p>
          </div>
        </div>

        <div className={cn("mt-6 overflow-hidden rounded-2xl border", isDark ? "border-white/10 bg-black/40" : "border-black/8 bg-white")}>
          <div className="relative flex aspect-[4/3] items-center justify-center bg-black/80">
            {display ? (
              <button type="button" className="h-full w-full" onMouseDown={() => setShowOriginal(true)} onMouseUp={() => setShowOriginal(false)} onTouchStart={() => setShowOriginal(true)} onTouchEnd={() => setShowOriginal(false)}>
                <img src={display} alt="" className="mx-auto max-h-full max-w-full object-contain" />
              </button>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()} className="flex flex-col items-center gap-2 text-white/80">
                <Upload className="h-8 w-8" />
                <span className="text-sm font-medium">Upload a photo</span>
              </button>
            )}
            {busy ? (
              <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2 p-3">
            <button type="button" onClick={() => setMode("younger")} className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold", mode === "younger" ? "border-[#7B6FE0] bg-[#7B6FE0] text-white" : isDark ? "border-white/15" : "border-black/10")}>
              Younger style
            </button>
            <button type="button" onClick={() => setMode("older")} className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold", mode === "older" ? "border-[#7B6FE0] bg-[#7B6FE0] text-white" : isDark ? "border-white/15" : "border-black/10")}>
              Older style
            </button>
            <div className="flex-1" />
            <button type="button" onClick={() => fileRef.current?.click()} className={cn("rounded-lg border px-3 py-2 text-sm font-medium", isDark ? "border-white/15" : "border-black/10")}>
              Change photo
            </button>
            <button type="button" disabled={!sourceUrl || busy} onClick={() => void onGenerate()} className="rounded-lg bg-[#7B6FE0] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              Generate
            </button>
            {resultUrl ? (
              <a href={resultUrl} download={`motio2edit-age-${Date.now()}.png`} className={cn("inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium", isDark ? "border-white/15" : "border-black/10")}>
                <Download className="h-4 w-4" />
              </a>
            ) : null}
          </div>
        </div>

        <p className={cn("mt-4 flex items-start gap-1.5 text-[11px] leading-snug", isDark ? "text-[#6B7080]" : "text-[#8A90A0]")}>
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Age Studio is a separate fun feature — not part of the primary Image Studio navigation.
          Current preview uses a local illustrative transform; results are entertainment only.
        </p>
      </main>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
    </div>
  );
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = url;
  });
}
