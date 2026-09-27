/**
 * Remove BG — /studio/image/remove-bg
 * Standalone product. Upload → one click → transparent PNG.
 * Credits + quality enforced server-side (20 credits; free→SD, paid→HD).
 */
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft,
  Download,
  Eraser,
  ImagePlus,
  Loader2,
  Share2,
  Sparkles,
  Trash2,
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
import { REMOVE_BG_GALLERY } from "@/lib/remove-bg/samples";
import { triggerBrowserDownload } from "@/lib/secure-image-download";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CompareSlider } from "@/components/CompareSlider";

const ROSE_ACCENT = "#f43f5e";

type Search = { from?: "home" | "studio" | "info" };

export const Route = createFileRoute("/studio/image/remove-bg")({
  ssr: false,
  validateSearch: (raw: Record<string, unknown>): Search => ({
    from:
      raw.from === "home" || raw.from === "studio" || raw.from === "info"
        ? raw.from
        : undefined,
  }),
  component: RemoveBgPage,
  head: () => ({
    meta: [
      { title: "Remove BG — Motio2edit" },
      {
        name: "description",
        content: "Remove image background in one click. Transparent PNG cutout.",
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
  }, [free]);

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
    if (search.from === "info") {
      void navigate({ to: "/studio/image/remove-bg-info" });
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
      toast.error(`Need ${REMOVE_BG_CREDITS} credits`);
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
      toast.success("Background removed");
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

  const creditsLabel = isAdmin ? "Admin" : `${profile?.credits ?? 0}`;
  const busy = phase === "uploading" || phase === "processing";
  const squareItems = REMOVE_BG_GALLERY.filter((g) => g.aspect === "1:1");
  const wideItems = REMOVE_BG_GALLERY.filter((g) => g.aspect === "16:9");

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
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
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-rose-500/15 text-rose-500">
              <Eraser className="h-[18px] w-[18px]" strokeWidth={2.25} />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-500">Remove BG</p>
              <p className="truncate text-sm font-semibold">Motio2edit</p>
            </div>
          </div>
          <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">
            {creditsLabel}
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-3 pb-4 pt-4">
        <div className="mb-3 text-center">
          <h1 className="text-lg font-extrabold tracking-tight sm:text-xl">
            One-click background removal
          </h1>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Upload a photo · get a transparent cutout
          </p>
        </div>

        <div
          className={cn(
            "relative overflow-hidden rounded-2xl border border-border bg-card",
            !preview && "min-h-[240px]",
          )}
        >
          {!preview ? (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-3 px-6 py-14 text-center transition hover:bg-muted/40"
            >
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-rose-500/15 text-rose-500">
                <ImagePlus className="h-7 w-7" />
              </span>
              <div>
                <p className="text-sm font-semibold">Upload a photo</p>
                <p className="mt-1 text-xs text-muted-foreground">JPG, PNG, WebP · any aspect</p>
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
                SD
              </button>
              <button
                type="button"
                disabled={busy || free}
                onClick={() => {
                  if (free) return;
                  setQuality("hd");
                }}
                className={cn(
                  "flex-1 rounded-xl border px-3 py-2 text-xs font-semibold transition",
                  quality === "hd"
                    ? "border-rose-500 bg-rose-500/10 text-rose-600"
                    : "border-border text-muted-foreground hover:border-rose-300",
                  free && "cursor-not-allowed opacity-50",
                )}
              >
                HD
              </button>
            </div>
          </div>
        )}

        {preview && phase !== "result" && (
          <p className="mt-3 text-center text-[12px] text-muted-foreground">
            <span className="font-semibold text-foreground">{REMOVE_BG_CREDITS} credits</span>
            {" "}
            per photo
          </p>
        )}

        {preview && (
          <div className="mt-2 flex gap-2">
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

        {phase === "result" && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              size="lg"
              className="h-12 rounded-2xl bg-rose-500 font-semibold hover:bg-rose-600"
              onClick={() => void onDownload()}
            >
              <Download className="mr-1.5 h-4 w-4" />
              Download
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 rounded-2xl font-semibold"
              onClick={() => void onShare()}
            >
              <Share2 className="mr-1.5 h-4 w-4" />
              Share
            </Button>
          </div>
        )}

        {/* Examples: 1:1 two-up, 16:9 full width; rose slider + checkerboard */}
        {!preview && (
          <section className="mt-8 space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-bold tracking-tight">Examples</h2>
              <p className="text-[11px] text-muted-foreground">Drag to compare</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {squareItems.map((item) => (
                <div
                  key={item.id}
                  className="overflow-hidden rounded-2xl border border-border bg-card"
                >
                  <div className="relative aspect-square w-full">
                    <CompareSlider
                      before={item.before}
                      after={item.after}
                      accentColor={ROSE_ACCENT}
                      transparentAfter
                      className="h-full w-full"
                    />
                  </div>
                  <p className="px-2.5 py-1.5 text-center text-[11px] font-semibold text-muted-foreground">
                    {item.title}
                  </p>
                </div>
              ))}
            </div>
            {wideItems.map((item) => (
              <div
                key={item.id}
                className="overflow-hidden rounded-2xl border border-border bg-card"
              >
                <div className="relative aspect-video w-full">
                  <CompareSlider
                    before={item.before}
                    after={item.after}
                    accentColor={ROSE_ACCENT}
                    transparentAfter
                    className="h-full w-full"
                  />
                </div>
                <p className="px-2.5 py-1.5 text-center text-[11px] font-semibold text-muted-foreground">
                  {item.title}
                </p>
              </div>
            ))}
          </section>
        )}

        <div className="mt-auto pt-6" />

        {phase !== "result" && (
          <div className="sticky bottom-0 z-20 -mx-3 border-t border-border/60 bg-background/95 px-3 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/90">
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
                  Remove background
                </>
              )}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
