/**
 * Motio2edit Frames Studio — production compose → charge → result.
 */
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Download,
  Info,
  Lock,
  Share2,
  SlidersHorizontal,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { isAdminEmail } from "@/lib/admin-config";
import { isPaidPlan } from "@/lib/policy";
import { readKeepWatermarkPref } from "@/lib/watermark-pref";
import { cn } from "@/lib/utils";
import { chargeFrameStudioApply } from "@/lib/frame-studio/charge.server";
import {
  FRAMES,
  FRAME_CREDIT_COST,
  DEFAULT_CONTROLS,
  composeFrame,
  framesForAspect,
  type FrameDef,
  type Controls,
  type FrameTier,
} from "@/lib/frame-studio/frames-compose";
import { getFrameInfo } from "@/lib/frame-studio/frame-info";

type Phase = "idle" | "edit" | "processing" | "result";

const CURATED_IDS = [
  "paper", "kraft", "walnut", "oak", "polaroid", "galleryDouble",
  "c-charcoal", "g-clear", "watercolor", "corners", "linen", "film",
  "filmreel2", "videoReel", "camera2", "g-frost", "g-aurora", "driftwood",
  "denimSt", "rosegold", "marbleW", "museumGold", "treasure1", "leatherSt",
  "ebony", "marbleB", "camera1", "filmreel1", "g-sheen", "ancientRelic",
  "brass", "velvet", "goldfoil", "silver", "bamboo",
];

function TierBadge({ tier }: { tier: FrameTier }) {
  if (tier === "common") return null;
  return (
    <span
      className={cn(
        "absolute left-0.5 top-0.5 z-10 rounded px-1 py-[1px] text-[7px] font-bold text-white",
        tier === "aiplus" ? "bg-[#FF5A1F]" : "bg-gradient-to-r from-amber-600 to-yellow-500",
      )}
    >
      {tier === "aiplus" ? "AI+" : "Premium"}
    </span>
  );
}

