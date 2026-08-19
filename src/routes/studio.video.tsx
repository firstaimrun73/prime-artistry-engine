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
  Scissors,
  Wand2,
  Search,
  RefreshCw,
  Film,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
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
  canUseAdvancedTier,
} from "@/lib/video-options";
import {
  computeVideoCreditCost,
  videoEfficiencyScore,
  estimateVideoEtaSeconds,
  VIDEO_PROGRESS_STAGES,
  VIDEO_QUALITY_OPTIONS,
  type VideoQualityId,
} from "@/lib/video-pricing";
import { cn } from "@/lib/utils";
import { StudioShell } from "@/components/studio/StudioShell";
import { StudioTierSelector } from "@/components/studio/StudioTierSelector";
import { StudioGenerateBar } from "@/components/studio/StudioGenerateBar";
import {
  studioCardClass,
  studioTierToVideoUi,
  type StudioTier,
} from "@/lib/studio/studio-tier";

export const Route = createFileRoute("/studio/video")({
  head: () => ({
    meta: [
      { title: "Video Studio — Motio2edit" },
      {
        name: "description",
        content: "AI text-to-video, image-to-video and video enhance with live credit pricing.",
      },
    ],
  }),
  component: VideoStudio,
});

type VideoMode = "text" | "image" | "video";

