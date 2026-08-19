import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Video,
  Camera,
  Sparkles,
  Lock,
  Upload,
  Download,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { isAdminEmail } from "@/lib/admin-config";
import { canAccessVideo } from "@/lib/policy";
import { generateMedia } from "@/lib/generate.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  VIDEO_ASPECT_RATIOS,
  VIDEO_DURATIONS,
  type VideoAspectRatio,
  type VideoDuration,
  isDurationAllowed,
  maxVideoDurationForPlan,
  modelTierForDuration,
  MODEL_TIER_LABEL,
  videoCreditCost,
} from "@/lib/video-options";
import {
  VIDEO_RESOLUTION_OPTIONS,
  type VideoResolution,
  videoResolutionMultiplier,
} from "@/lib/quality-options";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/studio/video")({
  head: () => ({
    meta: [
      { title: "Video Studio — Motio2edit" },
      {
        name: "description",
        content: "AI text-to-video and image-to-video with duration, aspect ratio and resolution controls.",
      },
    ],
  }),
  component: VideoStudio,
});

type VideoMode = "text" | "image";

function VideoStudio() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const generate = useServerFn(generateMedia);
  const fileRef = useRef<HTMLInputElement>(null);

  const admin = isAdminEmail(profile?.email);
  const allowed = canAccessVideo({ plan: profile?.plan, email: profile?.email, isAdmin: admin });

  const [mode, setMode] = useState<VideoMode>("text");
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState<VideoDuration>(5);
  const [aspect, setAspect] = useState<VideoAspectRatio>("16:9");
  const [resolution, setResolution] = useState<VideoResolution>("1080p");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);

  const maxDur = maxVideoDurationForPlan(profile?.plan);
  const tier = modelTierForDuration(duration);
  const baseCost = videoCreditCost(duration);
  const cost = Math.round(baseCost * videoResolutionMultiplier(resolution));

  useEffect(() => {
    if (user && profile && !allowed) {
      navigate({ to: "/pricing" });
    }
  }, [user, profile, allowed, navigate]);

  useEffect(() => {
    if (duration > maxDur && !admin) {
      setDuration(maxDur);
    }
  }, [maxDur, duration, admin]);

  const canGenerate = useMemo(() => {
    if (!prompt.trim()) return false;
    if (mode === "image" && !imageFile) return false;
    return true;
  }, [prompt, mode, imageFile]);

  if (user && profile && !allowed) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 pb-24 text-center md:pb-16">
          <Lock className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-bold">Video Studio is locked</h1>
          <p className="text-sm text-muted-foreground">
            Video generation requires Lite or higher.
          </p>
          <Button asChild>
            <Link to="/pricing">View plans</Link>
          </Button>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
          <Video className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-bold">Video Studio</h1>
          <p className="text-sm text-muted-foreground">Sign in to generate AI video.</p>
          <Button asChild>
            <Link to="/auth">Sign in</Link>
          </Button>
        </main>
      </div>
    );
  }

  const onPickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f?.type.startsWith("image/")) return toast.error("Choose an image file.");
    if (f.size > 25 * 1024 * 1024) return toast.error("Max 25 MB.");
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
    setOutputUrl(null);
  };

  const uploadImage = async (file: File) => {
    const uid = profile?.id ?? user.id;
    const path = `${uid}/video-src-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("uploads").upload(path, file, {
      contentType: file.type || "image/jpeg",
      upsert: true,
    });
    if (error) throw new Error(error.message);
    const { data, error: sErr } = await supabase.storage.from("uploads").createSignedUrl(path, 3600);
    if (sErr || !data?.signedUrl) throw new Error("Could not prepare image URL.");
    return data.signedUrl;
  };

  const onGenerate = async () => {
    if (!canGenerate || busy) return;
    if (!admin && (profile?.credits ?? 0) < cost) {
      toast.error(`Not enough credits (${cost} required).`);
      return;
    }
    if (!isDurationAllowed(profile?.plan, duration, admin)) {
      toast.error(`Your plan allows up to ${maxDur}s video.`);
      return;
    }

    setBusy(true);
    setOutputUrl(null);
    try {
      let imageUrl: string | undefined;
      if (mode === "image" && imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const res = await generate({
        data: {
          prompt: prompt.trim(),
          type: "video",
          imageUrl,
          sourceKind: mode === "image" ? "image" : undefined,
          videoDurationSeconds: duration,
          videoAspectRatio: aspect,
          videoResolution: resolution,
        },
      });

      setOutputUrl(res.outputUrl);
      await refreshProfile();
      toast.success("Video ready");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Video generation failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-6 pb-28 md:pb-12">
        <div className="mb-6">
          <Link to="/studio" className="text-xs font-medium text-muted-foreground hover:text-foreground">
            All studios
          </Link>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
            Video <span className="text-primary">Studio</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Text-to-video and image-to-video using Motio2edit’s existing generation pipeline.
          </p>
        </div>

        <section className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mode</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode("text")}
              className={cn(
                "flex items-center gap-2 rounded-xl border p-3 text-left text-sm font-semibold transition-colors",
                mode === "text"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card hover:border-primary/40",
              )}
            >
              <Sparkles className="h-4 w-4" /> Text to video
            </button>
            <button
              type="button"
              onClick={() => setMode("image")}
              className={cn(
                "flex items-center gap-2 rounded-xl border p-3 text-left text-sm font-semibold transition-colors",
                mode === "image"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card hover:border-primary/40",
              )}
            >
              <Camera className="h-4 w-4" /> Image to video
            </button>
          </div>
        </section>

        {mode === "image" && (
          <section className="mt-5 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Source image
            </p>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickImage} />
            {imagePreview ? (
              <div className="space-y-2">
                <div className="overflow-hidden rounded-xl border border-border">
                  <img src={imagePreview} alt="" className="mx-auto max-h-48 object-contain" />
                </div>
                <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                  Replace image
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card py-10 text-sm text-muted-foreground hover:border-primary"
              >
                <Upload className="h-6 w-6" />
                Upload image to animate
              </button>
            )}
          </section>
        )}

        <section className="mt-5 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Duration</p>
          <div className="flex flex-wrap gap-2">
            {VIDEO_DURATIONS.map((d) => {
              const ok = isDurationAllowed(profile?.plan, d, admin);
              return (
                <button
                  key={d}
                  type="button"
                  disabled={!ok}
                  onClick={() => setDuration(d)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                    duration === d
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40",
                    !ok && "cursor-not-allowed opacity-40",
                  )}
                  title={!ok ? `Requires a higher plan (max ${maxDur}s on yours)` : undefined}
                >
                  {d}s
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Model: {MODEL_TIER_LABEL[tier]} · Your plan max: {maxDur}s
          </p>
        </section>

        <section className="mt-5 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Aspect ratio
          </p>
          <div className="flex flex-wrap gap-2">
            {VIDEO_ASPECT_RATIOS.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAspect(a.id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                  aspect === a.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40",
                )}
              >
                {a.icon} {a.label}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-5 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Resolution
          </p>
          <div className="flex flex-wrap gap-2">
            {VIDEO_RESOLUTION_OPTIONS.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setResolution(r.id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                  resolution === r.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40",
                )}
                title={r.hint}
              >
                {r.label}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-5 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prompt</p>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value.slice(0, 2000))}
            rows={4}
            placeholder={
              mode === "image"
                ? "Describe motion: slow push-in, gentle camera orbit, product turn…"
                : "Describe the scene and motion you want in the video…"
            }
            className="w-full resize-y rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </section>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Cost: <span className="font-semibold text-foreground">{cost} credits</span>
            {!admin && (
              <> · Balance: {(profile?.credits ?? 0).toLocaleString()}</>
            )}
          </p>
          <Button
            onClick={onGenerate}
            disabled={!canGenerate || busy}
            className="w-full sm:w-auto"
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating…
              </>
            ) : (
              <>
                <Video className="mr-2 h-4 w-4" /> Generate video
              </>
            )}
          </Button>
        </div>

        {(busy || outputUrl) && (
          <section className="mt-6 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Result</p>
            {busy && !outputUrl && (
              <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card py-16 text-sm text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                Generating video — this can take a few minutes…
              </div>
            )}
            {outputUrl && (
              <div className="space-y-3">
                <div className="overflow-hidden rounded-xl border border-border bg-black">
                  <video
                    src={outputUrl}
                    controls
                    playsInline
                    className="mx-auto max-h-[60vh] w-full"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm">
                    <a href={outputUrl} download={`motio2edit-video-${Date.now()}.mp4`}>
                      <Download className="mr-1.5 h-3.5 w-3.5" /> Download
                    </a>
                  </Button>
                  <Button asChild size="sm" variant="secondary">
                    <Link
                      to="/music"
                      search={{ mode: "video-music", videoUrl: outputUrl }}
                    >
                      Add Sound
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/history">Open History</Link>
                  </Button>
                </div>
              </div>
            )}
          </section>
        )}

        <p className="mt-8 text-[11px] text-muted-foreground">
          Supported by current backend: text-to-video, image-to-video, duration 5–30s (plan-gated),
          aspect ratios 16:9 / 9:16 / 1:1 / 4:3, resolution tiers 720p / 1080p / 4K upscale.
          Video-from-video enhance remains available in the main editor when a video file is uploaded.
        </p>
      </main>
    </div>
  );
}
