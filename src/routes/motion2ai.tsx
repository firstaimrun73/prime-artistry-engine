/**
 * Motion2AI Creative Studio — one surface, three modes.
 * Real ImageEditor / VideoEditor / MusicStudioPage kept mounted (hidden when inactive)
 * so drafts, uploads and results survive mode switches.
 */
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import {
  Image as ImageIcon,
  Video,
  Music,
  Coins,
  Sparkles,
  ArrowUpRight,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { canAccessVideo } from "@/lib/policy";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { PlanId } from "@/lib/plans";
import { ImageEditor } from "@/components/editor/image/ImageEditor";
import { VideoEditor } from "@/components/editor/video/VideoEditor";
import { MusicStudioPage } from "@/components/music/MusicStudioPage";
import { ImageStudioWeeklyCarousel } from "@/components/editor/image/ImageStudioWeeklyCarousel";

const searchSchema = z.object({
  mode: z.enum(["image", "video", "music"]).optional().default("image"),
});

export type Motion2AIMode = "image" | "video" | "music";

export const Route = createFileRoute("/motion2ai")({
  validateSearch: (s) => {
    try {
      return searchSchema.parse(s);
    } catch {
      return { mode: "image" as const };
    }
  },
  head: () => ({
    meta: [
      { title: "Motion2AI Creative Studio — Motio2edit" },
      {
        name: "description",
        content:
          "Create images, videos, and music in one premium studio. What will you create today?",
      },
    ],
  }),
  component: Motion2AIPage,
});

const MODE_META: {
  id: Motion2AIMode;
  label: string;
  icon: typeof ImageIcon;
}[] = [
  { id: "image", label: "Image", icon: ImageIcon },
  { id: "video", label: "Video", icon: Video },
  { id: "music", label: "Music", icon: Music },
];

function Motion2AIPage() {
  const { mode: searchMode } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { user, profile, loading } = useAuth();
  const [mode, setMode] = useState<Motion2AIMode>(searchMode ?? "image");
  // Track which modes have been visited so we only mount once, then keep alive
  const [mounted, setMounted] = useState<Record<Motion2AIMode, boolean>>({
    image: true,
    video: false,
    music: false,
  });

  useEffect(() => {
    if (searchMode && searchMode !== mode) setMode(searchMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchMode]);

  useEffect(() => {
    setMounted((prev) => (prev[mode] ? prev : { ...prev, [mode]: true }));
  }, [mode]);

  const isAdmin = isAdminEmail(profile?.email);
  const planId = (profile?.plan ?? "free") as PlanId;
  const videoOk = canAccessVideo({ plan: planId, email: profile?.email, isAdmin });
  const credits = profile?.credits ?? 0;

  const switchMode = useCallback(
    (next: Motion2AIMode) => {
      if (next === "video" && user && !videoOk) {
        navigate({ to: "/pricing" });
        return;
      }
      setMode(next);
      void navigate({
        search: (prev) => ({ ...prev, mode: next }),
        replace: true,
      });
      try {
        if (next === "image" || next === "video") {
          sessionStorage.setItem("motio2edit-mode", next);
        }
      } catch {
        /* ignore */
      }
    },
    [navigate, user, videoOk],
  );

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
        <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -right-20 top-40 h-80 w-80 rounded-full bg-orange-400/10 blur-3xl" />
        <div className="absolute bottom-20 left-1/3 h-56 w-56 rounded-full bg-fuchsia-500/10 blur-3xl" />
      </div>

      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/55">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-3 py-2 sm:px-4 sm:py-2.5">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Motio2edit
              </p>
              <p className="truncate text-sm font-extrabold tracking-tight">
                Motion2AI Creative Studio
              </p>
            </div>
          </Link>

          <nav
            className="hidden items-center gap-0.5 rounded-2xl border border-border/60 bg-card/50 p-1 shadow-sm backdrop-blur-md sm:flex"
            aria-label="Creative modes"
          >
            {MODE_META.map((m) => {
              const Icon = m.icon;
              const locked = m.id === "video" && !!user && !videoOk;
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => switchMode(m.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-sm font-semibold transition-all duration-200",
                    active
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                    locked && "opacity-60",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {m.label}
                </button>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {user && profile ? (
              <>
                <div className="flex items-center gap-1 rounded-full border border-border/60 bg-card/60 px-2 py-1 text-xs font-semibold backdrop-blur-md">
                  <Coins className="h-3.5 w-3.5 text-amber-500" />
                  <span className="tabular-nums">{credits.toLocaleString()}</span>
                </div>
                <Button
                  size="sm"
                  className="h-8 gap-1 rounded-full px-2.5 text-xs font-bold sm:px-3"
                  onClick={() => navigate({ to: "/pricing" })}
                >
                  Upgrade
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                className="h-8 rounded-full px-3 text-xs font-bold"
                onClick={() =>
                  navigate({
                    to: "/auth",
                    search: { redirect: `/motion2ai?mode=${mode}`, mode: "signin" },
                  })
                }
              >
                Sign in
              </Button>
            )}
          </div>
        </div>

        <div className="border-t border-border/30 px-3 pb-2 pt-1.5 sm:hidden">
          <div className="flex gap-1 rounded-2xl border border-border/60 bg-card/50 p-1">
            {MODE_META.map((m) => {
              const Icon = m.icon;
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => switchMode(m.id)}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-semibold transition-all",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Tagline strip */}
      <div className="border-b border-border/30 bg-card/30 px-4 py-2.5 text-center backdrop-blur-sm">
        <p className="text-sm font-semibold tracking-tight text-foreground sm:text-base">
          What will you create today?
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground sm:text-xs">
          Image · Video · Music — one creative studio
        </p>
      </div>

      <main className="relative flex-1">
        {!user && (
          <div className="mx-auto max-w-3xl px-4 pt-3">
            <div className="rounded-2xl border border-border/60 bg-card/60 px-4 py-3 text-center text-sm text-muted-foreground backdrop-blur-md">
              Explore samples freely.{" "}
              <button
                type="button"
                className="font-semibold text-primary hover:underline"
                onClick={() =>
                  navigate({
                    to: "/auth",
                    search: { redirect: `/motion2ai?mode=${mode}`, mode: "signin" },
                  })
                }
              >
                Sign in
              </button>{" "}
              to generate.
            </div>
          </div>
        )}

        {/* Keep-alive panels: mount once, hide inactive — preserves drafts */}
        <div className={cn("pb-8", mode !== "image" && "hidden")} aria-hidden={mode !== "image"}>
          {mounted.image && (
            <>
              {user && profile ? (
                <ImageEditor />
              ) : (
                <ExploreImagePlaceholder
                  onSignIn={() =>
                    navigate({
                      to: "/auth",
                      search: { redirect: "/motion2ai?mode=image", mode: "signin" },
                    })
                  }
                />
              )}
              <div className="mx-auto max-w-5xl px-2 sm:px-4">
                <ImageStudioWeeklyCarousel />
              </div>
            </>
          )}
        </div>

        <div className={cn("pb-8", mode !== "video" && "hidden")} aria-hidden={mode !== "video"}>
          {mounted.video &&
            (user && profile && videoOk ? (
              <VideoEditor />
            ) : user && !videoOk ? (
              <LockedMode
                title="Video"
                message="Upgrade to unlock AI video generation."
                onUpgrade={() => navigate({ to: "/pricing" })}
              />
            ) : (
              <ExploreModePlaceholder
                title="Video"
                blurb="Text-to-video, image-to-video, and cinematic styles. Sign in on a paid plan to create."
                onSignIn={() =>
                  navigate({
                    to: "/auth",
                    search: { redirect: "/motion2ai?mode=video", mode: "signin" },
                  })
                }
              />
            ))}
        </div>

        <div className={cn("pb-8", mode !== "music" && "hidden")} aria-hidden={mode !== "music"}>
          {mounted.music &&
            (user && profile ? (
              <div className="music-embed [&>div]:min-h-0">
                <MusicStudioPage />
              </div>
            ) : (
              <ExploreModePlaceholder
                title="Music"
                blurb="Songs, instrumentals, BGM, voiceover, SFX, and video music. Sign in to create."
                onSignIn={() =>
                  navigate({
                    to: "/auth",
                    search: { redirect: "/motion2ai?mode=music", mode: "signin" },
                  })
                }
              />
            ))}
        </div>
      </main>

      <footer className="border-t border-border/40 py-3 text-center text-[11px] text-muted-foreground">
        AI+ editing tools live in{" "}
        <Link to="/studio" className="font-semibold text-primary hover:underline">
          AI+ Tools
        </Link>
        {" · "}Circle 2edit, Remove BG, Cropmix, Filters, Frames, Lenses
      </footer>
    </div>
  );
}

function ExploreImagePlaceholder({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25">
        <ImageIcon className="h-7 w-7" />
      </div>
      <h2 className="mt-4 text-xl font-extrabold tracking-tight">Image</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Standard · Premium · Ultra. Upload, prompt, and generate. Browse samples below.
      </p>
      <Button className="mt-6 rounded-full" onClick={onSignIn}>
        Sign in to create
      </Button>
    </div>
  );
}

function ExploreModePlaceholder({
  title,
  blurb,
  onSignIn,
}: {
  title: string;
  blurb: string;
  onSignIn: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg px-4 py-12 text-center">
      <h2 className="text-xl font-extrabold tracking-tight">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{blurb}</p>
      <Button className="mt-6 rounded-full" onClick={onSignIn}>
        Sign in to create
      </Button>
    </div>
  );
}

function LockedMode({
  title,
  message,
  onUpgrade,
}: {
  title: string;
  message: string;
  onUpgrade: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg px-4 py-12 text-center">
      <h2 className="text-xl font-extrabold tracking-tight">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      <Button className="mt-6 rounded-full" onClick={onUpgrade}>
        View plans
      </Button>
    </div>
  );
}
