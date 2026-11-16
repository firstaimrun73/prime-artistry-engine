import type { ReactNode, ChangeEvent } from "react";
import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Header } from "@/components/Header";
import {
  Image as ImageIcon,
  Video,
  Music,
  Coins,
  ArrowUp,
  Lock,
  Paperclip,
  SlidersHorizontal,
  X,
  Zap,
  Crown,
  Sparkles,
  Download,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { canAccessVideo, canAccessMusic, isPaidPlan } from "@/lib/policy";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  maxPromptCharsForPlan,
  isPromptEffectivelyUnlimited,
} from "@/utils/planLimits";
import { getMusicPlanCapabilities } from "@/lib/music/music-plan-capabilities";
import {
  STANDARD_VIDEO_PROMPT_MAX,
  PREMIUM_VIDEO_PROMPT_MAX,
} from "@/components/video/VideoPromptBar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  type StudioTier,
  STUDIO_TIER_META,
} from "@/lib/studio/studio-tier";
import { generateMedia } from "@/lib/generate.functions";
import { uploadToStorage } from "@/lib/editor/editor.utils";
import {
  startGeneration,
  setGenerationStage,
  completeGeneration,
  failGeneration,
  endGeneration,
  useGenerationStatus,
  useInFlightStageAdvance,
} from "@/lib/generation-status";
import { toast } from "sonner";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Studio — Motio2edit" },
      {
        name: "description",
        content: "Unified AI Studio — create images, video, and music in one place.",
      },
      { property: "og:title", content: "Studio — Motio2edit" },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: StudioLayout,
});

type StudioMode = "image" | "video" | "music";

type ConversationResult = {
  id: string;
  kind: "image" | "video" | "music";
  prompt: string;
  url: string;
  createdAt: number;
  experience: StudioTier;
};

const IMAGE_ASPECTS = ["1:1", "4:3", "3:4", "16:9", "9:16"] as const;
const VIDEO_ASPECTS = ["16:9", "9:16", "1:1"] as const;
const VIDEO_DURATIONS = [5, 8, 10] as const;
const MUSIC_MODES = [
  { id: "song", label: "Song" },
  { id: "instrumental", label: "Instrumental" },
] as const;

function StudioLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname !== "/studio") return <Outlet />;
  return <UnifiedAiStudio />;
}

