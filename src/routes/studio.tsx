import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Image as ImageIcon, Video, Music, Coins, ArrowUp, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { canAccessVideo, canAccessMusic } from "@/lib/policy";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Studio — Motio2edit" },
      {
        name: "description",
        content: "Generate images, video, and music in one simple Studio.",
      },
      { property: "og:title", content: "Studio — Motio2edit" },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: StudioLayout,
});

type StudioMode = "image" | "video" | "music";

function StudioLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname !== "/studio") return <Outlet />;
  return <StudioWorkspace />;
}

const PLACEHOLDERS: Record<StudioMode, string> = {
  image: "Describe the image you want to create…",
  video: "Describe the video scene, camera, and motion…",
  music: "Describe the song, mood, genre, and vocals…",
};

function StudioWorkspace() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const admin = isAdminEmail(profile?.email);
  const plan = profile?.plan;
  const videoOk = canAccessVideo({ plan, email: profile?.email, isAdmin: admin });
  const musicOk = canAccessMusic({ plan, email: profile?.email, isAdmin: admin });

  const [mode, setMode] = useState<StudioMode>("image");
  const [prompt, setPrompt] = useState("");

  const modeLocked = useMemo(() => {
    if (mode === "video") return !videoOk;
    if (mode === "music") return !musicOk;
    return false;
  }, [mode, videoOk, musicOk]);

  const credits = profile?.credits ?? 0;

  const onModeChange = (next: StudioMode) => {
    setMode(next);
  };

  const onGenerate = () => {
    const trimmed = prompt.trim();
    if (mode === "image") {
      navigate({
        to: "/editor",
        search: (trimmed ? { prompt: trimmed } : {}) as never,
      });
      return;
    }
    if (mode === "video") {
      if (!videoOk) {
        navigate({ to: "/pricing" });
        return;
      }
      navigate({ to: "/studio/video" });
      return;
    }
    if (mode === "music") {
      if (!musicOk) {
        navigate({ to: "/pricing" });
        return;
      }
      navigate({ to: "/music" });
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <Header />
      <main className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-[max(6rem,env(safe-area-inset-bottom))] pt-8 sm:pt-12">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-1/2 top-24 h-56 w-56 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        </div>

        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Studio</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Create with AI — image, video, or music
          </p>
        </div>

        <div className="mb-6 flex justify-center">
          <div
            className={cn(
              "inline-flex rounded-full border border-border/80 bg-muted/50 p-1",
              "dark:bg-muted/30",
            )}
            role="tablist"
            aria-label="Generation mode"
          >
            <ModePill
              active={mode === "image"}
              onClick={() => onModeChange("image")}
              icon={<ImageIcon className="h-3.5 w-3.5" />}
              label="Image"
            />
            <ModePill
              active={mode === "video"}
              onClick={() => onModeChange("video")}
              icon={<Video className="h-3.5 w-3.5" />}
              label="Video"
              locked={!videoOk}
            />
            <ModePill
              active={mode === "music"}
              onClick={() => onModeChange("music")}
              icon={<Music className="h-3.5 w-3.5" />}
              label="Music"
              locked={!musicOk}
            />
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
          <span className="capitalize">{mode} generation</span>
          <button
            type="button"
            onClick={() => navigate({ to: "/dashboard" })}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 font-medium tabular-nums text-foreground hover:bg-secondary"
          >
            <Coins className="h-3.5 w-3.5 text-amber-500" />
            {credits.toLocaleString()}
          </button>
        </div>

        <div
          className={cn(
            "rounded-2xl border border-border bg-card shadow-sm",
            "focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/15",
          )}
        >
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={PLACEHOLDERS[mode]}
            rows={5}
            className={cn(
              "w-full resize-none bg-transparent px-4 pt-4 text-[15px] leading-relaxed text-foreground",
              "placeholder:text-muted-foreground/70 focus:outline-none",
              "min-h-[8.5rem]",
            )}
            aria-label={`${mode} prompt`}
          />

          <div className="flex items-center justify-between gap-3 border-t border-border/60 px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">
              {modeLocked
                ? "Upgrade to unlock this mode"
                : mode === "image"
                  ? "Opens Image Studio with your prompt"
                  : mode === "video"
                    ? "Opens Video Studio"
                    : "Opens Music Studio"}
            </p>
            <Button
              size="sm"
              className="h-9 gap-1.5 rounded-full px-4"
              onClick={onGenerate}
            >
              {modeLocked ? (
                <>
                  <Lock className="h-3.5 w-3.5" />
                  Upgrade
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
        ) : null}

        <p className="mt-auto pt-10 text-center text-[11px] text-muted-foreground/80">
          Credits and plan limits apply. Pricing unchanged.
        </p>
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
        "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-all",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
      {locked ? <Lock className="h-3 w-3 opacity-60" /> : null}
    </button>
  );
}
