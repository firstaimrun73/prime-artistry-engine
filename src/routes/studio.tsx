import type { ReactNode } from "react";
import { useMemo, useRef, useState } from "react";
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
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { canAccessVideo, canAccessMusic, isPaidPlan } from "@/lib/policy";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MotioMarkIcon } from "@/components/BrandMark";
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

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Studio — Motio2edit" },
      {
        name: "description",
        content: "Unified AI Studio — create images, video, and music with Maluto AI.",
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

  const [imageAspect, setImageAspect] = useState<string>("1:1");
  const [videoAspect, setVideoAspect] = useState<string>("16:9");
  const [videoDuration, setVideoDuration] = useState<number>(5);
  const [musicMode, setMusicMode] = useState<"song" | "instrumental">("song");

  const modeLocked =
    (mode === "video" && !videoOk) || (mode === "music" && !musicOk);

  const credits = profile?.credits ?? 0;

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

  const greeting = useMemo(() => {
    if (mode === "image") {
      return "Describe the image you want to create, or tell me how to edit a photo.";
    }
    if (mode === "video") {
      return "Describe your scene — camera, motion, and mood. I'll help turn it into a video.";
    }
    return "Describe your music: mood, genre, instruments, and vocals.";
  }, [mode]);

  const placeholder = useMemo(() => {
    if (mode === "image") {
      return "Describe your image idea, or what you want to change in a photo…";
    }
    if (mode === "video") {
      return "A cinematic drone shot over misty mountains at sunrise…";
    }
    return "Upbeat indie pop with warm acoustic guitar and soft vocals…";
  }, [mode]);

  const overLimit = promptMax != null && prompt.length > promptMax;

  const onPromptChange = (value: string) => {
    if (promptMax != null && value.length > promptMax) {
      setPrompt(value.slice(0, promptMax));
      return;
    }
    setPrompt(value);
  };

  const onGenerate = () => {
    if (modeLocked) {
      navigate({ to: "/pricing" });
      return;
    }
    if (overLimit) return;
    const trimmed = prompt.trim();

    if (mode === "image") {
      navigate({
        to: "/editor",
        search: (trimmed ? { prompt: trimmed } : {}) as never,
      });
      return;
    }
    if (mode === "video") {
      navigate({ to: "/studio/video" });
      return;
    }
    navigate({ to: "/music" });
  };

  const onAttach = () => {
    if (mode === "image") {
      navigate({ to: "/editor" });
      return;
    }
    if (mode === "video") {
      navigate({ to: "/studio/video" });
      return;
    }
    navigate({ to: "/music" });
  };

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
            Applied when you open Image Studio. Models and quality follow your plan.
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

      <main className="relative mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 pb-[max(5.5rem,env(safe-area-inset-bottom))] pt-6 sm:max-w-2xl sm:pt-10">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-1/2 top-[18%] h-64 w-64 -translate-x-1/2 rounded-full bg-primary/12 blur-3xl" />
        </div>

        <div className="mb-6 text-center sm:mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Motio2edit
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
            Your AI creative studio
          </h1>
        </div>

        <div className="mb-5 flex justify-center sm:mb-6">
          <div
            className={cn(
              "inline-flex rounded-full border border-border/70 bg-muted/40 p-1 backdrop-blur-sm",
              "dark:bg-muted/25",
            )}
            role="tablist"
            aria-label="Studio mode"
          >
            <ModePill
              active={mode === "image"}
              onClick={() => setMode("image")}
              icon={<ImageIcon className="h-3.5 w-3.5" />}
              label="Image"
            />
            <ModePill
              active={mode === "video"}
              onClick={() => setMode("video")}
              icon={<Video className="h-3.5 w-3.5" />}
              label="Video"
              locked={!videoOk}
            />
            <ModePill
              active={mode === "music"}
              onClick={() => setMode("music")}
              icon={<Music className="h-3.5 w-3.5" />}
              label="Music"
              locked={!musicOk}
            />
          </div>
        </div>

        <div className="mb-4 flex items-start gap-3 px-0.5 sm:mb-5">
          <div
            className={cn(
              "grid h-10 w-10 shrink-0 place-items-center rounded-2xl",
              "border border-primary/25 bg-primary/10",
            )}
            aria-hidden
          >
            <MotioMarkIcon className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-xs font-semibold text-foreground">
              Maluto AI
              <span className="ml-1.5 font-normal text-muted-foreground">· assistant</span>
            </p>
            <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{greeting}</p>
          </div>
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

        <div
          className={cn(
            "rounded-2xl border border-border/80 bg-card/90 shadow-lg backdrop-blur-md",
            "dark:border-white/10 dark:bg-card/80",
            "focus-within:border-primary/35 focus-within:ring-2 focus-within:ring-primary/12",
          )}
        >
          <textarea
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
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
              onClick={onAttach}
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-xl",
                "text-muted-foreground transition hover:bg-secondary hover:text-foreground",
              )}
              title={mode === "image" ? "Upload or open editor" : "Open studio uploads"}
              aria-label="Attach reference"
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
          <p className="mt-4 text-center text-[11px] text-muted-foreground/80">
            Credits apply on generate. Simple Mode and full tools open inside each studio.
          </p>
        )}

        <input ref={fileRef} type="file" accept="image/*" className="hidden" aria-hidden />
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