export function FramesPage() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { profile, refreshProfile } = useAuth();
  const chargeApply = useServerFn(chargeFrameStudioApply);
  const admin = isAdminEmail(profile?.email);
  const paid = admin || isPaidPlan(profile?.plan);

  const [phase, setPhase] = useState<Phase>("idle");
  const [frameId, setFrameId] = useState("polaroid");
  const [source, setSource] = useState<HTMLImageElement | null>(null);
  const [sourceKey, setSourceKey] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [thumbCache, setThumbCache] = useState<Record<string, string>>({});
  const [applying, setApplying] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [controls, setControls] = useState<Controls>({
    ...DEFAULT_CONTROLS,
    glassPanel: false,
  } as Controls);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [infoFrame, setInfoFrame] = useState<FrameDef | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [moreQuery, setMoreQuery] = useState("");
  const [wantWm, setWantWm] = useState(() => readKeepWatermarkPref());
  const fileRef = useRef<HTMLInputElement>(null);
  const applyLock = useRef(false);
  /** Never overwrite with preview/result — original only. */
  const sourceOnly = useRef<HTMLImageElement | null>(null);

  const imageAspect = source
    ? (source.naturalWidth || source.width) / Math.max(1, source.naturalHeight || source.height)
    : 1;
  const compatibleFrames = useMemo(
    () => (source ? framesForAspect(imageAspect) : FRAMES),
    [source, imageAspect],
  );
  const railFrames = useMemo(() => {
    const map = new Map(compatibleFrames.map((f) => [f.id, f]));
    const curated = CURATED_IDS.map((id) => map.get(id)).filter(Boolean) as FrameDef[];
    return curated.length >= 8 ? curated : compatibleFrames.slice(0, 35);
  }, [compatibleFrames]);
  const frame =
    compatibleFrames.find((f) => f.id === frameId) ?? compatibleFrames[0] ?? FRAMES[0]!;
  const cost = FRAME_CREDIT_COST[frame.tier];
  const moreFiltered = useMemo(() => {
    const q = moreQuery.trim().toLowerCase();
    if (!q) return compatibleFrames;
    return compatibleFrames.filter((f) =>
      `${f.id} ${f.name} ${f.tier} ${f.kind} ${f.texture ?? ""}`.toLowerCase().includes(q),
    );
  }, [compatibleFrames, moreQuery]);

  useEffect(() => {
    if (!compatibleFrames.some((f) => f.id === frameId)) {
      setFrameId(compatibleFrames[0]?.id ?? "polaroid");
    }
  }, [source, compatibleFrames, frameId]);

  useEffect(() => {
    if (!source || phase !== "edit") {
      if (!source) setPreviewUrl(null);
      return;
    }
    const t = window.setTimeout(() => {
      try {
        const c = composeFrame(source, frame, controls, 900, false);
        setPreviewUrl(c.toDataURL("image/jpeg", 0.9));
      } catch (e) {
        console.error(e);
      }
    }, 40);
    return () => window.clearTimeout(t);
  }, [source, frame, controls, phase]);

  useEffect(() => {
    if (!source || phase === "idle") {
      setThumbCache({});
      return;
    }
    let cancelled = false;
    const cache: Record<string, string> = {};
    (async () => {
      for (const f of compatibleFrames) {
        if (cancelled) return;
        try {
          const c = composeFrame(source, f, DEFAULT_CONTROLS, 120, false);
          cache[f.id] = c.toDataURL("image/jpeg", 0.75);
        } catch {
          /* skip */
        }
        if (Object.keys(cache).length % 6 === 0) {
          setThumbCache({ ...cache });
          await new Promise((r) => setTimeout(r, 0));
        }
      }
      if (!cancelled) setThumbCache({ ...cache });
    })();
    return () => {
      cancelled = true;
    };
  }, [source, sourceKey, phase, compatibleFrames]);

  useEffect(() => {
    if (!paid) setWantWm(true);
  }, [paid]);

  const onPick = useCallback((file?: File) => {
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      toast.error("Image too large (max 25MB)");
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      sourceOnly.current = img;
      setSource(img);
      setSourceKey((k) => k + 1);
      setResultUrl(null);
      setPhase("edit");
      setAdjustOpen(false);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      toast.error("Could not load image");
    };
    img.src = url;
  }, []);

  const selectFrame = (f: FrameDef) => {
    if (!paid && f.tier !== "common") {
      toast.error(f.tier === "aiplus" ? "AI+ plan required" : "Premium plan required");
      void navigate({ to: "/pricing" });
      return;
    }
    setFrameId(f.id);
  };

  const onApply = async () => {
    const srcImg = sourceOnly.current ?? source;
    if (!srcImg || applyLock.current || applying) return;
    applyLock.current = true;
    setApplying(true);
    setPhase("processing");
    try {
      const edgePre = Math.min(
        2048,
        Math.max(srcImg.naturalWidth, srcImg.naturalHeight, 1200),
      );
      // Always compose from ORIGINAL source — never from preview
      const composed = composeFrame(srcImg, frame, controls, edgePre, !paid || wantWm);
      if (!composed || composed.width < 8) {
        toast.error("Composition failed");
        setPhase("edit");
        return;
      }
      const res = await chargeApply({ data: { frameId: frame.id } });
      if (!res || typeof res !== "object" || !("ok" in res) || !res.ok) {
        const r = res as { reason?: string; message?: string };
        toast.error(r?.message || "Could not apply frame");
        if (r?.reason === "plan" || r?.reason === "credits") void navigate({ to: "/pricing" });
        setPhase("edit");
        return;
      }
      try {
        await refreshProfile?.();
      } catch {
        /* ignore */
      }
      setResultUrl(composed.toDataURL("image/jpeg", 0.94));
      setPhase("result");
      setAdjustOpen(false);
    } catch (e) {
      console.error(e);
      toast.error("Could not apply frame");
      setPhase("edit");
    } finally {
      setApplying(false);
      applyLock.current = false;
    }
  };

  const onExport = async () => {
    if (!resultUrl) return;
    setExporting(true);
    try {
      const a = document.createElement("a");
      a.href = resultUrl;
      a.download = `motio2edit-frames-${frame.id}.jpg`;
      a.click();
    } finally {
      setExporting(false);
    }
  };

  const isLight = theme === "light";
  const vars = {
    ["--frames-bg" as string]: isLight ? "#F7F5F2" : "#0A0A0A",
    ["--frames-surface" as string]: isLight ? "#FFFFFF" : "#141414",
    ["--frames-glass" as string]: isLight ? "rgba(255,255,255,0.72)" : "rgba(20,20,20,0.72)",
    ["--frames-text" as string]: isLight ? "#111111" : "#FFFFFF",
    ["--frames-muted" as string]: isLight ? "#666666" : "#A1A1AA",
    ["--frames-border" as string]: isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.12)",
    ["--frames-preview" as string]: isLight ? "#EDEAE6" : "#000000",
    background: "var(--frames-bg)",
    color: "var(--frames-text)",
  } as React.CSSProperties;

  return (
    <div className="relative flex h-dvh max-h-dvh flex-col overflow-hidden" style={vars}>
      <header
        className="z-30 flex h-14 shrink-0 items-center justify-between border-b px-2"
        style={{ borderColor: "var(--frames-border)", background: "var(--frames-glass)", backdropFilter: "blur(16px)" }}
      >
        <button type="button" onClick={() => void navigate({ to: "/studio" })} className="grid h-10 w-10 place-items-center rounded-full border" style={{ borderColor: "var(--frames-border)" }} aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-lg font-bold tracking-tight">Frames</h1>
        <div className="h-10 w-10" />
      </header>

      <main className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-3" style={{ background: "var(--frames-preview)" }}>
        {phase === "idle" || !source ? (
          <button type="button" onClick={() => fileRef.current?.click()} className="rounded-2xl border px-8 py-4 text-sm font-semibold" style={{ borderColor: "var(--frames-border)", background: "var(--frames-glass)" }}>
            <Upload className="mr-2 inline h-4 w-4" />
            Upload your image
          </button>
        ) : phase === "processing" ? (
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#FF5A1F] border-t-transparent" />
            <p className="text-sm font-semibold">Creating your framed image…</p>
          </div>
        ) : phase === "result" && resultUrl ? (
          <img src={resultUrl} alt="Framed result" className="mx-auto max-h-[min(52dvh,520px)] w-auto object-contain" />
        ) : (
          previewUrl && <img src={previewUrl} alt="Framed preview" className="mx-auto max-h-[min(48dvh,480px)] w-auto object-contain" />
        )}
      </main>

      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; onPick(f); }} />

      {phase === "edit" && source && (
        <footer className="z-20 shrink-0 border-t px-3 pt-2" style={{ borderColor: "var(--frames-border)", background: "var(--frames-glass)", backdropFilter: "blur(20px)", paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
          <div className="mb-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {railFrames.map((f) => {
              const locked = !paid && f.tier !== "common";
              return (
                <div key={f.id} className={cn("relative flex w-[4.25rem] shrink-0 flex-col items-center rounded-2xl border p-1", f.id === frame.id ? "border-[#FF5A1F] ring-2 ring-[#FF5A1F]/35" : "border-[var(--frames-border)]")}>
                  <button type="button" onClick={() => selectFrame(f)} className="relative h-14 w-14 overflow-hidden rounded-lg bg-black/20">
                    {thumbCache[f.id] ? <img src={thumbCache[f.id]} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center text-[9px] text-[var(--frames-muted)]">…</span>}
                    <TierBadge tier={f.tier} />
                    {locked && <span className="absolute inset-0 grid place-items-center bg-black/45"><Lock className="h-4 w-4 text-white" /></span>}
                  </button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setInfoFrame(f); }} className="absolute -right-0.5 -top-0.5 z-20 grid h-5 w-5 place-items-center rounded-full border bg-[var(--frames-surface)]" style={{ borderColor: "var(--frames-border)" }} aria-label="Info">
                    <Info className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
            <button type="button" onClick={() => setMoreOpen(true)} className="flex w-[4.25rem] shrink-0 flex-col items-center justify-center rounded-2xl border border-dashed p-1" style={{ borderColor: "var(--frames-border)" }} aria-label="More Frames">
              <span className="text-[10px] font-bold uppercase text-[var(--frames-muted)]">More</span>
            </button>
          </div>

          {adjustOpen && (
            <div className="mb-3 space-y-3 rounded-2xl border p-3" style={{ borderColor: "var(--frames-border)" }}>
              {(["borderWidth", "padding", "round", "texture"] as const).map((key) => (
                <label key={key} className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold uppercase text-[var(--frames-muted)]">{key}</span>
                  <input type="range" min={key === "texture" ? 0 : key === "borderWidth" ? 4 : 0} max={key === "texture" ? 100 : key === "borderWidth" ? 60 : 48} value={(controls as any)[key]} onChange={(e) => setControls((c) => ({ ...c, [key]: Number(e.target.value) }))} className="accent-[#FF5A1F]" />
                </label>
              ))}
              <label className="flex items-center gap-2 text-[11px] font-semibold uppercase text-[var(--frames-muted)]">
                <input type="checkbox" checked={controls.shadowOn} onChange={(e) => setControls((c) => ({ ...c, shadowOn: e.target.checked }))} className="accent-[#FF5A1F]" />
                Shadow
              </label>
              <label className="flex items-center gap-2 text-[11px] font-semibold uppercase text-[var(--frames-muted)]">
                <input type="checkbox" checked={!!(controls as any).glassPanel} onChange={(e) => setControls((c) => ({ ...c, glassPanel: e.target.checked } as any))} className="accent-[#FF5A1F]" />
                Glass panel on photo
              </label>
            </div>
          )}

          <p className="mb-1.5 text-center text-[10px] text-[var(--frames-muted)]">
            {frame.name} · {frame.tier === "common" ? "Free" : frame.tier === "aiplus" ? "AI+" : "Premium"} · {cost} credits
          </p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => fileRef.current?.click()} className="rounded-full border px-3 py-2 text-xs font-semibold" style={{ borderColor: "var(--frames-border)" }}>Change Photo</button>
            <button type="button" onClick={() => setAdjustOpen((o) => !o)} className="grid h-10 w-10 place-items-center rounded-full border" style={{ borderColor: "var(--frames-border)" }} aria-label="Adjust">
              <SlidersHorizontal className="h-4 w-4" />
            </button>
            <button type="button" disabled={applying} onClick={() => void onApply()} className="ml-auto flex flex-1 items-center justify-center rounded-2xl bg-[#FF5A1F] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
              {applying ? "Working…" : "Apply"}
            </button>
          </div>
        </footer>
      )}

      {phase === "result" && resultUrl && (
        <footer className="z-20 shrink-0 space-y-2 border-t px-3 pt-3" style={{ borderColor: "var(--frames-border)", background: "var(--frames-glass)", paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
          <div className="flex items-center justify-center gap-2">
            <button type="button" onClick={() => { setPhase("edit"); setResultUrl(null); }} className="rounded-full border px-4 py-2.5 text-sm font-semibold" style={{ borderColor: "var(--frames-border)" }}>Edit again</button>
            <button type="button" disabled={exporting} onClick={() => void onExport()} className="flex items-center gap-2 rounded-full bg-[#FF5A1F] px-5 py-2.5 text-sm font-bold text-white">
              <Download className="h-4 w-4" />
              Download
            </button>
            <button type="button" onClick={async () => {
              if (!resultUrl) return;
              try {
                const blob = await (await fetch(resultUrl)).blob();
                const file = new File([blob], `motio-frames-${frame.id}.jpg`, { type: "image/jpeg" });
                if (navigator.share && navigator.canShare?.({ files: [file] })) {
                  await navigator.share({ files: [file], title: "Motio2edit Frames" });
                }
              } catch { /* ignore */ }
            }} className="grid h-10 w-10 place-items-center rounded-full border" style={{ borderColor: "var(--frames-border)" }} aria-label="Share">
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        </footer>
      )}

      {moreOpen && (
        <div className="absolute inset-0 z-50 flex flex-col" style={{ background: "var(--frames-bg)" }}>
          <div className="flex h-14 items-center gap-2 border-b px-3" style={{ borderColor: "var(--frames-border)" }}>
            <button type="button" onClick={() => setMoreOpen(false)} className="grid h-10 w-10 place-items-center rounded-full border" style={{ borderColor: "var(--frames-border)" }}><X className="h-4 w-4" /></button>
            <h2 className="text-base font-bold">More Frames</h2>
          </div>
          <div className="border-b px-3 py-2" style={{ borderColor: "var(--frames-border)" }}>
            <input value={moreQuery} onChange={(e) => setMoreQuery(e.target.value)} placeholder="Search wood, gold, film, marble…" className="w-full rounded-xl border bg-transparent px-3 py-2 text-sm outline-none" style={{ borderColor: "var(--frames-border)" }} />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <div className="grid grid-cols-4 gap-2">
              {moreFiltered.map((f) => {
                const locked = !paid && f.tier !== "common";
                return (
                  <button key={f.id} type="button" onClick={() => { selectFrame(f); if (paid || f.tier === "common") setMoreOpen(false); }} className={cn("relative aspect-square overflow-hidden rounded-xl border", f.id === frame.id ? "border-[#FF5A1F]" : "border-[var(--frames-border)]")}>
                    {thumbCache[f.id] ? <img src={thumbCache[f.id]} alt="" className="h-full w-full object-cover" /> : null}
                    <TierBadge tier={f.tier} />
                    {locked && <span className="absolute inset-0 grid place-items-center bg-black/45"><Lock className="h-4 w-4 text-white" /></span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {infoFrame && (
        <div className="absolute inset-0 z-50 grid place-items-end bg-black/40" onClick={() => setInfoFrame(null)}>
          <div className="max-h-[70dvh] w-full overflow-y-auto rounded-t-2xl border-t p-4" style={{ background: "var(--frames-surface)", borderColor: "var(--frames-border)" }} onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p className="text-base font-bold">{infoFrame.name}</p>
                <p className="text-[11px] font-semibold uppercase text-[var(--frames-muted)]">{infoFrame.tier} · {infoFrame.kind}</p>
              </div>
              <button type="button" onClick={() => setInfoFrame(null)} className="grid h-8 w-8 place-items-center rounded-full border" style={{ borderColor: "var(--frames-border)" }}><X className="h-4 w-4" /></button>
            </div>
            <dl className="space-y-2 text-xs text-[var(--frames-muted)]">
              <div><dt className="font-semibold text-[var(--frames-text)]">Material</dt><dd>{infoFrame.texture || infoFrame.color || infoFrame.kind}</dd></div>
              <div><dt className="font-semibold text-[var(--frames-text)]">Credits</dt><dd>{FRAME_CREDIT_COST[infoFrame.tier]}</dd></div>
              {(() => {
                try {
                  const info = getFrameInfo(infoFrame);
                  return (
                    <>
                      <div><dt className="font-semibold text-[var(--frames-text)]">Description</dt><dd>{info.description}</dd></div>
                      <div><dt className="font-semibold text-[var(--frames-text)]">Visual</dt><dd>{info.visual}</dd></div>
                    </>
                  );
                } catch {
                  return null;
                }
              })()}
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
