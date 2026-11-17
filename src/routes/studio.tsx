/**
 * Unified Studio — Image | Video | Music
 * BUILD_MARKER: 2026-11-17-studio-v6-backend
 *
 * Image generates in-place via generateMedia (existing billing + FAL).
 * Video/Music hand off with preset to dedicated studios.
 * Free: multi-image select allowed; upgrade only when credits/tier block generate.
 */
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Header } from "@/components/Header";
import {
  Image as ImageIcon,
  Video,
  Music,
  ArrowUp,
  Paperclip,
  Lock,
  Settings2,
  Wand2,
  Clock,
  Loader2,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { canAccessVideo, canAccessMusic } from "@/lib/policy";
import { cn } from "@/lib/utils";
import { getPlanLimits } from "@/utils/planLimits";
import type { StudioTier } from "@/lib/studio/studio-tier";
import {
  inferAspectFromPrompt,
  resolveVideoDuration,
  upgradePathForTier,
} from "@/lib/studio/auto-settings";
import { supabase } from "@/integrations/supabase/client";
import { isVisibleInHistory } from "@/lib/history-retention";
import { generateMedia } from "@/lib/generate.functions";
import { uploadToStorage } from "@/lib/editor/editor.utils";
import {
  startGeneration,
  setGenerationStage,
  completeGeneration,
  failGeneration,
  endGeneration,
  useInFlightStageAdvance,
} from "@/lib/generation-status";
import { toast } from "sonner";

function StudioPage() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname !== "/studio") return <Outlet />;
  return <StudioWorkspace />;
}

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Studio — Motio2edit" },
      {
        name: "description",
        content: "Create images, video, and music with Motio2edit Studio.",
      },
      { property: "og:title", content: "Studio — Motio2edit" },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: StudioPage,
});

type StudioMode = "image" | "video" | "music";
type SettingsMode = "auto" | "manual";
type ImageQualityUi = "sd" | "hd";

const IMAGE_ASPECTS = ["1:1", "4:3", "3:4", "16:9", "9:16"] as const;
const VIDEO_ASPECTS = ["16:9", "9:16", "1:1"] as const;
const VIDEO_DURATIONS_STANDARD = [5, 10] as const;
const VIDEO_DURATIONS_PREMIUM = [5, 10, 15] as const;
const MUSIC_DURATIONS = [30, 60, 120] as const;
const MAX_FILE_MB = 12;
const MAX_ATTACH = 10;

type Attached = { id: string; file: File; preview: string };

type RecentItem = {
  id: string;
  type: string | null;
  prompt: string | null;
  output_url: string | null;
  status: string | null;
  created_at: string | null;
};