function VideoStudio() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const generate = useServerFn(generateMedia);
  const fileRef = useRef<HTMLInputElement>(null);

  const admin = isAdminEmail(profile?.email);
  const allowed = canAccessVideo({
    plan: profile?.plan,
    email: profile?.email,
    isAdmin: admin,
  });
  const advancedOk = canUseAdvancedTier(profile?.plan, admin);

  const [studioTier, setStudioTier] = useState<StudioTier>("standard");
  const [mode, setMode] = useState<VideoMode>("text");
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState<VideoDuration>(5);
  const [aspect, setAspect] = useState<VideoAspectRatio>("16:9");
  const [quality, setQuality] = useState<VideoQualityId>("1080p");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stageIdx, setStageIdx] = useState(0);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [charged, setCharged] = useState<number | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const videoRef = useRef<HTMLVideoElement>(null);

  const videoUiTier = studioTierToVideoUi(studioTier);
  const maxDur = maxVideoDurationForPlan(profile?.plan);

  const price = useMemo(
    () =>
      computeVideoCreditCost({
        duration,
        quality,
        aspect,
        tier: videoUiTier,
        mode: mode === "video" && mediaFile ? "enhance" : "generate",
      }),
    [duration, quality, aspect, videoUiTier, mode, mediaFile],
  );
  const cost = price.credits;
  const efficiency = videoEfficiencyScore({ duration, quality, tier: videoUiTier });
  const eta = estimateVideoEtaSeconds({ duration, quality, tier: videoUiTier });

  useEffect(() => {
    if (user && profile && !allowed) navigate({ to: "/pricing" });
  }, [user, profile, allowed, navigate]);

  useEffect(() => {
    if (duration > maxDur && !admin) setDuration(maxDur);
  }, [maxDur, duration, admin]);

  useEffect(() => {
    if (!advancedOk && studioTier !== "standard") setStudioTier("standard");
  }, [advancedOk, studioTier]);

  useEffect(() => {
    if (!busy) {
      setStageIdx(0);
      return;
    }
    setStageIdx(0);
    const t1 = setTimeout(() => setStageIdx(1), 2500);
    const t2 = setTimeout(() => setStageIdx(2), 12000);
    const t3 = setTimeout(() => setStageIdx(3), 28000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [busy]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = playbackRate;
  }, [playbackRate, outputUrl]);

  const canGenerate = useMemo(() => {
    if (mode === "video") return !!mediaFile;
    if (!prompt.trim()) return false;
    if (mode === "image" && !mediaFile) return false;
    return true;
  }, [prompt, mode, mediaFile]);

  if (user && profile && !allowed) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 pb-24 text-center md:pb-16">
          <Lock className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-bold">Video Studio is locked</h1>
          <p className="text-sm text-muted-foreground">
            Video generation requires Lite or higher. Free plan includes Image Editor only.
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

  const accept =
    mode === "video" ? "video/*" : mode === "image" ? "image/*" : undefined;

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (mode === "image" && !f.type.startsWith("image/"))
      return toast.error("Choose an image file.");
    if (mode === "video" && !f.type.startsWith("video/"))
      return toast.error("Choose a video file.");
    if (f.size > 200 * 1024 * 1024) return toast.error("Max 200 MB.");
    setMediaFile(f);
    setMediaPreview(URL.createObjectURL(f));
    setOutputUrl(null);
    setCharged(null);
  };

  const uploadMedia = async (file: File) => {
    const uid = profile?.id ?? user.id;
    const path = `${uid}/video-src-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("uploads").upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    });
    if (error) throw new Error(error.message);
    const { data, error: sErr } = await supabase.storage
      .from("uploads")
      .createSignedUrl(path, 3600);
    if (sErr || !data?.signedUrl) throw new Error("Could not prepare media URL.");
    return data.signedUrl;
  };

  const toBackendResolution = (): "720p" | "1080p" | "4k" => {
    if (quality === "4k" || quality === "8k" || quality === "2k") return "4k";
    if (quality === "720p" || quality === "480p") return "720p";
    return "1080p";
  };

  const onGenerate = async () => {
    if (!canGenerate || busy) return;
    if (!admin && (profile?.credits ?? 0) < cost) {
      toast.error(`Not enough credits (${cost} required).`);
      return;
    }
    if (mode !== "video" && !isDurationAllowed(profile?.plan, duration, admin)) {
      toast.error(`Your plan allows up to ${maxDur}s video.`);
      return;
    }
    if (studioTier !== "standard" && !advancedOk) {
      toast.error("Pro and Premium video tiers require Pro plan or higher.");
      return;
    }

    setBusy(true);
    setOutputUrl(null);
    setCharged(null);
    toast(`Expected ~${eta}s — keep this tab open.`);
    try {
      let imageUrl: string | undefined;
      let sourceKind: "image" | "video" | undefined;

      if ((mode === "image" || mode === "video") && mediaFile) {
        imageUrl = await uploadMedia(mediaFile);
        sourceKind = mode === "video" ? "video" : "image";
      }

      const res = await generate({
        data: {
          prompt:
            prompt.trim() ||
            (mode === "video"
              ? "Enhance this video, improve clarity and stability."
              : ""),
          type: "video",
          imageUrl,
          sourceKind,
          videoDurationSeconds: duration,
          videoAspectRatio: aspect,
          videoResolution: toBackendResolution(),
        },
      });

      setOutputUrl(res.outputUrl);
      setCharged(cost);
      await refreshProfile();
      toast.success("Video ready");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Video generation failed");
    } finally {
      setBusy(false);
    }
  };

  const stageIcons = [Search, Camera, Scissors, Wand2];
  const card = studioCardClass(studioTier);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <StudioShell
        kind="video"
        tier={studioTier}
        credits={admin ? null : profile?.credits}
        subtitle="Text → Video · Image → Video · Video enhance. Credits shown before you generate."
      >
        <div className="mb-5">
          <StudioTierSelector
            value={studioTier}
            onChange={setStudioTier}
            locked={{
              pro: !advancedOk,
              premium: !advancedOk,
            }}
          />
        </div>

        <div className="grid w-full min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,1.1fr)]">
          <div className="min-w-0 space-y-5">
            <section className={cn("space-y-2 p-4", card)}>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Mode
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: "text" as const, icon: Sparkles, label: "Text → Video" },
                    { id: "image" as const, icon: Camera, label: "Image → Video" },
                    { id: "video" as const, icon: Film, label: "Video → Video" },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setMode(m.id);
                      setMediaFile(null);
                      setMediaPreview(null);
                      setOutputUrl(null);
                      setCharged(null);
                    }}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-xl border p-3 text-center text-xs font-semibold transition-colors sm:text-sm",
                      mode === m.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card hover:border-primary/40",
                    )}
                  >
                    <m.icon className="h-4 w-4" />
                    {m.label}
                  </button>
                ))}
              </div>
            </section>

            {(mode === "image" || mode === "video") && (
              <section className={cn("space-y-2 p-4", card)}>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {mode === "image" ? "Source image" : "Source video"}
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept={accept}
                  className="hidden"
                  onChange={onPickFile}
                />
                {mediaPreview ? (
                  <div className="space-y-2">
                    <div className="overflow-hidden rounded-xl border border-border bg-black/5">
                      {mode === "video" ? (
                        <video
                          src={mediaPreview}
                          controls
                          className="mx-auto max-h-48 w-full object-contain"
                        />
                      ) : (
                        <img
                          src={mediaPreview}
                          alt=""
                          className="mx-auto max-h-48 object-contain"
                        />
                      )}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => fileRef.current?.click()}
                    >
                      Replace
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card py-10 text-sm text-muted-foreground hover:border-primary"
                  >
                    <Upload className="h-6 w-6" />
                    {mode === "image" ? "Upload image to animate" : "Upload video to enhance"}
                  </button>
                )}
              </section>
            )}

            <section className={cn("space-y-2 p-4", card)}>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Prompt
              </p>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value.slice(0, 2000))}
                rows={4}
                disabled={busy}
                placeholder={
                  mode === "image"
                    ? "Motion guidance: slow push-in, orbit, product turn…"
                    : mode === "video"
                      ? "Optional: what to improve (clarity, stability…)"
                      : "Describe the scene and motion…"
                }
                className="w-full resize-y rounded-xl border border-border bg-background/50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
              />
              <p className="text-right text-[11px] text-muted-foreground">{prompt.length}/2000</p>
            </section>

            {mode !== "video" && (
              <section className={cn("space-y-4 p-4", card)}>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Duration
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {VIDEO_DURATIONS.map((d) => {
                      const ok = isDurationAllowed(profile?.plan, d, admin);
                      return (
                        <button
                          key={d}
                          type="button"
                          disabled={!ok || busy}
                          onClick={() => setDuration(d)}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                            duration === d
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-card text-muted-foreground hover:border-primary/40",
                            (!ok || busy) && "cursor-not-allowed opacity-40",
                          )}
                        >
                          {d}s
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-muted-foreground">Plan max: {maxDur}s</p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Aspect ratio
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {VIDEO_ASPECT_RATIOS.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        disabled={busy}
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
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Quality
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {VIDEO_QUALITY_OPTIONS.filter((q) => q.id !== "8k" || advancedOk).map(
                      (q) => (
                        <button
                          key={q.id}
                          type="button"
                          disabled={busy}
                          title={q.hint}
                          onClick={() => setQuality(q.id)}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                            quality === q.id
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-card text-muted-foreground hover:border-primary/40",
                          )}
                        >
                          {q.label}
                        </button>
                      ),
                    )}
                  </div>
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-[10px] font-medium text-muted-foreground">
                      <span>Fast</span>
                      <span>Max quality</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-orange-500 transition-all duration-300"
                        style={{ width: `${Math.round(efficiency * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </section>
            )}

            <StudioGenerateBar
              tier={studioTier}
              credits={cost}
              balance={admin ? null : profile?.credits}
              loading={busy}
              disabled={!canGenerate}
              loadingLabel={`Generating · ~${eta}s`}
              onGenerate={() => void onGenerate()}
            />
          </div>

          <div className="min-w-0 lg:sticky lg:top-4 lg:self-start">
            {busy && (
              <div className={cn("p-5", card)}>
                <p className="mb-4 text-sm font-semibold">Generating…</p>
                <ol className="space-y-3">
                  {VIDEO_PROGRESS_STAGES.map((s, i) => {
                    const Icon = stageIcons[i];
                    const done = i < stageIdx;
                    const active = i === stageIdx;
                    return (
                      <li
                        key={s.id}
                        className={cn(
                          "flex items-center gap-3 text-sm",
                          done && "text-primary",
                          active && "font-semibold text-foreground",
                          !done && !active && "text-muted-foreground",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full border",
                            done && "border-primary bg-primary/15",
                            active && "border-primary bg-primary/10",
                          )}
                        >
                          {done ? (
                            <span className="text-xs">✓</span>
                          ) : (
                            <Icon className={cn("h-3.5 w-3.5", active && "animate-pulse")} />
                          )}
                        </span>
                        <div>
                          <p>{s.label}</p>
                          <p className="text-[11px] font-normal text-muted-foreground">{s.hint}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
                <p className="mt-4 text-center text-xs text-muted-foreground">
                  Expected ~{eta}s — please don’t close this tab
                </p>
              </div>
            )}

            {outputUrl && !busy && (
              <div className={cn("space-y-3 p-3 sm:p-4", card)}>
                <div className="overflow-hidden rounded-xl bg-black">
                  <video
                    ref={videoRef}
                    src={outputUrl}
                    controls
                    playsInline
                    className="mx-auto max-h-[55vh] w-full"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <span>
                    {studioTier} · {aspect} · {quality}
                    {charged != null ? ` · ${charged} credits` : ""}
                  </span>
                  <label className="ml-auto flex items-center gap-1">
                    Speed
                    <select
                      value={playbackRate}
                      onChange={(e) => setPlaybackRate(Number(e.target.value))}
                      className="rounded border border-border bg-background px-1 py-0.5 text-xs"
                    >
                      {[0.5, 0.75, 1, 1.25, 1.5, 2].map((r) => (
                        <option key={r} value={r}>
                          {r}x
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => void onGenerate()} disabled={busy}>
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Regenerate
                  </Button>
                  <Button asChild size="sm" variant="secondary">
                    <a href={outputUrl} download={`motio2edit-video-${Date.now()}.mp4`}>
                      <Download className="mr-1.5 h-3.5 w-3.5" /> Download
                    </a>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setOutputUrl(null);
                      setCharged(null);
                    }}
                  >
                    Edit again
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/history">History</Link>
                  </Button>
                </div>
              </div>
            )}

            {!busy && !outputUrl && (
              <div
                className={cn(
                  "flex min-h-[240px] flex-col items-center justify-center border-dashed p-8 text-center",
                  card,
                )}
              >
                <Video className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm font-medium text-muted-foreground">Output preview</p>
                <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                  Your video appears here after generation — download, regenerate, or edit again.
                </p>
              </div>
            )}
          </div>
        </div>
      </StudioShell>
      <Footer />
    </div>
  );
}
