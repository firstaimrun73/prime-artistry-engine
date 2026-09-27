/**
 * Remove BG — /studio/image/remove-bg
 * Standalone product (not Image Studio editor).
 * Upload → one click → transparent PNG. 20 credits. SD free / HD paid. No watermark.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft,
  Download,
  ImagePlus,
  Loader2,
  Share2,
  Sparkles,
  Trash2,
  Lock,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { isPaidPlan, isFreePlan } from "@/lib/policy";
import { supabase } from "@/integrations/supabase/client";
import { runRemoveBg } from "@/lib/remove-bg/remove-bg.functions";
import {
  REMOVE_BG_CREDITS,
  type RemoveBgQuality,
} from "@/lib/remove-bg/constants";
import { REMOVE_BG_SAMPLES } from "@/lib/remove-bg/samples";
import { triggerBrowserDownload } from "@/lib/secure-image-download";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Search = { from?: "home" | "studio" };

export const Route = createFileRoute("/studio/image/remove-bg")({
  ssr: false,
  validateSearch: (raw: Record<string, unknown>): Search => ({
    from: raw.from === "home" || raw.from === "studio" ? raw.from : undefined,
  }),
  component: RemoveBgPage,
  head: () => ({
    meta: [
      { title: "Remove BG — Motio2edit" },
      {
        name: "description",
        content: "Remove image background in one click. Transparent PNG cutout — 20 credits.",
      },
    ],
  }),
});

type Phase = "idle" | "uploading" | "processing" | "result";

function RemoveBgPage() {
  const navigate = Route.useNavigate();
  const search = Route.useSearch();
  const { user, profile, refreshProfile, loading: authLoading } = useAuth();
  const isAdmin = isAdminEmail(profile?.email);
  const paid = isAdmin || isPaidPlan(profile?.plan);
  const free = !isAdmin && isFreePlan(profile?.plan);
  const run = useServerFn(runRemoveBg);
  const fileRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [output, setOutput] = useState<string | null>(null);
  const [quality, setQuality] = useState<RemoveBgQuality>(paid ? "hd" : "sd");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    if (user) return;
    const dest = `/studio/image/remove-bg${search.from ? `?from=${search.from}` : ""}`;
    void navigate({ to: "/auth", search: { redirect: dest } });
  }, [authLoading, user, navigate, search.from]);

  useEffect(() => {
    if (free) setQuality("sd");
    else if (paid && quality === "sd") {
      /* allow paid to stay on sd if they chose it */
    }
  }, [free, paid, quality]);

  useEffect(() => {
    if (phase !== "processing") return;
    setProgress(8);
    const timers = [
      window.setTimeout(() => setProgress(28), 700),
      window.setTimeout(() => setProgress(52), 1600),
      window.setTimeout(() => setProgress(74), 2800),
      window.setTimeout(() => setProgress(88), 4200),
    ];
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [phase]);

  const goBack = () => {
    if (search.from === "studio") {
      void navigate({ to: "/studio" });
      return;
    }
    void navigate({ to: "/" });
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setOutput(null);
    setPhase("idle");
  };

  const reset = () => {
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setOutput(null);
    setPhase("idle");
    setProgress(0);
    if (fileRef.current) fileRef.current.value = "";
  };

  const upload = async (blob: Blob, name: string) => {
    if (!user) throw new Error("Sign in required");
    const uid = profile?.id ?? user.id;
    const path = `${uid}/remove-bg-${Date.now()}-${name}`;
    const { error } = await supabase.storage.from("uploads").upload(path, blob, {
      contentType: blob.type || "image/png",
      upsert: true,
    });
    if (error) throw new Error(error.message);
    const { data, error: sErr } = await supabase.storage.from("uploads").createSignedUrl(path, 3600 * 6);
    if (sErr || !data?.signedUrl) throw new Error("Signed URL failed");
    return data.signedUrl;
  };

  const onRemove = useCallback(async () => {
    if (!file || !preview) {
      toast.message("Upload a photo first");
      return;
    }
    if (!isAdmin && (profile?.credits ?? 0) < REMOVE_BG_CREDITS) {
      toast.error(`Need ${REMOVE_BG_CREDITS} credits for Remove BG`);
      return;
    }
    const q: RemoveBgQuality = free ? "sd" : quality;
    setPhase("uploading");
    try {
      const imageUrl = await upload(file, file.name || "photo.jpg");
      setPhase("processing");
      const res = await run({
        data: { imageUrl, quality: q },
      });
      setProgress(100);
      setOutput(res.outputUrl);
      setPhase("result");
      await refreshProfile();
      toast.success(
        res.quality === "sd"
          ? "Background removed (SD)"
          : "Background removed (HD)",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Remove BG failed");
      setPhase("idle");
      setProgress(0);
    }
  }, [file, preview, isAdmin, profile?.credits, free, quality, run, refreshProfile]);

  const onDownload = async () => {
    if (!output) return;
    try {
      await triggerBrowserDownload(output, `motio2edit-remove-bg-${Date.now()}.png`);
      toast.success("Download started");
    } catch {
      // fallback open
      window.open(output, "_blank", "noopener,noreferrer");
    }
  };

  const onShare = async () => {
    if (!output) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Remove BG — Motio2edit",
          text: "Background removed with Motio2edit",
          url: output,
        });
      } else {
        await navigator.clipboard.writeText(output);
        toast.success("Link copied");
      }
    } catch {
      try {
        await navigator.clipboard.writeText(output);
        toast.success("Link copied");
      } catch {
        toast.message("Could not share");
      }
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-rose-500 border-t-transparent"
          aria-label="Loading"
        />
      </div>
    );
  }

  const creditsLabel = isAdmin ? "Admin" : `${profile?.credits ?? 0} credits`;
  const busy = phase === "uploading" || phase === "processing";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center gap-2 px-3 py-2.5">
          <button
            type="button"
            onClick={goBack}
            className="grid h-10 w-10 place-items-center rounded-full text-foreground hover:bg-muted"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-500">Remove BG</p>
            <p className="truncate text-sm font-semibold">One-click background removal</p>
          </div>
          <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">
            {creditsLabel}
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-3 pb-28 pt-4">
        {/* Stage */}
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl border border-border bg-card",
            !preview && "min-h-[280px]",
          )}
        >
          {!preview ? (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-3 px-6 py-16 text-center transition hover:bg-muted/40"
            >
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-rose-500/15 text-rose-500">
                <ImagePlus className="h-7 w-7" />
              </span>
              <div>
                <p className="text-sm font-semibold">Upload a photo</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Any aspect · {REMOVE_BG_CREDITS} credits · no watermark
                </p>
              </div>
            </button>
          ) : (
            <div className="relative">
              <div
                className="relative aspect-square w-full"
                style={{
                  backgroundImage:
                    phase === "result"
                      ? "linear-gradient(45deg,#e5e7eb 25%,transparent 25%),linear-gradient(-45deg,#e5e7eb 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e5e7eb 75%),linear-gradient(-45deg,transparent 75%,#e5e7eb 75%)"
                      : undefined,
                  backgroundSize: phase === "result" ? "16px 16px" : undefined,
                  backgroundPosition: phase === "result" ? "0 0,0 8px,8px -8px,-8px 0" : undefined,
                  backgroundColor: phase === "result" ? "#f8fafc" : undefined,
                }}
              >
                <img
                  src={phase === "result" && output ? output : preview}
                  alt={phase === "result" ? "Background removed" : "Original"}
                  className="h-full w-full object-contain"
                />
                {busy && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/50 backdrop-blur-[2px]">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                    <p className="text-sm font-semibold text-white">
                      {phase === "uploading" ? "Uploading…" : "Removing background…"}
                    </p>
                    <div className="h-1.5 w-40 overflow-hidden rounded-full bg-white/20">
                      <div
                        className="h-full rounded-full bg-rose-400 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFile}
          />
        </div>

        {/* Quality */}
        {preview && (
          <div className="mt-4 flex items-center gap-2">
            <p className="text-xs font-semibold text-muted-foreground">Quality</p>
            <div className="flex flex-1 gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setQuality("sd")}
                className={cn(
                  "flex-1 rounded-xl border px-3 py-2 text-xs font-semibold transition",
                  quality === "sd"
                    ? "border-rose-500 bg-rose-500/10 text-rose-600"
                    : "border-border text-muted-foreground hover:border-rose-300",
                )}
              >
                SD · free plan
              </button>
              <button
                type="button"
                disabled={busy || free}
                onClick={() => {
                  if (free) {
                    toast.message("HD is on paid plans");
                    return;
                  }
                  setQuality("hd");
                }}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1 rounded-xl border px-3 py-2 text-xs font-semibold transition",
                  quality === "hd"
                    ? "border-rose-500 bg-rose-500/10 text-rose-600"
                    : "border-border text-muted-foreground hover:border-rose-300",
                  free && "opacity-70",
                )}
              >
                {free && <Lock className="h-3 w-3" />}
                HD · paid
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 space-y-2">
          {phase !== "result" ? (
            <Button
              size="lg"
              className="h-12 w-full rounded-2xl bg-rose-500 text-base font-semibold hover:bg-rose-600"
              disabled={!preview || busy}
              onClick={() => void onRemove()}
            >
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Working…
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Remove background · {REMOVE_BG_CREDITS} credits
                </>
              )}
            </Button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="lg"
                className="h-12 rounded-2xl bg-rose-500 font-semibold hover:bg-rose-600"
                onClick={() => void onDownload()}
              >
                <Download className="mr-1.5 h-4 w-4" />
                Download
              </Button>
              <Button size="lg" variant="outline" className="h-12 rounded-2xl font-semibold" onClick={() => void onShare()}>
                <Share2 className="mr-1.5 h-4 w-4" />
                Share
              </Button>
            </div>
          )}

          {preview && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="flex-1 text-muted-foreground"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
              >
                Change photo
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                disabled={busy}
                onClick={reset}
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                Clear
              </Button>
            </div>
          )}
        </div>

        {/* Sample ideas carousel */}
        <section className="mt-10">
          <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Try with</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Products, flowers, plants — not only portraits.
          </p>
          <div className="mt-3 flex gap-3 overflow-x-auto pb-2 scrollbar-none">
            {REMOVE_BG_SAMPLES.map((s) => (
              <div
                key={s.id}
                className={cn(
                  "min-w-[140px] shrink-0 overflow-hidden rounded-2xl border border-border bg-card",
                )}
              >
                <div
                  className={cn(
                    "flex aspect-square items-center justify-center bg-gradient-to-br text-4xl",
                    s.gradient,
                  )}
                >
                  {s.emoji}
                </div>
                <div className="p-2.5">
                  <p className="text-[12px] font-semibold leading-tight">{s.title}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{s.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <p className="mt-8 text-center text-[11px] text-muted-foreground">
          Results are transparent PNG cutouts. No watermark on Remove BG.{" "}
          {free ? (
            <>
              Free plan uses SD.{" "}
              <Link to="/pricing" className="font-semibold text-rose-500">
                Upgrade for HD
              </Link>
            </>
          ) : (
            "Paid plans can use HD."
          )}
        </p>
      </main>
    </div>
  );
}