function UnifiedAiStudio() {
  const { profile, refreshProfile, user } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const generate = useServerFn(generateMedia);
  const genStatus = useGenerationStatus();

  const admin = isAdminEmail(profile?.email);
  const plan = profile?.plan;
  const paid = admin || isPaidPlan(plan);
  const videoOk = canAccessVideo({ plan, email: profile?.email, isAdmin: admin });
  const musicOk = canAccessMusic({ plan, email: profile?.email, isAdmin: admin });
  const musicCaps = useMemo(() => getMusicPlanCapabilities(plan), [plan]);

  const [mode, setMode] = useState<StudioMode>("image");
  const [prompt, setPrompt] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tier, setTier] = useState<StudioTier>("standard");
  const [attachedPreview, setAttachedPreview] = useState<string | null>(null);
  const [attachedName, setAttachedName] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [results, setResults] = useState<ConversationResult[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);

  const [imageAspect, setImageAspect] = useState<string>("1:1");
  const [videoAspect, setVideoAspect] = useState<string>("16:9");
  const [videoDuration, setVideoDuration] = useState<number>(5);
  const [musicMode, setMusicMode] = useState<"song" | "instrumental">("song");

  const modeLocked =
    (mode === "video" && !videoOk) || (mode === "music" && !musicOk);

  const credits = profile?.credits ?? 0;
  const planLabel = (plan || "free").toString();

  useInFlightStageAdvance(busy && mode === "image");

  useEffect(() => {
    return () => {
      document.documentElement.classList.remove("studio-composer-focus");
    };
  }, []);

  const setComposerFocus = (on: boolean) => {
    document.documentElement.classList.toggle("studio-composer-focus", on);
  };

  const promptMax = useMemo(() => {
    if (mode === "image") {
      if (isPromptEffectivelyUnlimited(plan)) return null;
      return maxPromptCharsForPlan(plan, admin);
    }
    if (mode === "video") {
      return paid ? PREMIUM_VIDEO_PROMPT_MAX : STANDARD_VIDEO_PROMPT_MAX;
    }
    return musicCaps.promptMaxChars > 0 ? musicCaps.promptMaxChars : 500;
  }, [mode, plan, admin, paid, musicCaps.promptMaxChars]);

  const placeholder = useMemo(() => {
    if (mode === "image") {
      return attachedPreview
        ? "Describe what you want to change in this photo…"
        : "Describe your image idea, or what you want to change in a photo…";
    }
    if (mode === "video") {
      return "A cinematic drone shot over misty mountains at sunrise…";
    }
    return "Upbeat indie pop with warm acoustic guitar and soft vocals…";
  }, [mode, attachedPreview]);

  const overLimit = promptMax != null && prompt.length > promptMax;

  const onPromptChange = (value: string) => {
    if (promptMax != null && value.length > promptMax) {
      setPrompt(value.slice(0, promptMax));
      return;
    }
    setPrompt(value);
  };

  const clearAttachment = useCallback(() => {
    setAttachedPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setAttachedName(null);
    setAttachedFile(null);
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast.error("Image must be under 25MB.");
      return;
    }
    setAttachedPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setAttachedName(file.name);
    setAttachedFile(file);
  };

  const onAttachClick = () => {
    if (mode === "image") {
      fileRef.current?.click();
      return;
    }
    if (mode === "video") {
      navigate({ to: "/studio/video" });
      return;
    }
    navigate({ to: "/music" });
  };

  /**
   * Image: real in-conversation generation via generateMedia.
   * Video / Music: hand off to existing full studios (still powered by same backend).
   */
  const onGenerate = async () => {
    if (busy) return;
    if (modeLocked) {
      navigate({ to: "/pricing" });
      return;
    }
    if (overLimit) return;
    const trimmed = prompt.trim();
    if (!trimmed && mode === "image" && !attachedFile) {
      toast.error("Enter a prompt or attach an image.");
      return;
    }

    if (mode === "video") {
      try {
        sessionStorage.setItem(
          "motio2edit-preset",
          JSON.stringify({
            prompt: trimmed || undefined,
            mode: "video",
            experience: tier,
            aspectRatio: videoAspect,
            duration: videoDuration,
          }),
        );
      } catch {
        /* ignore */
      }
      navigate({ to: "/studio/video" });
      return;
    }
    if (mode === "music") {
      navigate({ to: "/music" });
      return;
    }

    // —— Image path: stay on /studio ——
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }

    setBusy(true);
    setLastError(null);
    setStatusText("Preparing…");
    startGeneration("image", "/studio");

    try {
      let imageUrl: string | undefined;

      if (attachedFile) {
        setStatusText("Uploading image…");
        setGenerationStage("PREPARING");
        imageUrl = await uploadToStorage(attachedFile, profile?.id ?? user.id ?? "anon");
        if (!imageUrl?.startsWith("https://")) {
          throw new Error("Upload failed. Please try a smaller image.");
        }
      }

      setStatusText("Generating…");
      setGenerationStage("GENERATING");

      const res = (await generate({
        data: {
          type: "image",
          prompt: trimmed || "Enhance this image",
          imageUrl: imageUrl ?? null,
          aspectRatio: imageAspect,
          studioTier: tier,
          imageQuality: tier === "standard" ? "sd" : "hd",
        },
      })) as { outputUrl?: string; url?: string; credits?: number; error?: string };

      const outputUrl = res?.outputUrl || res?.url;
      if (!outputUrl || typeof outputUrl !== "string" || !outputUrl.startsWith("http")) {
        throw new Error(
          (res as { message?: string })?.message ||
            res?.error ||
            "Generation returned no image URL.",
        );
      }

      completeGeneration();
      setResults((prev) => [
        {
          id: `${Date.now()}`,
          kind: "image",
          prompt: trimmed || "(image edit)",
          url: outputUrl,
          createdAt: Date.now(),
          experience: tier,
        },
        ...prev,
      ]);
      setStatusText(null);
      toast.success("Image ready");
      try {
        await refreshProfile?.();
      } catch {
        /* profile refresh is best-effort */
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Generation failed. Please try again.";
      failGeneration(message);
      setLastError(message);
      setStatusText(null);
      toast.error(message);
    } finally {
      setBusy(false);
      // Clear global bar after a short delay so COMPLETE/ERROR is visible
      setTimeout(() => endGeneration(), 1200);
    }
  };

  const visibleTiers: StudioTier[] =
    mode === "image" ? ["standard", "pro", "premium"] : ["standard", "pro"];

  const contextualSuggestion = useMemo(() => {
    if (mode !== "image") return null;
    if (attachedPreview) {
      return {
        title: "Edit your uploaded image",
        body: "Describe what you want to change in your photo.",
      };
    }
    return {
      title: "Create from a prompt",
      body: "Describe your idea and let AI turn it into an image.",
    };
  }, [mode, attachedPreview]);

  const stageLabel =
    genStatus?.stage && busy
      ? genStatus.stage.replace(/_/g, " ").toLowerCase()
      : statusText;

  const settingsPanel = (
    <div className="space-y-4 text-sm">
      {mode === "image" && (
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Aspect ratio</p>
          <div className="flex flex-wrap gap-1.5">
            {IMAGE_ASPECTS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setImageAspect(a)}
                className={cn(
                  "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition",
                  imageAspect === a
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      )}
      {mode === "video" && (
        <>
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Aspect ratio</p>
            <div className="flex flex-wrap gap-1.5">
              {VIDEO_ASPECTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setVideoAspect(a)}
                  className={cn(
                    "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition",
                    videoAspect === a
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Duration</p>
            <div className="flex flex-wrap gap-1.5">
              {VIDEO_DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setVideoDuration(d)}
                  className={cn(
                    "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition",
                    videoDuration === d
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>
        </>
      )}
      {mode === "music" && (
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Type</p>
          <div className="flex flex-wrap gap-1.5">
            {MUSIC_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMusicMode(m.id)}
                className={cn(
                  "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition",
                  musicMode === m.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <Header />

      <button
        type="button"
        onClick={() => navigate({ to: "/pricing" })}
        className={cn(
          "fixed z-30 hidden sm:inline-flex items-center gap-1.5 rounded-full",
          "border border-primary/30 bg-card/90 px-3 py-1.5 text-xs font-semibold",
          "text-foreground shadow-md backdrop-blur-md hover:bg-primary/10",
          "right-4 top-[4.5rem]",
        )}
        title={`Current plan: ${planLabel}`}
      >
        <Crown className="h-3.5 w-3.5 text-primary" />
        Upgrade
        <span className="text-[10px] font-normal text-muted-foreground capitalize">
          · {planLabel}
        </span>
      </button>

      <button
        type="button"
        onClick={() => navigate({ to: "/pricing" })}
        className={cn(
          "fixed z-30 sm:hidden inline-flex items-center gap-1 rounded-full",
          "border border-primary/30 bg-card/95 px-2.5 py-1.5 text-[11px] font-semibold",
          "text-foreground shadow-lg backdrop-blur-md",
          "right-3 bottom-[max(4.75rem,calc(env(safe-area-inset-bottom)+4.25rem))]",
        )}
        title={`Current plan: ${planLabel}`}
      >
        <Crown className="h-3.5 w-3.5 text-primary" />
        Upgrade
      </button>

      <main
        className={cn(
          "relative mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pt-5 sm:max-w-2xl sm:pt-8",
          "pb-[max(6.5rem,calc(env(safe-area-inset-bottom)+5.5rem))]",
        )}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-1/2 top-[12%] h-56 w-56 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl dark:bg-primary/14" />
        </div>

        <div className="mb-5 text-center sm:mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Motio2edit
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Your AI creative studio
          </h1>
        </div>

        <div className="mb-4 flex justify-center sm:mb-5">
          <div
            className={cn(
              "inline-flex rounded-full border border-border/70 bg-muted/40 p-1 backdrop-blur-sm",
              "dark:border-white/10 dark:bg-muted/25",
            )}
            role="tablist"
            aria-label="Studio mode"
          >
            <ModePill
              active={mode === "image"}
              onClick={() => {
                setMode("image");
                setTier("standard");
              }}
              icon={<ImageIcon className="h-3.5 w-3.5" />}
              label="Image"
            />
            <ModePill
              active={mode === "video"}
              onClick={() => {
                setMode("video");
                setTier("standard");
              }}
              icon={<Video className="h-3.5 w-3.5" />}
              label="Video"
              locked={!videoOk}
            />
            <ModePill
              active={mode === "music"}
              onClick={() => {
                setMode("music");
                setTier("standard");
              }}
              icon={<Music className="h-3.5 w-3.5" />}
              label="Music"
              locked={!musicOk}
            />
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between px-0.5">
          <p className="text-xs text-muted-foreground">
            {mode === "image"
              ? "Image · create or edit"
              : mode === "video"
                ? "Video · opens full Video Studio"
                : "Music · opens Music Studio"}
          </p>
          <button
            type="button"
            onClick={() => navigate({ to: "/dashboard" })}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-card/80 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-foreground backdrop-blur-sm hover:bg-secondary"
            title="Credits"
          >
            <Coins className="h-3 w-3 text-amber-500" />
            {credits.toLocaleString()}
          </button>
        </div>

        <div className="mb-3">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Experience
          </p>
          <div
            className={cn(
              "grid gap-2",
              visibleTiers.length === 3 ? "grid-cols-3" : "grid-cols-2",
            )}
          >
            {visibleTiers.map((id) => {
              const meta = STUDIO_TIER_META[id];
              const active = tier === id;
              const Icon =
                id === "standard" ? Zap : id === "pro" ? Crown : Sparkles;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTier(id)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-center transition-all",
                    active &&
                      id === "standard" &&
                      "border-primary bg-primary/12 ring-1 ring-primary/30",
                    active &&
                      id === "pro" &&
                      "border-orange-500/80 bg-orange-500/10 ring-1 ring-orange-500/35",
                    active &&
                      id === "premium" &&
                      "border-amber-400/70 bg-amber-500/10 ring-1 ring-amber-400/40",
                    !active &&
                      "border-border/70 bg-card/60 text-muted-foreground hover:border-primary/35 hover:text-foreground",
                  )}
                  aria-pressed={active}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      active && id === "standard" && "text-primary",
                      active && id === "pro" && "text-orange-500",
                      active && id === "premium" && "text-amber-400",
                    )}
                  />
                  <span className="text-[11px] font-semibold leading-tight sm:text-xs">
                    {meta.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {contextualSuggestion && (
          <div
            className={cn(
              "mb-3 rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5 backdrop-blur-sm",
              "dark:border-white/8 dark:bg-muted/20",
            )}
          >
            <p className="text-xs font-semibold text-foreground">
              {contextualSuggestion.title}
            </p>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              {contextualSuggestion.body}
            </p>
          </div>
        )}

        {/* Conversation results */}
        {results.length > 0 && (
          <div className="mb-4 space-y-3">
            {results.map((r) => (
              <div
                key={r.id}
                className="overflow-hidden rounded-2xl border border-border/70 bg-card/80 shadow-sm backdrop-blur-sm"
              >
                <div className="border-b border-border/50 px-3 py-2">
                  <p className="truncate text-xs text-muted-foreground">{r.prompt}</p>
                  <p className="text-[10px] text-muted-foreground/80">
                    {STUDIO_TIER_META[r.experience].label} · image
                  </p>
                </div>
                <img
                  src={r.url}
                  alt="Generated result"
                  className="max-h-[420px] w-full object-contain bg-muted/20"
                />
                <div className="flex flex-wrap items-center gap-2 px-3 py-2">
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-secondary"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setPrompt(r.prompt);
                      setTier(r.experience);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-secondary"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Use prompt again
                  </button>
                </div>
                {/* Sponsored slot — only renders when a campaign is configured later */}
                <div className="border-t border-border/40 px-3 py-2">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
                    Sponsored
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Ad placement ready — configure campaign in admin to show links here.
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {attachedPreview && mode === "image" && (
          <div className="mb-3 flex items-center gap-3 rounded-xl border border-border/70 bg-card/70 p-2 backdrop-blur-sm">
            <img
              src={attachedPreview}
              alt="Upload preview"
              className="h-14 w-14 rounded-lg object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-foreground">
                {attachedName ?? "Uploaded image"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Will upload securely, then generate in this studio
              </p>
            </div>
            <button
              type="button"
              onClick={clearAttachment}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label="Remove attachment"
              disabled={busy}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {lastError && (
          <div className="mb-3 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {lastError}
            {/credit|enough/i.test(lastError) && (
              <button
                type="button"
                className="ml-2 font-semibold underline"
                onClick={() => navigate({ to: "/pricing" })}
              >
                Get credits
              </button>
            )}
          </div>
        )}

        {busy && stageLabel && (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            <span className="capitalize">{stageLabel}</span>
          </div>
        )}

        <div
          className={cn(
            "rounded-2xl border border-border/80 bg-card/90 shadow-lg backdrop-blur-md",
            "dark:border-white/10 dark:bg-card/80",
            "focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/15",
            "transition-shadow duration-200",
          )}
        >
          <textarea
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            onFocus={() => setComposerFocus(true)}
            onBlur={() => setComposerFocus(false)}
            placeholder={placeholder}
            rows={4}
            disabled={busy}
            className={cn(
              "w-full resize-none bg-transparent px-4 pt-4 text-[15px] leading-relaxed text-foreground",
              "placeholder:text-muted-foreground/65 focus:outline-none",
              "min-h-[7.5rem] max-h-[40vh]",
              busy && "opacity-70",
            )}
            aria-label={`${mode} prompt`}
          />

          <div className="flex items-center gap-1.5 border-t border-border/50 px-2.5 py-2 sm:gap-2 sm:px-3">
            <button
              type="button"
              onClick={onAttachClick}
              disabled={busy}
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-xl",
                "text-muted-foreground transition hover:bg-secondary hover:text-foreground",
                attachedPreview && mode === "image" && "text-primary",
              )}
              title={mode === "image" ? "Upload image" : "Open studio uploads"}
              aria-label="Attach"
            >
              <Paperclip className="h-4 w-4" />
            </button>

            <div className="hidden sm:block">
              <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "inline-flex h-9 w-9 items-center justify-center rounded-xl",
                      "text-muted-foreground transition hover:bg-secondary hover:text-foreground",
                      settingsOpen && "bg-secondary text-foreground",
                    )}
                    title="Filters & settings"
                    aria-label="Open settings"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-72 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold">Settings</p>
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {mode}
                    </span>
                  </div>
                  {settingsPanel}
                </PopoverContent>
              </Popover>
            </div>

            <div className="sm:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "inline-flex h-9 w-9 items-center justify-center rounded-xl",
                      "text-muted-foreground transition hover:bg-secondary hover:text-foreground",
                    )}
                    title="Filters & settings"
                    aria-label="Open settings"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                  </button>
                </SheetTrigger>
                <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-8 pt-4">
                  <SheetHeader className="mb-3 text-left">
                    <SheetTitle className="text-base capitalize">{mode} settings</SheetTitle>
                  </SheetHeader>
                  {settingsPanel}
                </SheetContent>
              </Sheet>
            </div>

            <div className="ml-1 min-w-0 flex-1">
              {promptMax != null ? (
                <span
                  className={cn(
                    "text-[10px] tabular-nums text-muted-foreground",
                    overLimit && "font-semibold text-destructive",
                  )}
                >
                  {prompt.length.toLocaleString()} / {promptMax.toLocaleString()}
                </span>
              ) : (
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {prompt.length.toLocaleString()}
                </span>
              )}
            </div>

            <Button
              size="sm"
              className="h-9 shrink-0 gap-1.5 rounded-full px-3.5 sm:px-4"
              onClick={() => void onGenerate()}
              disabled={overLimit || busy}
            >
              {busy ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span className="hidden sm:inline">Working</span>
                </>
              ) : modeLocked ? (
                <>
                  <Lock className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Upgrade</span>
                </>
              ) : (
                <>
                  Generate
                  <ArrowUp className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </div>
        </div>

        {modeLocked ? (
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {mode === "video" ? "Video" : "Music"} needs a paid plan.{" "}
            <button
              type="button"
              className="font-medium text-primary underline-offset-2 hover:underline"
              onClick={() => navigate({ to: "/pricing" })}
            >
              View plans
            </button>
          </p>
        ) : (
          <p className="mt-3 text-center text-[11px] text-muted-foreground/80">
            {mode === "image"
              ? "Image generation runs in this studio. Credits are charged only on successful jobs."
              : "Video and Music open their full studios with the same credit system."}
          </p>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          aria-hidden
          onChange={onFileChange}
        />
      </main>
    </div>
  );
}

function ModePill({
  active,
  onClick,
  icon,
  label,
  locked,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  locked?: boolean;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-all sm:px-3.5",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      <span>{label}</span>
      {locked ? <Lock className="h-3 w-3 opacity-55" /> : null}
    </button>
  );
}