function StudioWorkspace() {
  const { profile, user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const generate = useServerFn(generateMedia);

  const admin = isAdminEmail(profile?.email);
  const plan = profile?.plan;
  const limits = getPlanLimits(plan ?? "free");
  const videoOk =
    admin || canAccessVideo({ plan, email: profile?.email, isAdmin: admin });
  const musicOk =
    admin || canAccessMusic({ plan, email: profile?.email, isAdmin: admin });

  const tierOk = useMemo(
    () => ({
      standard: true,
      pro: admin || limits.premiumUnlocked,
      premium: admin || limits.ultraUnlocked,
    }),
    [admin, limits.premiumUnlocked, limits.ultraUnlocked],
  );

  const [mode, setMode] = useState<StudioMode>("image");
  const [prompt, setPrompt] = useState("");
  const [attached, setAttached] = useState<Attached[]>([]);
  const [settingsMode, setSettingsMode] = useState<SettingsMode>("auto");
  const [tier, setTier] = useState<StudioTier>("standard");
  const [aspect, setAspect] = useState("1:1");
  const [duration, setDuration] = useState(5);
  const [musicDuration, setMusicDuration] = useState(30);
  const [imageQuality, setImageQuality] = useState<ImageQualityUi>("sd");
  const [busy, setBusy] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);

  const videoDurations =
    tier === "standard" ? VIDEO_DURATIONS_STANDARD : VIDEO_DURATIONS_PREMIUM;

  useEffect(() => {
    if (tier === "premium" && !tierOk.premium) {
      setTier(tierOk.pro ? "pro" : "standard");
    } else if (tier === "pro" && !tierOk.pro) {
      setTier("standard");
    }
  }, [tier, tierOk.premium, tierOk.pro]);

  useEffect(() => {
    if (!videoDurations.includes(duration as (typeof videoDurations)[number])) {
      setDuration(videoDurations[0] ?? 5);
    }
  }, [videoDurations, duration]);

  useInFlightStageAdvance(busy && mode === "image");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setRecentLoading(true);
    void (async () => {
      try {
        const { data, error } = await supabase
          .from("generations")
          .select(
            "id, type, prompt, output_url, status, created_at, retained_as_history, deleted_at, expires_at",
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(12);
        if (cancelled) return;
        if (error) {
          console.warn("[studio] history:", error.message);
          setRecent([]);
        } else {
          const rows = (data || []).filter((g) => isVisibleInHistory(g as never));
          setRecent(rows as RecentItem[]);
        }
      } finally {
        if (!cancelled) setRecentLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, resultUrl]);

  useEffect(() => {
    return () => {
      attached.forEach((a) => URL.revokeObjectURL(a.preview));
    };
  }, []);

  const clearAttachments = () => {
    setAttached((prev) => {
      prev.forEach((a) => URL.revokeObjectURL(a.preview));
      return [];
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list?.length) return;
    const next: Attached[] = [];
    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      if (mode === "image" && !file.type.startsWith("image/")) continue;
      if (
        mode === "video" &&
        !file.type.startsWith("image/") &&
        !file.type.startsWith("video/")
      ) {
        continue;
      }
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        toast.error(`Each file must be under ${MAX_FILE_MB}MB`);
        continue;
      }
      next.push({
        id: `${Date.now()}-${i}-${file.name}`,
        file,
        preview: URL.createObjectURL(file),
      });
    }
    setAttached((prev) => {
      const merged = [...prev, ...next].slice(0, MAX_ATTACH);
      if (prev.length + next.length > MAX_ATTACH) {
        toast.message(`Up to ${MAX_ATTACH} files`);
      }
      return merged;
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onAttach = () => {
    if (mode === "video" && !videoOk) {
      navigate({ to: "/pricing" });
      return;
    }
    if (mode === "music" && !musicOk) {
      navigate({ to: "/pricing" });
      return;
    }
    fileInputRef.current?.click();
  };

  const persistPreset = (payload: Record<string, unknown>) => {
    try {
      sessionStorage.setItem("motio2edit-preset", JSON.stringify(payload));
    } catch {
      /* private mode */
    }
  };

  const effectiveImageQuality = (): ImageQualityUi => {
    if (settingsMode === "auto") return "sd";
    return imageQuality;
  };

  const onGenerate = async () => {
    if (busy) return;
    const trimmed = prompt.trim();

    if (mode !== "music") {
      if (tier === "pro" && !tierOk.pro) {
        persistPreset({ prompt: trimmed, mode, tier, aspect });
        navigate({ to: upgradePathForTier("pro") as never });
        return;
      }
      if (tier === "premium" && !tierOk.premium) {
        persistPreset({ prompt: trimmed, mode, tier, aspect });
        navigate({ to: upgradePathForTier("premium") as never });
        return;
      }
    }

    if (mode === "video") {
      if (!videoOk) {
        navigate({ to: "/pricing" });
        return;
      }
      const d =
        settingsMode === "auto"
          ? resolveVideoDuration(trimmed, tier)
          : { selectedSec: duration, exactMatch: true as const, note: null as string | null };
      if (d.note && !(d as { exactMatch?: boolean }).exactMatch) {
        toast.message(String(d.note));
      }
      const a =
        settingsMode === "auto"
          ? inferAspectFromPrompt(trimmed, "video") || aspect
          : aspect;
      persistPreset({
        prompt: trimmed,
        mode: "video",
        experience: tier === "standard" ? "standard" : "premium",
        tier,
        aspectRatio: a,
        aspect: a,
        duration: d.selectedSec,
        settingsMode,
      });
      navigate({ to: "/studio/video" });
      return;
    }

    if (mode === "music") {
      if (!musicOk) {
        navigate({ to: "/pricing" });
        return;
      }
      persistPreset({
        prompt: trimmed,
        mode: "music",
        tier,
        duration: musicDuration,
        settingsMode,
      });
      navigate({ to: "/music" });
      return;
    }

    if (!user) {
      persistPreset({ prompt: trimmed, mode: "image", tier, aspect });
      navigate({ to: "/auth" });
      return;
    }
    if (!trimmed && attached.length === 0) {
      toast.error("Enter a prompt or attach a photo.");
      return;
    }

    setBusy(true);
    setStatusText("Working…");
    setResultUrl(null);
    startGeneration("image", "/studio");

    try {
      let imageUrl: string | undefined;
      const refUrls: string[] = [];
      if (attached.length > 0) {
        setStatusText("Uploading…");
        setGenerationStage("PREPARING");
        const uid = profile?.id ?? user.id;
        for (let i = 0; i < attached.length; i++) {
          const url = await uploadToStorage(attached[i]!.file, uid);
          if (!url?.startsWith("https://")) {
            throw new Error("Upload failed. Try a smaller image.");
          }
          if (i === 0) imageUrl = url;
          else refUrls.push(url);
        }
      }

      const a =
        settingsMode === "auto"
          ? inferAspectFromPrompt(trimmed, "image") || aspect
          : aspect;
      const quality = effectiveImageQuality();

      setStatusText("Generating…");
      setGenerationStage("GENERATING");

      const res = (await generate({
        data: {
          type: "image",
          prompt: trimmed || "Enhance this image",
          imageUrl: imageUrl ?? null,
          referenceImageUrls: refUrls.length ? refUrls : null,
          aspectRatio: a,
          studioTier: tier,
          imageQuality: quality,
        },
      })) as { outputUrl?: string; url?: string; error?: string; message?: string };

      const outputUrl = res?.outputUrl || res?.url;
      if (!outputUrl || typeof outputUrl !== "string" || !outputUrl.startsWith("http")) {
        throw new Error(res?.message || res?.error || "No image returned.");
      }

      completeGeneration();
      setResultUrl(outputUrl);
      setStatusText(null);
      toast.success("Done");
      try {
        await refreshProfile?.();
      } catch {
        /* ignore */
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Generation failed.";
      failGeneration(message);
      setStatusText(null);
      if (/credit|enough|balance/i.test(message)) {
        toast.error(message, {
          action: {
            label: "Get credits",
            onClick: () => navigate({ to: "/pricing" }),
          },
        });
      } else {
        toast.error(message);
      }
    } finally {
      setBusy(false);
      setTimeout(() => endGeneration(), 800);
    }
  };

  const modes = [
    { id: "image" as const, icon: ImageIcon, label: "Image", ok: true },
    { id: "video" as const, icon: Video, label: "Video", ok: videoOk },
    { id: "music" as const, icon: Music, label: "Music", ok: musicOk },
  ];

  const tiers: { id: StudioTier; label: string; ok: boolean }[] = [
    { id: "standard", label: "Standard", ok: true },
    { id: "pro", label: "Premium", ok: tierOk.pro },
    { id: "premium", label: "Ultra AI", ok: tierOk.premium },
  ];

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <Header />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-3 pb-[max(5.5rem,env(safe-area-inset-bottom))] pt-3 sm:px-4 sm:pt-5">
        <div className="mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Motio2edit
          </p>
          <h1 className="text-xl font-semibold tracking-tight">Studio</h1>
        </div>

        <div className="mb-3 flex items-center gap-1 rounded-2xl border border-border/80 bg-muted/25 p-1">
          {modes.map(({ id, icon: Icon, label, ok }) => {
            const active = mode === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  if (!ok) {
                    navigate({ to: "/pricing" });
                    return;
                  }
                  setMode(id);
                  clearAttachments();
                  setResultUrl(null);
                  if (id === "video") setAspect("16:9");
                  if (id === "image") setAspect("1:1");
                }}
                className={cn(
                  "relative flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-semibold transition sm:text-sm",
                  active
                    ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground",
                  !ok && "opacity-55",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
                {!ok ? <Lock className="h-3 w-3 opacity-70" /> : null}
              </button>
            );
          })}
        </div>

        {(mode === "video" && !videoOk) || (mode === "music" && !musicOk) ? (
          <div className="mb-3 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2.5 text-sm">
            <p className="font-medium text-foreground">
              {mode === "video" ? "Video" : "Music"} needs a paid plan
            </p>
            <button
              type="button"
              className="mt-1 text-sm font-semibold text-primary underline-offset-2 hover:underline"
              onClick={() => navigate({ to: "/pricing" })}
            >
              View upgrade plans →
            </button>
          </div>
        ) : null}

        {mode !== "music" ? (
          <div className="mb-3">
            <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">
              Experience
            </p>
            <div className="flex gap-1.5">
              {tiers.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    if (!t.ok) {
                      navigate({ to: upgradePathForTier(t.id) as never });
                      return;
                    }
                    setTier(t.id);
                  }}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1 rounded-xl border px-2 py-2 text-[11px] font-semibold transition sm:text-xs",
                    tier === t.id && t.ok
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground",
                    !t.ok && "opacity-60",
                  )}
                >
                  {t.label}
                  {!t.ok ? <Lock className="h-3 w-3" /> : null}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mb-3 flex gap-1 rounded-xl border border-border/70 bg-card/50 p-1">
          <button
            type="button"
            onClick={() => setSettingsMode("auto")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition",
              settingsMode === "auto"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground",
            )}
          >
            <Wand2 className="h-3.5 w-3.5" />
            Auto
          </button>
          <button
            type="button"
            onClick={() => setSettingsMode("manual")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition",
              settingsMode === "manual"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground",
            )}
          >
            <Settings2 className="h-3.5 w-3.5" />
            Composer
          </button>
        </div>

        {settingsMode === "manual" ? (
          <div className="mb-3 space-y-2.5 rounded-xl border border-border/70 bg-card/40 p-3">
            {(mode === "image" || mode === "video") && (
              <div>
                <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">Aspect ratio</p>
                <div className="flex flex-wrap gap-1.5">
                  {(mode === "image" ? IMAGE_ASPECTS : VIDEO_ASPECTS).map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAspect(a)}
                      className={cn(
                        "rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold",
                        aspect === a
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground",
                      )}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {mode === "image" && (
              <div>
                <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">Quality</p>
                <div className="flex flex-wrap gap-1.5">
                  {(["sd", "hd"] as const).map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setImageQuality(q)}
                      className={cn(
                        "rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold uppercase",
                        imageQuality === q
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground",
                      )}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {mode === "video" && (
              <div>
                <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">Duration</p>
                <div className="flex flex-wrap gap-1.5">
                  {videoDurations.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDuration(d)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold",
                        duration === d
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground",
                      )}
                    >
                      {d}s
                    </button>
                  ))}
                </div>
              </div>
            )}
            {mode === "music" && (
              <div>
                <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">Target duration</p>
                <div className="flex flex-wrap gap-1.5">
                  {MUSIC_DURATIONS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setMusicDuration(d)}
                      className={cn(
                        "rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold",
                        musicDuration === d
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground",
                      )}
                    >
                      {d}s
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}

        <div className="mb-3 flex-1">
          <p className="text-sm text-muted-foreground">
            {mode === "image"
              ? "Type a prompt or attach a photo to edit."
              : mode === "video"
                ? "Describe the scene, camera and motion."
                : "Describe mood, genre, instruments or vocals."}
          </p>
          {attached.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {attached.map((a) => (
                <div key={a.id} className="relative">
                  <img src={a.preview} alt="" className="h-20 w-20 rounded-xl object-cover ring-1 ring-border" />
                  <button
                    type="button"
                    onClick={() =>
                      setAttached((prev) => {
                        const hit = prev.find((x) => x.id === a.id);
                        if (hit) URL.revokeObjectURL(hit.preview);
                        return prev.filter((x) => x.id !== a.id);
                      })
                    }
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-background shadow ring-1 ring-border"
                    aria-label="Remove"
                    disabled={busy}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          {resultUrl ? (
            <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
              <img src={resultUrl} alt="Result" className="max-h-[420px] w-full object-contain bg-muted/20" />
            </div>
          ) : null}
          {busy && statusText ? (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              {statusText}
            </div>
          ) : null}
        </div>

        <div className="mt-auto">
          <div className="rounded-2xl border border-border bg-card/90 p-2 shadow-lg backdrop-blur-xl">
            <div className="flex items-end gap-1.5">
              <button
                type="button"
                onClick={onAttach}
                disabled={busy}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                aria-label="Attach file"
              >
                <Paperclip className="h-5 w-5" />
              </button>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void onGenerate();
                  }
                }}
                placeholder={
                  mode === "image"
                    ? "Describe what you want to create…"
                    : mode === "video"
                      ? "Describe a video scene…"
                      : "Describe a song or instrumental…"
                }
                rows={2}
                disabled={busy}
                className="min-h-[44px] flex-1 resize-none bg-transparent px-1 py-2.5 text-sm outline-none placeholder:text-muted-foreground/70"
              />
              <button
                type="button"
                onClick={() => void onGenerate()}
                disabled={busy}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow transition hover:opacity-90 disabled:opacity-60"
                aria-label="Generate"
              >
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowUp className="h-5 w-5" />}
              </button>
            </div>
          </div>
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground/80">
            Credits apply on generate
            {settingsMode === "auto" ? " · Auto uses lowest suitable quality" : ""}
          </p>
        </div>

        <section className="mt-6 border-t border-border/60 pt-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Recent
            </h2>
            <Link to="/profile" className="text-xs font-medium text-primary hover:underline">
              Account
            </Link>
          </div>
          {recentLoading ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : recent.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
              Your recent generations will show up here.
            </p>
          ) : (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {recent.map((g) => (
                <li key={g.id} className="overflow-hidden rounded-xl border border-border bg-card">
                  {g.output_url && g.type !== "music" ? (
                    <img src={g.output_url} alt="" className="aspect-square w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex aspect-square items-center justify-center bg-muted/40 text-[10px] text-muted-foreground">
                      {(g.type || "item").slice(0, 8)}
                    </div>
                  )}
                  <p className="truncate px-1.5 py-1 text-[10px] text-muted-foreground">
                    {g.prompt || g.status || "—"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <input
          ref={fileInputRef}
          type="file"
          accept={mode === "image" ? "image/*" : "image/*,video/*"}
          multiple={mode === "image"}
          className="hidden"
          aria-hidden
          onChange={onFileChange}
        />
      </main>
    </div>
  );
}
