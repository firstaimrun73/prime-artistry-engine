import type { ReactNode, ChangeEvent } from "react";
import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
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
  const { profile } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

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

  const [imageAspect, setImageAspect] = useState<string>("1:1");
  const [videoAspect, setVideoAspect] = useState<string>("16:9");
  const [videoDuration, setVideoDuration] = useState<number>(5);
  const [musicMode, setMusicMode] = useState<"song" | "instrumental">("song");

  const modeLocked =
    (mode === "video" && !videoOk) || (mode === "music" && !musicOk);

  const credits = profile?.credits ?? 0;
  const planLabel = (plan || "free").toString();

  // Clean up focus class on unmount
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
    if (!file || !file.type.startsWith("image/")) return;
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
   * Hand-off to existing generation backends.
   * Uses sessionStorage preset so ImageEditor receives prompt + mode.
   * The real File is retained in state for the next integration step
   * (upload-to-URL then generateMedia). Until that lands, /editor remains
   * the full image pipeline.
   */
  const onGenerate = () => {
    if (modeLocked) {
      navigate({ to: "/pricing" });
      return;
    }
    if (overLimit) return;
    const trimmed = prompt.trim();

    if (mode === "image") {
      try {
        sessionStorage.setItem(
          "motio2edit-preset",
          JSON.stringify({
            prompt: trimmed || undefined,
            mode: "image",
            experience: tier,
            aspectRatio: imageAspect,
          }),
        );
        sessionStorage.setItem("motio2edit-mode", "image");
      } catch {
        // ignore quota errors
      }
      navigate({
        to: "/editor",
        search: {
          ...(trimmed ? { prompt: trimmed } : {}),
          ...(tier !== "standard" ? { experience: tier } : {}),
        } as never,
      });
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
        // ignore
      }
      navigate({ to: "/studio/video" });
      return;
    }
    navigate({ to: "/music" });
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
          <p className="mt-2 text-[11px] text-muted-foreground">
            Applied when you open Image Studio. Models and quality follow your plan and experience.
          </p>
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
            <p className="mt-2 text-[11px] text-muted-foreground">
              Final duration options depend on model and plan in Video Studio.
            </p>
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
          <p className="mt-2 text-[11px] text-muted-foreground">
            Full music controls open in Music Studio. Plan limits still apply.
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <Header />

      {/* Floating Upgrade Plan — does not cover Generate */}
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

      {/* Mobile floating upgrade (bottom-right, above tab bar) */}
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
                ? "Video · text or image"
                : "Music · song or instrumental"}
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
                {attachedFile
                  ? "File ready — describe the change, then Generate"
                  : "Ready to edit — describe the change below"}
              </p>
            </div>
            <button
              type="button"
              onClick={clearAttachment}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label="Remove attachment"
            >
              <X className="h-4 w-4" />
            </button>
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
            className={cn(
              "w-full resize-none bg-transparent px-4 pt-4 text-[15px] leading-relaxed text-foreground",
              "placeholder:text-muted-foreground/65 focus:outline-none",
              "min-h-[7.5rem] max-h-[40vh]",
            )}
            aria-label={`${mode} prompt`}
          />

          <div className="flex items-center gap-1.5 border-t border-border/50 px-2.5 py-2 sm:gap-2 sm:px-3">
            <button
              type="button"
              onClick={onAttachClick}
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
              onClick={onGenerate}
              disabled={overLimit}
            >
              {modeLocked ? (
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
            Credits apply on generate. Full tools open inside each studio. Uploaded files are kept for the next step.
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
